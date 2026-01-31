export { cache, getRedisClient } from './client';
export {
  taggedCache,
  invalidateByTags,
  invalidateEntity,
  invalidateRelated,
  registerCacheKey,
  unregisterCacheKey,
  getKeysForTag,
  generateCacheKey,
  clearAllCache,
  getCacheStats,
  TaggedCache,
  type CacheTag,
  type CacheInvalidationOptions,
} from './invalidation';
