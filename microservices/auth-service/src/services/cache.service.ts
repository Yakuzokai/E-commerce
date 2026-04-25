/**
 * Redis Cache Service
 * Session management and caching
 */

import Redis from 'ioredis';
import { appConfig } from '../config';
import { logger } from '../utils/logger';

// Create Redis client
const redis = new Redis(appConfig.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      logger.error('Redis connection failed after 3 retries');
      return null;
    }
    return Math.min(times * 100, 3000);
  },
  reconnectOnError: (err) => {
    logger.warn('Redis reconnecting...', { error: err.message });
    return true;
  },
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error('Redis error', { error: err.message });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

/**
 * Cache keys
 */
export const CacheKeys = {
  session: (userId: string) => `auth:session:${userId}`,
  refreshToken: (tokenHash: string) => `auth:refresh:${tokenHash}`,
  userProfile: (userId: string) => `auth:profile:${userId}`,
  rateLimit: (key: string) => `auth:ratelimit:${key}`,
  failedLogin: (identifier: string) => `auth:failedlogin:${identifier}`,
  verificationToken: (tokenHash: string) => `auth:verify:${tokenHash}`,
} as const;

/**
 * TTL in seconds
 */
export const CacheTTL = {
  session: 7 * 24 * 60 * 60, // 7 days
  refreshToken: 30 * 24 * 60 * 60, // 30 days
  userProfile: 60 * 60, // 1 hour
  rateLimit: 60, // 1 minute
  failedLogin: 15 * 60, // 15 minutes
  verificationToken: 24 * 60 * 60, // 24 hours
} as const;

/**
 * Set a value with optional TTL
 */
export async function cacheSet(
  key: string,
  value: string | object,
  ttlSeconds?: number
): Promise<void> {
  try {
    const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      await redis.set(key, serialized);
    }
  } catch (error) {
    logger.error('Cache set error', { key, error: (error as Error).message });
    throw error;
  }
}

/**
 * Get a value from cache
 */
export async function cacheGet<T = string>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;

    // Try to parse as JSON, otherwise return as string
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  } catch (error) {
    logger.error('Cache get error', { key, error: (error as Error).message });
    return null;
  }
}

/**
 * Delete a key from cache
 */
export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    logger.error('Cache delete error', { key, error: (error as Error).message });
  }
}

/**
 * Check if key exists
 */
export async function cacheExists(key: string): Promise<boolean> {
  try {
    const result = await redis.exists(key);
    return result === 1;
  } catch (error) {
    logger.error('Cache exists error', { key, error: (error as Error).message });
    return false;
  }
}

/**
 * Increment a counter with TTL
 */
export async function cacheIncrement(
  key: string,
  ttlSeconds?: number
): Promise<number> {
  try {
    const count = await redis.incr(key);
    if (ttlSeconds && count === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return count;
  } catch (error) {
    logger.error('Cache increment error', { key, error: (error as Error).message });
    throw error;
  }
}

/**
 * Get TTL of a key
 */
export async function cacheTTL(key: string): Promise<number> {
  try {
    return await redis.ttl(key);
  } catch (error) {
    logger.error('Cache TTL error', { key, error: (error as Error).message });
    return -1;
  }
}

/**
 * Set multiple values
 */
export async function cacheSetMany(
  entries: Array<{ key: string; value: string | object; ttl?: number }>
): Promise<void> {
  try {
    const pipeline = redis.pipeline();
    for (const { key, value, ttl } of entries) {
      const serialized = typeof value === 'object' ? JSON.stringify(value) : value;
      if (ttl) {
        pipeline.setex(key, ttl, serialized);
      } else {
        pipeline.set(key, serialized);
      }
    }
    await pipeline.exec();
  } catch (error) {
    logger.error('Cache set many error', { error: (error as Error).message });
    throw error;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  await redis.quit();
  logger.info('Redis connection closed');
}

/**
 * Health check
 */
export async function redisHealthCheck(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export { redis };
export default {
  cacheSet,
  cacheGet,
  cacheDelete,
  cacheExists,
  cacheIncrement,
  cacheTTL,
  cacheSetMany,
  closeRedis,
  redisHealthCheck,
  redis,
};
