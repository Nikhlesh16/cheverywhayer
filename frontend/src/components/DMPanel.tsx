'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';
import { MessageCircle, Send, X, User } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
}

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatar?: string;
  };
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: string;
}

export default function DMPanel() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadConversations();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await api.get('/messages/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/messages/conversations/${conversationId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    try {
      const response = await api.post(`/messages/conversations/${selectedConversation.id}/messages`, {
        receiverId: selectedConversation.otherUser.id,
        content: messageInput.trim(),
      });

      setMessages([...messages, response.data]);
      setMessageInput('');
      loadConversations(); // Refresh conversation list
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-50"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 rounded-t-lg flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <MessageCircle size={20} />
          Messages
        </h2>
        <button onClick={() => setIsOpen(false)} className="hover:bg-blue-600 rounded p-1">
          <X size={20} />
        </button>
      </div>

      {!selectedConversation ? (
        /* Conversations List */
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle size={48} className="mb-2" />
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className="w-full p-4 border-b hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    {conv.otherUser.avatar ? (
                      <img src={conv.otherUser.avatar} alt="" className="w-12 h-12 rounded-full" />
                    ) : (
                      <User size={24} className="text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold truncate">{conv.otherUser.name || 'Unknown User'}</p>
                      {conv.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-sm text-gray-500 truncate">{conv.lastMessage.content}</p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        /* Messages View */
        <>
          {/* Conversation Header */}
          <div className="p-3 border-b flex items-center gap-3">
            <button
              onClick={() => setSelectedConversation(null)}
              className="hover:bg-gray-100 rounded p-1"
            >
              <X size={20} />
            </button>
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              {selectedConversation.otherUser.avatar ? (
                <img src={selectedConversation.otherUser.avatar} alt="" className="w-10 h-10 rounded-full" />
              ) : (
                <User size={20} className="text-gray-500" />
              )}
            </div>
            <p className="font-semibold">{selectedConversation.otherUser.name || 'Unknown User'}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  const isSent = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isSent ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isSent ? 'text-blue-100' : 'text-gray-500'}`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim()}
                className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
