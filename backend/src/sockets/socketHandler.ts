import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyFirebaseIdToken } from '../config/firebase.js';
import { query } from '../config/db.js';
import { DbUser } from '../types/index.js';

let io: SocketIOServer | null = null;

// Map: userId -> Set of active socketIds (for multi-tab presence)
const activeUserSockets = new Map<string, Set<string>>();

export function getSocketIO(): SocketIOServer | null {
  return io;
}

export function isUserOnline(userId: string): boolean {
  const sockets = activeUserSockets.get(userId);
  return !!sockets && sockets.size > 0;
}

export function initSocketIO(server: HttpServer, allowedOrigins: string[] | string): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 30000,
    pingInterval: 15000,
  });

  // Authentication Middleware for Socket.IO
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = await verifyFirebaseIdToken(token);
      if (!decoded || !decoded.uid) {
        return next(new Error('Invalid authentication token'));
      }

      const userResult = await query<DbUser>(
        'SELECT id, firebase_uid, username, display_name, profile_image FROM users WHERE firebase_uid = $1',
        [decoded.uid]
      );

      if (userResult.rows.length === 0) {
        return next(new Error('User record not found. Please sync account first.'));
      }

      socket.data.user = userResult.rows[0];
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user as DbUser;
    if (!user) {
      socket.disconnect();
      return;
    }

    const userId = user.id;

    // Track active user sockets
    let userSockets = activeUserSockets.get(userId);
    const isFirstConnection = !userSockets || userSockets.size === 0;

    if (!userSockets) {
      userSockets = new Set();
      activeUserSockets.set(userId, userSockets);
    }
    userSockets.add(socket.id);

    // Join personal user room for direct notifications
    socket.join(`user:${userId}`);

    // If first socket connection, mark user as online in DB & notify
    if (isFirstConnection) {
      try {
        await query('UPDATE users SET online_status = TRUE, last_seen = NOW() WHERE id = $1', [userId]);
        socket.broadcast.emit('user_status_change', {
          userId,
          online_status: true,
          last_seen: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error updating online status:', err);
      }
    }

    // Auto-join all conversation rooms this user is part of
    try {
      const conversations = await query(
        'SELECT conversation_id FROM conversation_members WHERE user_id = $1',
        [userId]
      );
      conversations.rows.forEach((row) => {
        socket.join(`conversation:${row.conversation_id}`);
      });
    } catch (err) {
      console.error('Error joining user conversations:', err);
    }

    // --- EVENT: Join Conversation ---
    socket.on('join_conversation', async (data: { conversationId: string }) => {
      const { conversationId } = data;
      if (!conversationId) return;

      // Verify membership
      const member = await query(
        'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );

      if (member.rows.length > 0) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    // --- EVENT: Leave Conversation ---
    socket.on('leave_conversation', (data: { conversationId: string }) => {
      const { conversationId } = data;
      if (conversationId) {
        socket.leave(`conversation:${conversationId}`);
      }
    });

    // --- EVENT: Typing Start ---
    socket.on('typing_start', (data: { conversationId: string }) => {
      const { conversationId } = data;
      if (!conversationId) return;

      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        conversationId,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
        },
      });
    });

    // --- EVENT: Typing Stop ---
    socket.on('typing_stop', (data: { conversationId: string }) => {
      const { conversationId } = data;
      if (!conversationId) return;

      socket.to(`conversation:${conversationId}`).emit('user_stop_typing', {
        conversationId,
        userId: user.id,
      });
    });

    // --- EVENT: Messages Read ---
    socket.on('messages_read', async (data: { conversationId: string }) => {
      const { conversationId } = data;
      if (!conversationId) return;

      try {
        await query(
          `INSERT INTO message_reads (message_id, user_id, read_at)
           SELECT m.id, $1, NOW()
           FROM messages m
           WHERE m.conversation_id = $2 
             AND m.sender_id != $1
             AND NOT EXISTS (
               SELECT 1 FROM message_reads mr WHERE mr.message_id = m.id AND mr.user_id = $1
             )
           ON CONFLICT (message_id, user_id) DO NOTHING`,
          [userId, conversationId]
        );

        socket.to(`conversation:${conversationId}`).emit('messages_read_update', {
          conversationId,
          readerId: userId,
          readAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error handling socket messages_read:', err);
      }
    });

    // --- EVENT: Disconnect ---
    socket.on('disconnect', async () => {
      const sockets = activeUserSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          activeUserSockets.delete(userId);
          const now = new Date();
          try {
            await query('UPDATE users SET online_status = FALSE, last_seen = $1 WHERE id = $2', [now, userId]);
            io?.emit('user_status_change', {
              userId,
              online_status: false,
              last_seen: now.toISOString(),
            });
          } catch (err) {
            console.error('Error updating offline status:', err);
          }
        }
      }
    });
  });

  return io;
}
