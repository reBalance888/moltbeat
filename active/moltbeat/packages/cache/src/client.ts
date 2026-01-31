import { Redis } from '@upstash/redis'

// Singleton Redis client
let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url || !token) {
      throw new Error(
        'Missing Upstash Redis credentials. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN'
      )
    }

    redis = new Redis({
      url,
      token,
    })
  }

  return redis
}

export default getRedisClient()
