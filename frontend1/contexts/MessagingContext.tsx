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
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
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

  // Handle incoming WebSocket messages
  const handleIncomingMessage = useCallback((message: {
    type: string;
    conversation_id?: string;
    message_id?: string;
    content?: string;
    message?: string;
    sender_id?: string;
    sender_email?: string;
    sender_name?: string;
    sender?: {
      id: string;
      email: string;
      first_name: string;
      last_name: string;
    };
    timestamp?: string;
    is_read?: boolean;
  }) => {
    console.log('Processing incoming message:', message);
    
    if (message.type === 'chat.message' || message.type === 'chat.message.new') {
      const conversationId = message.conversation_id || currentConversation?.id;
      if (!conversationId) {
        console.warn('Received message without conversation ID');
        return;
      }
      
      // Skip if this is our own message that we've already processed
      if (user && message.sender_id === user.id && message.message_id?.startsWith('temp-')) {
        console.log('Skipping own message that we already processed');
        return;
      }

      const newMessage: Message = {
        id: message.message_id || `temp-${Date.now()}`,
        content: message.content || message.message || '',
        sender: message.sender || {
          id: message.sender_id || 'unknown',
          email: message.sender_email || '',
          first_name: message.sender_name?.split(' ')[0] || 'Unknown',
          last_name: message.sender_name?.split(' ').slice(1).join(' ') || 'User',
        },
        timestamp: message.timestamp || new Date().toISOString(),
        is_read: message.is_read || false,
      };

      console.log('Adding/updating message:', newMessage);
      
      // Check if this is an update to an existing message (replacing a temp message)
      setMessages(prev => {
        // If this is a new message with a server-generated ID, replace any temp message with the same content
        if (message.message_id && message.message_id.startsWith('temp-')) {
          const existingIndex = prev.findIndex(
            m => m.content === newMessage.content && 
                 m.sender.id === newMessage.sender.id &&
                 Math.abs(new Date(m.timestamp).getTime() - new Date(newMessage.timestamp).getTime()) < 10000 // Within 10 seconds
          );
          
          if (existingIndex >= 0) {
            console.log(`Replacing temp message at index ${existingIndex} with server message`, {
              oldId: prev[existingIndex].id,
              newId: newMessage.id
            });
            const updated = [...prev];
            updated[existingIndex] = newMessage;
            return updated;
          }
        }
        
        // Check if this message already exists (by ID)
        const exists = prev.some(m => m.id === newMessage.id);
        if (exists) {
          console.log('Message already exists, not adding again');
          return prev;
        }
        
        return [...prev, newMessage];
      });
      
      // Update last message in conversations
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === conversationId) {
            return { 
              ...conv,
              last_message: newMessage,
              updated_at: new Date().toISOString(),
              unread_count: conv.id === currentConversation?.id ? 0 : (conv.unread_count || 0) + 1
            };
          }
          return conv;
        });
        
        // If this is a new conversation, we might need to add it
        if (!prev.some(conv => conv.id === conversationId)) {
          console.log('Adding new conversation for message');
          // Create participants array with both sender and current user (if not the same)
          const participants: Array<{
            id: string;
            email: string;
            first_name: string;
            last_name: string;
            avatar: string | undefined;
          }> = [
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
              email: user.email || '',
              first_name: user.first_name || '',
              last_name: user.last_name || '',
              avatar: user.avatar
            });
          }
          
          updated.push({
            id: conversationId,
            participants,
            messages: [newMessage],
            last_message: newMessage,
            unread_count: 1,
            is_group: false,
            name: newMessage.sender.first_name + ' ' + newMessage.sender.last_name
          });
        }
        
        return updated;
      });
      
      // If this is our own message, mark it as read immediately
      if (user && newMessage.sender.id === user.id) {
        markConversationAsRead(conversationId).catch(console.error);
      }
    } else {
      console.log('Ignoring unknown message type:', message.type);
    }
  }, [currentConversation, user]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!user || !token) {
      console.log('WebSocket: Missing user or token, not connecting');
      return;
    }

    // Construct WebSocket URL directly to avoid double API prefix
    const wsUrl = `ws://localhost:8000/ws/chat/`;

    console.log('WebSocket: Connecting to', wsUrl);
    
    try {
      webSocketService.connect(wsUrl, token);
      console.log('WebSocket: Connection initiated');

      // Set up message handler
      const handleMessage = (message: any) => {
        console.log('WebSocket: Received message', message);
        handleIncomingMessage(message);
      };
      
      webSocketService.onMessage(handleMessage);

      // Log connection status changes
      const checkConnection = setInterval(() => {
        console.log('WebSocket status:', webSocketService.getConnectionState());
      }, 5000);

      // Clean up on unmount
      return () => {
        console.log('WebSocket: Cleaning up...');
        clearInterval(checkConnection);
        webSocketService.offMessage(handleMessage);
        webSocketService.disconnect();
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [user, token, handleIncomingMessage]);

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
          // Filter out any users that don't have required fields and the current user
          const isValid = !!user.id && !!user.email && user.id !== currentUserId;
          if (!isValid) {
            console.warn('Filtered out user (missing fields or current user):', user);
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
      content,
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
      // Send via WebSocket
      const wsMessage = {
        type: 'chat.message',
        conversation_id: conversationId,
        content,
        sender_id: user.id,  // Changed from sender object to sender_id
        sender: {  // Keep sender object for backward compatibility
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name
        },
        timestamp: message.timestamp
      };
      
      console.log('Sending WebSocket message:', wsMessage);
      
      // Check if WebSocket is connected before sending
      if (!webSocketService.isConnected()) {
        console.error('WebSocket is not connected. Current state:', webSocketService.getConnectionState());
        throw new Error('Failed to send message - WebSocket not connected');
      }
      
      webSocketService.sendMessage(wsMessage);
      console.log('WebSocket message sent successfully');
      
      // Also send via HTTP as a fallback
      try {
        const response = await fetch(getApiUrl('messaging/messages/'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            content,
            conversation: conversationId,
            sender: user.id
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
              conv.id === conversationId
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
                    updated_at: new Date().toISOString()
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
    setConversations,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};

export const useMessaging = (): MessagingContextType => {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};