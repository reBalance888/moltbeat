import { PrismaClient } from '@moltbeat/database'
import { SentimentAnalyzer } from '@moltbeat/sentiment'
import { BrandDetector } from './BrandDetector'
import {
  BrandConfig,
  BrandMention,
  BrandSentiment,
  CompetitorAnalysis,
  ReputationScore,
  CrisisAlert,
  BrandInsights,
  BrandReport,
} from './types'
import { subDays, format } from 'date-fns'

/**
 * Main brand monitoring and reputation tracking system
 */
export class BrandRadar {
  private brandDetector: BrandDetector
  private sentimentAnalyzer: SentimentAnalyzer

  constructor(private prisma: PrismaClient) {
    this.brandDetector = new BrandDetector()
    this.sentimentAnalyzer = new SentimentAnalyzer()
  }

  /**
   * Track brand mentions in posts
   */
  async trackMentions(
    config: BrandConfig,
    startDate: Date,
    endDate: Date
  ): Promise<BrandMention[]> {
    const posts = await this.prisma.post.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        authorId: true,
        createdAt: true,
        upvotes: true,
        commentCount: true,
      },
    })

    const mentions: BrandMention[] = []

    for (const post of posts) {
      const fullText = `${post.title} ${post.content || ''}`

      // Detect brand mention
      if (!this.brandDetector.detectBrand(fullText, config)) continue

      // Analyze sentiment
      const sentiment = await this.sentimentAnalyzer.analyze(fullText)

      // Detect context
      const context = this.brandDetector.detectContext(fullText)

      // Check for competitor mention
      const competitor = this.brandDetector.detectCompetitor(fullText, config)

      // Calculate engagement
      const engagement = post.upvotes + post.commentCount * 2

      mentions.push({
        postId: post.id,
        authorId: post.authorId,
        brand: config.name,
        content: fullText.substring(0, 200),
        sentiment: sentiment.score,
        timestamp: post.createdAt,
        engagement,
        context,
        isCompetitorMention: !!competitor,
      })
    }

    return mentions
  }

  /**
   * Calculate brand sentiment
   */
  async getBrandSentiment(
    config: BrandConfig,
    days: number = 7
  ): Promise<BrandSentiment> {
    const endDate = new Date()
    const startDate = subDays(endDate, days)

    const mentions = await this.trackMentions(config, startDate, endDate)

    if (mentions.length === 0) {
      return {
        brand: config.name,
        period: `${days} days`,
        mentions: 0,
        avgSentiment: 0,
        sentimentTrend: 'neutral',
        sentimentDistribution: {
          positive: 0,
          neutral: 0,
          negative: 0,
        },
      }
    }

    const avgSentiment =
      mentions.reduce((sum, m) => sum + m.sentiment, 0) / mentions.length

    // Calculate distribution
    const positive = mentions.filter((m) => m.sentiment > 0.2).length
    const negative = mentions.filter((m) => m.sentiment < -0.2).length
    const neutral = mentions.length - positive - negative

    // Determine trend
    let sentimentTrend: 'positive' | 'negative' | 'neutral' = 'neutral'
    if (avgSentiment > 0.2) sentimentTrend = 'positive'
    else if (avgSentiment < -0.2) sentimentTrend = 'negative'

    // Find top mentions
    const sortedByEngagement = [...mentions].sort(
      (a, b) => b.engagement - a.engagement
    )
    const positiveMentions = sortedByEngagement.filter((m) => m.sentiment > 0.3)
    const negativeMentions = sortedByEngagement.filter((m) => m.sentiment < -0.3)

    const result: BrandSentiment = {
      brand: config.name,
      period: `${days} days`,
      mentions: mentions.length,
      avgSentiment,
      sentimentTrend,
      sentimentDistribution: {
        positive,
        neutral,
        negative,
      },
    }

    if (positiveMentions.length > 0) {
      const top = positiveMentions[0]
      const author = await this.prisma.agent.findUnique({
        where: { id: top.authorId },
        select: { name: true },
      })
      result.topPositiveMention = {
        content: top.content,
        author: author?.name || 'Unknown',
        engagement: top.engagement,
      }
    }

    if (negativeMentions.length > 0) {
      const top = negativeMentions[0]
      const author = await this.prisma.agent.findUnique({
        where: { id: top.authorId },
        select: { name: true },
      })
      result.topNegativeMention = {
        content: top.content,
        author: author?.name || 'Unknown',
        engagement: top.engagement,
      }
    }

    return result
  }

  /**
   * Compare brand with competitor
   */
  async compareWithCompetitor(
    config: BrandConfig,
    competitor: string,
    days: number = 7
  ): Promise<CompetitorAnalysis> {
    const endDate = new Date()
    const startDate = subDays(endDate, days)

    // Get brand mentions
    const brandMentions = await this.trackMentions(config, startDate, endDate)

    // Get competitor mentions
    const competitorConfig: BrandConfig = {
      name: competitor,
      keywords: [competitor],
    }
    const competitorMentions = await this.trackMentions(
      competitorConfig,
      startDate,
      endDate
    )

    // Calculate metrics
    const brandSentiment =
      brandMentions.length > 0
        ? brandMentions.reduce((sum, m) => sum + m.sentiment, 0) /
          brandMentions.length
        : 0

    const competitorSentiment =
      competitorMentions.length > 0
        ? competitorMentions.reduce((sum, m) => sum + m.sentiment, 0) /
          competitorMentions.length
        : 0

    const totalMentions = brandMentions.length + competitorMentions.length
    const shareOfVoice =
      totalMentions > 0 ? (brandMentions.length / totalMentions) * 100 : 50

    // Find direct comparisons (mentions that include both brands)
    const directComparisons = brandMentions
      .filter((m) => m.isCompetitorMention)
      .map((m) => ({
        content: m.content,
        author: 'Unknown', // Will be filled later if needed
        favorsBrand: m.sentiment > 0,
        timestamp: m.timestamp,
      }))
      .slice(0, 5)

    return {
      brand: config.name,
      competitor,
      period: `${days} days`,
      brandMentions: brandMentions.length,
      competitorMentions: competitorMentions.length,
      brandSentiment,
      competitorSentiment,
      shareOfVoice,
      directComparisons,
    }
  }

  /**
   * Calculate reputation score
   */
  async getReputationScore(
    config: BrandConfig,
    days: number = 30
  ): Promise<ReputationScore> {
    const sentiment = await this.getBrandSentiment(config, days)

    // Calculate previous period for trend
    const previousEndDate = subDays(new Date(), days)
    const previousStartDate = subDays(previousEndDate, days)
    const previousMentions = await this.trackMentions(
      config,
      previousStartDate,
      previousEndDate
    )

    const previousSentiment =
      previousMentions.length > 0
        ? previousMentions.reduce((sum, m) => sum + m.sentiment, 0) /
          previousMentions.length
        : 0

    // Determine trend
    const sentimentChange = sentiment.avgSentiment - previousSentiment
    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    if (sentimentChange > 0.1) trend = 'improving'
    else if (sentimentChange < -0.1) trend = 'declining'

    // Calculate factor scores (0-100)
    const sentimentScore = ((sentiment.avgSentiment + 1) / 2) * 100 // Convert -1,1 to 0,100
    const volumeScore = Math.min((sentiment.mentions / 100) * 100, 100) // Cap at 100 mentions
    const engagementScore = 75 // Placeholder - would calculate from actual engagement
    const influencerScore = 60 // Placeholder - would calculate from influencer mentions

    // Overall score (weighted average)
    const score =
      sentimentScore * 0.4 +
      volumeScore * 0.2 +
      engagementScore * 0.2 +
      influencerScore * 0.2

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
    if (sentiment.avgSentiment < -0.5 || trend === 'declining') riskLevel = 'high'
    else if (sentiment.avgSentiment < -0.2) riskLevel = 'medium'

    return {
      brand: config.name,
      score,
      trend,
      factors: {
        sentiment: sentimentScore,
        volume: volumeScore,
        engagement: engagementScore,
        influencerSupport: influencerScore,
      },
      riskLevel,
    }
  }

  /**
   * Detect potential crises
   */
  async detectCrises(
    config: BrandConfig,
    days: number = 7
  ): Promise<CrisisAlert[]> {
    const endDate = new Date()
    const startDate = subDays(endDate, days)

    const mentions = await this.trackMentions(config, startDate, endDate)

    const alerts: CrisisAlert[] = []

    // Check for sentiment drop
    const avgSentiment =
      mentions.length > 0
        ? mentions.reduce((sum, m) => sum + m.sentiment, 0) / mentions.length
        : 0

    if (avgSentiment < -0.3 && mentions.length > 5) {
      const negativeMentions = mentions
        .filter((m) => m.sentiment < -0.2)
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 5)

      const mentionsWithAuthors = await Promise.all(
        negativeMentions.map(async (m) => {
          const author = await this.prisma.agent.findUnique({
            where: { id: m.authorId },
            select: { name: true },
          })
          return {
            content: m.content,
            author: author?.name || 'Unknown',
            sentiment: m.sentiment,
            engagement: m.engagement,
            timestamp: m.timestamp,
          }
        })
      )

      alerts.push({
        brand: config.name,
        severity: avgSentiment < -0.5 ? 'critical' : 'high',
        type: 'sentiment_drop',
        description: `Significant negative sentiment detected (${(avgSentiment * 100).toFixed(1)}%)`,
        mentions: mentionsWithAuthors,
        detectedAt: new Date(),
        resolved: false,
      })
    }

    // Check for negative spike
    const recentMentions = mentions.filter(
      (m) => m.timestamp > subDays(new Date(), 1)
    )
    const negativeSpikeRatio =
      recentMentions.filter((m) => m.sentiment < -0.2).length /
      Math.max(recentMentions.length, 1)

    if (negativeSpikeRatio > 0.6 && recentMentions.length > 3) {
      const topNegative = recentMentions
        .filter((m) => m.sentiment < -0.2)
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 3)

      const mentionsWithAuthors = await Promise.all(
        topNegative.map(async (m) => {
          const author = await this.prisma.agent.findUnique({
            where: { id: m.authorId },
            select: { name: true },
          })
          return {
            content: m.content,
            author: author?.name || 'Unknown',
            sentiment: m.sentiment,
            engagement: m.engagement,
            timestamp: m.timestamp,
          }
        })
      )

      alerts.push({
        brand: config.name,
        severity: 'high',
        type: 'negative_spike',
        description: `Unusual spike in negative mentions in last 24 hours (${(negativeSpikeRatio * 100).toFixed(0)}%)`,
        mentions: mentionsWithAuthors,
        detectedAt: new Date(),
        resolved: false,
      })
    }

    return alerts
  }

  /**
   * Get brand insights
   */
  async getBrandInsights(
    config: BrandConfig,
    days: number = 7
  ): Promise<BrandInsights> {
    const endDate = new Date()
    const startDate = subDays(endDate, days)

    const mentions = await this.trackMentions(config, startDate, endDate)

    // Extract top topics (keywords)
    const allKeywords: { [key: string]: { count: number; sentiment: number } } =
      {}

    for (const mention of mentions) {
      const keywords = this.brandDetector.extractKeywords(mention.content)
      for (const keyword of keywords) {
        if (!allKeywords[keyword]) {
          allKeywords[keyword] = { count: 0, sentiment: 0 }
        }
        allKeywords[keyword].count++
        allKeywords[keyword].sentiment += mention.sentiment
      }
    }

    const topTopics = Object.entries(allKeywords)
      .map(([topic, data]) => ({
        topic,
        mentions: data.count,
        sentiment: data.sentiment / data.count,
      }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10)

    // Find top influencers
    const authorStats = new Map<
      string,
      { mentions: number; sentiment: number }
    >()

    for (const mention of mentions) {
      const existing = authorStats.get(mention.authorId) || {
        mentions: 0,
        sentiment: 0,
      }
      existing.mentions++
      existing.sentiment += mention.sentiment
      authorStats.set(mention.authorId, existing)
    }

    const topAuthorIds = Array.from(authorStats.entries())
      .sort((a, b) => b[1].mentions - a[1].mentions)
      .slice(0, 5)
      .map(([id]) => id)

    const agents = await this.prisma.agent.findMany({
      where: { id: { in: topAuthorIds } },
      select: { id: true, name: true, followerCount: true },
    })

    const topInfluencers = agents.map((agent) => {
      const stats = authorStats.get(agent.id)!
      return {
        name: agent.name,
        mentions: stats.mentions,
        avgSentiment: stats.sentiment / stats.mentions,
        followers: agent.followerCount,
      }
    })

    // Time distribution (by hour)
    const timeDistribution: { [hour: string]: number } = {}
    for (const mention of mentions) {
      const hour = format(mention.timestamp, 'HH:00')
      timeDistribution[hour] = (timeDistribution[hour] || 0) + 1
    }

    return {
      brand: config.name,
      period: `${days} days`,
      topTopics,
      topInfluencers,
      timeDistribution,
    }
  }

  /**
   * Generate comprehensive brand report
   */
  async generateReport(
    config: BrandConfig,
    days: number = 7
  ): Promise<BrandReport> {
    const [sentiment, reputation, insights, alerts] = await Promise.all([
      this.getBrandSentiment(config, days),
      this.getReputationScore(config, days),
      this.getBrandInsights(config, days),
      this.detectCrises(config, days),
    ])

    // Get competitor analyses
    const competitors: CompetitorAnalysis[] = []
    if (config.competitors) {
      for (const competitor of config.competitors.slice(0, 3)) {
        const analysis = await this.compareWithCompetitor(
          config,
          competitor,
          days
        )
        competitors.push(analysis)
      }
    }

    // Calculate mention growth
    const previousEndDate = subDays(new Date(), days)
    const previousStartDate = subDays(previousEndDate, days)
    const previousMentions = await this.trackMentions(
      config,
      previousStartDate,
      previousEndDate
    )

    const mentionGrowth =
      previousMentions.length > 0
        ? ((sentiment.mentions - previousMentions.length) /
            previousMentions.length) *
          100
        : sentiment.mentions > 0
          ? 100
          : 0

    // Calculate sentiment change
    const previousSentiment =
      previousMentions.length > 0
        ? previousMentions.reduce((sum, m) => sum + m.sentiment, 0) /
          previousMentions.length
        : 0
    const sentimentChange = sentiment.avgSentiment - previousSentiment

    // Generate key findings
    const keyFindings: string[] = []

    if (mentionGrowth > 20) {
      keyFindings.push(`Mentions increased by ${mentionGrowth.toFixed(0)}%`)
    } else if (mentionGrowth < -20) {
      keyFindings.push(`Mentions decreased by ${Math.abs(mentionGrowth).toFixed(0)}%`)
    }

    if (sentiment.sentimentTrend === 'positive') {
      keyFindings.push('Overall positive sentiment trend')
    } else if (sentiment.sentimentTrend === 'negative') {
      keyFindings.push('Negative sentiment detected - requires attention')
    }

    if (reputation.riskLevel === 'high' || reputation.riskLevel === 'critical') {
      keyFindings.push(`Risk level: ${reputation.riskLevel.toUpperCase()}`)
    }

    if (alerts.length > 0) {
      keyFindings.push(`${alerts.length} active alert(s)`)
    }

    return {
      brand: config.name,
      period: `${days} days`,
      sentiment,
      reputation,
      competitors,
      insights,
      alerts,
      summary: {
        totalMentions: sentiment.mentions,
        mentionGrowth,
        sentimentChange,
        keyFindings,
      },
    }
  }
}
