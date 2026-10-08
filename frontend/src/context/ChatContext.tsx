import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.js';
import { useSocket } from './SocketContext.js';
import { api } from '../services/api.js';
import { sounds } from '../services/audio.js';
import { Conversation, Message, MessageType } from '../types/index.js';

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  hasMoreMessages: boolean;
  replyingTo: Message | null;
  editingMessage: Message | null;
  typingUsers: { id: string; username: string; display_name: string }[];
  selectConversation: (id: string | null) => void;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (payload: {
    messageType: MessageType;
    content?: string | null;
    mediaUrl?: string | null;
    stickerId?: string | null;
  }) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  startReply: (message: Message) => void;
  cancelReply: () => void;
  startEdit: (message: Message) => void;
  cancelEdit: () => void;
  emitTyping: (isTyping: boolean) => void;
  refreshConversations: () => Promise<void>;
  openDirectChatWithUser: (userId: string) => Promise<string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { socket, showToast } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ id: string; username: string; display_name: string }[]>([]);

  const typingTimeoutRef = useRef<any>(null);
  const activeConvIdRef = useRef<string | null>(null);
  activeConvIdRef.current = activeConversationId;

  // Fetch all conversations
  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingConversations(true);
      const res = await api.getConversations();
      setConversations(res.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshConversations();
    } else {
      setConversations([]);
      setMessages([]);
      setActiveConversationId(null);
    }
  }, [user, refreshConversations]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setTypingUsers([]);
      return;
    }

    let isMounted = true;
    const fetchMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const res = await api.getMessages(activeConversationId);
        if (isMounted) {
          setMessages(res.messages);
          setHasMoreMessages(res.hasMore);

          // Mark conversation as read locally in conversation list
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConversationId ? { ...c, unread_count: 0 } : c))
          );
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    };

    fetchMessages();

    // Notify socket we joined
    if (socket) {
      socket.emit('join_conversation', { conversationId: activeConversationId });
      socket.emit('messages_read', { conversationId: activeConversationId });
    }

    return () => {
      isMounted = false;
      if (socket) {
        socket.emit('leave_conversation', { conversationId: activeConversationId });
      }
    };
  }, [activeConversationId, socket]);

  // Socket event listeners for real-time messages & updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      // If message belongs to active conversation
      if (msg.conversation_id === activeConvIdRef.current) {
        setMessages((prev) => {
          // Prevent duplicates if already added optimistically
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        // If sent by other user, play sound & mark read
        if (msg.sender_id !== user?.id) {
          sounds.playReceived();
          socket.emit('messages_read', { conversationId: msg.conversation_id });
        }
      } else {
        // Message in another conversation
        if (msg.sender_id !== user?.id) {
          sounds.playNotification();
          showToast(`💬 New message from ${msg.sender?.display_name || 'Friend'}`, 'info');
        }
      }

      // Update conversation in list
      setConversations((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === msg.conversation_id);
        const isCurrentActive = msg.conversation_id === activeConvIdRef.current;

        if (existingIdx !== -1) {
          const updatedConv = {
            ...prev[existingIdx],
            last_message: {
              id: msg.id,
              content: msg.content,
              message_type: msg.message_type,
              sender_id: msg.sender_id,
              created_at: msg.created_at,
              is_deleted: false,
            },
            updated_at: msg.created_at,
            unread_count: isCurrentActive ? 0 : prev[existingIdx].unread_count + (msg.sender_id !== user?.id ? 1 : 0),
          };

          const remaining = prev.filter((_, idx) => idx !== existingIdx);
          return [updatedConv, ...remaining];
        } else {
          // If conversation not in list yet, refresh full list
          refreshConversations();
          return prev;
        }
      });
    };

    const handleMessageEdited = (data: { messageId: string; conversationId: string; content: string; updatedAt: string }) => {
      if (data.conversationId === activeConvIdRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, content: data.content, updated_at: data.updatedAt } : m))
        );
      }
    };

    const handleMessageDeleted = (data: { messageId: string; conversationId: string }) => {
      if (data.conversationId === activeConvIdRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.messageId
              ? { ...m, content: 'This message was deleted', media_url: null, sticker_id: null, is_deleted: true }
              : m
          )
        );
      }
    };

    const handleMessagesRead = (data: { conversationId: string; readerId: string }) => {
      if (data.conversationId === activeConvIdRef.current && data.readerId !== user?.id) {
        setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      }
    };

    const handleUserTyping = (data: { conversationId: string; user: { id: string; username: string; display_name: string } }) => {
      if (data.conversationId === activeConvIdRef.current && data.user.id !== user?.id) {
        setTypingUsers((prev) => {
          if (prev.some((u) => u.id === data.user.id)) return prev;
          return [...prev, data.user];
        });
      }
    };

    const handleUserStopTyping = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConvIdRef.current) {
        setTypingUsers((prev) => prev.filter((u) => u.id !== data.userId));
      }
    };

    const handleConversationUpdated = () => {
      refreshConversations();
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('messages_read_update', handleMessagesRead);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('conversation_updated', handleConversationUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('messages_read_update', handleMessagesRead);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('conversation_updated', handleConversationUpdated);
    };
  }, [socket, user?.id, showToast, refreshConversations]);

  const loadMoreMessages = async () => {
    if (!activeConversationId || isLoadingMessages || !hasMoreMessages || messages.length === 0) return;
    try {
      const oldestMessage = messages[0];
      const res = await api.getMessages(activeConversationId, oldestMessage.created_at);
      setMessages((prev) => [...res.messages, ...prev]);
      setHasMoreMessages(res.hasMore);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    }
  };

  const sendMessage = async (payload: {
    messageType: MessageType;
    content?: string | null;
    mediaUrl?: string | null;
    stickerId?: string | null;
  }) => {
    if (!activeConversationId || !user) return;

    sounds.playSent();
    emitTyping(false);

    try {
      await api.sendMessage({
        conversationId: activeConversationId,
        messageType: payload.messageType,
        content: payload.content,
        mediaUrl: payload.mediaUrl,
        stickerId: payload.stickerId,
        replyToMessageId: replyingTo ? replyingTo.id : null,
      });

      setReplyingTo(null);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      showToast(err.message || 'Failed to send message', 'warning');
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      await api.editMessage(messageId, newContent);
      setEditingMessage(null);
    } catch (err: any) {
      console.error('Failed to edit message:', err);
      showToast(err.message || 'Failed to edit message', 'warning');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await api.deleteMessage(messageId);
    } catch (err: any) {
      console.error('Failed to delete message:', err);
      showToast(err.message || 'Failed to delete message', 'warning');
    }
  };

  const emitTyping = (isTyping: boolean) => {
    if (!socket || !activeConversationId) return;

    if (isTyping) {
      socket.emit('typing_start', { conversationId: activeConversationId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { conversationId: activeConversationId });
      }, 2500);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('typing_stop', { conversationId: activeConversationId });
    }
  };

  const openDirectChatWithUser = async (targetUserId: string): Promise<string> => {
    const res = await api.getOrCreateConversation(targetUserId);
    await refreshConversations();
    setActiveConversationId(res.conversationId);
    return res.conversationId;
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeConversation,
        messages,
        isLoadingConversations,
        isLoadingMessages,
        hasMoreMessages,
        replyingTo,
        editingMessage,
        typingUsers,
        selectConversation: setActiveConversationId,
        loadMoreMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        startReply: (msg) => {
          setEditingMessage(null);
          setReplyingTo(msg);
        },
        cancelReply: () => setReplyingTo(null),
        startEdit: (msg) => {
          setReplyingTo(null);
          setEditingMessage(msg);
        },
        cancelEdit: () => setEditingMessage(null),
        emitTyping,
        refreshConversations,
        openDirectChatWithUser,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
