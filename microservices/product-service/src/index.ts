/**
 * Product Service - Main Entry Point
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { appConfig } from './config';
import { logger } from './utils/logger';
import { runMigrations } from './db/migrate';
import { closePool } from './db';
import { closeRedis } from './services/cache.service';
import { initProducer, disconnectKafka } from './services/kafka.service';
import * as productService from './services/product.service';

const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('Request', { method: req.method, path: req.path, status: res.statusCode, duration: Date.now() - start });
  });
  next();
});

// Health routes
app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'product-service' }));
app.get('/health/ready', async (req, res) => {
  const { healthCheck } = await import('./db');
  const { redisHealthCheck } = await import('./services/cache.service');
  const dbHealthy = await healthCheck();
  const redisHealthy = await redisHealthCheck();
  res.json({ status: dbHealthy && redisHealthy ? 'healthy' : 'degraded', checks: { db: dbHealthy, redis: redisHealthy } });
});

// Product Routes
app.get('/api/v1/categories', async (req, res) => {
  try {
    const categories = await productService.listCategories();
    res.json({ data: categories });
  } catch (error) {
    logger.error('List categories error', { error: (error as Error).message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/products', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, categoryId, brandId, search, sortBy, sortOrder } = req.query;
    const result = await productService.listProducts(
      { categoryId: categoryId as string, brandId: brandId as string, search: search as string, sortBy: sortBy as any, sortOrder: sortOrder as any },
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );
    res.json(result);
  } catch (error) {
    logger.error('List products error', { error: (error as Error).message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/products/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const products = await productService.getTrendingProducts(limit);
    res.json({ data: products });
  } catch (error) {
    logger.error('Trending products error', { error: (error as Error).message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/products/flash-sales', async (req, res) => {
  try {
    const products = await productService.getFlashSaleProducts();
    res.json({ data: products });
  } catch (error) {
    logger.error('Flash sale products error', { error: (error as Error).message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/products/:id', async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    // Increment view count
    productService.incrementViewCount(req.params.id).catch(() => {});
    res.json({ data: product });
  } catch (error) {
    logger.error('Get product error', { error: (error as Error).message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/v1/products/slug/:slug', async (req, res) => {
  try {
    const product = await productService.getProductBySlug(req.params.slug);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    productService.incrementViewCount(product.id).catch(() => {});
    res.json({ data: product });
  } catch (error) {
    logger.error('Get product by slug error', { error: (error as Error).message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down...`);
  await closePool();
  await closeRedis();
  await disconnectKafka();
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer() {
  try {
    logger.info('Starting Product Service...');
    await runMigrations();
    initProducer().catch((err) => logger.warn('Kafka init failed', { error: err.message }));

    app.listen(appConfig.PORT, () => {
      logger.info(`Product Service listening on port ${appConfig.PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

export { app };
