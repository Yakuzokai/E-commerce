/**
 * Health Routes
 * Service health and readiness endpoints
 */

import { Router, Request, Response } from 'express';
import { healthCheck as dbHealthCheck } from '../db';
import { redisHealthCheck } from '../services/cache.service';
import { kafkaHealthCheck } from '../services/kafka.service';
import { logger } from '../utils/logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: {
    database: boolean;
    redis: boolean;
    kafka: boolean;
  };
}

/**
 * GET /health
 * Basic health check
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
  });
});

/**
 * GET /health/ready
 * Readiness probe - checks all dependencies
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks = {
    database: await dbHealthCheck(),
    redis: await redisHealthCheck(),
    kafka: kafkaHealthCheck(),
  };

  const allHealthy = Object.values(checks).every(Boolean);
  const anyHealthy = Object.values(checks).some(Boolean);

  const status: 'healthy' | 'degraded' | 'unhealthy' = allHealthy
    ? 'healthy'
    : anyHealthy
    ? 'degraded'
    : 'unhealthy';

  const response: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks,
  };

  const statusCode = allHealthy ? 200 : anyHealthy ? 200 : 503;

  res.status(statusCode).json(response);
});

/**
 * GET /health/live
 * Liveness probe - just checks if the service is running
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;
