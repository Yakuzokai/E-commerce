/**
 * Auth Service - Main Entry Point
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import { appConfig, corsOrigins, isProduction } from './config';
import { logger } from './utils/logger';
import { runMigrations } from './db/migrate';
import { closePool } from './db';
import { closeRedis } from './services/cache.service';
import { initProducer, disconnectKafka } from './services/kafka.service';
import { notFoundHandler, errorHandler } from './middleware/error.middleware';
import { rateLimit } from './middleware/rateLimiter';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import healthRoutes from './routes/health.routes';

// Create Express app
const app: Express = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: isProduction,
  crossOriginEmbedderPolicy: isProduction,
}));

// CORS configuration
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
    });
  });
  next();
});

// Rate limiting
app.use(rateLimit({
  windowMs: appConfig.RATE_LIMIT_WINDOW_MS,
  max: appConfig.RATE_LIMIT_MAX_REQUESTS,
}));

// API Routes
app.use('/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'auth-service',
    version: '1.0.0',
    description: 'Authentication and Authorization Service',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
    },
  });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close database connections
    await closePool();
    logger.info('Database connections closed');

    // Close Redis connection
    await closeRedis();
    logger.info('Redis connection closed');

    // Disconnect Kafka
    await disconnectKafka();
    logger.info('Kafka disconnected');

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer() {
  try {
    logger.info('Starting Auth Service...');

    // Run database migrations
    logger.info('Running database migrations...');
    await runMigrations();

    // Start HTTP server
    app.listen(appConfig.PORT, () => {
      logger.info(`Auth Service listening on port ${appConfig.PORT}`);
      logger.info(`Environment: ${appConfig.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${appConfig.PORT}/health`);

      // Initialize Kafka producer (non-blocking, after server is up)
      initProducer().catch((err) => {
        logger.warn('Kafka initialization failed (non-critical)', {
          error: err.message,
        });
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: (error as Error).message,
    });
    process.exit(1);
  }
}

// Start if run directly
if (require.main === module) {
  startServer();
}

export { app };
export default app;
