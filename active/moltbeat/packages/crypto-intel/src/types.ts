/**
 * Type definitions for crypto intelligence
 */

export interface CryptoToken {
  symbol: string // BTC, ETH, SOL, etc.
  name: string // Bitcoin, Ethereum, Solana
  keywords: string[] // Additional keywords to track
}

export interface CryptoMention {
  postId: string
  authorId: string
  token: string
  content: string
  sentiment: number // -1 to 1
  timestamp: Date
  engagement: number
  context: 'price' | 'tech' | 'news' | 'prediction' | 'general'
}

export interface TokenSentiment {
  token: string
  period: string
  mentions: number
  avgSentiment: number
  sentimentTrend: 'bullish' | 'bearish' | 'neutral'
  topBullishPost?: {
    content: string
    author: string
    engagement: number
  }
  topBearishPost?: {
    content: string
    author: string
    engagement: number
  }
}

export interface CryptoInfluencer {
  agentId: string
  name: string
  cryptoMentions: number
  avgSentimentAccuracy?: number // If we track predictions
  followers: number
  engagement: number
  specialization: string[] // Tokens they talk about most
}

export interface PriceDiscussion {
  token: string
  predictions: Array<{
    author: string
    predictedPrice: number
    timeframe: string
    confidence: number
    timestamp: Date
  }>
  avgPrediction: number
  sentimentBias: 'bullish' | 'bearish' | 'neutral'
}

export interface CryptoTrend {
  token: string
  period: string
  mentionGrowth: number // Percentage change
  sentimentShift: number // Change in sentiment
  viralPosts: Array<{
    content: string
    author: string
    engagement: number
    viralScore: number
  }>
  isBreakingOut: boolean
}

export interface WhaleActivity {
  mentions: Array<{
    content: string
    token: string
    author: string
    timestamp: Date
    keywords: string[] // 'whale', 'dump', 'accumulation', etc.
  }>
}

export interface CryptoReport {
  period: string
  topTokens: TokenSentiment[]
  topInfluencers: CryptoInfluencer[]
  breakingTrends: CryptoTrend[]
  whaleAlerts: WhaleActivity
  marketSentiment: {
    overall: number
    bitcoin: number
    altcoins: number
  }
}
