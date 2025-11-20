import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { webSocketService } from '@/services/websocket';

interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  timestamp: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  participants: Array<{
    avatar: string | undefined;
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  }>;
  messages?: Message[];
  last_message?: Message;
  unread_count: number;
  is_group: boolean;
  name?: string;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name?: string;
  avatar?: string;
}

interface MessagingContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  organizationUsers: User[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string, conversationId: string) => Promise<boolean>;
  selectConversation: (conversationId: string) => Promise<void>;
  createConversation: (participantIds: string[], isGroup?: boolean, name?: string) => Promise<Conversation | null>;
  markConversationAsRead: (conversationId: string) => void;
  fetchConversations: () => Promise<Conversation[]>;
  fetchMessages: (conversationId: string) => Promise<void>;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setCurrentConversation: React.Dispatch<React.SetStateAction<Conversation | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [organizationUsers, setOrganizationUsers] = useState<User[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string>('');

  // Initialize WebSocket connection
  useEffect(() => {
    if (!token || !user?.id) return;

    // Set up WebSocket URL
    const wsBaseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
    const wsUrl = `${wsBaseUrl}${wsBaseUrl.endsWith('/') ? '' : '/'}ws/chat/`;
    
    console.log('[WebSocket] Connecting to:', wsUrl);
    webSocketService.connect(wsUrl, token)
      .then(() => {
        console.log('[WebSocket] Connected successfully');
      })
      .catch(error => {
        console.error('[WebSocket] Connection error:', error);
      });

    // Clean up on unmount
    return () => {
      console.log('[WebSocket] Cleaning up WebSocket connection');
      webSocketService.disconnect();
    };
  }, [token, user?.id]);

  // Handle incoming WebSocket messages
  const handleIncomingMessage = useCallback((message: {
    type: string;
    conversation_id?: string | number;
    message_id?: string;
    content?: string;
    message?: string;
    sender_id?: string | number;
    sender_email?: string;
    sender_name?: string;
    sender?: {
      id: string | number;
      email: string;
      first_name: string;
      last_name: string;
      avatar?: string;
    };
    timestamp?: string;
    is_read?: boolean;
    temp_id?: string;
  }) => {
    console.log('[WebSocket] Processing incoming message:', message);

    if (message.type === 'chat.message' || message.type === 'chat.message.new' || message.type === 'message') {
    const conversationId = String(message.conversation_id || currentConversation?.id || '');
    if (!conversationId) {
      console.warn('Received message without conversation ID', message);
      return;
    }

    // Skip if this is our own message that we've already processed
    if (user && message.sender_id === user.id && message.message_id?.startsWith('temp-')) {
      console.log('Skipping own message that we already processed');
      return;
    }

    // Ensure sender ID is a string
    const senderId = message.sender_id ? String(message.sender_id) : (message.sender?.id ? String(message.sender.id) : 'unknown');

    const newMessage: Message = {
      id: message.message_id || `temp-${Date.now()}`,
      content: message.content || message.message || '',
      sender: message.sender ? {
        ...message.sender,
        id: String(message.sender.id)
      } : {
        id: senderId,
        email: message.sender_email || '',
        first_name: message.sender_name?.split(' ')[0] || 'Unknown',
        last_name: message.sender_name?.split(' ').slice(1).join(' ') || 'User',
      },
      timestamp: message.timestamp || new Date().toISOString(),
      is_read: message.is_read || false,
    };

    console.log('Created message object:', newMessage);

    // Update messages state
    setMessages(prev => {
      // Check if message already exists (by ID or content)
      const messageExists = prev.some(m => 
        m.id === newMessage.id || 
        (m.content === newMessage.content && 
         m.sender.id === newMessage.sender.id &&
         Math.abs(new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 3000)
      );

      if (messageExists) {
        console.log('Message already exists, updating...');
        return prev.map(m => 
          (m.id === newMessage.id || 
           (m.content === newMessage.content && 
            m.sender.id === newMessage.sender.id &&
            Math.abs(new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 3000))
            ? { ...m, ...newMessage, id: newMessage.id } // Preserve server ID
            : m
        );
      }

      // Add new message and sort by timestamp
      const updated = [...prev, newMessage].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      console.log('Added new message to state. Total messages:', updated.length);
      return updated;
    });

    // Update conversations list to show the new message in the sidebar
    setConversations(prev => {
      return prev.map(conv => {
        if (conv.id === conversationId) {
          console.log('Updating conversation with new message:', newMessage);
          return {
            ...conv,
            last_message: newMessage,
            updated_at: new Date().toISOString(),
            unread_count: newMessage.sender.id === user?.id ? 0 : (conv.unread_count || 0) + 1
          };
        }
        return conv;
      });
    });

    // If this is a new conversation, add it to the list
    if (!conversations.some(conv => conv.id === conversationId)) {
      console.log('Adding new conversation for message');
      setConversations(prev => {
        const participants = [
          {
            id: String(newMessage.sender.id),
            email: newMessage.sender.email,
            first_name: newMessage.sender.first_name,
            last_name: newMessage.sender.last_name,
            avatar: (newMessage.sender as any).avatar
          }
        ];

        // Add current user to participants if they're not the sender
        if (user && String(user.id) !== String(newMessage.sender.id)) {
          participants.push({
            id: String(user.id),
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name || '',
            avatar: user.avatar
          });
        }

        return [{
          id: conversationId,
          participants,
          last_message: newMessage,
          unread_count: 0,
          updated_at: new Date().toISOString(),
          is_group: false,
          name: newMessage.sender.first_name + ' ' + newMessage.sender.last_name
        }, ...prev];
      });
    }
  }
}, [user, currentConversation, conversations]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (typeof window === 'undefined') return; // Skip during SSR

    if (!user || !token) {
      console.log('WebSocket: Missing user or token, not connecting');
      return;
    }

    // Construct WebSocket URL to point to the backend server on port 8000
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname + ':8000'; // Always use port 8000 for backend
    const newWsUrl = `${wsProtocol}//${wsHost}/ws/chat/`;

    console.log('WebSocket: Initializing with URL:', newWsUrl);
    setWsUrl(newWsUrl);

    // Log connection status periodically
    const logConnectionStatus = () => {
      console.log('WebSocket status:', {
        state: webSocketService.getConnectionState(),
        readyState: webSocketService.getReadyState(),
        isConnected: webSocketService.isConnected(),
        hasToken: !!token,
        url: newWsUrl,
        currentUser: user ? { id: user.id, email: user.email } : 'No user'
      });
    };

    const statusInterval = setInterval(logConnectionStatus, 5000);
    logConnectionStatus();

    // Set up message handler
    const handleMessage = (message: any) => {
      console.log('WebSocket: Received message', JSON.stringify(message, null, 2));
      try {
        handleIncomingMessage(message);
      } catch (error) {
        console.error('Error handling incoming message:', error);
      }
    };

    // Connect to WebSocket
    const connectWebSocket = async () => {
      try {
        console.log('WebSocket: Attempting to connect...');
        await webSocketService.connect(newWsUrl, token);
        console.log('WebSocket: Connection successful');
        webSocketService.onMessage(handleMessage);

        // Send a test message to verify the connection
        if (webSocketService.isConnected()) {
          console.log('WebSocket: Sending test message');
          webSocketService.sendMessage({
            type: 'ping',
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('WebSocket connection failed:', error);
        // Try to reconnect after a delay
        setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    // Clean up on unmount
    return () => {
      console.log('WebSocket: Cleaning up...');
      clearInterval(statusInterval);
      webSocketService.offMessage(handleMessage);
      webSocketService.disconnect();
    };
  }, [token, handleIncomingMessage, user]);

  // Fetch organization users
  const fetchOrganizationUsers = useCallback(async () => {
    if (!token) {
      console.error('No authentication token available');
      return [];
    }

    try {
      console.log('Fetching current user data...');
      // First, get the current user's organization ID from the JWT token
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const organizationId = tokenPayload.organization_id;

      console.log('JWT Token payload:', tokenPayload);

      if (!organizationId) {
        console.warn('No organization ID found in JWT token');
        setOrganizationUsers([]);
        return [];
      }

      console.log('Using organization ID from JWT:', organizationId);

      // Then fetch the organization members
      console.log('Fetching organization members...');
      const membersUrl = getApiUrl(`org/organizations/${organizationId}/members/`);
      console.log('Members URL:', membersUrl);

      const response = await fetch(membersUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch organization members:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: membersUrl
        });
        setOrganizationUsers([]);
        return [];
      }

      const data = await response.json();
      console.log('Raw API response:', data);

      // Handle different response structures
      let users: any[] = [];
      if (Array.isArray(data)) {
        users = data;
      } else if (data.results && Array.isArray(data.results)) {
        users = data.results;
      } else if (data.data && Array.isArray(data.data)) {
        users = data.data;
      } else if (data.members && Array.isArray(data.members)) {
        users = data.members;
      }

      console.log('Extracted users:', users);

      if (users.length === 0) {
        console.warn('No users found in the organization');
        setOrganizationUsers([]);
        return [];
      }

      // Transform the users to match our User interface
      const currentUserId = tokenPayload.user_id;
      const formattedUsers = users
        .map(member => {
          // Extract user data from member object
          const userData = member.user || member;
          const firstName = userData.first_name || '';
          const lastName = userData.last_name || '';
          const email = userData.email || '';
          const userId = String(userData.id || ''); // Use the user's ID, not the member ID

          return {
            id: userId,  // This is the actual User ID
            email: email,
            first_name: firstName,
            last_name: lastName,
            avatar: userData.avatar,
            name: [firstName, lastName].filter(Boolean).join(' ') || userData.name || email.split('@')[0],
            // Keep member_id for reference if needed, but don't use it for conversations
            member_id: member.id
          };
        })
        .filter(user => {
          // Make filtering more lenient - only filter out the current user
          // and users with no ID or email
          const isValid = !!user.id && !!user.email && user.id !== currentUserId;

          if (!isValid) {
            console.warn('Filtering out user due to missing fields or current user:', {
              id: user.id,
              email: user.email,
              isCurrentUser: user.id === currentUserId,
              hasId: !!user.id,
              hasEmail: !!user.email,
              userObject: user
            });
          }
          return isValid;
        });

      console.log('Formatted organization users:', formattedUsers);
      setOrganizationUsers(formattedUsers);
      return formattedUsers;
    } catch (error) {
      console.error('Error fetching organization users:', error);
      setError(error instanceof Error ? error.message : 'Failed to load organization users');
      return [];
    }
  }, [token]);

  // Fetch organization users on mount and when token changes
  useEffect(() => {
    console.log('Running fetchOrganizationUsers effect');
    const fetchData = async () => {
      try {
        await fetchOrganizationUsers();
      } catch (error) {
        console.error('Error in fetchOrganizationUsers effect:', error);
      }
    };

    fetchData();

    // Set up a timer to refetch after 5 seconds if no users are loaded
    const timer = setTimeout(() => {
      if (organizationUsers.length === 0) {
        console.log('No users loaded after initial fetch, retrying...');
        fetchData();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [fetchOrganizationUsers, organizationUsers.length]);

  const fetchConversations = useCallback(async (): Promise<Conversation[]> => {
    if (!token) return [];

    try {
      setLoading(true);

      // Fetch conversations from the API
      const response = await fetch(getApiUrl('messaging/conversations/'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch conversations:', errorData);
        throw new Error(errorData.detail || 'Failed to fetch conversations');
      }

      const data = await response.json();
      const conversations = Array.isArray(data) ? data : (data.results || []);

      // Format the conversations to match our interface
      const formattedConversations = conversations.map((conv: any) => ({
        id: String(conv.id),
        participants: conv.participants?.map((p: any) => ({
          id: String(p.id),
          email: p.email || '',
          first_name: p.first_name || '',
          last_name: p.last_name || '',
          avatar: p.avatar,
        })) || [],
        messages: conv.messages || [],
        last_message: conv.last_message,
        unread_count: conv.unread_count || 0,
        is_group: conv.is_group || false,
        name: conv.name || null,
      }));

      setConversations(formattedConversations);
      return formattedConversations;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch conversations');
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Mark all messages in a conversation as read
  const markConversationAsRead = useCallback(async (conversationId: string): Promise<void> => {
    if (!token) return;

    try {
      console.log(`Marking conversation ${conversationId} as read`);
      const response = await fetch(
        getApiUrl(`messaging/conversations/${conversationId}/mark_as_read/`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error marking conversation as read:', response.status, errorData);
        throw new Error(errorData.detail || 'Failed to mark conversation as read');
      }

      // Update unread count
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [token]);

  // Fetch messages for the current conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!token) return;

    setLoading(true);
    try {
      // Use the messages endpoint with conversation_id as a query parameter
      const response = await fetch(
        getApiUrl(`messaging/messages/?conversation_id=${conversationId}`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch messages');
      }

      const data = await response.json();

      // Ensure messages are in the correct format
      const formattedMessages = Array.isArray(data) ? data : (data.results || data.messages || []);

      setMessages(formattedMessages);

      // Update the conversation with the fetched messages
      setConversations(prevConversations =>
        prevConversations.map(conv =>
          conv.id === conversationId
            ? { ...conv, messages: formattedMessages }
            : conv
        )
      );

      // Mark conversation as read when selected
      markConversationAsRead(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [token, markConversationAsRead]);

  // Send a new message
  const handleSendMessage = useCallback(async (content: string, conversationId: string): Promise<boolean> => {
    console.log('handleSendMessage called with:', { content, conversationId, hasToken: !!token, hasUser: !!user });
    if (!token || !conversationId || !currentConversation || !user) {
      console.error('Cannot send message: Missing required data', {
        hasToken: !!token,
        conversationId,
        hasCurrentConversation: !!currentConversation,
        hasUser: !!user
      });
      return false;
    }

    console.log('Sending message to conversation:', conversationId);

    const message = {
      conversation_id: conversationId,
      content: content, // Ensure we're using the content parameter
      timestamp: new Date().toISOString(),
    };

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      content,
      sender: {
        id: String(user.id),
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      },
      timestamp: message.timestamp,
      is_read: false,
    };

    console.log('Adding optimistic message:', tempMessage);
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Convert conversationId to number for WebSocket message
      const numericConversationId = Number(conversationId);
      if (isNaN(numericConversationId)) {
        throw new Error('Invalid conversation ID for WebSocket');
      }

      // Send via WebSocket
      const wsMessage = {
        type: 'chat.message',
        conversation_id: numericConversationId,
        content: content,
        sender_id: user.id,
        sender: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar: user.avatar
        },
        timestamp: message.timestamp,
        temp_id: tempId
      };

      console.log('Sending WebSocket message:', wsMessage);

      // Check if WebSocket is connected before sending
      const connectionState = webSocketService.getConnectionState();
      if (!webSocketService.isConnected()) {
        console.warn('WebSocket is not connected. Current state:', connectionState);
        console.log('Attempting to reconnect WebSocket...');
        try {
          if (!wsUrl) {
            throw new Error('WebSocket URL not initialized');
          }
          await webSocketService.connect(wsUrl, token);
          console.log('WebSocket reconnected successfully');
        } catch (err) {
          console.error('Failed to reconnect WebSocket:', err);
          // Continue with HTTP fallback even if WebSocket fails
          console.warn('Proceeding with HTTP fallback for message sending');
        }
      }

      try {
        webSocketService.sendMessage(wsMessage);
        console.log('WebSocket message sent successfully');
      } catch (err) {
        console.error('Error sending WebSocket message:', err);
        throw new Error('Failed to send message - ' + (err instanceof Error ? err.message : 'Unknown error'));
      }

      // Also send via HTTP as a fallback
      try {
        // Ensure conversationId is a number
        const numericConversationId = Number(conversationId);
        if (isNaN(numericConversationId)) {
          throw new Error('Invalid conversation ID');
        }

        const response = await fetch(getApiUrl('messaging/messages/'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            content,
            conversation: numericConversationId
            // Note: Removed sender as it's set by the backend
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to send message via HTTP:', errorData);
          throw new Error(errorData.detail || 'Failed to send message');
        } else {
          console.log('Message sent successfully via HTTP');

          // Update the conversation's last_message in the conversations list
          const newMessage = await response.json();

          setConversations(prevConversations =>
            prevConversations.map(conv =>
              String(conv.id) === String(conversationId)
                ? {
                  ...conv,
                  last_message: {
                    id: String(newMessage.id), // Ensure ID is string
                    content: newMessage.content,
                    sender: {
                      id: String(user.id), // Convert user.id to string
                      email: user.email,
                      first_name: user.first_name,
                      last_name: user.last_name || ''
                    },
                    timestamp: newMessage.timestamp || new Date().toISOString(),
                    is_read: true
                  },
                  unread_count: 0,
                  updated_at: new Date().toISOString(),
                  // Ensure messages array is updated
                  messages: [
                    ...(conv.messages || []),
                    {
                      id: String(newMessage.id),
                      content: newMessage.content,
                      sender: {
                        id: String(user.id),
                        email: user.email,
                        first_name: user.first_name,
                        last_name: user.last_name || ''
                      },
                      timestamp: newMessage.timestamp || new Date().toISOString(),
                      is_read: true
                    }
                  ]
                }
                : conv
            )
          );
        }
      } catch (httpError) {
        console.error('Error sending message via HTTP:', httpError);
      }
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      // Revert optimistic update on error
      setMessages(prev => {
        const updated = prev.filter(msg => msg.id !== tempId);
        console.log('Reverted optimistic update, messages now:', updated);
        return updated;
      });
      setError('Failed to send message: ' + (err instanceof Error ? err.message : 'Unknown error'));
      return false;
    }
  }, [token, currentConversation, user]);

  // Select a conversation
  const handleSelectConversation = useCallback(async (conversationId: string): Promise<void> => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);

      // First set the current conversation with existing messages (for immediate UI update)
      setMessages(conversation.messages || []);

      try {
        // Then fetch the latest messages from the server
        await fetchMessages(conversationId);
      } catch (error) {
        console.error('Error fetching messages:', error);
        // Keep the existing messages if there's an error
      }

      // Mark the conversation as read
      await markConversationAsRead(conversationId);
    }
  }, [conversations, markConversationAsRead, fetchMessages]);

  // Create a new conversation
  const handleCreateConversation = useCallback(async (participantIds: string[], isGroup: boolean = false, name: string = '') => {
    if (!token) {
      console.error('No authentication token available');
      throw new Error('Authentication required');
    }

    try {
      // Ensure participantIds is an array of strings
      const validParticipantIds = Array.isArray(participantIds)
        ? participantIds.map(id => String(id).trim()).filter(id => id)
        : [];

      if (validParticipantIds.length === 0 && !isGroup) {
        throw new Error('At least one participant is required for a direct conversation');
      }

      // Prepare the payload with participant IDs and conversation type
      const payload = {
        participant_ids: validParticipantIds,
        is_group: isGroup,
        ...(isGroup && name ? { name } : {})
      };

      console.log('Creating conversation with payload:', payload);

      const response = await fetch(getApiUrl('messaging/conversations/'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errorMessage = `Failed to create conversation: ${response.status} ${response.statusText}`;

        try {
          const errorData = await response.json();
          console.error('Failed to create conversation:', {
            status: response.status,
            statusText: response.statusText,
            errorData,
            payload
          });

          // If the backend provides specific validation errors, use them
          if (errorData.participant_ids) {
            errorMessage = `Validation error: ${Array.isArray(errorData.participant_ids) ? errorData.participant_ids.join(', ') : errorData.participant_ids}`;
          } else {
            errorMessage = errorData.detail || errorData.message || errorMessage;
          }
        } catch (e) {
          console.error('Failed to parse error response:', e);
        }

        throw new Error(errorMessage);
      }

      const newConversation = await response.json();
      console.log('Successfully created conversation:', newConversation);

      // Update the conversations list
      setConversations(prev => [newConversation, ...prev]);
      return newConversation;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create conversation');
      setError(error.message);
      console.error('Error creating conversation:', error);
      throw error; // Re-throw to allow handling in the component
    }
  }, [token]);

  // Initial data fetch
  useEffect(() => {
    fetchConversations();
    fetchOrganizationUsers();
  }, [fetchConversations, fetchOrganizationUsers]);

  const value = {
    conversations,
    currentConversation,
    messages,
    organizationUsers,
    loading,
    error,
    sendMessage: handleSendMessage,
    selectConversation: handleSelectConversation,
    createConversation: handleCreateConversation,
    markConversationAsRead,
    fetchConversations,
    fetchMessages,
    setConversations,
    setMessages,
    setCurrentConversation,
    setError,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = (): MessagingContextType & { fetchMessages: any } => {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};