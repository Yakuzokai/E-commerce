/**
 * Recommendation Service - Main Entry Point
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { connectRedis, connectElasticsearch, disconnectAll } from './services/recommendation.service';
import { startConsumer, stopConsumer } from './services/kafka.service';

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
  res.json({ status: 'healthy', service: 'recommendation-service' });
});

// Routes

/**
 * Track user behavior
 * POST /api/behavior
 */
app.post('/api/behavior', async (req: Request, res: Response) => {
  try {
    const { trackBehavior } = require('./services/recommendation.service');
    await trackBehavior(req.body);
    res.json({ message: 'Behavior tracked' });
  } catch (error: any) {
    logger.error('Error tracking behavior', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get trending products
 * GET /api/recommendations/trending
 */
app.get('/api/recommendations/trending', async (req: Request, res: Response) => {
  try {
    const { getTrendingProducts } = require('./services/recommendation.service');
    const limit = parseInt(req.query.limit as string) || 20;
    const products = await getTrendingProducts(limit);
    res.json(products);
  } catch (error: any) {
    logger.error('Error getting trending', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get personalized recommendations
 * GET /api/recommendations/personalized/:userId
 */
app.get('/api/recommendations/personalized/:userId', async (req: Request, res: Response) => {
  try {
    const { getPersonalizedRecommendations } = require('./services/recommendation.service');
    const limit = parseInt(req.query.limit as string) || 50;
    const recommendations = await getPersonalizedRecommendations(req.params.userId, limit);
    res.json({
      userId: req.params.userId,
      recommendations,
      generatedAt: new Date(),
    });
  } catch (error: any) {
    logger.error('Error getting personalized recommendations', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get similar products
 * GET /api/recommendations/similar/:productId
 */
app.get('/api/recommendations/similar/:productId', async (req: Request, res: Response) => {
  try {
    const { getSimilarProducts } = require('./services/recommendation.service');
    const limit = parseInt(req.query.limit as string) || 20;
    const recommendations = await getSimilarProducts(req.params.productId, limit);
    res.json(recommendations);
  } catch (error: any) {
    logger.error('Error getting similar products', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get frequently bought together
 * POST /api/recommendations/frequently-bought-together
 */
app.post('/api/recommendations/frequently-bought-together', async (req: Request, res: Response) => {
  try {
    const { getFrequentlyBoughtTogether } = require('./services/recommendation.service');
    const { productIds, limit } = req.body;
    const recommendations = await getFrequentlyBoughtTogether(productIds, limit || 10);
    res.json(recommendations);
  } catch (error: any) {
    logger.error('Error getting frequently bought together', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get recently viewed products
 * GET /api/recommendations/recently-viewed/:userId
 */
app.get('/api/recommendations/recently-viewed/:userId', async (req: Request, res: Response) => {
  try {
    const { getRecentlyViewed } = require('./services/recommendation.service');
    const limit = parseInt(req.query.limit as string) || 20;
    const products = await getRecentlyViewed(req.params.userId, limit);
    res.json(products);
  } catch (error: any) {
    logger.error('Error getting recently viewed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get new arrivals
 * GET /api/recommendations/new-arrivals
 */
app.get('/api/recommendations/new-arrivals', async (req: Request, res: Response) => {
  try {
    const { getNewArrivals } = require('./services/recommendation.service');
    const { category, limit } = req.query;
    const recommendations = await getNewArrivals(category as string, parseInt(limit as string) || 20);
    res.json(recommendations);
  } catch (error: any) {
    logger.error('Error getting new arrivals', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get flash sale recommendations
 * GET /api/recommendations/flash-sale/:userId
 */
app.get('/api/recommendations/flash-sale/:userId', async (req: Request, res: Response) => {
  try {
    const { getFlashSaleRecommendations } = require('./services/recommendation.service');
    const limit = parseInt(req.query.limit as string) || 20;
    const recommendations = await getFlashSaleRecommendations(req.params.userId, limit);
    res.json(recommendations);
  } catch (error: any) {
    logger.error('Error getting flash sale recommendations', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Trigger trending score decay
 * POST /api/admin/decay-trending
 */
app.post('/api/admin/decay-trending', async (req: Request, res: Response) => {
  try {
    const { decayTrendingScores } = require('./services/recommendation.service');
    await decayTrendingScores();
    res.json({ message: 'Trending scores decayed' });
  } catch (error: any) {
    logger.error('Error decaying trending', { error: error.message });
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
  await disconnectAll();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const start = async () => {
  try {
    await connectRedis();
    await connectElasticsearch();
    await startConsumer();

    app.listen(config.port, () => {
      logger.info(`Recommendation service listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

start();

export default app;
