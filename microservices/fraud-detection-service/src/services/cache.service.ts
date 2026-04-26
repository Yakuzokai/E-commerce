import Redis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

export class CacheService {
  private redis: Redis;
  private prefix = 'fraud:';

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

  async increment(key: string, amount = 1): Promise<number> {
    return this.redis.incrby(this.prefix + key, amount);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(this.prefix + key, seconds);
  }

  async lpush(key: string, value: any): Promise<number> {
    return this.redis.lpush(this.prefix + key, JSON.stringify(value));
  }

  async lrange(key: string, start: number, stop: number): Promise<any[]> {
    const values = await this.redis.lrange(this.prefix + key, start, stop);
    return values.map(v => JSON.parse(v));
  }

  async ltrim(key: string, start: number, stop: number): Promise<void> {
    await this.redis.ltrim(this.prefix + key, start, stop);
  }

  async scard(key: string): Promise<number> {
    return this.redis.scard(this.prefix + key);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.redis.sadd(this.prefix + key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.redis.smembers(this.prefix + key);
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.redis.zadd(this.prefix + key, score, member);
  }

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    return this.redis.zincrby(this.prefix + key, increment, member);
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const score = await this.redis.zscore(this.prefix + key, member);
    return score !== null ? parseFloat(score) : null;
  }
}

export const cacheService = new CacheService();