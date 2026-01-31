/**
 * Type definitions for brand monitoring
 */

export interface BrandConfig {
  name: string
  keywords: string[] // Primary keywords to track
  aliases?: string[] // Alternative names/spellings
  competitors?: string[] // Competitor names to track
  excludeKeywords?: string[] // Keywords to exclude (false positives)
}

export interface BrandMention {
  postId: string
  authorId: string
  brand: string
  content: string
  sentiment: number // -1 to 1
  timestamp: Date
  engagement: number
  context: 'product' | 'support' | 'comparison' | 'review' | 'general'
  isCompetitorMention: boolean
}

export interface BrandSentiment {
  brand: string
  period: string
  mentions: number
  avgSentiment: number
  sentimentTrend: 'positive' | 'negative' | 'neutral'
  sentimentDistribution: {
    positive: number
    neutral: number
    negative: number
  }
  topPositiveMention?: {
    content: string
    author: string
    engagement: number
  }
  topNegativeMention?: {
    content: string
    author: string
    engagement: number
  }
}

export interface CompetitorAnalysis {
  brand: string
  competitor: string
  period: string
  brandMentions: number
  competitorMentions: number
  brandSentiment: number
  competitorSentiment: number
  shareOfVoice: number // Percentage
  directComparisons: Array<{
    content: string
    author: string
    favorsBrand: boolean
    timestamp: Date
  }>
}

export interface ReputationScore {
  brand: string
  score: number // 0-100
  trend: 'improving' | 'declining' | 'stable'
  factors: {
    sentiment: number
    volume: number
    engagement: number
    influencerSupport: number
  }
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface CrisisAlert {
  brand: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type: 'sentiment_drop' | 'negative_spike' | 'controversy' | 'product_issue'
  description: string
  mentions: Array<{
    content: string
    author: string
    sentiment: number
    engagement: number
    timestamp: Date
  }>
  detectedAt: Date
  resolved: boolean
}

export interface BrandInsights {
  brand: string
  period: string
  topTopics: Array<{
    topic: string
    mentions: number
    sentiment: number
  }>
  topInfluencers: Array<{
    name: string
    mentions: number
    avgSentiment: number
    followers: number
  }>
  geographicSpread?: {
    [country: string]: number
  }
  timeDistribution: {
    [hour: string]: number
  }
}

export interface BrandReport {
  brand: string
  period: string
  sentiment: BrandSentiment
  reputation: ReputationScore
  competitors: CompetitorAnalysis[]
  insights: BrandInsights
  alerts: CrisisAlert[]
  summary: {
    totalMentions: number
    mentionGrowth: number
    sentimentChange: number
    keyFindings: string[]
  }
}
