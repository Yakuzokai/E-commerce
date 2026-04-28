/**
 * Order Service - Main Entry Point
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
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

// Authentication middleware
interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required. Please login to continue.',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };

    (req as AuthRequest).user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        error: 'Session expired. Please login again.',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    res.status(401).json({
      error: 'Invalid authentication token.',
      code: 'INVALID_TOKEN',
    });
  }
};

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'order-service' });
});

// Routes

/**
 * Create a new order
 * POST /api/orders
 * Requires authentication
 */
app.post('/api/orders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const orderData = req.body;

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
 * Requires authentication
 */
app.get('/api/orders/:id', authenticate, async (req: AuthRequest, res: Response) => {
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
 * Requires authentication
 */
app.get('/api/users/:userId/orders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Users can only view their own orders unless they have admin role
    if (userId !== requestingUserId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. You can only view your own orders.' });
    }

    const result = await orderService.getOrdersByUser(userId, page, limit);
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting user orders', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current user's orders
 * GET /api/orders
 * Requires authentication
 */
app.get('/api/orders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await orderService.getOrdersByUser(userId!, page, limit);
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting orders', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get orders for a seller
 * GET /api/sellers/:sellerId/orders
 * Requires authentication
 */
app.get('/api/sellers/:sellerId/orders', authenticate, async (req: AuthRequest, res: Response) => {
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
 * Requires authentication
 */
app.patch('/api/orders/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
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
 * Requires authentication
 */
app.patch('/api/orders/:id/payment', authenticate, async (req: AuthRequest, res: Response) => {
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
 * Requires authentication
 */
app.post('/api/orders/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user?.userId;

    if (!reason || !userId) {
      return res.status(400).json({ error: 'Reason is required' });
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
 * Requires authentication
 */
app.post('/api/orders/:id/returns', authenticate, async (req: AuthRequest, res: Response) => {
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
 * Requires authentication
 */
app.get('/api/sellers/:sellerId/stats', authenticate, async (req: AuthRequest, res: Response) => {
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
