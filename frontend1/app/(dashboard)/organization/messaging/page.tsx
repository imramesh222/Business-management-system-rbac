'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { Search, Send, Users, Plus, MessageSquare, X } from 'lucide-react';

// Define the user type to match your AuthContext
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;
  name?: string;
}

// Extend the participant type to include name and avatar
interface Participant {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar?: string;  // Make avatar optional
  name?: string;    // Add name for backward compatibility
}

// Extend the message type to include sender information
interface Message {
  id: string;
  content: string;
  sender: User;
  timestamp: string;
  is_read: boolean;
}

// Extend the conversation type
interface Conversation {
  id: string;
  participants: Participant[];
  last_message?: Message;
  unread_count: number;
  is_group: boolean;
  name?: string;
}

export default function MessagingPage() {
  const { user } = useAuth();
  const {
    conversations,
    currentConversation,
    messages,
    organizationUsers = [],
    loading,
    error,
    sendMessage,
    selectConversation,
    createConversation,
    fetchConversations,
    setConversations,
  } = useMessaging();
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Participant[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Debug log to check organization users
  useEffect(() => {
    console.log('Organization Users:', organizationUsers);
    console.log('Current User ID:', user?.id);
  }, [organizationUsers, user?.id]);

  // Memoize the list of available users (excluding current user)
  const availableUsers = useMemo(() => {
    const users = organizationUsers
      .filter(orgUser => orgUser.id !== user?.id)
      .map(orgUser => ({
        id: orgUser.id,
        email: orgUser.email,
        first_name: orgUser.first_name,
        last_name: orgUser.last_name,
        name: [orgUser.first_name, orgUser.last_name].filter(Boolean).join(' '),
        avatar: orgUser.avatar
      } as Participant));
    
    console.log('Available Users (filtered):', users);
    return users;
  }, [organizationUsers, user?.id]);
  
  // Focus the search input when the dialog opens
  useEffect(() => {
    if (showNewChatDialog) {
      // Small timeout to ensure the dialog is fully rendered
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Reset search when dialog is closed
      setSearchInput('');
      setSelectedUsers([]);
    }
  }, [showNewChatDialog]);
  
  
  // Update search results when search input or available users change
  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults(availableUsers);
      return;
    }
    
    const query = searchInput.toLowerCase().trim();
    const results = availableUsers.filter(
      (user) =>
        (user.name?.toLowerCase().includes(query)) ||
        (user.email?.toLowerCase().includes(query)) ||
        (`${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(query))
    );
    setSearchResults(results);
  }, [searchInput, availableUsers]);

  // Helper function to get user's display name
  const getDisplayName = (user?: { first_name?: string; last_name?: string; name?: string }) => {
    if (!user) return 'Unknown User';
    return user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';
  };

  // Helper function to get user's initials
  const getInitials = (user?: { first_name?: string; last_name?: string; name?: string }) => {
    if (!user) return 'U';
    if (user.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';
  };

  
  // Filter users based on search input
  const filteredUsers = useMemo(() => {
    if (!searchInput.trim()) return availableUsers;
    
    const query = searchInput.toLowerCase().trim();
    return availableUsers.filter((userItem: Participant) => {
      const displayName = [userItem.first_name, userItem.last_name].filter(Boolean).join(' ').toLowerCase();
      const email = userItem.email?.toLowerCase() || '';
      
      return (
        displayName.includes(query) ||
        email.includes(query) ||
        (userItem.first_name?.toLowerCase().includes(query)) ||
        (userItem.last_name?.toLowerCase().includes(query))
      );
    });
  }, [searchInput, availableUsers]);


  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentConversation) return;
    
    const success = await sendMessage(newMessage, currentConversation.id);
    if (success) {
      setNewMessage('');
    }
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0) return;
    
    try {
      setIsLoading(true);
      const conversation = await createConversation(
        selectedUsers.map(u => u.id),
        true,
        groupName || `Group with ${selectedUsers.length} members`
      );
      
      if (conversation) {
        setSelectedUsers([]);
        setGroupName('');
        setShowNewChatDialog(false);
        await selectConversation(conversation.id);
        // Refresh conversations list
        const updatedConversations = await fetchConversations?.();
        if (updatedConversations) {
          setConversations?.(updatedConversations);
        }
      }
    } catch (error) {
      console.error('Error creating group:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = async (userId: string) => {
    try {
      setIsLoading(true);
      const conversation = await createConversation([userId]);
      if (conversation) {
        await selectConversation(conversation.id);
        setShowNewChatDialog(false);
        // Refresh conversations list
        const updatedConversations = await fetchConversations?.();
        if (updatedConversations) {
          setConversations?.(updatedConversations);
        }
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to start chat');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUserSelection = (selectedUser: Participant) => {
    setSelectedUsers(prevUsers => 
      prevUsers.some(u => u.id === selectedUser.id)
        ? prevUsers.filter(u => u.id !== selectedUser.id)
        : [...prevUsers, selectedUser]
    );
  };

  if ((loading || isLoading) && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white rounded-lg shadow">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Messages</h2>
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={() => setShowNewChatDialog(true)}
              className="rounded-full"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <ScrollArea className="flex-1">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                currentConversation?.id === conversation.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => selectConversation(conversation.id)}
            >
              <div className="flex items-center">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={conversation.participants[0]?.avatar} 
                      alt={getDisplayName(conversation.participants[0])}
                    />
                    <AvatarFallback>
                      {conversation.name 
                        ? conversation.name.charAt(0).toUpperCase()
                        : getInitials(conversation.participants[0] || { first_name: '', last_name: '' })
                      }
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {conversation.name || 
                        conversation.participants
                          .filter((p: any) => p.id !== user?.id)
                          .map((p: any) => p.name)
                          .join(', ')}
                    </h3>
                    {conversation.last_message && (
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(conversation.last_message.timestamp))}
                      </span>
                    )}
                  </div>
                  {conversation.last_message && (
                    <p className="text-sm text-gray-500 truncate">
                      {conversation.last_message.sender.id === user?.id
                        ? `You: ${conversation.last_message.content}`
                        : `${getDisplayName(conversation.last_message.sender)}: ${conversation.last_message.content}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 flex items-center">
              <div className="flex items-center">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={currentConversation.participants[0]?.avatar} 
                    alt={currentConversation.name || getDisplayName(currentConversation.participants[0])}
                  />
                  <AvatarFallback>
                    {currentConversation.name 
                      ? currentConversation.name.charAt(0).toUpperCase()
                      : getInitials(currentConversation.participants[0] || { first_name: '', last_name: '' })
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    {currentConversation.name || 
                      currentConversation.participants
                        .filter((p: any) => p.id !== user?.id)
                        .map((p: any) => p.name)
                        .join(', ')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {currentConversation.participants.length} participant
                    {currentConversation.participants.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender.id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender.id === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className={`text-xs mt-1 ${
                      message.sender.id === user?.id ? 'text-primary-foreground/70' : 'text-gray-500'
                    }`}>
                      {message.timestamp}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Message input */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <Input
                  placeholder="Type a message..."
                  className="flex-1"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
              <MessageSquare className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
            <p className="text-gray-500 mb-6">
              Select a conversation from the sidebar or start a new one
            </p>
            <Button onClick={() => setShowNewChatDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> New conversation
            </Button>
          </div>
        )}
      </div>

      {/* New chat dialog */}
      {showNewChatDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">New Conversation</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowNewChatDialog(false);
                  setSelectedUsers([]);
                  setGroupName('');
                  setIsGroupChat(false);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="group-chat" 
                  checked={isGroupChat}
                  onCheckedChange={(checked: boolean) => setIsGroupChat(checked)}
                />
                <label htmlFor="group-chat" className="text-sm font-medium">
                  Create a group chat
                </label>
              </div>
              
              {isGroupChat && (
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group name</Label>
                  <Input
                    id="group-name"
                    placeholder="Enter group name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Select participants</Label>
                <div className="relative mb-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search users by name or email..."
                      className="pl-10 pr-8 w-full"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setSearchInput('');
                          searchInputRef.current?.blur();
                        }
                      }}
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput('');
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                      <span className="ml-2 text-sm text-gray-500">Loading users...</span>
                    </div>
                  ) : error ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-red-500">Error loading users. Please try again.</p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => window.location.reload()}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">
                      No users found in your organization.
                    </div>
                  ) : (
                    <>
                      {filteredUsers.map((userItem: Participant) => (
                        <div 
                          key={userItem.id} 
                          className={`flex items-center space-x-2 p-2 rounded cursor-pointer ${
                            selectedUsers.some(u => u.id === userItem.id) ? 'bg-gray-100' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleUserSelection(userItem)}
                        >
                          <Checkbox 
                            checked={selectedUsers.some(u => u.id === userItem.id)}
                            onCheckedChange={() => toggleUserSelection(userItem)}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                          />
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={userItem.avatar} alt={userItem.name} />
                              <AvatarFallback>{getInitials(userItem)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{userItem.name}</p>
                              <p className="text-xs text-gray-500">{userItem.email}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {searchInput && searchResults.length === 0 && (
                        <div className="text-center py-4 text-sm text-gray-500">
                          No users found matching "{searchInput}"
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowNewChatDialog(false);
                    setSelectedUsers([]);
                    setGroupName('');
                    setIsGroupChat(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={isGroupChat ? handleCreateGroup : () => selectedUsers[0] && handleStartChat(selectedUsers[0].id)}
                  disabled={selectedUsers.length === 0 || (isGroupChat && !groupName.trim())}
                >
                  {isGroupChat ? 'Create group' : 'Start chat'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
