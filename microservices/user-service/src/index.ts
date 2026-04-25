/**
 * User Service - Main Entry Point
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { runMigrations } from './db/migrate';
import { connectProducer, disconnectProducer } from './services/kafka.service';
import * as userService from './services/user.service';

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
  res.json({ status: 'healthy', service: 'user-service' });
});

// Routes

/**
 * Get user by ID
 * GET /api/users/:id
 */
app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    logger.error('Error getting user', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update user profile
 * PATCH /api/users/:id
 */
app.patch('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    logger.error('Error updating user', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user addresses
 * GET /api/users/:userId/addresses
 */
app.get('/api/users/:userId/addresses', async (req: Request, res: Response) => {
  try {
    const addresses = await userService.getUserAddresses(req.params.userId);
    res.json(addresses);
  } catch (error: any) {
    logger.error('Error getting addresses', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add address
 * POST /api/users/:userId/addresses
 */
app.post('/api/users/:userId/addresses', async (req: Request, res: Response) => {
  try {
    const address = await userService.addAddress(req.params.userId, req.body);
    res.status(201).json(address);
  } catch (error: any) {
    logger.error('Error adding address', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update address
 * PATCH /api/users/:userId/addresses/:addressId
 */
app.patch('/api/users/:userId/addresses/:addressId', async (req: Request, res: Response) => {
  try {
    const address = await userService.updateAddress(req.params.addressId, req.body);
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    res.json(address);
  } catch (error: any) {
    logger.error('Error updating address', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete address
 * DELETE /api/users/:userId/addresses/:addressId
 */
app.delete('/api/users/:userId/addresses/:addressId', async (req: Request, res: Response) => {
  try {
    const deleted = await userService.deleteAddress(req.params.addressId, req.params.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Address not found' });
    }
    res.json({ message: 'Address deleted' });
  } catch (error: any) {
    logger.error('Error deleting address', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Set default address
 * POST /api/users/:userId/addresses/:addressId/default
 */
app.post('/api/users/:userId/addresses/:addressId/default', async (req: Request, res: Response) => {
  try {
    const address = await userService.setDefaultAddress(req.params.addressId, req.params.userId);
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }
    res.json(address);
  } catch (error: any) {
    logger.error('Error setting default address', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user preferences
 * GET /api/users/:userId/preferences
 */
app.get('/api/users/:userId/preferences', async (req: Request, res: Response) => {
  try {
    const preferences = await userService.getUserPreferences(req.params.userId);
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
    const preferences = await userService.updateUserPreferences(req.params.userId, req.body);
    res.json(preferences);
  } catch (error: any) {
    logger.error('Error updating preferences', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Follow seller
 * POST /api/users/:userId/follow/:sellerId
 */
app.post('/api/users/:userId/follow/:sellerId', async (req: Request, res: Response) => {
  try {
    await userService.followSeller(req.params.userId, req.params.sellerId);
    res.json({ message: 'Seller followed' });
  } catch (error: any) {
    logger.error('Error following seller', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Unfollow seller
 * DELETE /api/users/:userId/follow/:sellerId
 */
app.delete('/api/users/:userId/follow/:sellerId', async (req: Request, res: Response) => {
  try {
    await userService.unfollowSeller(req.params.userId, req.params.sellerId);
    res.json({ message: 'Seller unfollowed' });
  } catch (error: any) {
    logger.error('Error unfollowing seller', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get seller's followers
 * GET /api/sellers/:sellerId/followers
 */
app.get('/api/sellers/:sellerId/followers', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await userService.getSellerFollowers(req.params.sellerId, page, limit);
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting followers', { error: error.message });
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
    app.listen(config.port, () => {
      logger.info(`User service listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

start();

export default app;
