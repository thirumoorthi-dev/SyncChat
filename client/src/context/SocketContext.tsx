import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!token) {
      setSocket(prev => {
        if (prev) prev.disconnect();
        return null;
      });
      setIsConnected(false);
      return;
    }

    const newSocket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    // [Phase 2C] Browser Notification Request
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // [Phase 2C] Global Notification Listener
    const handleNotification = (data: any) => {
      // Data could be a simple message or { groupId, message }
      const msg = data.message || data;
      
      if (document.hidden && Notification.permission === 'granted') {
        const title = msg.group_id ? `Group: ${msg.group_name || 'New Group Message'}` : `Message from ${msg.sender_username}`;
        const notification = new Notification(title, {
          body: msg.content || 'Sent an attachment',
          icon: '/favicon.ico', // Adjust path if needed
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
    };

    newSocket.on('new_message', handleNotification);
    newSocket.on('new_group_message', handleNotification);

    setSocket(newSocket);

    return () => {
      newSocket.off('new_message', handleNotification);
      newSocket.off('new_group_message', handleNotification);
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
