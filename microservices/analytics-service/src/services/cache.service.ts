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
    const result = await this.redis.zincrby(this.prefix + key, increment, member);
    return typeof result === 'string' ? parseFloat(result) : result;
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

  async incrbyfloat(key: string, increment: number): Promise<number> {
    const result = await this.redis.incrbyfloat(this.prefix + key, increment);
    return typeof result === 'string' ? parseFloat(result) : result;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.redis.sadd(this.prefix + key, ...members);
  }

  async expire(key: string, ttl: number): Promise<number> {
    return this.redis.expire(this.prefix + key, ttl);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redis.smembers(this.prefix + key);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const result = await this.redis.zscore(this.prefix + key, member);
    return result === null ? null : (typeof result === 'string' ? parseFloat(result) : result);
  }

  async zremrangebyscore(key: string, min: string, max: number): Promise<number> {
    return this.redis.zremrangebyscore(this.prefix + key, min, max);
  }
}

export const cacheService = new CacheService();