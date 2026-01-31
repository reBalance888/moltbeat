/**
 * Base Agent Class
 * Resilient agent with retry logic and circuit breaker
 */

import { MoltBookClient } from '@moltbeat/moltbook-client';
import { logger } from '@moltbeat/logger';
import { AgentScheduler, SchedulerConfig } from './scheduler';
import { CircuitBreaker, retryWithCircuitBreaker, RetryConfig } from './retry';

export interface AgentConfig {
  id: string;
  name: string;
  apiKey: string;
  personality?: string;
  scheduler: SchedulerConfig;
  retry?: RetryConfig;
}

export abstract class Agent {
  protected client: MoltBookClient;
  protected scheduler: AgentScheduler;
  protected circuitBreaker: CircuitBreaker;
  protected retryConfig: RetryConfig;

  public readonly id: string;
  public readonly name: string;
  public readonly personality?: string;

  private isRunning: boolean = false;
  private shutdownRequested: boolean = false;

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.personality = config.personality;

    // Initialize MoltBook client
    this.client = new MoltBookClient({ apiKey: config.apiKey });

    // Initialize scheduler
    this.scheduler = new AgentScheduler({
      ...config.scheduler,
      agentName: config.name,
    });

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 10,
      successThreshold: 3,
      timeout: 120000, // 2 minutes
    });

    // Retry config
    this.retryConfig = config.retry || {
      maxRetries: 5,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    };

    logger.info({ agentId: this.id, agentName: this.name }, 'Agent initialized');
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn({ agentName: this.name }, 'Agent already running');
      return;
    }

    this.isRunning = true;
    this.shutdownRequested = false;

    logger.info({ agentName: this.name }, 'Agent started');

    try {
      await this.onStart();
      await this.run();
    } catch (error: any) {
      logger.error({ agentName: this.name, error: error.message }, 'Agent error');
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop the agent gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info({ agentName: this.name }, 'Stopping agent...');
    this.shutdownRequested = true;

    // Wait for current operation to complete (max 30s)
    const timeout = setTimeout(() => {
      logger.warn({ agentName: this.name }, 'Agent shutdown timeout');
    }, 30000);

    while (this.isRunning) {
      await sleep(100);
    }

    clearTimeout(timeout);

    await this.onStop();

    logger.info({ agentName: this.name }, 'Agent stopped');
  }

  /**
   * Create a post with retry logic
   */
  protected async createPost(params: {
    submolt: string;
    title: string;
    content?: string;
    url?: string;
  }): Promise<void> {
    await retryWithCircuitBreaker(
      async () => {
        // Check scheduler
        if (!this.scheduler.canPostNow()) {
          const nextPostTime = this.scheduler.getNextPostTime();
          throw new Error(`Cannot post now. Next post at ${nextPostTime.toISOString()}`);
        }

        // Create post
        const post = await this.client.createPost(params);

        // Record in scheduler
        this.scheduler.recordPost();

        logger.info(
          {
            agentName: this.name,
            postId: post.id,
            submolt: params.submolt,
          },
          'Post created successfully'
        );
      },
      this.circuitBreaker,
      this.retryConfig,
      {
        operation: 'createPost',
        agentName: this.name,
      }
    );
  }

  /**
   * Create a comment with retry logic
   */
  protected async createComment(postId: string, content: string): Promise<void> {
    await retryWithCircuitBreaker(
      async () => {
        // Check scheduler
        if (!this.scheduler.canCommentNow()) {
          const nextCommentTime = this.scheduler.getNextCommentTime();
          throw new Error(`Cannot comment now. Next comment at ${nextCommentTime.toISOString()}`);
        }

        // Create comment
        await this.client.createComment(postId, content);

        // Record in scheduler
        this.scheduler.recordComment();

        logger.info(
          {
            agentName: this.name,
            postId,
          },
          'Comment created successfully'
        );
      },
      this.circuitBreaker,
      this.retryConfig,
      {
        operation: 'createComment',
        agentName: this.name,
      }
    );
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      isRunning: this.isRunning,
      circuitBreaker: this.circuitBreaker.getState(),
      scheduler: this.scheduler.getStatus(),
    };
  }

  /**
   * Main run loop (implemented by subclass)
   */
  protected abstract run(): Promise<void>;

  /**
   * Called when agent starts (optional hook)
   */
  protected async onStart(): Promise<void> {
    // Override in subclass if needed
  }

  /**
   * Called when agent stops (optional hook)
   */
  protected async onStop(): Promise<void> {
    // Override in subclass if needed
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
