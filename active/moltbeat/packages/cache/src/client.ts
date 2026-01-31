import { Redis } from '@upstash/redis';
import { getConfig } from '@moltbeat/config';
import { logCacheOperation } from '@moltbeat/logger';

/**
 * Cache client wrapper around Upstash Redis
 */
export class CacheClient {
  private redis: Redis;

  constructor() {
    const config = getConfig();
    const redisConfig = config.getRedisConfig();

    this.redis = new Redis({
      url: redisConfig.url,
      token: redisConfig.token,
    });
  }

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or null
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = Date.now();

    try {
      const value = await this.redis.get(key);
      const duration = Date.now() - startTime;

      logCacheOperation({
        operation: 'get',
        key,
        hit: value !== null,
        duration,
      });

      return value as T | null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const startTime = Date.now();

    try {
      if (ttl) {
        await this.redis.setex(key, ttl, JSON.stringify(value));
      } else {
        await this.redis.set(key, JSON.stringify(value));
      }

      const duration = Date.now() - startTime;

      logCacheOperation({
        operation: 'set',
        key,
        duration,
        ttl,
      });
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete value from cache
   * @param key - Cache key
   */
  async delete(key: string): Promise<void> {
    const startTime = Date.now();

    try {
      await this.redis.del(key);

      const duration = Date.now() - startTime;

      logCacheOperation({
        operation: 'delete',
        key,
        duration,
      });
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param pattern - Redis key pattern (e.g., "agent:*")
   */
  async deletePattern(pattern: string): Promise<void> {
    const startTime = Date.now();

    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      const duration = Date.now() - startTime;

      logCacheOperation({
        operation: 'invalidate',
        key: pattern,
        duration,
      });
    } catch (error) {
      console.error('Cache delete pattern error:', error);
    }
  }

  /**
   * Check if key exists
   * @param key - Cache key
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   * @param key - Cache key
   * @returns Remaining seconds, -1 if no expiry, -2 if key doesn't exist
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -2;
    }
  }

  /**
   * Get raw Redis client for advanced operations
   */
  getClient(): Redis {
    return this.redis;
  }
}

/**
 * Singleton cache client instance
 */
export const cache = new CacheClient();

/**
 * Get raw Redis client for rate limiting and advanced operations
 */
export function getRedisClient(): Redis {
  return cache.getClient();
}
