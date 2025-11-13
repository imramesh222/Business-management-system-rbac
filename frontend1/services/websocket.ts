type MessageHandler = (data: any) => void;

interface WebSocketService {
  connect(url: string, token: string | null): Promise<boolean>;
  disconnect(): void;
  sendMessage(message: any): void;
  onMessage(handler: MessageHandler): void;
  offMessage(handler: MessageHandler): void;
  isConnected(): boolean;
  getConnectionState(): string;
  getReadyState(): number | null;
  reconnect(): void;
}

class WebSocketServiceImpl implements WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnectingFlag = false;
  private connectionUrl: string | null = null;
  private authToken: string | null = null;
  private connectionPromise: Promise<boolean> | null = null;
  private connectionResolve: ((value: boolean | PromiseLike<boolean>) => void) | null = null;
  private connectionReject: ((reason?: any) => void) | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private messageQueue: any[] = [];
  
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

  // Get current connection state
  public getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }

  // Get raw ready state
  public getReadyState(): number | null {
    return this.socket?.readyState ?? null;
  }

  // Disconnect from WebSocket
  public disconnect(): void {
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
    this.connectionPromise = null;
    this.connectionResolve = null;
    this.connectionReject = null;
  }

  // Send a message through the WebSocket
  public sendMessage(message: any): void {
    if (!this.isConnected()) {
      console.warn('WebSocket not connected, queueing message');
      this.messageQueue.push(message);
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
          resolve();
        };

        this.socket.onmessage = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle ping-pong
            if (data.type === 'ping') {
              this.sendMessage({ type: 'pong' });
              return;
            }
            
            this.notifyHandlers(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.socket.onclose = () => {
          console.log('WebSocket connection closed');
          this.cleanupConnection();
          this.scheduleReconnect();
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
    
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({ type: 'ping' });
      }
    }, 30000);
  }

  private scheduleReconnect(): void {
    // Only attempt reconnect if we haven't exceeded max attempts
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff with max 30s
      console.log(`Scheduling reconnection attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      this.reconnectAttempts++;
      
      setTimeout(() => {
        if (!this.isConnected() && !this.isConnectingFlag && this.connectionUrl && this.authToken) {
          this.connect(this.connectionUrl, this.authToken).catch(console.error);
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      if (this.connectionReject) {
        this.connectionReject(new Error('Max reconnection attempts reached'));
      }
      this.cleanupConnection();
    }
  }

  private cleanupConnection(): void {
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
    if (this.socket) {
      this.disconnect();
    }
    if (this.connectionUrl && this.authToken) {
      this.connect(this.connectionUrl, this.authToken);
    }
  }
}

export const webSocketService = WebSocketServiceImpl.getInstance();