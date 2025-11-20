type MessageHandler = (data: any) => void;
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
type ConnectionChangeHandler = (state: ConnectionState) => void;

interface WebSocketService {
  connect(url: string, token: string | null): Promise<boolean>;
  disconnect(): void;
  sendMessage(message: any): void;
  onMessage(handler: MessageHandler): void;
  offMessage(handler: MessageHandler): void;
  isConnected(): boolean;
  getConnectionState(): ConnectionState;
  getReadyState(): number | null;
  reconnect(): void;
  onConnectionChange(handler: ConnectionChangeHandler): void;
  offConnectionChange(handler: ConnectionChangeHandler): void;
}

class WebSocketServiceImpl implements WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: MessageHandler[] = [];
  private connectionChangeHandlers: ConnectionChangeHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isExplicitlyClosed = false;
  private isConnectingFlag = false;
  private connectionUrl: string | null = null;
  private authToken: string | null = null;
  private connectionPromise: Promise<boolean> | null = null;
  private connectionResolve: ((value: boolean | PromiseLike<boolean>) => void) | null = null;
  private connectionReject: ((reason?: any) => void) | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  private lastPong: number = Date.now();
  private readonly PING_INTERVAL = 25000; // 25 seconds
  private readonly PONG_TIMEOUT = 10000; // 10 seconds

  // Connection state constants
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSING = 2;
  public static readonly CLOSED = 3;

  private constructor() {}

  public static getInstance(): WebSocketService {
    if (!WebSocketServiceImpl.instance) {
      WebSocketServiceImpl.instance = new WebSocketServiceImpl();
    }
    return WebSocketServiceImpl.instance;
  }

  // Check if WebSocket is connected
  public isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // Notify all connection state change handlers
  private notifyConnectionStateChange(state: ConnectionState): void {
    this.connectionChangeHandlers.forEach(handler => {
      try {
        handler(state);
      } catch (error) {
        console.error('Error in connection state handler:', error);
      }
    });
  }

  // Get current connection state
  public getConnectionState(): ConnectionState {
    if (!this.socket) return 'disconnected';

    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return this.isConnectingFlag ? 'connecting' : 'reconnecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'disconnected';
      case WebSocket.CLOSED:
        return this.isExplicitlyClosed ? 'disconnected' : 'reconnecting';
      default:
        return 'error';
    }
  }

  // Get raw ready state
  public getReadyState(): number | null {
    return this.socket?.readyState ?? null;
  }

  // Disconnect from WebSocket
  public disconnect(): void {
    this.isExplicitlyClosed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close(1000, 'User disconnected');
      }

      this.socket = null;
    }

    this.connectionPromise = null;
    this.connectionResolve = null;
    this.connectionReject = null;
    this.notifyConnectionStateChange('disconnected');
  }

  // Send a message through the WebSocket
  public sendMessage(message: any): void {
    if (!this.isConnected()) {
      console.warn('WebSocket not connected, queueing message');
      this.messageQueue.push(message);

      // If not already trying to connect, try to reconnect
      if (!this.isConnectingFlag && !this.isExplicitlyClosed) {
        this.reconnect();
      }
      return;
    }

    try {
      const messageString = typeof message === 'string' ? message : JSON.stringify(message);
      if (this.socket) {
        this.socket.send(messageString);
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      this.messageQueue.push(message);

      // If we get an error while sending, try to reconnect
      if (!this.isConnectingFlag && !this.isExplicitlyClosed) {
        this.reconnect();
      }
    }
  }

  // Register a message handler
  public onMessage(handler: MessageHandler): void {
    if (!this.messageHandlers.includes(handler)) {
      this.messageHandlers.push(handler);
    }
  }

  // Unregister a message handler
  public offMessage(handler: MessageHandler): void {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  // Register a connection state change handler
  public onConnectionChange(handler: ConnectionChangeHandler): void {
    if (!this.connectionChangeHandlers.includes(handler)) {
      this.connectionChangeHandlers.push(handler);
    }
  }

  // Unregister a connection state change handler
  public offConnectionChange(handler: ConnectionChangeHandler): void {
    this.connectionChangeHandlers = this.connectionChangeHandlers.filter(h => h !== handler);
  }

  // Notify all registered handlers of a message
  private notifyHandlers(data: any): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in WebSocket message handler:', error);
      }
    });
  }

  // Process queued messages
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  // Main connect method
  public connect(url: string, token: string | null): Promise<boolean> {
    // If already connected, return existing connection promise
    if (this.connectionPromise && this.isConnected()) {
      return this.connectionPromise;
    }

    // If we're already trying to connect, return the existing promise
    if (this.isConnectingFlag && this.connectionPromise) {
      return this.connectionPromise;
    }

    if (!token) {
      const error = new Error('No authentication token provided');
      console.error('WebSocket connection error:', error.message);
      return Promise.reject(error);
    }

    // Clean up any existing connection
    this.disconnect();

    this.connectionUrl = url;
    this.authToken = token;
    this.isConnectingFlag = true;

    // Create a new promise that will be resolved when the connection is established
    this.connectionPromise = new Promise<boolean>((resolve, reject) => {
      this.connectionResolve = resolve;
      this.connectionReject = reject;

      this.attemptConnection()
        .then(() => resolve(true))
        .catch(error => {
          console.error('WebSocket connection failed:', error);
          this.scheduleReconnect();
          reject(error);
        });
    });

    return this.connectionPromise;
  }

  private async attemptConnection(): Promise<void> {
    if (!this.connectionUrl || !this.authToken) {
      throw new Error('Connection URL or token not set');
    }

    return new Promise((resolve, reject) => {
      try {
        // Ensure URL doesn't have double slashes
        const cleanUrl = this.connectionUrl!.replace(/([^:]\/)\/+/g, '$1');
        const wsUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(this.authToken!)}`;

        console.log('Creating new WebSocket connection to:', wsUrl);

        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = (event: Event) => {
          console.log('WebSocket connection established');
          this.isConnectingFlag = false;
          this.reconnectAttempts = 0;
          this.setupPingPong();
          this.processMessageQueue();
          if (this.connectionResolve) {
            this.connectionResolve(true);
          }
        };

        this.socket.onmessage = (event: MessageEvent) => {
          try {
            let data;
            if (typeof event.data === 'string') {
              try {
                data = JSON.parse(event.data);
                console.log('[WebSocket] Received message:', data);
                
                // Handle ping-pong
                if (data.type === 'ping') {
                  console.log('[WebSocket] Received ping, sending pong');
                  this.sendMessage({ type: 'pong', timestamp: data.timestamp });
                  return;
                }

                if (data.type === 'pong') {
                  console.log('[WebSocket] Received pong');
                  this.lastPong = Date.now();
                  return;
                }
                
                // Notify all handlers of the incoming message
                this.notifyHandlers(data);
              } catch (e) {
                console.error('[WebSocket] Error parsing message:', e, 'Raw data:', event.data);
              }
            } else {
              console.warn('[WebSocket] Received non-string message:', event.data);
            }
          } catch (error) {
            console.error('[WebSocket] Error in message handler:', error);
          }
        };

        this.socket.onclose = (event: CloseEvent) => {
          console.log('WebSocket connection closed');
          this.cleanupConnection();
          if (this.connectionReject) {
            this.connectionReject(new Error('WebSocket connection closed'));
          }
          reject(new Error('WebSocket connection closed'));
        };

        this.socket.onerror = (event: Event) => {
          console.error('WebSocket error:', event);
          this.cleanupConnection();
          if (this.connectionReject) {
            this.connectionReject(event);
          }
          reject(event);
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        this.cleanupConnection();
        reject(error);
      }
    });
  }

  private setupPingPong(): void {
    // Clear any existing interval
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    this.lastPong = Date.now();
    console.log('[WebSocket] Setting up ping-pong with interval:', this.PING_INTERVAL, 'ms');

    // Send ping at regular intervals to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        const timeSinceLastPong = Date.now() - this.lastPong;
        
        // Check if we've received a pong recently
        if (timeSinceLastPong > this.PING_INTERVAL + this.PONG_TIMEOUT) {
          console.warn(`[WebSocket] No pong received in ${timeSinceLastPong}ms, reconnecting...`);
          this.cleanupConnection();
          this.scheduleReconnect();
          return;
        }

        try {
          const pingMsg = { type: 'ping', timestamp: Date.now() };
          console.log('[WebSocket] Sending ping:', pingMsg);
          this.sendMessage(pingMsg);
        } catch (error) {
          console.error('[WebSocket] Error sending ping:', error);
        }
      } else {
        console.log('[WebSocket] Not connected, skipping ping');
      }
    }, this.PING_INTERVAL);
  }

  private scheduleReconnect(): void {
    if (this.isExplicitlyClosed) {
      console.log('Not reconnecting: connection was explicitly closed');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached. Giving up.');
      this.messageQueue = []; // Clear message queue if we're giving up
      this.notifyConnectionStateChange('error');
      return;
    }

    const baseDelay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    // Add jitter to prevent thundering herd problem
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;

    console.log(`Reconnecting in ${Math.round(delay)}ms... (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
    this.notifyConnectionStateChange('reconnecting');

    // Clear any existing timeout to prevent multiple reconnection attempts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      if (this.isExplicitlyClosed) {
        console.log('Not reconnecting: connection was explicitly closed');
        return;
      }

      if (!this.isConnected() && !this.isConnectingFlag && this.connectionUrl && this.authToken) {
        console.log('Attempting to reconnect WebSocket...');
        this.connect(this.connectionUrl, this.authToken)
          .then(() => {
            console.log('WebSocket reconnected successfully');
            this.reconnectAttempts = 0; // Reset reconnect attempts on success
            this.processMessageQueue(); // Process any queued messages after reconnection
            this.notifyConnectionStateChange('connected');
          })
          .catch(err => {
            console.error('WebSocket reconnection failed:', err);
            this.reconnectAttempts++;
            this.scheduleReconnect(); // Schedule next reconnection attempt
          });
      }
    }, delay);
  }

  private cleanupConnection(): void {
    console.log('[WebSocket] Cleaning up connection...');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }

      this.socket = null;
    }

    this.isConnectingFlag = false;
  }

  /**
   * Manually trigger a reconnect
   */
  public reconnect(): void {
    if (this.isConnectingFlag) {
      console.log('Reconnect already in progress');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectAttempts = 0; // Reset reconnect attempts
    this.isExplicitlyClosed = false; // Allow reconnection

    if (this.connectionUrl && this.authToken) {
      console.log('Manual reconnect triggered');
      this.connect(this.connectionUrl, this.authToken)
        .catch(error => {
          console.error('Manual reconnection failed:', error);
          this.scheduleReconnect();
        });
    } else {
      console.error('Cannot reconnect: URL or token not set');
      this.notifyConnectionStateChange('error');
    }
  }
}

export const webSocketService = WebSocketServiceImpl.getInstance();