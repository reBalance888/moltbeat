import { Redis } from '@upstash/redis'
import { getRedisClient } from './client'

export interface CacheOptions {
  /**
   * Time to live in seconds
   */
  ttl?: number
  /**
   * Namespace prefix for keys
   */
  namespace?: string
}

export class CacheManager {
  private redis: Redis
  private namespace: string

  constructor(options: CacheOptions = {}) {
    this.redis = getRedisClient()
    this.namespace = options.namespace || 'moltbeat'
  }

  /**
   * Generate namespaced key
   */
  private key(key: string): string {
    return `${this.namespace}:${key}`
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get<T>(this.key(key))
    return value
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(this.key(key), ttl, JSON.stringify(value))
    } else {
      await this.redis.set(this.key(key), JSON.stringify(value))
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    await this.redis.del(this.key(key))
  }

  /**
   * Delete multiple keys
   */
  async delMany(keys: string[]): Promise<void> {
    if (keys.length === 0) return
    await this.redis.del(...keys.map((k) => this.key(k)))
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(this.key(key))
    return result === 1
  }

  /**
   * Get or set pattern: fetch from cache or compute and store
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    await this.set(key, value, ttl)
    return value
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(`${this.namespace}:${pattern}`)
    if (keys.length === 0) return 0

    await this.redis.del(...keys)
    return keys.length
  }

  /**
   * Get TTL for key in seconds
   */
  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(this.key(key))
  }

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    return await this.redis.incr(this.key(key))
  }

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    return await this.redis.decr(this.key(key))
  }

  /**
   * Increment by value
   */
  async incrBy(key: string, value: number): Promise<number> {
    return await this.redis.incrby(this.key(key), value)
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.redis.expire(this.key(key), seconds)
    return result === 1
  }

  /**
   * Remove expiration from key
   */
  async persist(key: string): Promise<boolean> {
    const result = await this.redis.persist(this.key(key))
    return result === 1
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return []
    const values = await this.redis.mget(...keys.map((k) => this.key(k)))
    return values as (T | null)[]
  }

  /**
   * Set multiple values at once
   */
  async mset(entries: Record<string, any>, ttl?: number): Promise<void> {
    const pipeline = this.redis.pipeline()

    Object.entries(entries).forEach(([key, value]) => {
      const nsKey = this.key(key)
      pipeline.set(nsKey, JSON.stringify(value))
      if (ttl) {
        pipeline.expire(nsKey, ttl)
      }
    })

    await pipeline.exec()
  }

  /**
   * Flush all keys in namespace
   */
  async flushNamespace(): Promise<number> {
    const keys = await this.redis.keys(`${this.namespace}:*`)
    if (keys.length === 0) return 0

    await this.redis.del(...keys)
    return keys.length
  }

  /**
   * Add item to sorted set
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    const result = await this.redis.zadd(this.key(key), { score, member })
    return result || 0
  }

  /**
   * Get range from sorted set (highest scores first)
   */
  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    const results = await this.redis.zrange(this.key(key), start, stop, { rev: true })
    return results as string[]
  }

  /**
   * Get range with scores
   */
  async zrevrangeWithScores(
    key: string,
    start: number,
    stop: number
  ): Promise<Array<{ member: string; score: number }>> {
    const results = await this.redis.zrange(this.key(key), start, stop, {
      rev: true,
      withScores: true,
    })

    const formatted: Array<{ member: string; score: number }> = []
    for (let i = 0; i < results.length; i += 2) {
      formatted.push({
        member: results[i] as string,
        score: results[i + 1] as number,
      })
    }

    return formatted
  }

  /**
   * Remove item from sorted set
   */
  async zrem(key: string, member: string): Promise<number> {
    return await this.redis.zrem(this.key(key), member)
  }

  /**
   * Get sorted set size
   */
  async zcard(key: string): Promise<number> {
    return await this.redis.zcard(this.key(key))
  }

  /**
   * Add to hash
   */
  async hset(key: string, field: string, value: any): Promise<number> {
    return await this.redis.hset(this.key(key), { [field]: JSON.stringify(value) })
  }

  /**
   * Get from hash
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    const value = await this.redis.hget<string>(this.key(key), field)
    if (!value) return null
    return JSON.parse(value) as T
  }

  /**
   * Get all fields from hash
   */
  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    const values = await this.redis.hgetall<Record<string, string>>(this.key(key))
    if (!values) return null

    const parsed: Record<string, T> = {}
    Object.entries(values).forEach(([field, value]) => {
      parsed[field] = JSON.parse(value) as T
    })
    return parsed
  }

  /**
   * Delete field from hash
   */
  async hdel(key: string, field: string): Promise<number> {
    return await this.redis.hdel(this.key(key), field)
  }
}
