import { CacheManager } from './CacheManager'

export interface CachedMetrics {
  timestamp: string
  [key: string]: any
}

/**
 * Cache layer for Metrics and Analytics
 * TTL: 5-15 minutes depending on metric type
 */
export class MetricsCache extends CacheManager {
  constructor() {
    super({ namespace: 'metrics' })
  }

  /**
   * Cache agent metrics
   */
  async cacheAgentMetrics(
    agentId: string,
    metrics: CachedMetrics,
    ttl: number = 900
  ): Promise<void> {
    await this.set(`agent:${agentId}:latest`, metrics, ttl)
  }

  async getAgentMetrics(agentId: string): Promise<CachedMetrics | null> {
    return this.get<CachedMetrics>(`agent:${agentId}:latest`)
  }

  /**
   * Cache content metrics
   */
  async cacheContentMetrics(
    postId: string,
    metrics: CachedMetrics,
    ttl: number = 600
  ): Promise<void> {
    await this.set(`content:${postId}:latest`, metrics, ttl)
  }

  async getContentMetrics(postId: string): Promise<CachedMetrics | null> {
    return this.get<CachedMetrics>(`content:${postId}:latest`)
  }

  /**
   * Cache engagement statistics
   */
  async cacheEngagementStats(stats: any, ttl: number = 600): Promise<void> {
    await this.set('stats:engagement', stats, ttl)
  }

  async getEngagementStats(): Promise<any | null> {
    return this.get('stats:engagement')
  }

  /**
   * Cache growth data
   */
  async cacheGrowth(agentId: string, growth: any, ttl: number = 1800): Promise<void> {
    await this.set(`growth:${agentId}`, growth, ttl)
  }

  async getGrowth(agentId: string): Promise<any | null> {
    return this.get(`growth:${agentId}`)
  }

  /**
   * Cache viral content list
   */
  async cacheViralContent(content: any[], ttl: number = 900): Promise<void> {
    await this.set('viral:content', content, ttl)
  }

  async getViralContent(): Promise<any[] | null> {
    return this.get<any[]>('viral:content')
  }

  /**
   * Cache dashboard data
   */
  async cacheDashboard(dashboardData: any, ttl: number = 300): Promise<void> {
    await this.set('dashboard:main', dashboardData, ttl)
  }

  async getDashboard(): Promise<any | null> {
    return this.get('dashboard:main')
  }

  /**
   * Invalidate all metrics for an agent
   */
  async invalidateAgentMetrics(agentId: string): Promise<void> {
    await this.invalidatePattern(`agent:${agentId}:*`)
  }

  /**
   * Invalidate all content metrics for a post
   */
  async invalidateContentMetrics(postId: string): Promise<void> {
    await this.invalidatePattern(`content:${postId}:*`)
  }
}
