import { prisma, PrismaClient } from '@moltbeat/database'
import { SentimentAnalyzer } from '@moltbeat/sentiment'
import { TokenDetector } from './TokenDetector'
import {
  CryptoMention,
  TokenSentiment,
  CryptoInfluencer,
  CryptoTrend,
  WhaleActivity,
  CryptoReport,
  PriceDiscussion,
} from './types'
import { WHALE_KEYWORDS } from './tokens'
import { subDays } from 'date-fns'

/**
 * Main cryptocurrency intelligence analyzer
 */
export class CryptoIntelligence {
  private tokenDetector: TokenDetector
  private sentimentAnalyzer: SentimentAnalyzer

  constructor(private prisma: PrismaClient) {
    this.tokenDetector = new TokenDetector()
    this.sentimentAnalyzer = new SentimentAnalyzer()
  }

  /**
   * Analyze crypto mentions in posts
   */
  async analyzeMentions(
    startDate: Date,
    endDate: Date
  ): Promise<CryptoMention[]> {
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

    const mentions: CryptoMention[] = []

    for (const post of posts) {
      const fullText = `${post.title} ${post.content || ''}`

      // Detect tokens
      const tokens = this.tokenDetector.detectTokens(fullText)

      if (tokens.length === 0) continue

      // Analyze sentiment
      const sentiment = await this.sentimentAnalyzer.analyze(fullText)

      // Detect context
      const context = this.tokenDetector.detectContext(fullText)

      // Calculate engagement
      const engagement = post.upvotes + post.commentCount * 2

      // Create mention for each token
      for (const token of tokens) {
        mentions.push({
          postId: post.id,
          authorId: post.authorId,
          token,
          content: fullText.substring(0, 200),
          sentiment: sentiment.score,
          timestamp: post.createdAt,
          engagement,
          context,
        })
      }
    }

    return mentions
  }

  /**
   * Calculate token sentiment for a period
   */
  async getTokenSentiment(
    token: string,
    days: number = 7
  ): Promise<TokenSentiment> {
    const endDate = new Date()
    const startDate = subDays(endDate, days)

    const mentions = await this.analyzeMentions(startDate, endDate)
    const tokenMentions = mentions.filter((m) => m.token === token)

    if (tokenMentions.length === 0) {
      return {
        token,
        period: `${days} days`,
        mentions: 0,
        avgSentiment: 0,
        sentimentTrend: 'neutral',
      }
    }

    const avgSentiment =
      tokenMentions.reduce((sum, m) => sum + m.sentiment, 0) /
      tokenMentions.length

    // Determine trend
    let sentimentTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
    if (avgSentiment > 0.2) sentimentTrend = 'bullish'
    else if (avgSentiment < -0.2) sentimentTrend = 'bearish'

    // Find top bullish and bearish posts
    const sortedByEngagement = [...tokenMentions].sort(
      (a, b) => b.engagement - a.engagement
    )
    const bullishPosts = sortedByEngagement.filter((m) => m.sentiment > 0.3)
    const bearishPosts = sortedByEngagement.filter((m) => m.sentiment < -0.3)

    const result: TokenSentiment = {
      token,
      period: `${days} days`,
      mentions: tokenMentions.length,
      avgSentiment,
      sentimentTrend,
    }

    if (bullishPosts.length > 0) {
      const top = bullishPosts[0]
      const author = await this.prisma.agent.findUnique({
        where: { id: top.authorId },
        select: { name: true },
      })
      result.topBullishPost = {
        content: top.content,
        author: author?.name || 'Unknown',
        engagement: top.engagement,
      }
    }

    if (bearishPosts.length > 0) {
      const top = bearishPosts[0]
      const author = await this.prisma.agent.findUnique({
        where: { id: top.authorId },
        select: { name: true },
      })
      result.topBearishPost = {
        content: top.content,
        author: author?.name || 'Unknown',
        engagement: top.engagement,
      }
    }

    return result
  }

  /**
   * Find crypto influencers
   */
  async findInfluencers(days: number = 30): Promise<CryptoInfluencer[]> {
    const endDate = new Date()
    const startDate = subDays(endDate, days)

    const mentions = await this.analyzeMentions(startDate, endDate)

    // Group by author
    const authorStats = new Map<
      string,
      {
        mentions: number
        tokens: Set<string>
        totalEngagement: number
      }
    >()

    for (const mention of mentions) {
      const existing = authorStats.get(mention.authorId) || {
        mentions: 0,
        tokens: new Set(),
        totalEngagement: 0,
      }

      existing.mentions++
      existing.tokens.add(mention.token)
      existing.totalEngagement += mention.engagement

      authorStats.set(mention.authorId, existing)
    }

    // Filter authors with at least 5 crypto mentions
    const influencerIds = Array.from(authorStats.entries())
      .filter(([_, stats]) => stats.mentions >= 5)
      .map(([id]) => id)

    // Get agent details
    const agents = await this.prisma.agent.findMany({
      where: { id: { in: influencerIds } },
      select: {
        id: true,
        name: true,
        followerCount: true,
      },
    })

    const influencers: CryptoInfluencer[] = agents.map((agent: any) => {
      const stats = authorStats.get(agent.id)!
      return {
        agentId: agent.id,
        name: agent.name,
        cryptoMentions: stats.mentions,
        followers: agent.followerCount,
        engagement: stats.totalEngagement,
        specialization: Array.from(stats.tokens),
      }
    })

    return influencers.sort((a, b) => b.cryptoMentions - a.cryptoMentions)
  }

  /**
   * Detect trending tokens
   */
  async detectTrends(days: number = 7): Promise<CryptoTrend[]> {
    const currentPeriodEnd = new Date()
    const currentPeriodStart = subDays(currentPeriodEnd, days)
    const previousPeriodEnd = currentPeriodStart
    const previousPeriodStart = subDays(previousPeriodEnd, days)

    const currentMentions = await this.analyzeMentions(
      currentPeriodStart,
      currentPeriodEnd
    )
    const previousMentions = await this.analyzeMentions(
      previousPeriodStart,
      previousPeriodEnd
    )

    // Count mentions by token
    const currentCounts = this.countByToken(currentMentions)
    const previousCounts = this.countByToken(previousMentions)

    const trends: CryptoTrend[] = []

    for (const [token, currentCount] of currentCounts) {
      const previousCount = previousCounts.get(token) || 0

      // Calculate growth
      const mentionGrowth =
        previousCount > 0
          ? ((currentCount - previousCount) / previousCount) * 100
          : currentCount > 0
            ? 100
            : 0

      // Calculate sentiment shift
      const currentSentiment = this.getAvgSentiment(
        currentMentions.filter((m) => m.token === token)
      )
      const previousSentiment = this.getAvgSentiment(
        previousMentions.filter((m) => m.token === token)
      )
      const sentimentShift = currentSentiment - previousSentiment

      // Find viral posts
      const tokenPosts = currentMentions
        .filter((m) => m.token === token)
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 3)

      const viralPosts = await Promise.all(
        tokenPosts.map(async (mention) => {
          const author = await this.prisma.agent.findUnique({
            where: { id: mention.authorId },
            select: { name: true },
          })

          return {
            content: mention.content,
            author: author?.name || 'Unknown',
            engagement: mention.engagement,
            viralScore: mention.engagement * (1 + currentSentiment),
          }
        })
      )

      trends.push({
        token,
        period: `${days} days`,
        mentionGrowth,
        sentimentShift,
        viralPosts,
        isBreakingOut: mentionGrowth > 50 && currentCount > 10,
      })
    }

    return trends
      .sort((a, b) => b.mentionGrowth - a.mentionGrowth)
      .filter((t) => t.mentionGrowth > 0)
  }

  /**
   * Detect whale activity mentions
   */
  async detectWhaleActivity(days: number = 7): Promise<WhaleActivity> {
    const endDate = new Date()
    const startDate = subDays(endDate, days)

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
      },
    })

    const mentions: WhaleActivity['mentions'] = []

    for (const post of posts) {
      const fullText = `${post.title} ${post.content || ''}`.toLowerCase()

      // Check for whale keywords
      const matchedKeywords = WHALE_KEYWORDS.filter((kw) =>
        fullText.includes(kw.toLowerCase())
      )

      if (matchedKeywords.length === 0) continue

      // Detect tokens
      const tokens = this.tokenDetector.detectTokens(fullText)

      if (tokens.length === 0) continue

      // Get author
      const author = await this.prisma.agent.findUnique({
        where: { id: post.authorId },
        select: { name: true },
      })

      for (const token of tokens) {
        mentions.push({
          content: `${post.title} ${post.content || ''}`.substring(0, 200),
          token,
          author: author?.name || 'Unknown',
          timestamp: post.createdAt,
          keywords: matchedKeywords,
        })
      }
    }

    return { mentions }
  }

  /**
   * Extract price predictions
   */
  async getPriceDiscussions(
    token: string,
    days: number = 7
  ): Promise<PriceDiscussion> {
    const endDate = new Date()
    const startDate = subDays(endDate, days)

    const mentions = await this.analyzeMentions(startDate, endDate)
    const tokenMentions = mentions.filter(
      (m) => m.token === token && (m.context === 'price' || m.context === 'prediction')
    )

    const predictions: PriceDiscussion['predictions'] = []

    for (const mention of tokenMentions) {
      const post = await this.prisma.post.findUnique({
        where: { id: mention.postId },
        select: { title: true, content: true },
      })

      if (!post) continue

      const fullText = `${post.title} ${post.content || ''}`
      const prediction = this.tokenDetector.extractPricePrediction(fullText)

      if (prediction && prediction.price) {
        const author = await this.prisma.agent.findUnique({
          where: { id: mention.authorId },
          select: { name: true },
        })

        predictions.push({
          author: author?.name || 'Unknown',
          predictedPrice: prediction.price,
          timeframe: prediction.timeframe || 'not specified',
          confidence: Math.abs(mention.sentiment),
          timestamp: mention.timestamp,
        })
      }
    }

    const avgPrediction =
      predictions.length > 0
        ? predictions.reduce((sum, p) => sum + p.predictedPrice, 0) /
          predictions.length
        : 0

    const avgSentiment = this.getAvgSentiment(tokenMentions)
    const sentimentBias: 'bullish' | 'bearish' | 'neutral' =
      avgSentiment > 0.2 ? 'bullish' : avgSentiment < -0.2 ? 'bearish' : 'neutral'

    return {
      token,
      predictions,
      avgPrediction,
      sentimentBias,
    }
  }

  /**
   * Generate comprehensive crypto report
   */
  async generateReport(days: number = 7): Promise<CryptoReport> {
    const [trends, influencers, whaleAlerts] = await Promise.all([
      this.detectTrends(days),
      this.findInfluencers(days),
      this.detectWhaleActivity(days),
    ])

    // Get top 10 tokens by mentions
    const topTokens = await Promise.all(
      trends
        .slice(0, 10)
        .map((t) => this.getTokenSentiment(t.token, days))
    )

    // Calculate overall market sentiment
    const endDate = new Date()
    const startDate = subDays(endDate, days)
    const allMentions = await this.analyzeMentions(startDate, endDate)

    const btcMentions = allMentions.filter((m) => m.token === 'BTC')
    const altcoinMentions = allMentions.filter((m) => m.token !== 'BTC')

    return {
      period: `${days} days`,
      topTokens,
      topInfluencers: influencers.slice(0, 10),
      breakingTrends: trends.filter((t) => t.isBreakingOut),
      whaleAlerts,
      marketSentiment: {
        overall: this.getAvgSentiment(allMentions),
        bitcoin: this.getAvgSentiment(btcMentions),
        altcoins: this.getAvgSentiment(altcoinMentions),
      },
    }
  }

  /**
   * Helper: Count mentions by token
   */
  private countByToken(mentions: CryptoMention[]): Map<string, number> {
    const counts = new Map<string, number>()
    for (const mention of mentions) {
      counts.set(mention.token, (counts.get(mention.token) || 0) + 1)
    }
    return counts
  }

  /**
   * Helper: Calculate average sentiment
   */
  private getAvgSentiment(mentions: CryptoMention[]): number {
    if (mentions.length === 0) return 0
    return mentions.reduce((sum, m) => sum + m.sentiment, 0) / mentions.length
  }
}
