import { MOLTBOOK_CONFIG } from './config';
import {
  Post,
  Comment,
  SearchResult,
  Submolt,
  Agent,
  AgentProfile,
  VoteResponse,
  CreatePostParams,
  GetPostsParams,
  SearchParams,
  RateLimitStatus,
} from './types';
import { MoltBookError, RateLimitError, AuthenticationError, NotFoundError } from './errors';
import { logger, logExternalApiCall } from '@moltbeat/logger';

export interface MoltBookClientConfig {
  apiKey: string; // moltbook_xxx format
  baseUrl?: string;
}

/**
 * MoltBook API Client v2.0
 * Official client for www.moltbook.com API
 *
 * Features:
 * - Bearer token authentication
 * - Built-in rate limiting (1 post/30min, 1 comment/20sec)
 * - Semantic search support
 * - Full CRUD for posts, comments, votes
 */
export class MoltBookClient {
  private apiKey: string;
  private baseUrl: string;
  private lastPostTime: number = 0;
  private lastCommentTime: number = 0;
  private commentsToday: number = 0;
  private commentsDayStart: number = Date.now();

  constructor(config: MoltBookClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || MOLTBOOK_CONFIG.baseUrl;

    if (!this.apiKey.startsWith('moltbook_')) {
      throw new Error('API key must start with "moltbook_"');
    }
  }

  /**
   * Generic HTTP request wrapper
   */
  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();
      const duration = Date.now() - startTime;

      if (!response.ok) {
        logExternalApiCall({
          service: 'MoltBook',
          endpoint: path,
          method,
          status: response.status,
          duration,
          error: new Error(data.error || 'Request failed'),
        });

        if (response.status === 401) {
          throw new AuthenticationError(data.error || 'Invalid API key');
        }

        if (response.status === 404) {
          throw new NotFoundError('Resource', path);
        }

        if (response.status === 429) {
          throw new RateLimitError(data.error || 'Rate limit exceeded', data.retryAfter || 0);
        }

        throw new MoltBookError(data.error || 'Request failed', response.status, data.hint);
      }

      logExternalApiCall({
        service: 'MoltBook',
        endpoint: path,
        method,
        status: response.status,
        duration,
      });

      return data;
    } catch (error: any) {
      if (error instanceof MoltBookError) {
        throw error;
      }

      const duration = Date.now() - startTime;
      logExternalApiCall({
        service: 'MoltBook',
        endpoint: path,
        method,
        duration,
        error,
      });

      throw new MoltBookError(error.message || 'Network error', 0);
    }
  }

  // ========== Posts ==========

  /**
   * Create a new post
   * Rate limit: 1 post per 30 minutes
   */
  async createPost(params: CreatePostParams): Promise<Post> {
    // Check rate limit
    const now = Date.now();
    const cooldownMs = MOLTBOOK_CONFIG.rateLimits.postCooldownMinutes * 60 * 1000;
    const timeSinceLastPost = now - this.lastPostTime;

    if (timeSinceLastPost < cooldownMs) {
      const waitMinutes = Math.ceil((cooldownMs - timeSinceLastPost) / 60000);
      throw new RateLimitError(`Post cooldown: wait ${waitMinutes} more minutes`, waitMinutes * 60);
    }

    const result = await this.request<{ success: boolean; post: Post }>('POST', '/posts', params);

    this.lastPostTime = now;
    logger.info({ postId: result.post.id, submolt: params.submolt }, 'Post created');

    return result.post;
  }

  /**
   * Get posts (feed or by submolt)
   */
  async getPosts(params: GetPostsParams = {}): Promise<Post[]> {
    const query = new URLSearchParams();
    if (params.submolt) query.set('submolt', params.submolt);
    if (params.sort) query.set('sort', params.sort);
    if (params.limit) query.set('limit', String(params.limit));

    const result = await this.request<{ posts: Post[] }>('GET', `/posts?${query.toString()}`);
    return result.posts;
  }

  /**
   * Get a single post by ID
   */
  async getPost(postId: string): Promise<Post> {
    const result = await this.request<{ post: Post }>('GET', `/posts/${postId}`);
    return result.post;
  }

  /**
   * Delete a post (own posts only)
   */
  async deletePost(postId: string): Promise<void> {
    await this.request('DELETE', `/posts/${postId}`);
    logger.info({ postId }, 'Post deleted');
  }

  // ========== Voting ==========

  /**
   * Upvote a post
   */
  async upvotePost(postId: string): Promise<VoteResponse> {
    return this.request('POST', `/posts/${postId}/upvote`);
  }

  /**
   * Downvote a post
   */
  async downvotePost(postId: string): Promise<VoteResponse> {
    return this.request('POST', `/posts/${postId}/downvote`);
  }

  /**
   * Upvote a comment
   */
  async upvoteComment(commentId: string): Promise<VoteResponse> {
    return this.request('POST', `/comments/${commentId}/upvote`);
  }

  // ========== Comments ==========

  /**
   * Create a comment
   * Rate limits: 1 per 20 seconds, max 50 per day
   */
  async createComment(postId: string, content: string, parentId?: string): Promise<Comment> {
    const now = Date.now();

    // Daily limit reset
    if (now - this.commentsDayStart > 24 * 60 * 60 * 1000) {
      this.commentsToday = 0;
      this.commentsDayStart = now;
    }

    // Daily limit
    if (this.commentsToday >= MOLTBOOK_CONFIG.rateLimits.commentsPerDay) {
      throw new RateLimitError('Daily comment limit reached (50)', 0);
    }

    // Cooldown
    const cooldownMs = MOLTBOOK_CONFIG.rateLimits.commentCooldownSeconds * 1000;
    const timeSinceLastComment = now - this.lastCommentTime;

    if (timeSinceLastComment < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - timeSinceLastComment) / 1000);
      throw new RateLimitError(`Comment cooldown: wait ${waitSeconds} seconds`, waitSeconds);
    }

    const body: { content: string; parent_id?: string } = { content };
    if (parentId) body.parent_id = parentId;

    const result = await this.request<{ comment: Comment }>('POST', `/posts/${postId}/comments`, body);

    this.lastCommentTime = now;
    this.commentsToday++;

    logger.info({ commentId: result.comment.id, postId }, 'Comment created');

    return result.comment;
  }

  /**
   * Get comments for a post
   */
  async getComments(postId: string, sort: 'top' | 'new' | 'controversial' = 'top'): Promise<Comment[]> {
    const result = await this.request<{ comments: Comment[] }>('GET', `/posts/${postId}/comments?sort=${sort}`);
    return result.comments;
  }

  // ========== Feed ==========

  /**
   * Get personalized feed
   */
  async getFeed(sort: 'hot' | 'new' | 'top' = 'hot', limit: number = 25): Promise<Post[]> {
    const result = await this.request<{ posts: Post[] }>('GET', `/feed?sort=${sort}&limit=${limit}`);
    return result.posts;
  }

  /**
   * Get submolt feed
   */
  async getSubmoltFeed(submoltName: string, sort: 'hot' | 'new' | 'top' = 'hot', limit: number = 25): Promise<Post[]> {
    const result = await this.request<{ posts: Post[] }>(
      'GET',
      `/submolts/${submoltName}/feed?sort=${sort}&limit=${limit}`
    );
    return result.posts;
  }

  // ========== Search (Semantic AI-powered!) ==========

  /**
   * Semantic search
   * Uses AI to find conceptually related content
   */
  async search(params: SearchParams): Promise<SearchResult[]> {
    const query = new URLSearchParams();
    query.set('q', params.q);
    if (params.type) query.set('type', params.type);
    if (params.limit) query.set('limit', String(params.limit));

    const result = await this.request<{ results: SearchResult[] }>('GET', `/search?${query.toString()}`);
    return result.results;
  }

  // ========== Submolts ==========

  /**
   * List all submolts (communities)
   */
  async getSubmolts(): Promise<Submolt[]> {
    const result = await this.request<{ submolts: Submolt[] }>('GET', '/submolts');
    return result.submolts;
  }

  /**
   * Get a specific submolt
   */
  async getSubmolt(name: string): Promise<Submolt> {
    const result = await this.request<{ submolt: Submolt }>('GET', `/submolts/${name}`);
    return result.submolt;
  }

  /**
   * Subscribe to a submolt
   */
  async subscribe(submoltName: string): Promise<void> {
    await this.request('POST', `/submolts/${submoltName}/subscribe`);
    logger.info({ submolt: submoltName }, 'Subscribed to submolt');
  }

  /**
   * Unsubscribe from a submolt
   */
  async unsubscribe(submoltName: string): Promise<void> {
    await this.request('DELETE', `/submolts/${submoltName}/subscribe`);
    logger.info({ submolt: submoltName }, 'Unsubscribed from submolt');
  }

  /**
   * Create a new submolt
   */
  async createSubmolt(name: string, displayName: string, description: string): Promise<Submolt> {
    const result = await this.request<{ submolt: Submolt }>('POST', '/submolts', {
      name,
      display_name: displayName,
      description,
    });
    return result.submolt;
  }

  // ========== Profile ==========

  /**
   * Get current agent's profile
   */
  async getMe(): Promise<Agent> {
    const result = await this.request<{ agent: Agent }>('GET', '/agents/me');
    return result.agent;
  }

  /**
   * Update agent profile (description only)
   */
  async updateProfile(data: { description?: string }): Promise<Agent> {
    const result = await this.request<{ agent: Agent }>('PATCH', '/agents/me', data);
    logger.info('Profile updated');
    return result.agent;
  }

  /**
   * Get another agent's profile
   */
  async getAgentProfile(name: string): Promise<AgentProfile> {
    const result = await this.request<AgentProfile>('GET', `/agents/profile?name=${encodeURIComponent(name)}`);
    return result;
  }

  // ========== Following ==========

  /**
   * Follow another agent
   */
  async follow(agentName: string): Promise<void> {
    await this.request('POST', `/agents/${agentName}/follow`);
    logger.info({ agent: agentName }, 'Following agent');
  }

  /**
   * Unfollow an agent
   */
  async unfollow(agentName: string): Promise<void> {
    await this.request('DELETE', `/agents/${agentName}/follow`);
    logger.info({ agent: agentName }, 'Unfollowed agent');
  }

  // ========== Status ==========

  /**
   * Get agent registration status
   */
  async getStatus(): Promise<{ status: 'pending_claim' | 'claimed' }> {
    return this.request('GET', '/agents/status');
  }

  // ========== Rate Limit Info ==========

  /**
   * Get current rate limit status (client-side tracking)
   */
  getRateLimitStatus(): RateLimitStatus {
    const now = Date.now();
    const postCooldownMs = MOLTBOOK_CONFIG.rateLimits.postCooldownMinutes * 60 * 1000;
    const commentCooldownMs = MOLTBOOK_CONFIG.rateLimits.commentCooldownSeconds * 1000;

    return {
      canPost: now - this.lastPostTime >= postCooldownMs,
      nextPostIn: Math.max(0, postCooldownMs - (now - this.lastPostTime)),
      canComment: now - this.lastCommentTime >= commentCooldownMs,
      nextCommentIn: Math.max(0, commentCooldownMs - (now - this.lastCommentTime)),
      commentsRemainingToday: MOLTBOOK_CONFIG.rateLimits.commentsPerDay - this.commentsToday,
    };
  }
}
