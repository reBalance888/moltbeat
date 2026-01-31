import { Agent, AgentConfig } from '@moltbeat/agent-framework'
import { PrismaClient } from '@moltbeat/database'
import { CryptoIntelligence } from '@moltbeat/crypto-intel'

/**
 * Crypto Analyst Agent - Analyzes and discusses cryptocurrency trends
 */
export class CryptoAnalystAgent extends Agent {
  private cryptoIntel: CryptoIntelligence
  private trackedTokens = ['BTC', 'ETH', 'SOL', 'ADA', 'DOGE']

  constructor(config: AgentConfig, prisma: PrismaClient) {
    super(config)
    this.cryptoIntel = new CryptoIntelligence(prisma)
  }

  protected async initialize(): Promise<void> {
    console.log('💰 Crypto Analyst Agent initializing...')
    console.log(`Tracking tokens: ${this.trackedTokens.join(', ')}`)
  }

  protected async cleanup(): Promise<void> {
    console.log('👋 Crypto Analyst Agent shutting down...')
  }

  protected async generatePostContent(topic: string): Promise<{
    title: string
    body: string
  }> {
    // Get real crypto data
    const token =
      this.trackedTokens[Math.floor(Math.random() * this.trackedTokens.length)]

    try {
      const sentiment = await this.cryptoIntel.getTokenSentiment(token, 1)

      const trendEmoji = {
        bullish: '📈',
        bearish: '📉',
        neutral: '➡️',
      }[sentiment.sentimentTrend]

      return {
        title: `${token} Sentiment: ${sentiment.sentimentTrend.toUpperCase()} ${trendEmoji}`,
        body: `Current ${token} community sentiment is ${sentiment.sentimentTrend} with ${sentiment.mentions} mentions in the last 24h. Average sentiment score: ${sentiment.avgSentiment.toFixed(2)}. What's your take on ${token} right now?`,
      }
    } catch (error) {
      // Fallback to generic content
      return {
        title: `${token} Market Analysis`,
        body: `Interesting movements in ${token} today. The market sentiment seems to be shifting. What are your predictions for ${token}?`,
      }
    }
  }

  protected async generateCommentContent(post: any): Promise<string> {
    const comments = [
      'Solid analysis! The on-chain data supports this view.',
      'Interesting take. I have been watching this token closely too.',
      'Great insight! This aligns with the broader market trends I am seeing.',
      'The sentiment data definitely backs this up. Smart observation.',
      'This is exactly what the technical indicators are showing. Good call!',
    ]

    const comment = comments[Math.floor(Math.random() * comments.length)]
    return this.contentGenerator.applyPersonality(comment)
  }

  protected async learn(): Promise<void> {
    // Track which crypto tokens generate most engagement
    console.log('📊 Learning from crypto discussions...')
  }
}

// Configuration
export const cryptoAnalystConfig: AgentConfig = {
  name: 'CryptoAnalyst',
  description: 'AI agent specializing in cryptocurrency market analysis',
  apiKey: process.env.MOLTBOOK_API_KEY || '',
  personality: {
    traits: ['analytical', 'data-driven', 'precise'],
    tone: 'professional',
    expertise: ['cryptocurrency', 'blockchain', 'trading', 'DeFi'],
    interests: ['Bitcoin', 'Ethereum', 'altcoins', 'market analysis'],
    style: {
      emojiUsage: 'moderate',
      averagePostLength: 'medium',
      formality: 7,
    },
  },
  behavior: {
    postingFrequency: { min: 4, max: 10 },
    engagementRate: 0.5,
    submolts: ['crypto', 'bitcoin', 'ethereum', 'defi'],
    preferredTopics: ['crypto', 'bitcoin', 'trading', 'blockchain'],
  },
  schedule: {
    timezone: 'UTC',
    activeHours: { start: 6, end: 22 },
  },
}
