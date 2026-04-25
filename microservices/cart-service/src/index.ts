/**
 * Cart Service - Main Entry Point
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { connectRedis, disconnectRedis } from './services/cart.service';
import { connectProducer, disconnectProducer } from './services/kafka.service';

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
  res.json({ status: 'healthy', service: 'cart-service' });
});

// Routes

/**
 * Get cart
 * GET /api/users/:userId/cart
 */
app.get('/api/users/:userId/cart', async (req: Request, res: Response) => {
  try {
    const { getCart } = require('./services/cart.service');
    const cart = await getCart(req.params.userId);
    res.json(cart);
  } catch (error: any) {
    logger.error('Error getting cart', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add item to cart
 * POST /api/users/:userId/cart/items
 */
app.post('/api/users/:userId/cart/items', async (req: Request, res: Response) => {
  try {
    const { addToCart } = require('./services/cart.service');
    const cart = await addToCart(req.params.userId, req.body);
    res.status(201).json(cart);
  } catch (error: any) {
    logger.error('Error adding to cart', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

/**
 * Update cart item
 * PATCH /api/users/:userId/cart/items/:itemId
 */
app.patch('/api/users/:userId/cart/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { updateCartItem } = require('./services/cart.service');
    const { quantity } = req.body;
    const cart = await updateCartItem(req.params.userId, req.params.itemId, quantity);
    res.json(cart);
  } catch (error: any) {
    logger.error('Error updating cart item', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

/**
 * Remove item from cart
 * DELETE /api/users/:userId/cart/items/:itemId
 */
app.delete('/api/users/:userId/cart/items/:itemId', async (req: Request, res: Response) => {
  try {
    const { removeFromCart } = require('./services/cart.service');
    const cart = await removeFromCart(req.params.userId, req.params.itemId);
    res.json(cart);
  } catch (error: any) {
    logger.error('Error removing from cart', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

/**
 * Clear cart
 * DELETE /api/users/:userId/cart
 */
app.delete('/api/users/:userId/cart', async (req: Request, res: Response) => {
  try {
    const { clearCart } = require('./services/cart.service');
    await clearCart(req.params.userId);
    res.json({ message: 'Cart cleared' });
  } catch (error: any) {
    logger.error('Error clearing cart', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Apply voucher
 * POST /api/users/:userId/cart/vouchers
 */
app.post('/api/users/:userId/cart/vouchers', async (req: Request, res: Response) => {
  try {
    const { applyVoucher } = require('./services/cart.service');
    const cart = await applyVoucher(req.params.userId, req.body);
    res.json(cart);
  } catch (error: any) {
    logger.error('Error applying voucher', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

/**
 * Remove voucher
 * DELETE /api/users/:userId/cart/vouchers/:code
 */
app.delete('/api/users/:userId/cart/vouchers/:code', async (req: Request, res: Response) => {
  try {
    const { removeVoucher } = require('./services/cart.service');
    const cart = await removeVoucher(req.params.userId, req.params.code);
    res.json(cart);
  } catch (error: any) {
    logger.error('Error removing voucher', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get cart summary
 * GET /api/users/:userId/cart/summary
 */
app.get('/api/users/:userId/cart/summary', async (req: Request, res: Response) => {
  try {
    const { getCartSummary } = require('./services/cart.service');
    const shippingFee = parseFloat(req.query.shippingFee as string) || 5.99;
    const summary = await getCartSummary(req.params.userId, shippingFee);
    res.json(summary);
  } catch (error: any) {
    logger.error('Error getting cart summary', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Merge guest cart
 * POST /api/users/:userId/cart/merge
 */
app.post('/api/users/:userId/cart/merge', async (req: Request, res: Response) => {
  try {
    const { mergeGuestCart } = require('./services/cart.service');
    const { guestCartId, items } = req.body;
    const cart = await mergeGuestCart(req.params.userId, guestCartId, items);
    res.json(cart);
  } catch (error: any) {
    logger.error('Error merging cart', { error: error.message });
    res.status(400).json({ error: error.message });
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
  await disconnectProducer();
  await disconnectRedis();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const start = async () => {
  try {
    await connectRedis();
    await connectProducer();

    app.listen(config.port, () => {
      logger.info(`Cart service listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

start();

export default app;
