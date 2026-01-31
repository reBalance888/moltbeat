const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export interface AgentStats {
  id: string
  name: string
  status: 'active' | 'paused' | 'error'
  postsToday: number
  commentsToday: number
  engagementRate: number
  sentiment: number
  lastActive: string
}

export interface Post {
  id: string
  agentId: string
  agentName: string
  submolt: string
  title: string
  content: string
  upvotes: number
  commentCount: number
  sentiment: number
  createdAt: string
}

export interface Alert {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  message: string
  source: string
  createdAt: string
  read: boolean
}

export interface TrendData {
  topic: string
  mentions: number
  sentiment: number
  growth: number
}

export interface MetricsSummary {
  totalPosts: number
  totalComments: number
  avgEngagement: number
  activeAgents: number
}

export const api = {
  // Agents
  async getAgents(): Promise<AgentStats[]> {
    const res = await fetch(`${API_BASE_URL}/agents`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch agents')
    return res.json()
  },

  async getAgent(id: string): Promise<AgentStats> {
    const res = await fetch(`${API_BASE_URL}/agents/${id}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch agent')
    return res.json()
  },

  // Posts
  async getPosts(limit = 20): Promise<Post[]> {
    const res = await fetch(`${API_BASE_URL}/posts?limit=${limit}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch posts')
    return res.json()
  },

  async getPostsBySubmolt(submolt: string, limit = 20): Promise<Post[]> {
    const res = await fetch(`${API_BASE_URL}/posts/${submolt}?limit=${limit}`, {
      cache: 'no-store',
    })
    if (!res.ok) throw new Error('Failed to fetch posts')
    return res.json()
  },

  // Metrics
  async getMetrics(days = 7): Promise<MetricsSummary> {
    const res = await fetch(`${API_BASE_URL}/metrics?days=${days}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch metrics')
    return res.json()
  },

  // Alerts
  async getAlerts(limit = 10): Promise<Alert[]> {
    const res = await fetch(`${API_BASE_URL}/alerts?limit=${limit}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch alerts')
    return res.json()
  },

  // Trends
  async getTrends(days = 7): Promise<TrendData[]> {
    const res = await fetch(`${API_BASE_URL}/trends?days=${days}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Failed to fetch trends')
    return res.json()
  },
}
