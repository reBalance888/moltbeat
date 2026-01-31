import { RateLimiter } from './rate-limiter'
import { MoltbookApiError, MoltbookRateLimitError } from './errors'
import type * as T from './types'

export interface MoltbookClientConfig {
  apiKey: string
  baseUrl?: string
  maxRetries?: number
  timeout?: number
}

export class MoltbookClient {
  private apiKey: string
  private baseUrl: string
  private rateLimiter: RateLimiter
  private maxRetries: number
  private timeout: number

  constructor(config: MoltbookClientConfig) {
    this.apiKey = config.apiKey
    // CRITICAL: Must use www subdomain!
    this.baseUrl = config.baseUrl || 'https://www.moltbook.com/api/v1'
    this.rateLimiter = new RateLimiter(100) // 100 req/min
    this.maxRetries = config.maxRetries ?? 3
    this.timeout = config.timeout ?? 10000
  }

  // ============ PRIVATE METHODS ============

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    await this.rateLimiter.acquire()

    let lastError: Error | null = null

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          throw new MoltbookRateLimitError(
            'Rate limit exceeded',
            retryAfter ? parseInt(retryAfter) : 60
          )
        }

        if (!response.ok) {
          const errorBody = await response.text()
          throw new MoltbookApiError(response.status, errorBody)
        }

        return response.json() as Promise<T>
      } catch (error) {
        lastError = error as Error

        // Don't retry on rate limit or 4xx errors
        if (error instanceof MoltbookRateLimitError) throw error
        if (error instanceof MoltbookApiError && error.status < 500) throw error

        // Exponential backoff for retries
        if (attempt < this.maxRetries - 1) {
          await this.sleep(Math.pow(2, attempt) * 1000)
        }
      }
    }

    throw lastError || new Error('Request failed')
  }

  private async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint)
  }

  private async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, body)
  }

  private async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', endpoint, body)
  }

  private async delete<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', endpoint, body)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ============ AGENTS ============

  async getMe(): Promise<T.Agent> {
    const res = await this.get<T.ApiResponse<T.Agent>>('/agents/me')
    return res.data!
  }

  async getAgentProfile(name: string): Promise<T.AgentProfile> {
    const res = await this.get<T.ApiResponse<T.AgentProfile>>(
      `/agents/profile?name=${encodeURIComponent(name)}`
    )
    return res.data!
  }

  async getAgentStatus(): Promise<{ status: string }> {
    return this.get('/agents/status')
  }

  async updateProfile(data: {
    description?: string
    metadata?: Record<string, unknown>
  }): Promise<T.Agent> {
    const res = await this.patch<T.ApiResponse<T.Agent>>('/agents/me', data)
    return res.data!
  }

  async followAgent(name: string): Promise<void> {
    await this.post(`/agents/${encodeURIComponent(name)}/follow`)
  }

  async unfollowAgent(name: string): Promise<void> {
    await this.delete(`/agents/${encodeURIComponent(name)}/follow`)
  }

  // ============ POSTS ============

  async getPosts(params?: {
    submolt?: string
    sort?: T.SortOrder
    limit?: number
    cursor?: string
  }): Promise<T.PaginatedResponse<T.Post>> {
    const searchParams = new URLSearchParams()
    if (params?.submolt) searchParams.set('submolt', params.submolt)
    if (params?.sort) searchParams.set('sort', params.sort)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.cursor) searchParams.set('cursor', params.cursor)

    return this.get(`/posts?${searchParams}`)
  }

  async getPost(postId: string): Promise<T.Post> {
    const res = await this.get<T.ApiResponse<T.Post>>(`/posts/${postId}`)
    return res.data!
  }

  async createPost(input: T.CreatePostInput): Promise<T.Post> {
    const res = await this.post<T.ApiResponse<T.Post>>('/posts', input)
    return res.data!
  }

  async deletePost(postId: string): Promise<void> {
    await this.delete(`/posts/${postId}`)
  }

  async upvotePost(postId: string): Promise<void> {
    await this.post(`/posts/${postId}/upvote`)
  }

  async downvotePost(postId: string): Promise<void> {
    await this.post(`/posts/${postId}/downvote`)
  }

  async getTrending(params?: {
    limit?: number
    hours?: number
  }): Promise<T.Post[]> {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.hours) searchParams.set('hours', String(params.hours))

    return this.get(`/trending?${searchParams}`)
  }

  // ============ FEED ============

  async getFeed(params?: {
    sort?: T.SortOrder
    limit?: number
    cursor?: string
  }): Promise<T.PaginatedResponse<T.Post>> {
    const searchParams = new URLSearchParams()
    if (params?.sort) searchParams.set('sort', params.sort)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.cursor) searchParams.set('cursor', params.cursor)

    return this.get(`/feed?${searchParams}`)
  }

  // ============ COMMENTS ============

  async getComments(postId: string, params?: {
    sort?: 'top' | 'new' | 'controversial'
    limit?: number
    cursor?: string
  }): Promise<T.PaginatedResponse<T.Comment>> {
    const searchParams = new URLSearchParams()
    if (params?.sort) searchParams.set('sort', params.sort)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.cursor) searchParams.set('cursor', params.cursor)

    return this.get(`/posts/${postId}/comments?${searchParams}`)
  }

  async createComment(postId: string, input: T.CreateCommentInput): Promise<T.Comment> {
    const res = await this.post<T.ApiResponse<T.Comment>>(
      `/posts/${postId}/comments`,
      input
    )
    return res.data!
  }

  async upvoteComment(commentId: string): Promise<void> {
    await this.post(`/comments/${commentId}/upvote`)
  }

  async downvoteComment(commentId: string): Promise<void> {
    await this.post(`/comments/${commentId}/downvote`)
  }

  // ============ SUBMOLTS ============

  async getSubmolts(): Promise<T.Submolt[]> {
    const res = await this.get<T.ApiResponse<T.Submolt[]>>('/submolts')
    return res.data!
  }

  async getSubmolt(name: string): Promise<T.Submolt> {
    const res = await this.get<T.ApiResponse<T.Submolt>>(`/submolts/${name}`)
    return res.data!
  }

  async getSubmoltFeed(name: string, params?: {
    sort?: T.SortOrder
    limit?: number
    cursor?: string
  }): Promise<T.PaginatedResponse<T.Post>> {
    const searchParams = new URLSearchParams()
    if (params?.sort) searchParams.set('sort', params.sort)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.cursor) searchParams.set('cursor', params.cursor)

    return this.get(`/submolts/${name}/feed?${searchParams}`)
  }

  async createSubmolt(input: T.CreateSubmoltInput): Promise<T.Submolt> {
    const res = await this.post<T.ApiResponse<T.Submolt>>('/submolts', input)
    return res.data!
  }

  async subscribeToSubmolt(name: string): Promise<void> {
    await this.post(`/submolts/${name}/subscribe`)
  }

  async unsubscribeFromSubmolt(name: string): Promise<void> {
    await this.delete(`/submolts/${name}/subscribe`)
  }

  // ============ SEARCH ============

  async search(query: string, limit?: number): Promise<T.SearchResults> {
    const searchParams = new URLSearchParams()
    searchParams.set('q', query)
    if (limit) searchParams.set('limit', String(limit))

    return this.get(`/search?${searchParams}`)
  }

  // ============ DMs ============

  async checkDMs(): Promise<T.DMCheck> {
    return this.get('/agents/dm/check')
  }

  async getDMRequests(): Promise<T.DMRequest[]> {
    const res = await this.get<T.ApiResponse<T.DMRequest[]>>('/agents/dm/requests')
    return res.data!
  }

  async approveDMRequest(conversationId: string): Promise<void> {
    await this.post(`/agents/dm/requests/${conversationId}/approve`)
  }

  async rejectDMRequest(conversationId: string, block?: boolean): Promise<void> {
    await this.post(`/agents/dm/requests/${conversationId}/reject`, { block })
  }

  async getDMConversations(): Promise<T.DMConversation[]> {
    const res = await this.get<{ conversations: { items: T.DMConversation[] } }>(
      '/agents/dm/conversations'
    )
    return res.conversations.items
  }

  async getDMMessages(conversationId: string): Promise<T.DMMessage[]> {
    const res = await this.get<T.ApiResponse<T.DMMessage[]>>(
      `/agents/dm/conversations/${conversationId}`
    )
    return res.data!
  }

  async sendDM(conversationId: string, message: string, needsHumanInput?: boolean): Promise<void> {
    await this.post(`/agents/dm/conversations/${conversationId}/send`, {
      message,
      needs_human_input: needsHumanInput,
    })
  }

  async requestDM(input: {
    to?: string
    to_owner?: string
    message: string
  }): Promise<void> {
    await this.post('/agents/dm/request', input)
  }

  // ============ MODERATION ============

  async pinPost(postId: string): Promise<void> {
    await this.post(`/posts/${postId}/pin`)
  }

  async unpinPost(postId: string): Promise<void> {
    await this.delete(`/posts/${postId}/pin`)
  }

  async updateSubmoltSettings(name: string, settings: {
    description?: string
    banner_color?: string
    theme_color?: string
  }): Promise<void> {
    await this.patch(`/submolts/${name}/settings`, settings)
  }

  async addModerator(submolt: string, agentName: string): Promise<void> {
    await this.post(`/submolts/${submolt}/moderators`, {
      agent_name: agentName,
      role: 'moderator',
    })
  }

  async removeModerator(submolt: string, agentName: string): Promise<void> {
    await this.delete(`/submolts/${submolt}/moderators`, {
      agent_name: agentName,
    })
  }
}
