/**
 * Chat Service - Main Entry Point with HTTP and Socket.IO
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { config } from './config';
import { logger } from './utils/logger';
import { runMigrations } from './db/migrate';
import { connectProducer, disconnectProducer } from './services/kafka.service';
import { initializeSocket, disconnectSocket } from './services/socket.service';
import * as chatService from './services/chat.service';

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'chat-service' });
});

// REST Routes

/**
 * Get user's conversations
 * GET /api/users/:userId/conversations
 */
app.get('/api/users/:userId/conversations', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await chatService.getUserConversations(req.params.userId, page, limit);
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting conversations', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get or create direct conversation
 * POST /api/conversations/direct
 */
app.post('/api/conversations/direct', async (req: Request, res: Response) => {
  try {
    const { userId1, userId2 } = req.body;
    const conversation = await chatService.getOrCreateDirectConversation(userId1, userId2);
    res.json(conversation);
  } catch (error: any) {
    logger.error('Error creating direct conversation', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create conversation
 * POST /api/conversations
 */
app.post('/api/conversations', async (req: Request, res: Response) => {
  try {
    const conversation = await chatService.createConversation(req.body);
    res.status(201).json(conversation);
  } catch (error: any) {
    logger.error('Error creating conversation', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get conversation by ID
 * GET /api/conversations/:id
 */
app.get('/api/conversations/:id', async (req: Request, res: Response) => {
  try {
    const conversation = await chatService.getConversationById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error: any) {
    logger.error('Error getting conversation', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get conversation messages
 * GET /api/conversations/:id/messages
 */
app.get('/api/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const result = await chatService.getConversationMessages(req.params.id, userId, page, limit);
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting messages', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send message (REST endpoint)
 * POST /api/conversations/:id/messages
 */
app.post('/api/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { senderId, senderName, type, content, attachmentUrl } = req.body;
    const message = await chatService.sendMessage(
      {
        conversationId: req.params.id,
        type,
        content,
        attachmentUrl,
      },
      senderId,
      senderName
    );
    res.status(201).json(message);
  } catch (error: any) {
    logger.error('Error sending message', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete message
 * DELETE /api/messages/:id
 */
app.delete('/api/messages/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const deleted = await chatService.deleteMessage(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found or unauthorized' });
    }
    res.json({ message: 'Message deleted' });
  } catch (error: any) {
    logger.error('Error deleting message', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Toggle mute
 * POST /api/conversations/:id/mute
 */
app.post('/api/conversations/:id/mute', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    await chatService.toggleMute(req.params.id, userId);
    res.json({ message: 'Mute toggled' });
  } catch (error: any) {
    logger.error('Error toggling mute', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Toggle block
 * POST /api/conversations/:id/block
 */
app.post('/api/conversations/:id/block', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    await chatService.toggleBlock(req.params.id, userId);
    res.json({ message: 'Block toggled' });
  } catch (error: any) {
    logger.error('Error toggling block', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get unread count
 * GET /api/users/:userId/unread-count
 */
app.get('/api/users/:userId/unread-count', async (req: Request, res: Response) => {
  try {
    const count = await chatService.getUnreadCount(req.params.userId);
    res.json({ count });
  } catch (error: any) {
    logger.error('Error getting unread count', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');
  await disconnectSocket();
  await disconnectProducer();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const start = async () => {
  try {
    await runMigrations();
    await connectProducer();

    // Initialize Socket.IO
    initializeSocket(httpServer);

    httpServer.listen(config.port, () => {
      logger.info(`Chat service listening on port ${config.port}`);
      logger.info(`Socket.IO server ready`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

start();

export default app;
