import { Agent, AgentConfig } from '@moltbeat/agent-framework'

/**
 * Startup Scout Agent - Discusses startups, funding, and entrepreneurship
 */
export class StartupScoutAgent extends Agent {
  private startupTopics = [
    'Series A funding',
    'YC batch',
    'Product launch',
    'Unicorn status',
    'Acquisition news',
    'Pivot strategy',
    'Growth hacking',
    'MVP development',
    'Product-market fit',
    'Founder journey',
  ]

  private inspirationalQuotes = [
    'The best time to start was yesterday. The next best time is now.',
    'Build something people want.',
    'Move fast and ship things.',
    "Don't worry about funding. Focus on solving a real problem.",
    'Every great startup started with just an idea.',
  ]

  protected async initialize(): Promise<void> {
    console.log('🚀 Startup Scout Agent initializing...')
    console.log('Ready to discuss startups, funding, and entrepreneurship!')
  }

  protected async cleanup(): Promise<void> {
    console.log('👋 Startup Scout Agent shutting down...')
  }

  protected async generatePostContent(topic: string): Promise<{
    title: string
    body: string
  }> {
    const randomTopic =
      this.startupTopics[Math.floor(Math.random() * this.startupTopics.length)]

    const templates = [
      {
        title: `Thoughts on ${randomTopic}`,
        body: `Just came across an interesting case of ${randomTopic}. The startup ecosystem is so dynamic right now. What's your experience with this? Any founders here dealing with similar challenges?`,
      },
      {
        title: `Startup Lesson: ${randomTopic}`,
        body: `One thing I've learned about ${randomTopic}: it's all about timing and execution. What lessons have you learned from your startup journey? Share your stories!`,
      },
      {
        title: `${randomTopic} - Success Factors`,
        body: `Looking at recent examples of ${randomTopic}, I see a pattern. The successful ones all had one thing in common. What do you think makes the difference? Let's discuss!`,
      },
    ]

    const template = templates[Math.floor(Math.random() * templates.length)]

    // Occasionally add inspirational quote
    if (Math.random() > 0.7) {
      const quote =
        this.inspirationalQuotes[
          Math.floor(Math.random() * this.inspirationalQuotes.length)
        ]
      template.body += `\n\nRemember: "${quote}"`
    }

    return {
      title: this.contentGenerator.applyPersonality(template.title),
      body: this.contentGenerator.applyPersonality(template.body),
    }
  }

  protected async generateCommentContent(post: any): Promise<string> {
    const comments = [
      'Love this! As a founder, I totally relate to this challenge.',
      'Great insight! This is exactly what early-stage startups need to hear.',
      'This perspective is gold. Saving this for future reference!',
      'So true! We went through this exact scenario at my startup.',
      'Valuable lessons here. Thanks for sharing your experience!',
    ]

    const comment = comments[Math.floor(Math.random() * comments.length)]
    return this.contentGenerator.applyPersonality(comment)
  }

  protected async learn(): Promise<void> {
    console.log('📊 Analyzing startup discussion trends...')
  }
}

// Configuration
export const startupScoutConfig: AgentConfig = {
  name: 'StartupScout',
  description: 'AI agent focused on startups, funding, and entrepreneurship',
  apiKey: process.env.MOLTBOOK_API_KEY || '',
  personality: {
    traits: ['motivational', 'insightful', 'experienced'],
    tone: 'casual',
    expertise: ['startups', 'venture capital', 'entrepreneurship', 'product'],
    interests: [
      'funding rounds',
      'YC',
      'product launches',
      'growth strategies',
    ],
    style: {
      emojiUsage: 'heavy',
      averagePostLength: 'medium',
      formality: 4,
    },
  },
  behavior: {
    postingFrequency: { min: 2, max: 6 },
    engagementRate: 0.6,
    submolts: ['startups', 'entrepreneurship', 'ycombinator', 'saas'],
    preferredTopics: ['startups', 'funding', 'founders', 'product'],
  },
  schedule: {
    timezone: 'America/Los_Angeles',
    activeHours: { start: 9, end: 18 },
  },
}
