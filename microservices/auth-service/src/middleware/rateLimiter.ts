/**
 * Rate Limiting Middleware
 * Redis-based rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { cacheIncrement, CacheKeys, CacheTTL } from '../services/cache.service';
import { appConfig } from '../config';
import { logger } from '../utils/logger';

interface RateLimitInfo {
  remaining: number;
  limit: number;
  resetTime: Date;
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: Request): string {
  // Use user ID if authenticated
  if (req.userId) {
    return `user:${req.userId}`;
  }

  // Use API key if present
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    return `apikey:${apiKey.substring(0, 8)}`;
  }

  // Fall back to IP address
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  return `ip:${ip}`;
}

/**
 * Generic rate limiter
 */
export function rateLimit(options?: {
  windowMs?: number;
  max?: number;
  keyPrefix?: string;
}) {
  const windowMs = options?.windowMs || appConfig.RATE_LIMIT_WINDOW_MS;
  const max = options?.max || appConfig.RATE_LIMIT_MAX_REQUESTS;
  const keyPrefix = options?.keyPrefix || 'rl';

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const identifier = getClientIdentifier(req);
    const key = `${keyPrefix}:${identifier}`;

    try {
      const count = await cacheIncrement(key, Math.ceil(windowMs / 1000));

      // Set rate limit headers
      const resetTime = new Date(Date.now() + windowMs);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));
      res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

      if (count > max) {
        logger.warn('Rate limit exceeded', { identifier, count, max });
        res.status(429).json({
          error: 'Too Many Requests',
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000),
        });
        return;
      }

      next();
    } catch (error) {
      // If Redis fails, allow the request but log the error
      logger.error('Rate limit check failed', {
        error: (error as Error).message,
      });
      next();
    }
  };
}

/**
 * Stricter rate limiter for sensitive endpoints
 */
export function strictRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    keyPrefix: 'strict',
  })(req, res, next);
}

/**
 * Auth-specific rate limiter
 */
export function authRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 login attempts per 15 minutes
    keyPrefix: 'auth',
  })(req, res, next);
}

/**
 * Registration rate limiter
 */
export function registrationRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Only 5 registrations per hour per IP
    keyPrefix: 'register',
  })(req, res, next);
}

/**
 * Password reset rate limiter
 */
export function passwordResetRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Only 3 password resets per hour
    keyPrefix: 'password_reset',
  })(req, res, next);
}

/**
 * API rate limiter (for service calls)
 */
export function apiRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000, // 1000 requests per minute for services
    keyPrefix: 'api',
  })(req, res, next);
}

export default {
  rateLimit,
  strictRateLimit,
  authRateLimit,
  registrationRateLimit,
  passwordResetRateLimit,
  apiRateLimit,
};
