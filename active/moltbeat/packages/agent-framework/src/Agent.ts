import { MoltbookClient } from '@moltbeat/moltbook-client'
import { AgentConfig, AgentAction, AgentMemory, AgentStats } from './types'
import { ActionScheduler } from './ActionScheduler'
import { ContentGenerator } from './ContentGenerator'
import { DecisionEngine } from './DecisionEngine'

/**
 * Base class for AI agents on MoltBook
 */
export abstract class Agent {
  protected client: MoltbookClient
  protected scheduler: ActionScheduler
  protected contentGenerator: ContentGenerator
  protected decisionEngine: DecisionEngine
  protected memory: AgentMemory
  protected stats: AgentStats
  protected isRunning: boolean = false

  constructor(protected config: AgentConfig) {
    this.client = new MoltbookClient({ apiKey: config.apiKey })
    this.scheduler = new ActionScheduler(config.schedule)
    this.contentGenerator = new ContentGenerator(config.personality)
    this.decisionEngine = new DecisionEngine(config.behavior)

    this.memory = {
      agentId: config.name,
      recentPosts: [],
      recentComments: [],
      interactions: new Map(),
      topics: new Map(),
      lastActive: new Date(),
    }

    this.stats = {
      postsCreated: 0,
      commentsCreated: 0,
      upvotesReceived: 0,
      followersGained: 0,
      engagementRate: 0,
      activeTime: 0,
    }
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`Agent ${this.config.name} is already running`)
      return
    }

    this.isRunning = true
    console.log(`Starting agent: ${this.config.name}`)

    await this.initialize()

    // Schedule periodic activities
    this.scheduler.scheduleRecurring('0 */2 * * *', async () => {
      if (this.isRunning) {
        await this.performCycle()
      }
    })

    console.log(`Agent ${this.config.name} started successfully`)
  }

  /**
   * Stop the agent
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    console.log(`Stopping agent: ${this.config.name}`)
    this.isRunning = false
    this.scheduler.stop()

    await this.cleanup()

    console.log(`Agent ${this.config.name} stopped`)
  }

  /**
   * Perform one activity cycle
   */
  protected async performCycle(): Promise<void> {
    const startTime = Date.now()

    try {
      // Decide what to do
      const action = await this.decideNextAction()

      if (action) {
        await this.executeAction(action)
      }

      // Learn from recent activities
      await this.learn()

      // Update stats
      const duration = (Date.now() - startTime) / 1000 / 60 // minutes
      this.stats.activeTime += duration
      this.memory.lastActive = new Date()
    } catch (error) {
      console.error(`Error in agent cycle: ${error}`)
    }
  }

  /**
   * Decide what action to take next
   */
  protected async decideNextAction(): Promise<AgentAction | null> {
    // Check if agent should be active now
    if (!this.scheduler.shouldBeActive()) {
      return null
    }

    // Get recent posts from submolts
    const result = await this.client.getPosts({
      submolt: this.config.behavior.submolts[0],
      limit: 20,
    })
    const posts = result.data

    // Decide whether to post or engage
    const shouldPost = this.decisionEngine.shouldCreatePost(
      this.stats.postsCreated,
      this.config.behavior.postingFrequency
    )

    if (shouldPost) {
      // Generate a new post
      const topic = this.selectTopic()
      const content = await this.generatePostContent(topic)

      return {
        type: 'post',
        data: {
          submolt: this.selectSubmolt(),
          title: content.title,
          content: content.body,
        },
        priority: 5,
      }
    }

    // Check if should engage with existing posts
    const shouldEngage = this.decisionEngine.shouldEngage(
      this.config.behavior.engagementRate
    )

    if (shouldEngage && posts.length > 0) {
      // Select a post to engage with
      const post = this.selectPostToEngageWith(posts)

      if (post) {
        const commentContent = await this.generateCommentContent(post)

        return {
          type: 'comment',
          data: {
            postId: post.id,
            content: commentContent,
          },
          priority: 3,
        }
      }
    }

    return null
  }

  /**
   * Execute an action
   */
  protected async executeAction(action: AgentAction): Promise<void> {
    switch (action.type) {
      case 'post':
        await this.createPost(action.data)
        break

      case 'comment':
        await this.createComment(action.data)
        break

      case 'upvote':
        await this.upvotePost(action.data.postId)
        break

      case 'follow':
        await this.followAgent(action.data.agentId)
        break
    }
  }

  /**
   * Create a post
   */
  protected async createPost(data: {
    submolt: string
    title: string
    content?: string
  }): Promise<void> {
    try {
      const post = await this.client.createPost({
        submolt: data.submolt,
        title: data.title,
        content: data.content,
      })

      this.memory.recentPosts.push(post.id)
      this.stats.postsCreated++

      console.log(`Agent ${this.config.name} created post: ${post.id}`)
    } catch (error) {
      console.error(`Failed to create post: ${error}`)
    }
  }

  /**
   * Create a comment
   */
  protected async createComment(data: {
    postId: string
    content: string
  }): Promise<void> {
    try {
      const comment = await this.client.createComment(data.postId, {
        content: data.content,
      })

      this.memory.recentComments.push(comment.id)
      this.stats.commentsCreated++

      console.log(`Agent ${this.config.name} commented on post: ${data.postId}`)
    } catch (error) {
      console.error(`Failed to create comment: ${error}`)
    }
  }

  /**
   * Upvote a post
   */
  protected async upvotePost(postId: string): Promise<void> {
    try {
      await this.client.upvotePost(postId)
      console.log(`Agent ${this.config.name} upvoted post: ${postId}`)
    } catch (error) {
      console.error(`Failed to upvote post: ${error}`)
    }
  }

  /**
   * Follow an agent
   */
  protected async followAgent(agentId: string): Promise<void> {
    try {
      await this.client.followAgent(agentId)
      console.log(`Agent ${this.config.name} followed agent: ${agentId}`)
    } catch (error) {
      console.error(`Failed to follow agent: ${error}`)
    }
  }

  /**
   * Select a topic to post about
   */
  protected selectTopic(): string {
    const topics =
      this.config.behavior.preferredTopics ||
      this.config.personality.interests

    return topics[Math.floor(Math.random() * topics.length)]
  }

  /**
   * Select a submolt to post in
   */
  protected selectSubmolt(): string {
    const submolts = this.config.behavior.submolts
    return submolts[Math.floor(Math.random() * submolts.length)]
  }

  /**
   * Select a post to engage with
   */
  protected selectPostToEngageWith(posts: any[]): any | null {
    // Filter posts based on interests
    const relevantPosts = posts.filter((post) => {
      const content = `${post.title} ${post.content || ''}`.toLowerCase()

      // Check if post matches interests
      return this.config.personality.interests.some((interest) =>
        content.includes(interest.toLowerCase())
      )
    })

    if (relevantPosts.length === 0) {
      return posts[0] // Fallback to first post
    }

    return relevantPosts[0]
  }

  /**
   * Abstract methods to be implemented by concrete agents
   */
  protected abstract initialize(): Promise<void>
  protected abstract cleanup(): Promise<void>
  protected abstract generatePostContent(topic: string): Promise<{
    title: string
    body: string
  }>
  protected abstract generateCommentContent(post: any): Promise<string>
  protected abstract learn(): Promise<void>

  /**
   * Get agent stats
   */
  getStats(): AgentStats {
    return { ...this.stats }
  }

  /**
   * Get agent memory
   */
  getMemory(): AgentMemory {
    return { ...this.memory }
  }
}
