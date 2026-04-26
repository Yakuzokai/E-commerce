import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

export class CacheService {
  private redis: Redis;
  private prefix = 'ml:';

  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redis.on('error', (err) => logger.error('Redis error:', err));
    this.redis.on('connect', () => logger.info('Connected to Redis'));
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(this.prefix + key, ttl, serialized);
    } else {
      await this.redis.set(this.prefix + key, serialized);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(this.prefix + key);
    return data ? JSON.parse(data) : null;
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.prefix + key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.redis.exists(this.prefix + key)) === 1;
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const prefixedKeys = keys.map(k => this.prefix + k);
    const values = await this.redis.mget(...prefixedKeys);
    return values.map(v => v ? JSON.parse(v) : null);
  }

  async mset(pairs: Record<string, any>, ttl?: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const [key, value] of Object.entries(pairs)) {
      const serialized = JSON.stringify(value);
      if (ttl) {
        pipeline.setex(this.prefix + key, ttl, serialized);
      } else {
        pipeline.set(this.prefix + key, serialized);
      }
    }
    await pipeline.exec();
  }

  async increment(key: string, amount = 1): Promise<number> {
    return this.redis.incrby(this.prefix + key, amount);
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.redis.zadd(this.prefix + key, score, member);
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redis.zrevrange(this.prefix + key, start, stop);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const score = await this.redis.zscore(this.prefix + key, member);
    return score !== null ? parseFloat(score) : null;
  }
}

export const cacheService = new CacheService();