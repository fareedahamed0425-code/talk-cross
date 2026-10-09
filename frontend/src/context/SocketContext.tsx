import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.js';
import { api } from '../services/api.js';
import { sounds } from '../services/audio.js';
import { notificationService } from '../services/notificationService.js';
import { FriendRequest, Friend } from '../types/index.js';
import confetti from 'canvas-confetti';

export interface InAppNotificationData {
  id: string;
  type: 'message' | 'image' | 'sticker' | 'friend_request' | 'friend_accepted' | 'info';
  senderName: string;
  senderUsername?: string;
  senderAvatar?: string | null;
  content?: string | null;
  mediaUrl?: string | null;
  stickerUrl?: string | null;
  stickerName?: string | null;
  conversationId?: string;
  timestamp?: string;
  onClick?: () => void;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: Set<string>;
  isOnline: (userId: string) => boolean;
  toast: { message: string; type?: 'info' | 'success' | 'warning' } | null;
  showToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
  clearToast: () => void;
  inAppNotifications: InAppNotificationData[];
  showInAppNotification: (notif: Omit<InAppNotificationData, 'id'>) => string;
  dismissInAppNotification: (id: string) => void;
  notificationPermission: NotificationPermission;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  sendTestNotification: (type?: 'message' | 'image') => void;
  // Live Auto-Refresh State for Requests & Friends
  receivedRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  receivedRequestsCount: number;
  friends: Friend[];
  isLoadingRequests: boolean;
  isLoadingFriends: boolean;
  refreshFriendRequests: () => Promise<void>;
  refreshFriends: () => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warning' } | null>(null);
  const [inAppNotifications, setInAppNotifications] = useState<InAppNotificationData[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    notificationService.getPermission()
  );

  // Friend Requests & Friends live state
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState<boolean>(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState<boolean>(false);

  const toastTimerRef = useRef<any>(null);
  const notifTimersRef = useRef<Map<string, any>>(new Map());

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const clearToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(null);
  };

  const dismissInAppNotification = useCallback((id: string) => {
    const timer = notifTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      notifTimersRef.current.delete(id);
    }
    setInAppNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showInAppNotification = useCallback(
    (notif: Omit<InAppNotificationData, 'id'>): string => {
      const id = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const newNotif: InAppNotificationData = {
        ...notif,
        id,
        timestamp: notif.timestamp || new Date().toISOString(),
      };

      setInAppNotifications((prev) => {
        const filtered = prev.slice(-2);
        return [...filtered, newNotif];
      });

      const timeoutMs = notif.type === 'image' ? 6500 : 5000;
      const timer = setTimeout(() => {
        dismissInAppNotification(id);
      }, timeoutMs);

      notifTimersRef.current.set(id, timer);
      return id;
    },
    [dismissInAppNotification]
  );

  const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    const perm = await notificationService.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      showToast('🔔 Push notifications enabled! You will be notified of new messages & photos.', 'success');
    } else if (perm === 'denied') {
      showToast('Notifications are blocked in your browser settings.', 'warning');
    }
    return perm;
  };

  const sendTestNotification = (type: 'message' | 'image' = 'image') => {
    if (type === 'image') {
      const testImage =
        'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=600&q=80';
      notificationService.showNotification({
        title: '📷 Sophia Turner sent a photo',
        body: 'Check out this cute puppy! 🐶',
        image: testImage,
        icon: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        tag: 'test-image',
      });
      showInAppNotification({
        type: 'image',
        senderName: 'Sophia Turner',
        senderUsername: 'sophia',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        content: 'Check out this cute puppy! 🐶',
        mediaUrl: testImage,
      });
    } else {
      notificationService.showNotification({
        title: '💬 Liam Miller (@liam)',
        body: 'Hey there! Are we still meeting for coffee this afternoon?',
        icon: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        tag: 'test-msg',
      });
      showInAppNotification({
        type: 'message',
        senderName: 'Liam Miller',
        senderUsername: 'liam',
        senderAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        content: 'Hey there! Are we still meeting for coffee this afternoon? ☕',
      });
    }
    sounds.playReceived();
  };

  // Live Auto-Refresh Functions
  const refreshFriendRequests = useCallback(async () => {
    if (!token || !user) return;
    try {
      setIsLoadingRequests(true);
      const res = await api.getFriendRequests();
      setReceivedRequests(res.received || []);
      setSentRequests(res.sent || []);
    } catch (err) {
      console.error('Failed to auto-refresh friend requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [token, user]);

  const refreshFriends = useCallback(async () => {
    if (!token || !user) return;
    try {
      setIsLoadingFriends(true);
      const res = await api.getFriends();
      setFriends(res.friends || []);
    } catch (err) {
      console.error('Failed to auto-refresh friends:', err);
    } finally {
      setIsLoadingFriends(false);
    }
  }, [token, user]);

  const refreshAllData = useCallback(async () => {
    await Promise.all([refreshFriendRequests(), refreshFriends()]);
  }, [refreshFriendRequests, refreshFriends]);

  // Initial load and live background/foreground auto-refresh
  useEffect(() => {
    if (!user || !token) {
      setReceivedRequests([]);
      setSentRequests([]);
      setFriends([]);
      return;
    }

    refreshAllData();

    // Auto-refresh when app comes to foreground or focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAllData();
      }
    };

    const handleFocus = () => {
      refreshAllData();
    };

    const handleOnline = () => {
      refreshAllData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    // Periodic auto-refresh every 15s to keep installed PWA 100% updated
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshAllData();
      }
    }, 15000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [user, token, refreshAllData]);

  // Socket Connection and Event Listeners
  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : window.location.origin;

    const s = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      console.log('⚡ Connected to Talk Cross real-time socket');
      setIsConnected(true);
      refreshAllData();
    });

    s.on('disconnect', () => {
      console.log('❌ Disconnected from socket');
      setIsConnected(false);
    });

    s.on('user_status_change', (data: { userId: string; online_status: boolean }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (data.online_status) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    s.on('new_friend_request', (data: { sender?: any }) => {
      sounds.playNotification();
      const sender = data.sender;
      const senderName = sender?.display_name || 'A user';
      const senderUsername = sender?.username || '';
      const senderAvatar = sender?.profile_image;

      // Auto-refresh request list immediately
      refreshFriendRequests();

      // Native Push Notification
      notificationService.notifyFriendRequest({
        senderName,
        senderUsername,
        senderAvatar,
      });

      // Rich in-app banner
      showInAppNotification({
        type: 'friend_request',
        senderName,
        senderUsername,
        senderAvatar,
        content: 'wants to connect with you on Talk Cross',
      });
    });

    s.on('friend_request_accepted', (data: { friend?: any }) => {
      sounds.playNotification();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      const friend = data.friend;

      // Auto-refresh requests and friends
      refreshFriendRequests();
      refreshFriends();

      if (friend) {
        // Native Push Notification
        notificationService.notifyFriendAccepted({
          friendName: friend.display_name,
          friendAvatar: friend.profile_image,
        });

        // Rich in-app banner
        showInAppNotification({
          type: 'friend_accepted',
          senderName: friend.display_name,
          senderUsername: friend.username,
          senderAvatar: friend.profile_image,
          content: 'accepted your friend request! You can now chat.',
        });
      }
    });

    s.on('friend_request_cancelled', () => {
      refreshFriendRequests();
    });

    s.on('friend_request_rejected', () => {
      refreshFriendRequests();
    });

    s.on('friend_removed', () => {
      refreshFriends();
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token, user?.id, showInAppNotification, refreshAllData, refreshFriendRequests, refreshFriends]);

  const isOnline = (userId: string): boolean => {
    return onlineUserIds.has(userId);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUserIds,
        isOnline,
        toast,
        showToast,
        clearToast,
        inAppNotifications,
        showInAppNotification,
        dismissInAppNotification,
        notificationPermission,
        requestNotificationPermission,
        sendTestNotification,
        receivedRequests,
        sentRequests,
        receivedRequestsCount: receivedRequests.length,
        friends,
        isLoadingRequests,
        isLoadingFriends,
        refreshFriendRequests,
        refreshFriends,
        refreshAllData,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

