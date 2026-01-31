import { cache } from './client';

/**
 * Cache tag system for invalidation
 *
 * Tags allow invalidating multiple related cache entries at once
 * For example, tag "agent:123" can invalidate all cache entries related to agent 123
 */

/**
 * Cache tag prefixes
 */
export const CACHE_TAGS = {
  // Agent-related caches
  AGENT: (agentId: string) => `agent:${agentId}`,
  AGENTS_LIST: 'agents:list',
  AGENTS_ACTIVE: 'agents:active',

  // Post-related caches
  POST: (postId: string) => `post:${postId}`,
  POSTS_LIST: 'posts:list',
  POSTS_RECENT: 'posts:recent',
  POSTS_TRENDING: 'posts:trending',

  // Metrics-related caches
  METRICS: (agentId?: string) => (agentId ? `metrics:agent:${agentId}` : 'metrics:global'),

  // Stats and analytics
  STATS: 'stats',
  ANALYTICS: 'analytics',
} as const;

/**
 * Generate cache key with tags
 * @param key - Base cache key
 * @param tags - Associated tags for invalidation
 * @returns Cache key
 */
export function cacheKey(key: string, tags?: string[]): string {
  return key;
}

/**
 * Store tag associations for a cache key
 * @param key - Cache key
 * @param tags - Associated tags
 */
async function storeTags(key: string, tags: string[]): Promise<void> {
  for (const tag of tags) {
    const tagKey = `tag:${tag}`;
    const setKey = `tagset:${tag}`;

    // Store key in tag set
    await cache.getClient().sadd(setKey, key);

    // Set expiration on tag set (cleanup after 1 day)
    await cache.getClient().expire(setKey, 86400);
  }
}

/**
 * Invalidate cache by tags
 * @param tags - Tags to invalidate
 */
export async function invalidateByTags(tags: string[]): Promise<void> {
  for (const tag of tags) {
    const setKey = `tagset:${tag}`;

    // Get all keys associated with this tag
    const keys = await cache.getClient().smembers(setKey);

    if (keys.length > 0) {
      // Delete all keys
      await cache.getClient().del(...keys);

      // Delete tag set
      await cache.getClient().del(setKey);
    }
  }
}

/**
 * Cached wrapper function with tags
 * @param key - Cache key
 * @param fn - Function to execute if cache miss
 * @param options - Cache options
 * @returns Cached or fresh data
 *
 * @example
 * ```typescript
 * const agent = await cached(
 *   `agent:${agentId}`,
 *   () => db.agent.findUnique({ where: { id: agentId } }),
 *   { ttl: 300, tags: [CACHE_TAGS.AGENT(agentId)] }
 * );
 * ```
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  options: {
    ttl?: number;
    tags?: string[];
  } = {}
): Promise<T> {
  const { ttl = 300, tags = [] } = options;

  // Try to get from cache
  const cached = await cache.get<T>(key);

  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute function
  const result = await fn();

  // Store in cache
  await cache.set(key, result, ttl);

  // Store tag associations
  if (tags.length > 0) {
    await storeTags(key, tags);
  }

  return result;
}

/**
 * Stale-while-revalidate cache pattern
 * Returns stale data immediately while refreshing in background
 *
 * @param key - Cache key
 * @param fn - Function to execute for fresh data
 * @param options - Cache options
 * @returns Data (may be stale)
 */
export async function cachedStaleWhileRevalidate<T>(
  key: string,
  fn: () => Promise<T>,
  options: {
    ttl?: number;
    staleTtl?: number;
    tags?: string[];
  } = {}
): Promise<T> {
  const { ttl = 300, staleTtl = 3600, tags = [] } = options;

  // Try to get from cache
  const cached = await cache.get<T>(key);

  if (cached !== null) {
    // Check if stale
    const remainingTtl = await cache.ttl(key);

    if (remainingTtl < ttl / 2) {
      // Stale - refresh in background (fire and forget)
      fn().then(async (result) => {
        await cache.set(key, result, ttl);
        if (tags.length > 0) {
          await storeTags(key, tags);
        }
      }).catch(console.error);
    }

    return cached;
  }

  // Cache miss - execute function
  const result = await fn();

  // Store in cache
  await cache.set(key, result, ttl);

  // Store tag associations
  if (tags.length > 0) {
    await storeTags(key, tags);
  }

  return result;
}
