/**
 * Search Service - Main Entry Point
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './utils/logger';
import { connectElasticsearch, closeClient, search, autocomplete, getSimilarProducts } from './services/elasticsearch.service';
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
  res.json({ status: 'healthy', service: 'search-service' });
});

// Routes

/**
 * Search products
 * GET /api/search
 */
app.get('/api/search', async (req: Request, res: Response) => {
  try {
    const {
      q,
      page,
      limit,
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      sortBy,
      inStock,
      flashSale,
    } = req.query;

    const result = await search({
      query: q as string,
      page: parseInt(page as string) || 1,
      limit: parseInt(limit as string) || 20,
      category: category as string,
      brand: brand as string,
      minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      rating: rating ? parseFloat(rating as string) : undefined,
      sortBy: sortBy as any,
      filters: {
        inStock: inStock === 'true',
        flashSale: flashSale === 'true',
      },
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Search error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Autocomplete suggestions
 * GET /api/search/suggest
 */
app.get('/api/search/suggest', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || (q as string).length < 2) {
      return res.json({ suggestions: [], took: 0 });
    }

    const result = await autocomplete(q as string);
    res.json(result);
  } catch (error: any) {
    logger.error('Autocomplete error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get similar products
 * GET /api/search/similar/:productId
 */
app.get('/api/search/similar/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { limit } = req.query;

    const products = await getSimilarProducts(productId, parseInt(limit as string) || 5);
    res.json(products);
  } catch (error: any) {
    logger.error('Similar products error', { error: error.message });
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
  await closeClient();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const start = async () => {
  try {
    await connectElasticsearch();
    await startConsumer();

    app.listen(config.port, () => {
      logger.info(`Search service listening on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

start();

export default app;
