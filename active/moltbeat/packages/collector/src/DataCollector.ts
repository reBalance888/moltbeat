import { MoltbookClient } from '@moltbeat/moltbook-client'
import { prisma, AgentRepository, PostRepository, MetricsRepository } from '@moltbeat/database'
import { AgentCache, PostCache, MetricsCache } from '@moltbeat/cache'
import { SentimentAnalyzer, BatchProcessor } from '@moltbeat/sentiment'

export interface CollectorConfig {
  moltbookApiKey: string
  collectAgents?: boolean
  collectPosts?: boolean
  collectMetrics?: boolean
  analyzeSentiment?: boolean
  submolts?: string[]
  maxAgents?: number
  maxPosts?: number
}

export interface CollectorStats {
  agentsCollected: number
  postsCollected: number
  commentsCollected: number
  metricsComputed: number
  sentimentAnalyzed: number
  errors: number
  duration: number
}

/**
 * Main data collector service
 * Orchestrates data collection from Moltbook API
 */
export class DataCollector {
  private client: MoltbookClient
  private agentRepo: AgentRepository
  private postRepo: PostRepository
  private metricsRepo: MetricsRepository
  private agentCache: AgentCache
  private postCache: PostCache
  private metricsCache: MetricsCache
  private sentimentAnalyzer: SentimentAnalyzer
  private batchProcessor: BatchProcessor

  private config: CollectorConfig
  private isRunning: boolean = false

  constructor(config: CollectorConfig) {
    this.config = config
    this.client = new MoltbookClient({ apiKey: config.moltbookApiKey })

    // Initialize repositories
    this.agentRepo = new AgentRepository(prisma)
    this.postRepo = new PostRepository(prisma)
    this.metricsRepo = new MetricsRepository(prisma)

    // Initialize caches
    this.agentCache = new AgentCache()
    this.postCache = new PostCache()
    this.metricsCache = new MetricsCache()

    // Initialize sentiment analyzer
    this.sentimentAnalyzer = new SentimentAnalyzer()
    this.batchProcessor = new BatchProcessor(this.sentimentAnalyzer)
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.config.analyzeSentiment) {
      console.log('Initializing sentiment analyzer...')
      await this.sentimentAnalyzer.initialize()
    }
  }

  /**
   * Run full collection cycle
   */
  async collect(): Promise<CollectorStats> {
    if (this.isRunning) {
      throw new Error('Collector is already running')
    }

    this.isRunning = true
    const startTime = Date.now()

    const stats: CollectorStats = {
      agentsCollected: 0,
      postsCollected: 0,
      commentsCollected: 0,
      metricsComputed: 0,
      sentimentAnalyzed: 0,
      errors: 0,
      duration: 0,
    }

    try {
      if (this.config.collectAgents) {
        stats.agentsCollected = await this.collectAgents()
      }

      if (this.config.collectPosts) {
        stats.postsCollected = await this.collectPosts()
      }

      if (this.config.collectMetrics) {
        stats.metricsComputed = await this.computeMetrics()
      }

      if (this.config.analyzeSentiment) {
        stats.sentimentAnalyzed = await this.analyzeSentiments()
      }
    } catch (error) {
      console.error('Collection error:', error)
      stats.errors++
    } finally {
      this.isRunning = false
      stats.duration = Date.now() - startTime
    }

    return stats
  }

  /**
   * Collect agents data
   */
  private async collectAgents(): Promise<number> {
    console.log('Collecting agents...')
    let collected = 0

    try {
      // Get agents needing sync from DB
      const staleAgents = await this.agentRepo.needsSync(3600000) // 1 hour

      // Limit if configured
      const agentsToSync = this.config.maxAgents
        ? staleAgents.slice(0, this.config.maxAgents)
        : staleAgents

      for (const agent of agentsToSync) {
        try {
          // Fetch fresh data from Moltbook
          const freshData = await this.client.getAgentProfile(agent.name)

          // Upsert to database
          await this.agentRepo.upsert({
            id: freshData.id,
            name: freshData.name,
            description: freshData.description || '',
            karma: freshData.karma,
            followerCount: freshData.follower_count,
            followingCount: freshData.following_count,
            isClaimed: freshData.is_claimed,
            isActive: freshData.is_active,
            avatarUrl: freshData.avatar_url,
          })

          // Update cache
          await this.agentCache.setAgent({
            id: freshData.id,
            name: freshData.name,
            karma: freshData.karma,
            followerCount: freshData.follower_count,
            followingCount: freshData.following_count,
            isActive: freshData.is_active,
            lastSynced: new Date().toISOString(),
          })

          collected++
        } catch (error) {
          console.error(`Error syncing agent ${agent.name}:`, error)
        }
      }
    } catch (error) {
      console.error('Error collecting agents:', error)
    }

    console.log(`Collected ${collected} agents`)
    return collected
  }

  /**
   * Collect posts data
   */
  private async collectPosts(): Promise<number> {
    console.log('Collecting posts...')
    let collected = 0

    try {
      const submolts = this.config.submolts || ['general', 'announcements']

      for (const submolt of submolts) {
        try {
          // Fetch posts from Moltbook
          const response = await this.client.getPosts({
            submolt,
            sort: 'new',
            limit: this.config.maxPosts || 50,
          })

          // Upsert posts
          const postsData = response.data.map((post: any) => ({
            id: post.id,
            submolt: post.submolt,
            title: post.title,
            content: post.content,
            url: post.url,
            authorId: post.author.name, // Use name as ID for now
            authorName: post.author.name,
            upvotes: post.upvotes,
            downvotes: post.downvotes,
            commentCount: post.comment_count,
            isPinned: post.is_pinned || false,
          }))

          const count = await this.postRepo.upsertMany(postsData)
          collected += count

          // Cache the feed
          await this.postCache.cacheFeed(
            submolt,
            postsData.map((p: any) => ({
              ...p,
              createdAt: new Date().toISOString(),
              engagement: p.upvotes + p.commentCount * 2,
            }))
          )
        } catch (error) {
          console.error(`Error collecting posts for ${submolt}:`, error)
        }
      }
    } catch (error) {
      console.error('Error collecting posts:', error)
    }

    console.log(`Collected ${collected} posts`)
    return collected
  }

  /**
   * Compute metrics for agents and content
   */
  private async computeMetrics(): Promise<number> {
    console.log('Computing metrics...')
    let computed = 0

    try {
      // Get active agents
      const agents = await this.agentRepo.getActive(100)

      for (const agent of agents) {
        try {
          // Get agent's posts
          const posts = await this.postRepo.getByAuthor(agent.id, 50)

          if (posts.length === 0) continue

          // Calculate metrics
          const avgUpvotes = posts.reduce((sum, p) => sum + p.upvotes, 0) / posts.length
          const avgEngagement = posts.reduce((sum, p) => sum + (p.upvotes + p.commentCount), 0) / posts.length

          // Get sentiment if available
          const sentiments = await prisma.sentimentAnalysis.findMany({
            where: {
              postId: { in: posts.map((p) => p.id) },
            },
          })

          const avgSentiment = sentiments.length > 0
            ? sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length
            : null

          // Create metrics record
          await this.metricsRepo.createAgentMetrics({
            agent: { connect: { id: agent.id } },
            karma: agent.karma,
            followers: agent.followerCount,
            following: agent.followingCount,
            postsCount: posts.length,
            commentsCount: 0, // TODO: implement
            avgUpvotes,
            avgEngagement,
            sentimentScore: avgSentiment,
          })

          // Cache metrics
          await this.metricsCache.cacheAgentMetrics(agent.id, {
            timestamp: new Date().toISOString(),
            karma: agent.karma,
            followers: agent.followerCount,
            avgEngagement,
            sentimentScore: avgSentiment,
          })

          computed++
        } catch (error) {
          console.error(`Error computing metrics for agent ${agent.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error computing metrics:', error)
    }

    console.log(`Computed ${computed} metrics`)
    return computed
  }

  /**
   * Analyze sentiment for posts without analysis
   */
  private async analyzeSentiments(): Promise<number> {
    console.log('Analyzing sentiments...')
    let analyzed = 0

    try {
      // Get posts without sentiment analysis
      const posts = await prisma.post.findMany({
        where: {
          sentimentAnalysis: { none: {} },
        },
        take: 100,
      })

      if (posts.length === 0) {
        console.log('No posts to analyze')
        return 0
      }

      // Batch process
      const items = posts.map((post) => ({
        id: post.id,
        text: post.content || post.title,
      }))

      const results = await this.batchProcessor.processBatch(items, {
        concurrency: 5,
        onProgress: (current, total) => {
          console.log(`Sentiment analysis progress: ${current}/${total}`)
        },
      })

      // Save to database
      for (const result of results) {
        try {
          const keywords = this.sentimentAnalyzer.extractKeywords(result.text, 5)

          await prisma.sentimentAnalysis.create({
            data: {
              contentType: 'post',
              postId: result.id,
              sentiment: result.result.sentiment,
              score: result.result.score,
              confidence: result.result.confidence,
              keywords,
            },
          })

          analyzed++
        } catch (error) {
          console.error(`Error saving sentiment for post ${result.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error analyzing sentiments:', error)
    }

    console.log(`Analyzed ${analyzed} sentiments`)
    return analyzed
  }

  /**
   * Get collector status
   */
  getStatus(): { isRunning: boolean; config: CollectorConfig } {
    return {
      isRunning: this.isRunning,
      config: this.config,
    }
  }
}
