/**
 * Redis Cache Service for Product Service
 */

import Redis from 'ioredis';
import { appConfig } from '../config';
import { logger } from '../utils/logger';

const redis = new Redis(appConfig.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  },
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));

export const CacheKeys = {
  product: (id: string) => `product:detail:${id}`,
  productList: (key: string) => `product:list:${key}`,
  category: (id: string) => `product:category:${id}`,
  brand: (id: string) => `product:brand:${id}`,
};

export const CacheTTL = {
  product: 15 * 60,
  productList: 5 * 60,
  category: 60 * 60,
  brand: 60 * 60,
  trending: 15 * 60,
};

export async function cacheSet(key: string, value: any, ttlSeconds?: number): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) await redis.setex(key, ttlSeconds, serialized);
    else await redis.set(key, serialized);
  } catch (error) {
    logger.error('Cache set error', { key, error: (error as Error).message });
  }
}

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    logger.error('Cache delete error', { error: (error as Error).message });
  }
}

export async function closeRedis(): Promise<void> {
  await redis.quit();
}

export async function redisHealthCheck(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export { redis };
export default { cacheSet, cacheGet, cacheDelete, closeRedis, redisHealthCheck };
