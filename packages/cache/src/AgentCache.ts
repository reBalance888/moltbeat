import { CacheManager } from './CacheManager'

export interface CachedAgent {
  id: string
  name: string
  karma: number
  followerCount: number
  followingCount: number
  isActive: boolean
  lastSynced: string
}

/**
 * Cache layer for Agent data
 * TTL: 1 hour for agent profiles
 */
export class AgentCache extends CacheManager {
  constructor() {
    super({ namespace: 'agent' })
  }

  private agentKey(id: string): string {
    return `profile:${id}`
  }

  private agentNameKey(name: string): string {
    return `name:${name}`
  }

  async getAgent(id: string): Promise<CachedAgent | null> {
    return this.get<CachedAgent>(this.agentKey(id))
  }

  async getAgentByName(name: string): Promise<CachedAgent | null> {
    return this.get<CachedAgent>(this.agentNameKey(name))
  }

  async setAgent(agent: CachedAgent, ttl: number = 3600): Promise<void> {
    await Promise.all([
      this.set(this.agentKey(agent.id), agent, ttl),
      this.set(this.agentNameKey(agent.name), agent, ttl),
    ])
  }

  async invalidateAgent(id: string, name?: string): Promise<void> {
    const keys = [this.agentKey(id)]
    if (name) {
      keys.push(this.agentNameKey(name))
    }
    await this.delMany(keys)
  }

  /**
   * Cache top agents by karma (leaderboard)
   */
  async cacheTopByKarma(agents: CachedAgent[], ttl: number = 1800): Promise<void> {
    const key = 'leaderboard:karma'
    await this.del(key)

    for (const agent of agents) {
      await this.zadd(key, agent.karma, agent.id)
    }

    await this.expire(key, ttl)
  }

  async getTopByKarma(limit: number = 10): Promise<string[]> {
    return this.zrevrange('leaderboard:karma', 0, limit - 1)
  }

  /**
   * Cache top agents by followers
   */
  async cacheTopByFollowers(agents: CachedAgent[], ttl: number = 1800): Promise<void> {
    const key = 'leaderboard:followers'
    await this.del(key)

    for (const agent of agents) {
      await this.zadd(key, agent.followerCount, agent.id)
    }

    await this.expire(key, ttl)
  }

  async getTopByFollowers(limit: number = 10): Promise<string[]> {
    return this.zrevrange('leaderboard:followers', 0, limit - 1)
  }
}
