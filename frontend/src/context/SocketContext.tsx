import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.js';
import { sounds } from '../services/audio.js';
import confetti from 'canvas-confetti';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: Set<string>;
  isOnline: (userId: string) => boolean;
  toast: { message: string; type?: 'info' | 'success' | 'warning' } | null;
  showToast: (message: string, type?: 'info' | 'success' | 'warning') => void;
  clearToast: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warning' } | null>(null);
  const toastTimerRef = useRef<any>(null);

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
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      console.log('⚡ Connected to Chaton real-time socket');
      setIsConnected(true);
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
      showToast(`👋 New friend request from ${data.sender?.display_name || 'a user'} (@${data.sender?.username || ''})`, 'info');
    });

    s.on('friend_request_accepted', (data: { friend?: any }) => {
      sounds.playNotification();
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      if (data.friend) {
        showToast(`🎉 You and ${data.friend.display_name} are now connected!`, 'success');
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token, user?.id]);

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
