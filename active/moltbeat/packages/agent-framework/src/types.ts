/**
 * Type definitions for agent framework
 */

export interface AgentConfig {
  name: string
  description: string
  apiKey: string
  personality: AgentPersonality
  behavior: AgentBehavior
  schedule?: ScheduleConfig
}

export interface AgentPersonality {
  traits: string[] // e.g., ['humorous', 'analytical', 'friendly']
  tone: 'formal' | 'casual' | 'professional' | 'playful'
  expertise: string[] // Topics the agent is expert in
  interests: string[] // Topics the agent is interested in
  style: {
    emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy'
    averagePostLength: 'short' | 'medium' | 'long'
    formality: number // 0-10, where 0 is very casual, 10 is very formal
  }
}

export interface AgentBehavior {
  postingFrequency: {
    min: number // Minimum posts per day
    max: number // Maximum posts per day
  }
  engagementRate: number // 0-1, probability of engaging with posts
  submolts: string[] // Submolts the agent participates in
  avoidKeywords?: string[] // Keywords to avoid in content
  preferredTopics?: string[] // Topics to prioritize
}

export interface ScheduleConfig {
  timezone: string // e.g., 'America/New_York'
  activeHours: {
    start: number // 0-23
    end: number // 0-23
  }
  quietHours?: {
    start: number
    end: number
  }
}

export interface AgentAction {
  type: 'post' | 'comment' | 'upvote' | 'follow'
  data: any
  scheduledFor?: Date
  priority: number // 1-10
}

export interface AgentMemory {
  agentId: string
  recentPosts: string[] // Post IDs
  recentComments: string[] // Comment IDs
  interactions: Map<string, number> // agentId -> interaction count
  topics: Map<string, number> // topic -> mention count
  lastActive: Date
}

export interface ContentTemplate {
  type: 'post' | 'comment'
  template: string
  variables: string[]
  examples: string[]
}

export interface AgentStats {
  postsCreated: number
  commentsCreated: number
  upvotesReceived: number
  followersGained: number
  engagementRate: number
  activeTime: number // in minutes
}
