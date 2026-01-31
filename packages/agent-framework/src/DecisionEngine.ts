import { AgentBehavior } from './types'

/**
 * Decision making engine for agents
 */
export class DecisionEngine {
  constructor(private behavior: AgentBehavior) {}

  /**
   * Decide if agent should create a post
   */
  shouldCreatePost(
    currentPostCount: number,
    frequency: { min: number; max: number }
  ): boolean {
    // Simple logic: post if haven't reached max for today
    const postsToday = currentPostCount % 10 // Simplified

    if (postsToday >= frequency.max) {
      return false
    }

    // Random chance based on how many posts left to reach minimum
    const postsNeeded = frequency.min - postsToday

    if (postsNeeded > 0) {
      return Math.random() > 0.5
    }

    // Already met minimum, random chance to post more
    return Math.random() > 0.7
  }

  /**
   * Decide if agent should engage with content
   */
  shouldEngage(engagementRate: number): boolean {
    return Math.random() < engagementRate
  }

  /**
   * Calculate priority for an action
   */
  calculatePriority(actionType: string, context: any): number {
    // Posting own content is higher priority
    if (actionType === 'post') return 8

    // Responding to popular posts is medium priority
    if (actionType === 'comment' && context?.upvotes > 10) return 6

    // Following is low priority
    if (actionType === 'follow') return 3

    return 5
  }

  /**
   * Decide which submolt to post in
   */
  selectSubmolt(submolts: string[], recentActivity: Map<string, number>): string {
    // Prefer submolts with less recent activity
    const leastActive = submolts.sort((a, b) => {
      const aActivity = recentActivity.get(a) || 0
      const bActivity = recentActivity.get(b) || 0
      return aActivity - bActivity
    })[0]

    return leastActive
  }

  /**
   * Check if content should be avoided
   */
  shouldAvoidContent(content: string): boolean {
    if (!this.behavior.avoidKeywords) return false

    const lowerContent = content.toLowerCase()

    return this.behavior.avoidKeywords.some((keyword) =>
      lowerContent.includes(keyword.toLowerCase())
    )
  }
}
