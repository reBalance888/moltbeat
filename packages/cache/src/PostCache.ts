import { CacheManager } from './CacheManager'

export interface CachedPost {
  id: string
  submolt: string
  title: string
  content?: string
  url?: string
  authorId: string
  upvotes: number
  downvotes: number
  commentCount: number
  createdAt: string
  engagement: number
}

/**
 * Cache layer for Post data
 * TTL: 30 minutes for posts, 10 minutes for feeds
 */
export class PostCache extends CacheManager {
  constructor() {
    super({ namespace: 'post' })
  }

  private postKey(id: string): string {
    return `item:${id}`
  }

  private feedKey(submolt: string): string {
    return `feed:${submolt}`
  }

  private trendingKey(hours: number = 24): string {
    return `trending:${hours}h`
  }

  async getPost(id: string): Promise<CachedPost | null> {
    return this.get<CachedPost>(this.postKey(id))
  }

  async setPost(post: CachedPost, ttl: number = 1800): Promise<void> {
    await this.set(this.postKey(post.id), post, ttl)
  }

  async invalidatePost(id: string): Promise<void> {
    await this.del(this.postKey(id))
  }

  /**
   * Cache feed for a submolt
   */
  async cacheFeed(submolt: string, posts: CachedPost[], ttl: number = 600): Promise<void> {
    const key = this.feedKey(submolt)
    await this.set(key, posts, ttl)
  }

  async getFeed(submolt: string): Promise<CachedPost[] | null> {
    return this.get<CachedPost[]>(this.feedKey(submolt))
  }

  async invalidateFeed(submolt: string): Promise<void> {
    await this.del(this.feedKey(submolt))
  }

  /**
   * Cache trending posts
   */
  async cacheTrending(posts: CachedPost[], hours: number = 24, ttl: number = 600): Promise<void> {
    const key = this.trendingKey(hours)
    await this.del(key)

    for (const post of posts) {
      await this.zadd(key, post.engagement, post.id)
    }

    await this.expire(key, ttl)
  }

  async getTrending(hours: number = 24, limit: number = 10): Promise<string[]> {
    return this.zrevrange(this.trendingKey(hours), 0, limit - 1)
  }

  /**
   * Cache top posts by engagement
   */
  async cacheTopByEngagement(posts: CachedPost[], ttl: number = 900): Promise<void> {
    const key = 'top:engagement'
    await this.del(key)

    for (const post of posts) {
      await this.zadd(key, post.engagement, post.id)
    }

    await this.expire(key, ttl)
  }

  async getTopByEngagement(limit: number = 10): Promise<string[]> {
    return this.zrevrange('top:engagement', 0, limit - 1)
  }

  /**
   * Invalidate all submolt feeds
   */
  async invalidateAllFeeds(): Promise<number> {
    return this.invalidatePattern('feed:*')
  }
}
