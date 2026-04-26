/**
 * Order Service - Main Entry Point
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import { logger } from './utils/logger';
import { runMigrations } from './db/migrate';
import { connectProducer, disconnectProducer } from './services/kafka.service';
import { connectCache, disconnectCache } from './services/cache.service';
import * as orderService from './services/order.service';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
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
  res.json({ status: 'healthy', service: 'order-service' });
});

// Routes

/**
 * Create a new order
 * POST /api/orders
 */
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const orderData = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const order = await orderService.createOrder(userId, orderData);
    res.status(201).json(order);
  } catch (error: any) {
    logger.error('Error creating order', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get order by ID
 * GET /api/orders/:id
 */
app.get('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    logger.error('Error getting order', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get order by order number
 * GET /api/orders/number/:orderNumber
 */
app.get('/api/orders/number/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const order = await orderService.getOrderByNumber(orderNumber);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    logger.error('Error getting order by number', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get orders for a user
 * GET /api/users/:userId/orders
 */
app.get('/api/users/:userId/orders', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await orderService.getOrdersByUser(userId, page, limit);
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting user orders', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get orders for a seller
 * GET /api/sellers/:sellerId/orders
 */
app.get('/api/sellers/:sellerId/orders', async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as any;

    const result = await orderService.getOrdersBySeller(sellerId, page, limit, status);
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting seller orders', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update order status
 * PATCH /api/orders/:id/status
 */
app.patch('/api/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, description, changedBy } = req.body;

    const order = await orderService.updateOrderStatus(id, status, description, changedBy);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    logger.error('Error updating order status', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update payment status
 * PATCH /api/orders/:id/payment
 */
app.patch('/api/orders/:id/payment', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!['paid', 'failed', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status' });
    }

    const order = await orderService.updatePaymentStatus(id, paymentStatus);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    logger.error('Error updating payment status', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Cancel order
 * POST /api/orders/:id/cancel
 */
app.post('/api/orders/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, userId } = req.body;

    if (!reason || !userId) {
      return res.status(400).json({ error: 'Reason and userId are required' });
    }

    const order = await orderService.cancelOrder(id, reason, userId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    logger.error('Error cancelling order', { error: error.message });
    if (error.message.includes('Cannot cancel')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create return request
 * POST /api/orders/:id/returns
 */
app.post('/api/orders/:id/returns', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const ret = await orderService.createReturn(id, reason, description);
    res.status(201).json(ret);
  } catch (error: any) {
    logger.error('Error creating return', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get order statistics for seller
 * GET /api/sellers/:sellerId/stats
 */
app.get('/api/sellers/:sellerId/stats', async (req: Request, res: Response) => {
  try {
    const { sellerId } = req.params;
    const stats = await orderService.getOrderStats(sellerId);
    res.json(stats);
  } catch (error: any) {
    logger.error('Error getting order stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');
  await disconnectProducer();
  await disconnectCache();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const start = async () => {
  try {
    // Run database migrations
    logger.info('Running database migrations...');
    await runMigrations();

    // Connect to Kafka
    logger.info('Connecting to Kafka...');
    await connectProducer();

    // Connect to Redis
    logger.info('Connecting to Redis...');
    await connectCache();

    // Start HTTP server
    app.listen(config.PORT, () => {
      logger.info(`Order service listening on port ${config.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

start();

export default app;
