/**
 * Cache Service - Redis caching for orders
 */

import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { Order } from '../types';

const CACHE_PREFIX = 'order:';
const CACHE_TTL = 3600; // 1 hour

let client: RedisClientType | null = null;
let isConnected = false;

/**
 * Connect to Redis
 */
export async function connectCache(): Promise<void> {
  if (client && isConnected) return;

  client = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis max retries reached');
          return new Error('Redis max retries reached');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  client.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
  });

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('ready', () => {
    isConnected = true;
    logger.info('Redis client ready');
  });

  client.on('end', () => {
    isConnected = false;
    logger.info('Redis client disconnected');
  });

  try {
    await client.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis', { error });
    throw error;
  }
}

/**
 * Disconnect from Redis
 */
export async function disconnectCache(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    isConnected = false;
  }
}

/**
 * Get cached order
 */
export async function getCachedOrder(orderId: string): Promise<Order | null> {
  if (!client || !isConnected) {
    logger.warn('Redis not connected, skipping cache get');
    return null;
  }

  try {
    const key = `${CACHE_PREFIX}${orderId}`;
    const data = await client.get(key);
    if (data) {
      logger.debug('Cache hit for order', { orderId });
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    logger.error('Cache get error', { orderId, error });
    return null;
  }
}

/**
 * Set cached order
 */
export async function setCachedOrder(order: Order): Promise<void> {
  if (!client || !isConnected) {
    logger.warn('Redis not connected, skipping cache set');
    return;
  }

  try {
    const key = `${CACHE_PREFIX}${order.id}`;
    await client.setEx(key, CACHE_TTL, JSON.stringify(order));
    logger.debug('Order cached', { orderId: order.id });
  } catch (error) {
    logger.error('Cache set error', { orderId: order.id, error });
  }
}

/**
 * Invalidate cached order
 */
export async function invalidateCachedOrder(orderId: string): Promise<void> {
  if (!client || !isConnected) {
    return;
  }

  try {
    const key = `${CACHE_PREFIX}${orderId}`;
    await client.del(key);
    logger.debug('Order cache invalidated', { orderId });
  } catch (error) {
    logger.error('Cache invalidate error', { orderId, error });
  }
}

/**
 * Get user's recent orders (cache)
 */
export async function getCachedUserOrders(
  userId: string
): Promise<Order[] | null> {
  if (!client || !isConnected) return null;

  try {
    const key = `${CACHE_PREFIX}user:${userId}:recent`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Cache get user orders error', { userId, error });
    return null;
  }
}

/**
 * Set user's recent orders (cache)
 */
export async function setCachedUserOrders(
  userId: string,
  orders: Order[]
): Promise<void> {
  if (!client || !isConnected) return;

  try {
    const key = `${CACHE_PREFIX}user:${userId}:recent`;
    await client.setEx(key, 300, JSON.stringify(orders)); // 5 min TTL
  } catch (error) {
    logger.error('Cache set user orders error', { userId, error });
  }
}

/**
 * Invalidate user's orders cache
 */
export async function invalidateUserOrdersCache(userId: string): Promise<void> {
  if (!client || !isConnected) return;

  try {
    const key = `${CACHE_PREFIX}user:${userId}:recent`;
    await client.del(key);
  } catch (error) {
    logger.error('Cache invalidate user orders error', { userId, error });
  }
}

export default {
  connectCache,
  disconnectCache,
  getCachedOrder,
  setCachedOrder,
  invalidateCachedOrder,
  getCachedUserOrders,
  setCachedUserOrders,
  invalidateUserOrdersCache,
};
