/**
 * Cache Invalidation Strategy
 * Tag-based cache invalidation for efficient cache management
 */

import { cache } from './client';

export type CacheTag =
  | 'agents'
  | 'posts'
  | 'metrics'
  | 'alerts'
  | 'analytics'
  | 'users'
  | string; // Allow custom tags

export interface CacheInvalidationOptions {
  /**
   * Tags to invalidate
   */
  tags: CacheTag[];

  /**
   * Optional pattern matching for keys
   */
  pattern?: string;

  /**
   * Whether to invalidate child tags
   */
  cascade?: boolean;
}

/**
 * Tag registry mapping tags to cache keys
 */
const tagRegistry = new Map<CacheTag, Set<string>>();

/**
 * Register a cache key with tags
 */
export function registerCacheKey(key: string, tags: CacheTag[]): void {
  tags.forEach(tag => {
    if (!tagRegistry.has(tag)) {
      tagRegistry.set(tag, new Set());
    }
    tagRegistry.get(tag)!.add(key);
  });
}

/**
 * Unregister a cache key
 */
export function unregisterCacheKey(key: string): void {
  tagRegistry.forEach((keys, tag) => {
    keys.delete(key);
    if (keys.size === 0) {
      tagRegistry.delete(tag);
    }
  });
}

/**
 * Get all keys for a tag
 */
export function getKeysForTag(tag: CacheTag): string[] {
  return Array.from(tagRegistry.get(tag) || []);
}

/**
 * Invalidate cache by tags
 */
export async function invalidateByTags(options: CacheInvalidationOptions): Promise<number> {
  const { tags, pattern, cascade = false } = options;
  const keysToDelete = new Set<string>();

  // Collect all keys for the specified tags
  for (const tag of tags) {
    const keys = getKeysForTag(tag);
    keys.forEach(key => {
      if (!pattern || key.includes(pattern)) {
        keysToDelete.add(key);
      }
    });

    // If cascade is enabled, also get child tags
    if (cascade) {
      const childTags = Array.from(tagRegistry.keys()).filter(t => t.startsWith(`${tag}:`));
      for (const childTag of childTags) {
        const childKeys = getKeysForTag(childTag);
        childKeys.forEach(key => {
          if (!pattern || key.includes(pattern)) {
            keysToDelete.add(key);
          }
        });
      }
    }
  }

  // Delete all collected keys
  if (keysToDelete.size > 0) {
    const redis = cache.getClient();
    await redis.del(...Array.from(keysToDelete));

    // Unregister deleted keys
    keysToDelete.forEach(key => unregisterCacheKey(key));
  }

  return keysToDelete.size;
}

/**
 * Invalidate all cache for a specific entity
 */
export async function invalidateEntity(entityType: CacheTag, entityId?: string): Promise<number> {
  if (entityId) {
    return invalidateByTags({
      tags: [entityType],
      pattern: entityId,
      cascade: true,
    });
  }

  return invalidateByTags({
    tags: [entityType],
    cascade: true,
  });
}

/**
 * Invalidate related cache after mutation
 */
export async function invalidateRelated(entityType: CacheTag, operation: 'create' | 'update' | 'delete'): Promise<void> {
  const tagsToInvalidate: CacheTag[] = [entityType];

  // Invalidate related caches based on entity type
  switch (entityType) {
    case 'agents':
      tagsToInvalidate.push('analytics', 'metrics');
      break;
    case 'posts':
      tagsToInvalidate.push('analytics', 'agents', 'metrics');
      break;
    case 'metrics':
      tagsToInvalidate.push('analytics');
      break;
    case 'alerts':
      tagsToInvalidate.push('analytics');
      break;
  }

  await invalidateByTags({ tags: tagsToInvalidate, cascade: true });
}

/**
 * Tagged cache wrapper with automatic invalidation tracking
 */
export class TaggedCache {
  /**
   * Set a value in cache with tags
   */
  async set<T>(key: string, value: T, tags: CacheTag[], ttl?: number): Promise<void> {
    const redis = cache.getClient();

    // Register key with tags
    registerCacheKey(key, tags);

    // Set value in cache
    if (ttl) {
      await redis.setex(key, ttl, JSON.stringify(value));
    } else {
      await redis.set(key, JSON.stringify(value));
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const redis = cache.getClient();
    const value = await redis.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<void> {
    const redis = cache.getClient();
    await redis.del(key);
    unregisterCacheKey(key);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const redis = cache.getClient();
    const result = await redis.exists(key);
    return result === 1;
  }

  /**
   * Get or set pattern - fetch from cache or compute and cache
   */
  async getOrSet<T>(
    key: string,
    tags: CacheTag[],
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Compute value
    const value = await fetchFn();

    // Cache value
    await this.set(key, value, tags, ttl);

    return value;
  }
}

/**
 * Export singleton instance
 */
export const taggedCache = new TaggedCache();

/**
 * Utility function to generate cache keys
 */
export function generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return [prefix, ...parts].join(':');
}

/**
 * Clear all cache (use with caution!)
 */
export async function clearAllCache(): Promise<void> {
  const redis = cache.getClient();
  await redis.flushdb();
  tagRegistry.clear();
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  totalTags: number;
  tagDistribution: Record<string, number>;
}> {
  const tagDistribution: Record<string, number> = {};

  tagRegistry.forEach((keys, tag) => {
    tagDistribution[tag] = keys.size;
  });

  const redis = cache.getClient();
  const totalKeys = await redis.dbsize();

  return {
    totalKeys,
    totalTags: tagRegistry.size,
    tagDistribution,
  };
}
