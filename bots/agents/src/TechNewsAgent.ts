import { Agent, AgentConfig } from '@moltbeat/agent-framework'

/**
 * Tech News Agent - Posts and discusses technology news
 */
export class TechNewsAgent extends Agent {
  private newsTopics = [
    'AI breakthrough',
    'Startup funding',
    'Tech IPO',
    'Open source release',
    'Developer tools',
    'Cloud computing',
    'Cybersecurity',
    'Mobile technology',
    'Web3 developments',
    'Quantum computing',
  ]

  protected async initialize(): Promise<void> {
    console.log('🚀 Tech News Agent initializing...')
    console.log(`Name: ${this.config.name}`)
    console.log(`Active hours: ${this.config.schedule?.activeHours.start}:00 - ${this.config.schedule?.activeHours.end}:00`)
    console.log(`Posting frequency: ${this.config.behavior.postingFrequency.min}-${this.config.behavior.postingFrequency.max} posts/day`)
  }

  protected async cleanup(): Promise<void> {
    console.log('👋 Tech News Agent shutting down...')
  }

  protected async generatePostContent(topic: string): Promise<{
    title: string
    body: string
  }> {
    const randomTopic =
      this.newsTopics[Math.floor(Math.random() * this.newsTopics.length)]

    const templates = [
      {
        title: `Breaking: ${randomTopic}`,
        body: `Just saw some exciting news about ${randomTopic}. The tech industry is moving so fast! What are your thoughts on this development?`,
      },
      {
        title: `Weekly Tech Update: ${randomTopic}`,
        body: `This week's highlight in tech is definitely ${randomTopic}. It's fascinating how this impacts the broader ecosystem. Let's discuss the implications!`,
      },
      {
        title: `${randomTopic} - Game Changer?`,
        body: `Is ${randomTopic} going to be a game changer for the industry? I think it has huge potential. Would love to hear different perspectives from the community.`,
      },
    ]

    const template = templates[Math.floor(Math.random() * templates.length)]

    return {
      title: this.contentGenerator.applyPersonality(template.title),
      body: this.contentGenerator.applyPersonality(template.body),
    }
  }

  protected async generateCommentContent(post: any): Promise<string> {
    const comments = [
      'Great post! This aligns perfectly with what I have been seeing in the tech space.',
      'Interesting perspective! I think this technology has massive potential for disruption.',
      'Thanks for sharing! This is exactly the kind of innovation we need to see more of.',
      'Spot on analysis. The technical implications here are really fascinating.',
      'This is a hot topic right now. Excited to see where this goes!',
    ]

    const comment = comments[Math.floor(Math.random() * comments.length)]
    return this.contentGenerator.applyPersonality(comment)
  }

  protected async learn(): Promise<void> {
    // Track which topics get most engagement
    const topicCounts = Array.from(this.memory.topics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (topicCounts.length > 0) {
      console.log('📊 Top performing topics:', topicCounts.map((t) => t[0]))
    }
  }
}

// Configuration
export const techNewsConfig: AgentConfig = {
  name: 'TechNewsBot',
  description: 'AI agent that shares and discusses technology news',
  apiKey: process.env.MOLTBOOK_API_KEY || '',
  personality: {
    traits: ['informative', 'enthusiastic', 'analytical'],
    tone: 'professional',
    expertise: ['technology', 'startups', 'innovation'],
    interests: ['AI', 'blockchain', 'fintech', 'SaaS'],
    style: {
      emojiUsage: 'moderate',
      averagePostLength: 'medium',
      formality: 6,
    },
  },
  behavior: {
    postingFrequency: { min: 3, max: 8 },
    engagementRate: 0.4,
    submolts: ['technology', 'startups', 'ai'],
    preferredTopics: ['AI', 'startups', 'tech news', 'innovation'],
  },
  schedule: {
    timezone: 'America/New_York',
    activeHours: { start: 8, end: 20 },
    quietHours: { start: 22, end: 6 },
  },
}
