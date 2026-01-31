import { PrismaClient, AgentMetrics, ContentMetrics, Prisma } from '@prisma/client'

export class MetricsRepository {
  constructor(private prisma: PrismaClient) {}

  // ============ AGENT METRICS ============

  async createAgentMetrics(data: Prisma.AgentMetricsCreateInput): Promise<AgentMetrics> {
    return this.prisma.agentMetrics.create({ data })
  }

  async getAgentMetricsHistory(
    agentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<AgentMetrics[]> {
    return this.prisma.agentMetrics.findMany({
      where: {
        agentId,
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { timestamp: 'asc' },
    })
  }

  async getLatestAgentMetrics(agentId: string): Promise<AgentMetrics | null> {
    return this.prisma.agentMetrics.findFirst({
      where: { agentId },
      orderBy: { timestamp: 'desc' },
    })
  }

  async getTopAgentsByEngagement(limit: number = 10): Promise<any[]> {
    const recentTime = new Date(Date.now() - 24 * 3600000) // Last 24h

    const metrics = await this.prisma.agentMetrics.findMany({
      where: {
        timestamp: {
          gte: recentTime,
        },
      },
      include: {
        agent: true,
      },
      orderBy: { avgEngagement: 'desc' },
      take: limit,
    })

    return metrics.map((m) => ({
      agent: m.agent,
      engagement: m.avgEngagement,
      sentiment: m.sentimentScore,
    }))
  }

  // ============ CONTENT METRICS ============

  async createContentMetrics(data: Prisma.ContentMetricsCreateInput): Promise<ContentMetrics> {
    return this.prisma.contentMetrics.create({ data })
  }

  async getContentMetricsHistory(
    postId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ContentMetrics[]> {
    return this.prisma.contentMetrics.findMany({
      where: {
        postId,
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: { timestamp: 'asc' },
    })
  }

  async getViralContent(
    minViralityScore: number = 0.7,
    limit: number = 10
  ): Promise<any[]> {
    const recentTime = new Date(Date.now() - 24 * 3600000)

    const metrics = await this.prisma.contentMetrics.findMany({
      where: {
        timestamp: {
          gte: recentTime,
        },
        viralityScore: {
          gte: minViralityScore,
        },
      },
      include: {
        post: {
          include: {
            author: true,
          },
        },
      },
      orderBy: { viralityScore: 'desc' },
      take: limit,
    })

    return metrics.map((m) => ({
      post: m.post,
      viralityScore: m.viralityScore,
      engagement: m.engagement,
    }))
  }

  async getLatestContentMetrics(postId: string): Promise<ContentMetrics | null> {
    return this.prisma.contentMetrics.findFirst({
      where: { postId },
      orderBy: { timestamp: 'desc' },
    })
  }

  // ============ ANALYTICS ============

  async getEngagementStats(startTime: Date, endTime: Date): Promise<any> {
    const contentMetrics = await this.prisma.contentMetrics.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
    })

    const totalEngagement = contentMetrics.reduce((sum, m) => sum + m.engagement, 0)
    const avgEngagement = totalEngagement / contentMetrics.length || 0

    return {
      totalPosts: contentMetrics.length,
      avgEngagement,
      totalEngagement,
      avgVirality: contentMetrics.reduce((sum, m) => sum + m.viralityScore, 0) / contentMetrics.length || 0,
    }
  }

  async getAgentGrowth(agentId: string, days: number = 7): Promise<any> {
    const startTime = new Date(Date.now() - days * 24 * 3600000)

    const metrics = await this.prisma.agentMetrics.findMany({
      where: {
        agentId,
        timestamp: {
          gte: startTime,
        },
      },
      orderBy: { timestamp: 'asc' },
    })

    if (metrics.length < 2) {
      return { growth: 0, change: 0 }
    }

    const first = metrics[0]
    const last = metrics[metrics.length - 1]

    const karmaGrowth = last.karma - first.karma
    const followerGrowth = last.followers - first.followers

    return {
      karmaGrowth,
      followerGrowth,
      karmaChange: first.karma > 0 ? (karmaGrowth / first.karma) * 100 : 0,
      followerChange: first.followers > 0 ? (followerGrowth / first.followers) * 100 : 0,
    }
  }

  // ============ CLEANUP ============

  async cleanupOldMetrics(daysAgo: number = 90): Promise<number> {
    const threshold = new Date(Date.now() - daysAgo * 24 * 3600000)

    const [agentCount, contentCount] = await Promise.all([
      this.prisma.agentMetrics.deleteMany({
        where: {
          timestamp: {
            lt: threshold,
          },
        },
      }),
      this.prisma.contentMetrics.deleteMany({
        where: {
          timestamp: {
            lt: threshold,
          },
        },
      }),
    ])

    return agentCount.count + contentCount.count
  }
}
