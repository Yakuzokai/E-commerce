/**
 * Recommendation Service - AI-based product recommendations
 * Phase 1: Rule-based recommendations
 * Phase 2: Collaborative filtering (placeholder for ML integration)
 */

import { createClient, RedisClientType } from 'redis';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ProductRecommendation, UserBehaviorEvent, TrendingProduct, RecentlyViewedProduct } from '../types';
import { publishEvent, RECOMMENDATION_TOPICS } from './kafka.service';
import { v4 as uuidv4 } from 'uuid';

let redisClient: RedisClientType | null = null;
let esClient: ElasticsearchClient | null = null;

const REDIS_PREFIX = 'rec:';
const TRENDING_KEY = 'trending:products';
const USER_VIEWED_PREFIX = 'user:viewed:';
const PRODUCT_VIEWS_PREFIX = 'product:views:';

export async function connectRedis(): Promise<void> {
  redisClient = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) return new Error('Redis max retries');
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisClient.on('error', (err) => logger.error('Redis error', { error: err.message }));
  redisClient.on('connect', () => logger.info('Redis connected'));

  await redisClient.connect();
}

export async function connectElasticsearch(): Promise<void> {
  esClient = new ElasticsearchClient({
    node: config.elasticsearch.url,
  });

  try {
    const health = await esClient.cluster.health({});
    logger.info('Elasticsearch connected', { status: health.status });

    // Create behavior index if not exists
    await createBehaviorIndex();
  } catch (error: any) {
    logger.error('Elasticsearch connection failed', { error: error.message });
  }
}

async function createBehaviorIndex(): Promise<void> {
  if (!esClient) return;

  const indexName = 'user_behavior';

  const exists = await esClient.indices.exists({ index: indexName });

  if (!exists) {
    await esClient.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            productId: { type: 'keyword' },
            eventType: { type: 'keyword' },
            timestamp: { type: 'date' },
            category: { type: 'keyword' },
            brand: { type: 'keyword' },
            price: { type: 'float' },
            searchQuery: { type: 'text' },
          },
        },
      },
    });
    logger.info('Created user_behavior index');
  }
}

/**
 * Track user behavior event
 */
export async function trackBehavior(event: UserBehaviorEvent): Promise<void> {
  // Store in Elasticsearch for analysis
  if (esClient) {
    try {
      await esClient.index({
        index: 'user_behavior',
        body: {
          ...event,
          timestamp: event.timestamp || new Date(),
        },
      });
    } catch (error: any) {
      logger.error('Failed to index behavior', { error: error.message });
    }
  }

  // Update Redis counters
  if (redisClient) {
    try {
      const productKey = `${PRODUCT_VIEWS_PREFIX}${event.productId}`;

      if (event.eventType === 'view') {
        await redisClient.zIncrBy(productKey, 1, event.userId);

        // Track recently viewed
        const viewedKey = `${USER_VIEWED_PREFIX}${event.userId}`;
        await redisClient.zAdd(viewedKey, {
          score: Date.now(),
          value: event.productId,
        });
        // Keep only last N items
        await redisClient.zRemRangeByRank(viewedKey, 0, -config.ml.recentlyViewedLimit - 1);

        // Update trending
        await redisClient.zIncrBy(TRENDING_KEY, 1, event.productId);
      } else if (event.eventType === 'add_to_cart') {
        await redisClient.zIncrBy(productKey, 3, event.userId); // Weight: 3
        await redisClient.zIncrBy(TRENDING_KEY, 3, event.productId);
      } else if (event.eventType === 'purchase') {
        await redisClient.zIncrBy(productKey, 5, event.userId); // Weight: 5
        await redisClient.zIncrBy(TRENDING_KEY, 5, event.productId);
      }
    } catch (error: any) {
      logger.error('Failed to update Redis', { error: error.message });
    }
  }

  // Publish event
  await publishEvent(RECOMMENDATION_TOPICS.BEHAVIOR_TRACKED, {
    eventType: 'BEHAVIOR_TRACKED',
    eventId: uuidv4(),
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: event,
  });
}

/**
 * Get trending products
 */
export async function getTrendingProducts(limit: number = 20): Promise<TrendingProduct[]> {
  if (!redisClient) return [];

  try {
    const results = await redisClient.zRangeWithScores(TRENDING_KEY, 0, limit - 1, { REV: true });

    return results.map((item, index) => ({
      productId: item.value,
      viewCount: 0,
      purchaseCount: 0,
      addToCartCount: 0,
      score: item.score,
      rank: index + 1,
    }));
  } catch (error: any) {
    logger.error('Failed to get trending', { error: error.message });
    return [];
  }
}

/**
 * Get personalized recommendations for user
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit: number = 50
): Promise<ProductRecommendation[]> {
  if (!redisClient) return [];

  const recommendations: ProductRecommendation[] = [];

  try {
    // 1. Get recently viewed categories (category affinity)
    const viewedKey = `${USER_VIEWED_PREFIX}${userId}`;
    const recentProducts = await redisClient.zRange(viewedKey, 0, -1);

    if (recentProducts.length > 0) {
      // 2. Find trending products in similar categories (simplified - would use product service in production)
      // For now, just return trending products
      const trending = await getTrendingProducts(limit);

      for (const item of trending) {
        if (!recentProducts.includes(item.productId)) {
          recommendations.push({
            productId: item.productId,
            score: item.score * 0.8, // Slightly reduce score for non-viewed
            reason: 'Trending in categories you like',
            type: 'personalized',
          });
        }
      }
    } else {
      // New user - return trending products
      const trending = await getTrendingProducts(limit);
      for (const item of trending) {
        recommendations.push({
          productId: item.productId,
          score: item.score,
          reason: 'Popular with other shoppers',
          type: 'trending',
        });
      }
    }
  } catch (error: any) {
    logger.error('Failed to get personalized recommendations', { error: error.message });
  }

  return recommendations.slice(0, limit);
}

/**
 * Get similar products
 */
export async function getSimilarProducts(
  productId: string,
  limit: number = 20
): Promise<ProductRecommendation[]> {
  if (!redisClient) return [];

  try {
    // Get products frequently viewed together
    const togetherKey = `together:${productId}`;
    const results = await redisClient.zRangeWithScores(togetherKey, 0, limit - 1, { REV: true });

    return results.map(item => ({
      productId: item.value,
      score: item.score,
      reason: 'Frequently viewed together',
      type: 'similar' as const,
    }));
  } catch (error: any) {
    logger.error('Failed to get similar products', { error: error.message });
    return [];
  }
}

/**
 * Get frequently bought together
 */
export async function getFrequentlyBoughtTogether(
  productIds: string[],
  limit: number = 10
): Promise<ProductRecommendation[]> {
  const recommendations: ProductRecommendation[] = [];

  if (!redisClient) return recommendations;

  try {
    for (const productId of productIds) {
      const key = `bought_together:${productId}`;
      const results = await redisClient.zRangeWithScores(key, 0, limit - 1, { REV: true });

      for (const item of results) {
        if (!productIds.includes(item.value)) {
          recommendations.push({
            productId: item.value,
            score: item.score,
            reason: 'Frequently bought together',
            type: 'frequently_bought_together',
          });
        }
      }
    }
  } catch (error: any) {
    logger.error('Failed to get frequently bought together', { error: error.message });
  }

  // Deduplicate and return top N
  const unique = new Map<string, ProductRecommendation>();
  for (const rec of recommendations) {
    if (!unique.has(rec.productId)) {
      unique.set(rec.productId, rec);
    }
  }

  return Array.from(unique.values()).slice(0, limit);
}

/**
 * Get recently viewed products
 */
export async function getRecentlyViewed(
  userId: string,
  limit: number = 20
): Promise<RecentlyViewedProduct[]> {
  if (!redisClient) return [];

  try {
    const viewedKey = `${USER_VIEWED_PREFIX}${userId}`;
    const results = await redisClient.zRangeWithScores(viewedKey, 0, limit - 1, { REV: true });

    return results.map(item => ({
      productId: item.value,
      viewedAt: new Date(item.score),
    }));
  } catch (error: any) {
    logger.error('Failed to get recently viewed', { error: error.message });
    return [];
  }
}

/**
 * Get new arrivals
 */
export async function getNewArrivals(
  category?: string,
  limit: number = 20
): Promise<ProductRecommendation[]> {
  // In production, this would query the product service
  // For now, return placeholder
  logger.info('Getting new arrivals', { category, limit });

  return []; // Would be populated from product-service
}

/**
 * Get flash sale recommendations
 */
export async function getFlashSaleRecommendations(
  userId: string,
  limit: number = 20
): Promise<ProductRecommendation[]> {
  // Get user's preferred categories from behavior
  // Return flash sale items in those categories
  logger.info('Getting flash sale recommendations', { userId, limit });

  return []; // Would be populated from flash-sale data
}

/**
 * Update trending scores (scheduled job)
 */
export async function decayTrendingScores(): Promise<void> {
  if (!redisClient) return;

  try {
    // Decay all scores by 10%
    const results = await redisClient.zRangeWithScores(TRENDING_KEY, 0, -1);

    for (const item of results) {
      const newScore = item.score * 0.9;
      if (newScore < 1) {
        await redisClient.zRem(TRENDING_KEY, item.value);
      } else {
        await redisClient.zAdd(TRENDING_KEY, { score: newScore, value: item.value });
      }
    }

    logger.info('Decayed trending scores');
  } catch (error: any) {
    logger.error('Failed to decay trending scores', { error: error.message });
  }
}

/**
 * Add frequently bought together relationship
 */
export async function addBoughtTogetherRelationship(
  productId: string,
  boughtWithProductId: string,
  weight: number = 1
): Promise<void> {
  if (!redisClient) return;

  try {
    const key = `bought_together:${productId}`;
    await redisClient.zIncrBy(key, weight, boughtWithProductId);

    // Also add reverse relationship
    const reverseKey = `bought_together:${boughtWithProductId}`;
    await redisClient.zIncrBy(reverseKey, weight, productId);
  } catch (error: any) {
    logger.error('Failed to add bought together relationship', { error: error.message });
  }
}

/**
 * Add viewed together relationship
 */
export async function addViewedTogetherRelationship(
  productId: string,
  viewedWithProductId: string
): Promise<void> {
  if (!redisClient) return;

  try {
    const key = `together:${productId}`;
    await redisClient.zIncrBy(key, 0.5, viewedWithProductId);
  } catch (error: any) {
    logger.error('Failed to add viewed together relationship', { error: error.message });
  }
}

export async function disconnectAll(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
  if (esClient) {
    await esClient.close();
    esClient = null;
  }
}

export default {
  connectRedis,
  connectElasticsearch,
  trackBehavior,
  getTrendingProducts,
  getPersonalizedRecommendations,
  getSimilarProducts,
  getFrequentlyBoughtTogether,
  getRecentlyViewed,
  getNewArrivals,
  getFlashSaleRecommendations,
  decayTrendingScores,
  addBoughtTogetherRelationship,
  addViewedTogetherRelationship,
  disconnectAll,
};
