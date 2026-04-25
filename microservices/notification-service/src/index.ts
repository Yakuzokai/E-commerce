/**
 * Notification Service - Main Entry Point
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { runMigrations } from './db/migrate';
import { initTransporter } from './services/email.service';
import { startConsumer, stopConsumer } from './services/kafka.service';
import * as notificationService from './services/notification.service';

const app = express();

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
  res.json({ status: 'healthy', service: 'notification-service' });
});

// Routes

/**
 * Create notification
 * POST /api/notifications
 */
app.post('/api/notifications', async (req: Request, res: Response) => {
  try {
    const notification = await notificationService.createNotification(req.body);
    res.status(201).json(notification);
  } catch (error: any) {
    logger.error('Error creating notification', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user notifications
 * GET /api/users/:userId/notifications
 */
app.get('/api/users/:userId/notifications', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(
      req.params.userId,
      page,
      limit,
      unreadOnly
    );
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting notifications', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get unread count
 * GET /api/users/:userId/notifications/unread-count
 */
app.get('/api/users/:userId/notifications/unread-count', async (req: Request, res: Response) => {
  try {
    const count = await notificationService.getUnreadCount(req.params.userId);
    res.json({ count });
  } catch (error: any) {
    logger.error('Error getting unread count', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark notification as read
 * PATCH /api/notifications/:id/read
 */
app.patch('/api/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const notification = await notificationService.markAsRead(req.params.id, userId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error: any) {
    logger.error('Error marking notification as read', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark all notifications as read
 * POST /api/users/:userId/notifications/read-all
 */
app.post('/api/users/:userId/notifications/read-all', async (req: Request, res: Response) => {
  try {
    await notificationService.markAllAsRead(req.params.userId);
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    logger.error('Error marking all as read', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete notification
 * DELETE /api/notifications/:id
 */
app.delete('/api/notifications/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const deleted = await notificationService.deleteNotification(req.params.id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted' });
  } catch (error: any) {
    logger.error('Error deleting notification', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user preferences
 * GET /api/users/:userId/preferences
 */
app.get('/api/users/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const preferences = await notificationService.getUserPreferences(req.params.userId);
    res.json(preferences || { userId: req.params.userId });
  } catch (error: any) {
    logger.error('Error getting preferences', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update user preferences
 * PUT /api/users/:userId/preferences
 */
app.put('/api/users/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const preferences = await notificationService.updateUserPreferences(
      req.params.userId,
      req.body
    );
    res.json(preferences);
  } catch (error: any) {
    logger.error('Error updating preferences', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send bulk notifications
 * POST /api/notifications/bulk
 */
app.post('/api/notifications/bulk', async (req: Request, res: Response) => {
  try {
    const { userIds, ...notificationData } = req.body;
    const result = await notificationService.sendBulkNotifications(userIds, notificationData);
    res.json(result);
  } catch (error: any) {
    logger.error('Error sending bulk notifications', { error: error.message });
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
  await stopConsumer();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const start = async () => {
  try {
    await runMigrations();
    await initTransporter();
    await startConsumer();

    app.listen(config.port, () => {
      logger.info(`Notification service listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

start();

export default app;
