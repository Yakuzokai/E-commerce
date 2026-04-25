/**
 * Socket.IO Service - WebSocket handling
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import * as chatService from './chat.service';
import { Message, SendMessageRequest } from '../types';

let io: Server | null = null;
let pubClient: ReturnType<typeof createClient> | null = null;
let subClient: ReturnType<typeof createClient> | null = null;

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
}

export function initializeSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Set up Redis adapter for scaling
  setupRedisAdapter();

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const userId = socket.handshake.auth.userId || socket.handshake.query.userId;
    const userName = socket.handshake.auth.userName || socket.handshake.query.userName;

    if (!userId) {
      return next(new Error('Authentication required'));
    }

    socket.userId = userId as string;
    socket.userName = userName as string;
    next();
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info('User connected', { userId: socket.userId });

    // Join user's personal room for notifications
    socket.join(`user:${socket.userId}`);

    // Join conversation rooms
    socket.on('join_conversation', async (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      logger.info('User joined conversation', { userId: socket.userId, conversationId });

      // Mark messages as read
      await chatService.markMessagesAsRead(conversationId, socket.userId!);

      // Notify others
      socket.to(`conversation:${conversationId}`).emit('user_online', {
        userId: socket.userId,
        conversationId,
      });
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      logger.info('User left conversation', { userId: socket.userId, conversationId });

      socket.to(`conversation:${conversationId}`).emit('user_offline', {
        userId: socket.userId,
        conversationId,
      });
    });

    // Send message
    socket.on('send_message', async (data: SendMessageRequest, callback?: (response: any) => void) => {
      try {
        const message = await chatService.sendMessage(
          data,
          socket.userId!,
          socket.userName
        );

        // Broadcast to conversation
        io!.to(`conversation:${data.conversationId}`).emit('new_message', message);

        // Send notification to offline users
        broadcastToOfflineUsers(data.conversationId, message);

        if (callback) {
          callback({ success: true, message });
        }
      } catch (error: any) {
        logger.error('Error sending message', { error: error.message });
        if (callback) {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Typing indicator
    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.userName,
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      });
    });

    // Mark as read
    socket.on('mark_read', async (conversationId: string) => {
      await chatService.markMessagesAsRead(conversationId, socket.userId!);

      socket.to(`conversation:${conversationId}`).emit('messages_read', {
        userId: socket.userId,
        conversationId,
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      logger.info('User disconnected', { userId: socket.userId });
    });
  });

  return io;
}

async function setupRedisAdapter(): Promise<void> {
  try {
    pubClient = createClient({ url: config.redis.url });
    subClient = createClient({ url: config.redis.url });

    await Promise.all([pubClient.connect(), subClient.connect()]);

    if (io) {
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.IO Redis adapter initialized');
    }
  } catch (error: any) {
    logger.warn('Failed to setup Redis adapter, using default', { error: error.message });
  }
}

function broadcastToOfflineUsers(conversationId: string, message: Message): void {
  if (!io) return;

  // This would check which users are online and send push notifications to offline ones
  // For now, we just emit to the conversation room
  logger.debug('Broadcasting to offline users', { conversationId, messageId: message.id });
}

export function getIO(): Server | null {
  return io;
}

export async function disconnectSocket(): Promise<void> {
  if (io) {
    await io.close();
    io = null;
  }
  if (pubClient) {
    await pubClient.quit();
    pubClient = null;
  }
  if (subClient) {
    await subClient.quit();
    subClient = null;
  }
}

export default {
  initializeSocket,
  getIO,
  disconnectSocket,
};
