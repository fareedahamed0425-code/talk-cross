import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.js';
import { useSocket } from './SocketContext.js';
import { api } from '../services/api.js';
import { sounds } from '../services/audio.js';
import { notificationService } from '../services/notificationService.js';
import { chatPrivacy } from '../utils/chatPrivacy.js';
import { encryptMessage, decryptMessage } from '../utils/crypto.js';
import { Conversation, Message, MessageType } from '../types/index.js';

interface OfflineQueueItem {
  tempId: string;
  conversationId: string;
  messageType: MessageType;
  content?: string | null;
  mediaUrl?: string | null;
  stickerId?: string | null;
  replyToMessageId?: string | null;
  createdAt: string;
}

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
  const { socket, showToast, showInAppNotification } = useSocket();

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
  const isFlushingRef = useRef<boolean>(false);

  const selectConversation = useCallback((id: string | null) => {
    setActiveConversationId(id);
    setReplyingTo(null);
    setEditingMessage(null);
  }, []);

  // Helper: Decrypt array of messages in a conversation
  const decryptMessagesList = async (rawMessages: Message[], convId: string): Promise<Message[]> => {
    return Promise.all(
      rawMessages.map(async (msg) => {
        let content = msg.content;
        if (msg.content && !msg.is_deleted) {
          content = await decryptMessage(msg.content, convId);
        }
        let replyToMsg = msg.reply_to_message;
        if (replyToMsg && replyToMsg.content) {
          const decReply = await decryptMessage(replyToMsg.content, convId);
          replyToMsg = { ...replyToMsg, content: decReply };
        }
        return { ...msg, content, reply_to_message: replyToMsg };
      })
    );
  };

  // Helper: Decrypt conversation snippet
  const decryptConversationList = async (convList: Conversation[]): Promise<Conversation[]> => {
    return Promise.all(
      convList.map(async (conv) => {
        if (conv.last_message?.content && !conv.last_message.is_deleted) {
          const dec = await decryptMessage(conv.last_message.content, conv.id);
          return {
            ...conv,
            last_message: {
              ...conv.last_message,
              content: dec,
            },
          };
        }
        return conv;
      })
    );
  };

  // Fetch all conversations
  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingConversations(true);
      const res = await api.getConversations();
      const decryptedConvs = await decryptConversationList(res.conversations);
      setConversations(decryptedConvs);
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

  // Live auto-refresh when downloaded app resumes from background or regains focus
  useEffect(() => {
    if (!user) return;

    const handleResume = async () => {
      refreshConversations();
      if (activeConvIdRef.current) {
        try {
          const res = await api.getMessages(activeConvIdRef.current);
          const decrypted = await decryptMessagesList(res.messages, activeConvIdRef.current);
          setMessages(decrypted);
          setHasMoreMessages(res.hasMore);
        } catch (e) {
          console.error('Failed to auto-sync messages on resume:', e);
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleResume);
    window.addEventListener('online', handleResume);

    // Periodic background sync every 20s
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    }, 20000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('online', handleResume);
      clearInterval(timer);
    };
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
        const decrypted = await decryptMessagesList(res.messages, activeConversationId);
        if (isMounted) {
          // Restore any offline queued messages for this conversation
          const rawQueue = localStorage.getItem('talkcross_offline_msg_queue');
          let pendingForConv: Message[] = [];
          if (rawQueue) {
            try {
              const queue: OfflineQueueItem[] = JSON.parse(rawQueue);
              pendingForConv = queue
                .filter((q) => q.conversationId === activeConversationId)
                .map((item) => ({
                  id: item.tempId,
                  conversation_id: item.conversationId,
                  sender_id: user?.id || '',
                  message_type: item.messageType,
                  content: item.content || '',
                  media_url: item.mediaUrl || null,
                  sticker_id: item.stickerId || null,
                  reply_to_message_id: item.replyToMessageId || null,
                  created_at: item.createdAt,
                  updated_at: item.createdAt,
                  is_deleted: false,
                  deleted_at: null,
                  is_edited: false,
                  is_read: false,
                  is_delivered: false,
                  sending: true,
                  sender: user || undefined,
                }));
            } catch {}
          }

          setMessages([...decrypted, ...pendingForConv]);
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

    const handleNewMessage = async (msg: Message) => {
      // Decrypt message content in real-time
      let decryptedContent = msg.content;
      if (msg.content && !msg.is_deleted) {
        decryptedContent = await decryptMessage(msg.content, msg.conversation_id);
      }
      let decryptedReply = msg.reply_to_message;
      if (decryptedReply && decryptedReply.content) {
        const replyDec = await decryptMessage(decryptedReply.content, msg.conversation_id);
        decryptedReply = { ...decryptedReply, content: replyDec };
      }
      const decryptedMsg = { ...msg, content: decryptedContent, reply_to_message: decryptedReply };

      // If message belongs to active conversation
      if (msg.conversation_id === activeConvIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          // If we sent this message and had an optimistic message pending, replace it
          if (msg.sender_id === user?.id) {
            const pendingIdx = prev.findIndex(
              (m) => m.sending && (m.id.startsWith('temp_')) && m.content === decryptedContent
            );
            if (pendingIdx !== -1) {
              const updated = [...prev];
              updated[pendingIdx] = decryptedMsg;
              return updated;
            }
          }
          return [...prev, decryptedMsg];
        });

        // If sent by other user, play sound & mark read
        if (msg.sender_id !== user?.id) {
          const isMuted = chatPrivacy.isChatMuted(msg.conversation_id);
          const isAppFocused = typeof document !== 'undefined' && !document.hidden && document.hasFocus();

          if (!isMuted) {
            if (isAppFocused) {
              sounds.playReceived();
            } else {
              sounds.playNotification();
              // Native push notification if app tab is minimized/in background
              notificationService.notifyIncomingMessage({
                senderName: msg.sender?.display_name || 'Friend',
                senderUsername: msg.sender?.username,
                senderAvatar: msg.sender?.profile_image,
                messageType: msg.message_type,
                content: decryptedContent,
                mediaUrl: msg.media_url,
                stickerName: msg.sticker_name,
                conversationId: msg.conversation_id,
                onOpen: () => {
                  selectConversation(msg.conversation_id);
                },
              });
            }
          }
          socket.emit('messages_read', { conversationId: msg.conversation_id });
        }
      } else {
        // Message in another conversation
        if (msg.sender_id !== user?.id) {
          const isMuted = chatPrivacy.isChatMuted(msg.conversation_id);
          if (!isMuted) {
            sounds.playNotification();

            // 1. Native Push Notification (Rich format with image preview / text)
            notificationService.notifyIncomingMessage({
              senderName: msg.sender?.display_name || 'Friend',
              senderUsername: msg.sender?.username,
              senderAvatar: msg.sender?.profile_image,
              messageType: msg.message_type,
              content: decryptedContent,
              mediaUrl: msg.media_url,
              stickerName: msg.sticker_name,
              conversationId: msg.conversation_id,
              onOpen: () => {
                selectConversation(msg.conversation_id);
              },
            });

            // 2. Beautiful In-App Heads-Up Banner Notification
            showInAppNotification({
              type: msg.message_type === 'image' ? 'image' : msg.message_type === 'sticker' ? 'sticker' : 'message',
              senderName: msg.sender?.display_name || 'Friend',
              senderUsername: msg.sender?.username,
              senderAvatar: msg.sender?.profile_image,
              content: decryptedContent,
              mediaUrl: msg.media_url,
              stickerUrl: msg.sticker_url,
              stickerName: msg.sticker_name,
              conversationId: msg.conversation_id,
              onClick: () => {
                selectConversation(msg.conversation_id);
              },
            });
          }
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
              content: decryptedContent,
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
          refreshConversations();
          return prev;
        }
      });
    };

    const handleMessageEdited = async (data: { messageId: string; conversationId: string; content: string; updatedAt: string }) => {
      const decContent = await decryptMessage(data.content, data.conversationId);
      if (data.conversationId === activeConvIdRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.messageId ? { ...m, content: decContent, updated_at: data.updatedAt, is_edited: true } : m))
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

    const handleMessagesDelivered = () => {
      setMessages((prev) =>
        prev.map((m) =>
          m.sender_id === user?.id && !m.is_read
            ? { ...m, is_delivered: true }
            : m
        )
      );
      setConversations((prev) =>
        prev.map((c) => {
          if (c.last_message && c.last_message.sender_id === user?.id && !c.last_message.is_read) {
            return {
              ...c,
              last_message: { ...c.last_message, is_delivered: true },
            };
          }
          return c;
        })
      );
    };

    const handleUserStatusChange = (data: { userId: string; online_status: boolean }) => {
      if (data.online_status) {
        handleMessagesDelivered();
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('messages_read_update', handleMessagesRead);
    socket.on('messages_delivered_update', handleMessagesDelivered);
    socket.on('user_status_change', handleUserStatusChange);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stop_typing', handleUserStopTyping);
    socket.on('conversation_updated', handleConversationUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('messages_read_update', handleMessagesRead);
      socket.off('messages_delivered_update', handleMessagesDelivered);
      socket.off('user_status_change', handleUserStatusChange);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stop_typing', handleUserStopTyping);
      socket.off('conversation_updated', handleConversationUpdated);
    };
  }, [socket, user?.id, showToast, showInAppNotification, selectConversation, refreshConversations]);

  const loadMoreMessages = async () => {
    if (!activeConversationId || isLoadingMessages || !hasMoreMessages || messages.length === 0) return;
    try {
      const oldestMessage = messages[0];
      const res = await api.getMessages(activeConversationId, oldestMessage.created_at);
      const decrypted = await decryptMessagesList(res.messages, activeConversationId);
      setMessages((prev) => [...decrypted, ...prev]);
      setHasMoreMessages(res.hasMore);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    }
  };

  // Flush offline messages sequentially in FIFO order as soon as network is connected
  const flushOfflineQueue = useCallback(async () => {
    if (isFlushingRef.current) return;
    if (!navigator.onLine || !user) return;

    const rawQueue = localStorage.getItem('talkcross_offline_msg_queue');
    if (!rawQueue) return;

    let queue: OfflineQueueItem[] = [];
    try {
      queue = JSON.parse(rawQueue);
    } catch {
      localStorage.removeItem('talkcross_offline_msg_queue');
      return;
    }

    if (!Array.isArray(queue) || queue.length === 0) return;

    isFlushingRef.current = true;

    try {
      while (queue.length > 0) {
        if (!navigator.onLine) break;

        const item = queue[0];
        try {
          let encryptedContent = item.content;
          if (item.content) {
            encryptedContent = await encryptMessage(item.content, item.conversationId);
          }

          const res = await api.sendMessage({
            conversationId: item.conversationId,
            messageType: item.messageType,
            content: encryptedContent,
            mediaUrl: item.mediaUrl,
            stickerId: item.stickerId,
            replyToMessageId: item.replyToMessageId,
          });

          // Successfully sent! Remove this item from the front of queue
          queue.shift();
          localStorage.setItem('talkcross_offline_msg_queue', JSON.stringify(queue));

          // Update optimistic message in state if still in view
          setMessages((prev) =>
            prev.map((m) =>
              m.id === item.tempId
                ? {
                    ...res.message,
                    content: item.content || res.message.content,
                    sender: user,
                    sending: false,
                    is_delivered: res.message.is_delivered,
                  }
                : m
            )
          );

          // Update conversation list
          setConversations((prev) => {
            const existingIdx = prev.findIndex((c) => c.id === item.conversationId);
            if (existingIdx === -1) return prev;
            const updated = {
              ...prev[existingIdx],
              last_message: {
                id: res.message.id,
                content: item.content || (item.messageType === 'image' ? 'Photo' : 'Sticker'),
                message_type: item.messageType,
                sender_id: user.id,
                created_at: res.message.created_at,
                is_deleted: false,
                is_read: false,
                is_delivered: res.message.is_delivered,
                sending: false,
              },
              updated_at: res.message.created_at,
            };
            return [updated, ...prev.filter((_, idx) => idx !== existingIdx)];
          });
        } catch (err) {
          console.warn('Sequential queue flush paused on item:', item.tempId, err);
          break;
        }
      }
    } finally {
      isFlushingRef.current = false;
    }
  }, [user]);

  // Automatically flush offline queue when network connects or socket reconnects
  useEffect(() => {
    const handleOnline = () => {
      flushOfflineQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [flushOfflineQueue]);

  useEffect(() => {
    if (socket) {
      socket.on('connect', flushOfflineQueue);
      return () => {
        socket.off('connect', flushOfflineQueue);
      };
    }
  }, [socket, flushOfflineQueue]);

  const sendMessage = async (payload: {
    messageType: MessageType;
    content?: string | null;
    mediaUrl?: string | null;
    stickerId?: string | null;
  }) => {
    if (!activeConversationId || !user) return;

    sounds.playSent();
    emitTyping(false);

    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const createdAt = new Date().toISOString();

    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: activeConversationId,
      sender_id: user.id,
      message_type: payload.messageType,
      content: payload.content || '',
      media_url: payload.mediaUrl || null,
      sticker_id: payload.stickerId || null,
      reply_to_message_id: replyingTo ? replyingTo.id : null,
      created_at: createdAt,
      updated_at: createdAt,
      is_deleted: false,
      deleted_at: null,
      is_edited: false,
      is_read: false,
      is_delivered: false,
      sending: true, // Clock icon 🕒
      sender: user,
      reply_to_message: replyingTo ? (messages.find((m) => m.id === replyingTo.id) || null) : null,
    };

    // 1. Immediately show in chat with clock icon
    setMessages((prev) => [...prev, optimisticMsg]);

    // 2. Update snippet in conversation list with sending state
    setConversations((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === activeConversationId);
      if (existingIdx === -1) return prev;
      const updatedConv = {
        ...prev[existingIdx],
        last_message: {
          id: tempId,
          content: payload.content || (payload.messageType === 'image' ? 'Photo' : 'Sticker'),
          message_type: payload.messageType,
          sender_id: user.id,
          created_at: createdAt,
          is_deleted: false,
          sending: true,
          is_read: false,
          is_delivered: false,
        },
        updated_at: createdAt,
      };
      return [updatedConv, ...prev.filter((_, idx) => idx !== existingIdx)];
    });

    const queueItem: OfflineQueueItem = {
      tempId,
      conversationId: activeConversationId,
      messageType: payload.messageType,
      content: payload.content,
      mediaUrl: payload.mediaUrl,
      stickerId: payload.stickerId,
      replyToMessageId: replyingTo ? replyingTo.id : null,
      createdAt,
    };

    setReplyingTo(null);

    // If sender is currently offline, store in offline queue and let clock icon stay
    if (!navigator.onLine) {
      try {
        const rawQueue = localStorage.getItem('talkcross_offline_msg_queue');
        const queue: OfflineQueueItem[] = rawQueue ? JSON.parse(rawQueue) : [];
        queue.push(queueItem);
        localStorage.setItem('talkcross_offline_msg_queue', JSON.stringify(queue));
      } catch (e) {
        console.error('Failed to save to offline queue:', e);
      }
      return;
    }

    try {
      // Encrypt message content with AES-256-GCM before sending over the wire
      let encryptedContent = payload.content;
      if (payload.content) {
        encryptedContent = await encryptMessage(payload.content, activeConversationId);
      }

      const res = await api.sendMessage({
        conversationId: activeConversationId,
        messageType: payload.messageType,
        content: encryptedContent,
        mediaUrl: payload.mediaUrl,
        stickerId: payload.stickerId,
        replyToMessageId: queueItem.replyToMessageId,
      });

      // Update message state from sending (clock) to confirmed message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...res.message,
                content: payload.content || res.message.content,
                sender: user,
                sending: false,
                is_delivered: res.message.is_delivered,
              }
            : m
        )
      );

      // Update conversation list
      setConversations((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === activeConversationId);
        if (existingIdx === -1) return prev;
        const updatedConv = {
          ...prev[existingIdx],
          last_message: {
            id: res.message.id,
            content: payload.content || (payload.messageType === 'image' ? 'Photo' : 'Sticker'),
            message_type: payload.messageType,
            sender_id: user.id,
            created_at: res.message.created_at,
            is_deleted: false,
            sending: false,
            is_delivered: res.message.is_delivered,
            is_read: false,
          },
          updated_at: res.message.created_at,
        };
        return [updatedConv, ...prev.filter((_, idx) => idx !== existingIdx)];
      });
    } catch (err: any) {
      console.warn('Send message network/server issue. Saving to offline queue for sequence retry:', err);
      try {
        const rawQueue = localStorage.getItem('talkcross_offline_msg_queue');
        const queue: OfflineQueueItem[] = rawQueue ? JSON.parse(rawQueue) : [];
        queue.push(queueItem);
        localStorage.setItem('talkcross_offline_msg_queue', JSON.stringify(queue));
      } catch (e) {
        console.error('Failed to save to offline queue on send failure:', e);
      }
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!activeConversationId) return;
    try {
      const encrypted = await encryptMessage(newContent, activeConversationId);
      await api.editMessage(messageId, encrypted);
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
        selectConversation,
        loadMoreMessages,
        sendMessage,
        editMessage,
        deleteMessage,
        startReply: async (msg) => {
          setEditingMessage(null);
          let resolvedMsg = msg;
          if (msg.content && msg.content.startsWith('e2ee:') && (activeConversationId || msg.conversation_id)) {
            const dec = await decryptMessage(msg.content, activeConversationId || msg.conversation_id);
            resolvedMsg = { ...msg, content: dec };
          }
          setReplyingTo(resolvedMsg);
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
