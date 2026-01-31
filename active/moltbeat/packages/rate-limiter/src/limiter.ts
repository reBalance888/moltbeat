import { getRedisClient } from '@moltbeat/cache';
import { RateLimitError } from '@moltbeat/errors';
import { logger } from '@moltbeat/logger';
import { RateLimitTier, getTierLimits } from './tiers';

export interface RateLimitConfig {
  tier?: RateLimitTier;
  windowMs?: number; // Custom window in ms
  maxRequests?: number; // Custom max requests
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Unix timestamp
  retryAfter?: number; // Seconds
}

/**
 * Redis-based rate limiter with sliding window algorithm
 */
export class RateLimiter {
  private redis = getRedisClient();
  private tier: RateLimitTier;
  private keyPrefix: string;

  constructor(config: RateLimitConfig = {}) {
    this.tier = config.tier || RateLimitTier.FREE;
    this.keyPrefix = config.keyPrefix || 'ratelimit';
  }

  /**
   * Check rate limit for a key (user ID, IP, API key)
   */
  async checkLimit(
    key: string,
    window: 'minute' | 'hour' | 'day' = 'minute'
  ): Promise<RateLimitResult> {
    const limits = getTierLimits(this.tier);
    const now = Date.now();

    // Window duration in ms
    const windowMs =
      window === 'minute' ? 60 * 1000 : window === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    // Max requests for this window
    const maxRequests =
      window === 'minute'
        ? limits.requestsPerMinute
        : window === 'hour'
        ? limits.requestsPerHour
        : limits.requestsPerDay;

    const redisKey = `${this.keyPrefix}:${key}:${window}`;

    try {
      // Sliding window algorithm using sorted set
      // Remove old entries outside the window
      await this.redis.zremrangebyscore(redisKey, 0, now - windowMs);

      // Count current requests in window
      const count = await this.redis.zcard(redisKey);

      // Calculate remaining and reset time
      const remaining = Math.max(0, maxRequests - count);
      const resetTime = now + windowMs;

      // Check if limit exceeded
      if (count >= maxRequests) {
        logger.warn(
          {
            key,
            window,
            count,
            maxRequests,
          },
          'Rate limit exceeded'
        );

        return {
          allowed: false,
          limit: maxRequests,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil(windowMs / 1000),
        };
      }

      // Add current request to sorted set
      await this.redis.zadd(redisKey, { score: now, member: `${now}-${Math.random()}` });

      // Set TTL on the key (cleanup)
      await this.redis.expire(redisKey, Math.ceil(windowMs / 1000) + 60);

      logger.debug(
        {
          key,
          window,
          count: count + 1,
          remaining: remaining - 1,
        },
        'Rate limit checked'
      );

      return {
        allowed: true,
        limit: maxRequests,
        remaining: remaining - 1,
        resetTime,
      };
    } catch (error: any) {
      logger.error({ error: error.message, key }, 'Rate limit check failed');

      // Fail open (allow request on error)
      return {
        allowed: true,
        limit: maxRequests,
        remaining: maxRequests,
        resetTime: now + windowMs,
      };
    }
  }

  /**
   * Consume a request (decrement limit)
   */
  async consume(key: string): Promise<RateLimitResult> {
    // Check all windows (minute, hour, day)
    const minuteResult = await this.checkLimit(key, 'minute');
    if (!minuteResult.allowed) {
      throw new RateLimitError('Rate limit exceeded (minute)', minuteResult.retryAfter || 60);
    }

    const hourResult = await this.checkLimit(key, 'hour');
    if (!hourResult.allowed) {
      throw new RateLimitError('Rate limit exceeded (hour)', hourResult.retryAfter || 3600);
    }

    const dayResult = await this.checkLimit(key, 'day');
    if (!dayResult.allowed) {
      throw new RateLimitError('Rate limit exceeded (day)', hourResult.retryAfter || 86400);
    }

    // Return most restrictive limit
    return minuteResult;
  }

  /**
   * Reset limits for a key (admin operation)
   */
  async reset(key: string): Promise<void> {
    await Promise.all([
      this.redis.del(`${this.keyPrefix}:${key}:minute`),
      this.redis.del(`${this.keyPrefix}:${key}:hour`),
      this.redis.del(`${this.keyPrefix}:${key}:day`),
    ]);

    logger.info({ key }, 'Rate limit reset');
  }

  /**
   * Get current usage stats
   */
  async getUsage(key: string): Promise<{
    minute: { count: number; limit: number };
    hour: { count: number; limit: number };
    day: { count: number; limit: number };
  }> {
    const limits = getTierLimits(this.tier);
    const now = Date.now();

    const [minuteCount, hourCount, dayCount] = await Promise.all([
      this.redis.zcount(
        `${this.keyPrefix}:${key}:minute`,
        now - 60 * 1000,
        now
      ),
      this.redis.zcount(
        `${this.keyPrefix}:${key}:hour`,
        now - 60 * 60 * 1000,
        now
      ),
      this.redis.zcount(
        `${this.keyPrefix}:${key}:day`,
        now - 24 * 60 * 60 * 1000,
        now
      ),
    ]);

    return {
      minute: { count: minuteCount, limit: limits.requestsPerMinute },
      hour: { count: hourCount, limit: limits.requestsPerHour },
      day: { count: dayCount, limit: limits.requestsPerDay },
    };
  }
}
