/**
 * Review Service - Main Entry Point
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { runMigrations } from './db/migrate';
import { connectProducer, disconnectProducer } from './services/kafka.service';
import * as reviewService from './services/review.service';

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
  res.json({ status: 'healthy', service: 'review-service' });
});

// Routes

/**
 * Get product reviews
 * GET /api/products/:productId/reviews
 */
app.get('/api/products/:productId/reviews', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = req.query.sortBy as any || 'newest';

    const result = await reviewService.getProductReviews(
      req.params.productId,
      page,
      limit,
      sortBy
    );
    res.json(result);
  } catch (error: any) {
    logger.error('Error getting reviews', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get product rating summary
 * GET /api/products/:productId/rating-summary
 */
app.get('/api/products/:productId/rating-summary', async (req: Request, res: Response) => {
  try {
    const summary = await reviewService.getProductRatingSummary(req.params.productId);
    res.json(summary);
  } catch (error: any) {
    logger.error('Error getting rating summary', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get multiple products rating summaries
 * POST /api/products/rating-summaries
 */
app.post('/api/products/rating-summaries', async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body;
    const summaries = await reviewService.getProductsRatingSummaries(productIds);
    res.json(summaries);
  } catch (error: any) {
    logger.error('Error getting rating summaries', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create review
 * POST /api/reviews
 */
app.post('/api/reviews', async (req: Request, res: Response) => {
  try {
    const { userId, productId, orderId, rating, title, content, images } = req.body;
    const review = await reviewService.createReview(userId, {
      productId,
      orderId,
      rating,
      title,
      content,
      images,
    });
    res.status(201).json(review);
  } catch (error: any) {
    logger.error('Error creating review', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get review by ID
 * GET /api/reviews/:id
 */
app.get('/api/reviews/:id', async (req: Request, res: Response) => {
  try {
    const review = await reviewService.getReviewById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(review);
  } catch (error: any) {
    logger.error('Error getting review', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update review
 * PATCH /api/reviews/:id
 */
app.patch('/api/reviews/:id', async (req: Request, res: Response) => {
  try {
    const { userId, ...data } = req.body;
    const review = await reviewService.updateReview(req.params.id, userId, data);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(review);
  } catch (error: any) {
    logger.error('Error updating review', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete review
 * DELETE /api/reviews/:id
 */
app.delete('/api/reviews/:id', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const deleted = await reviewService.deleteReview(req.params.id, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json({ message: 'Review deleted' });
  } catch (error: any) {
    logger.error('Error deleting review', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Vote on review
 * POST /api/reviews/:id/vote
 */
app.post('/api/reviews/:id/vote', async (req: Request, res: Response) => {
  try {
    const { userId, vote } = req.body;
    const review = await reviewService.voteOnReview(req.params.id, userId, vote);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }
    res.json(review);
  } catch (error: any) {
    logger.error('Error voting on review', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add seller response
 * POST /api/reviews/:id/response
 */
app.post('/api/reviews/:id/response', async (req: Request, res: Response) => {
  try {
    const { sellerId, sellerName, content } = req.body;
    const response = await reviewService.addSellerResponse(
      req.params.id,
      sellerId,
      sellerName,
      content
    );
    res.status(201).json(response);
  } catch (error: any) {
    logger.error('Error adding seller response', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get user's reviews
 * GET /api/users/:userId/reviews
 */
app.get('/api/users/:userId/reviews', async (req: Request, res: Response) => {
  try {
    const reviews = await reviewService.getUserReviews(req.params.userId);
    res.json(reviews);
  } catch (error: any) {
    logger.error('Error getting user reviews', { error: error.message });
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
      logger.info(`Review service listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

start();

export default app;
