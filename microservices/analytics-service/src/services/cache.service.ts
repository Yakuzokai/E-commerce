import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

export class CacheService {
  private redis: Redis;
  private prefix = 'analytics:';

  constructor() {
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    this.redis.on('error', (err) => logger.error('Redis error:', err));
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

  async increment(key: string, amount = 1): Promise<number> {
    return this.redis.incrby(this.prefix + key, amount);
  }

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    return this.redis.zincrby(this.prefix + key, increment, member);
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redis.zrevrange(this.prefix + key, start, stop);
  }

  async hset(key: string, field: string, value: any): Promise<void> {
    await this.redis.hset(this.prefix + key, field, JSON.stringify(value));
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    const data = await this.redis.hget(this.prefix + key, field);
    return data ? JSON.parse(data) : null;
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    const data = await this.redis.hgetall(this.prefix + key);
    const result: Record<string, T> = {};
    for (const [k, v] of Object.entries(data)) {
      result[k] = JSON.parse(v);
    }
    return result;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    return this.redis.hincrby(this.prefix + key, field, increment);
  }
}

export const cacheService = new CacheService();