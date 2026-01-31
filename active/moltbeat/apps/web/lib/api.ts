/**
 * MoltBeat API Client
 * Real API integration for Next.js 14 Dashboard
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

// ========== Types ==========

export interface Agent {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  personality?: string;
  lastActive?: string;
  postsCount: number;
  karma: number;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  agentId: string;
  submolt: string;
  title: string;
  content?: string;
  url?: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  sentiment: number;
  engagementScore: number;
  createdAt: string;
}

export interface Metric {
  id: string;
  agentId?: string;
  type: string;
  value: number;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface Alert {
  id: string;
  agentId?: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  metadata?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  services?: {
    database: {
      status: 'ok' | 'down';
      latency?: number;
    };
    redis: {
      status: 'ok' | 'down';
      latency?: number;
    };
  };
}

// ========== API Client ==========

class MoltBeatAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN && { Authorization: `Bearer ${API_TOKEN}` }),
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          console.error('Authentication failed - check your API token');
        }
        return Promise.reject(error);
      }
    );
  }

  // ========== Health ==========

  async getHealth(): Promise<HealthStatus> {
    const { data } = await this.client.get<HealthStatus>('/health');
    return data;
  }

  async getDetailedHealth(): Promise<HealthStatus> {
    const { data } = await this.client.get<HealthStatus>('/health/detailed');
    return data;
  }

  // ========== Agents ==========

  async getAgents(params?: {
    page?: number;
    limit?: number;
    status?: 'ACTIVE' | 'PAUSED' | 'ERROR';
    sortBy?: 'name' | 'karma' | 'createdAt';
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Agent>> {
    const { data } = await this.client.get<PaginatedResponse<Agent>>('/api/agents', { params });
    return data;
  }

  async getAgent(id: string): Promise<Agent> {
    const { data } = await this.client.get<Agent>(`/api/agents/${id}`);
    return data;
  }

  async createAgent(agent: {
    name: string;
    description?: string;
    personality?: string;
    moltbookApiKey: string;
  }): Promise<Agent> {
    const { data } = await this.client.post<Agent>('/api/agents', agent);
    return data;
  }

  async updateAgent(
    id: string,
    updates: {
      description?: string;
      personality?: string;
      status?: 'ACTIVE' | 'PAUSED';
    }
  ): Promise<Agent> {
    const { data } = await this.client.patch<Agent>(`/api/agents/${id}`, updates);
    return data;
  }

  async deleteAgent(id: string): Promise<void> {
    await this.client.delete(`/api/agents/${id}`);
  }

  // ========== Posts ==========

  async getPosts(params?: {
    page?: number;
    limit?: number;
    agentId?: string;
    submolt?: string;
    sortBy?: 'createdAt' | 'upvotes' | 'engagementScore';
    order?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResponse<Post>> {
    const { data } = await this.client.get<PaginatedResponse<Post>>('/api/posts', { params });
    return data;
  }

  async getPost(id: string): Promise<Post> {
    const { data } = await this.client.get<Post>(`/api/posts/${id}`);
    return data;
  }

  // ========== Metrics ==========

  async getMetrics(params?: {
    agentId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  }): Promise<Metric[]> {
    const { data } = await this.client.get<Metric[]>('/api/metrics', { params });
    return data;
  }

  async createMetric(metric: {
    agentId?: string;
    type: string;
    value: number;
    metadata?: Record<string, any>;
  }): Promise<Metric> {
    const { data } = await this.client.post<Metric>('/api/metrics', metric);
    return data;
  }

  // ========== Alerts ==========

  async getAlerts(params?: {
    page?: number;
    limit?: number;
    agentId?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    read?: boolean;
    sortBy?: 'createdAt' | 'severity';
    order?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<Alert>> {
    const { data } = await this.client.get<PaginatedResponse<Alert>>('/api/alerts', { params });
    return data;
  }

  async createAlert(alert: {
    agentId?: string;
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    message: string;
    metadata?: Record<string, any>;
  }): Promise<Alert> {
    const { data } = await this.client.post<Alert>('/api/alerts', alert);
    return data;
  }

  async markAlertAsRead(id: string): Promise<Alert> {
    const { data } = await this.client.patch<Alert>(`/api/alerts/${id}`, { read: true });
    return data;
  }

  // ========== Analytics ==========

  /**
   * Get dashboard overview stats
   */
  async getOverview(): Promise<{
    agents: { total: number; active: number; change24h: number };
    posts: { total: number; change24h: number };
    metrics: { total: number; avgSentiment: number; avgEngagement: number };
    alerts: { unread: number };
    timestamp: string;
  }> {
    const { data } = await this.client.get('/api/analytics/overview');
    return data;
  }

  /**
   * Get time series data for charts
   */
  async getTimeSeries(days: number = 30): Promise<Array<{
    date: string;
    posts: number;
    avgSentiment: number;
    avgEngagement: number;
  }>> {
    const { data } = await this.client.get('/api/analytics/timeseries', { params: { days } });
    return data;
  }

  /**
   * Get sentiment distribution
   */
  async getSentimentDistribution(): Promise<Array<{
    name: string;
    value: number;
    color: string;
  }>> {
    const { data } = await this.client.get('/api/analytics/sentiment-distribution');
    return data;
  }

  /**
   * Get top agents by karma
   */
  async getTopAgents(limit: number = 10): Promise<Array<{
    id: string;
    name: string;
    karma: number;
    postsCount: number;
  }>> {
    const { data } = await this.client.get('/api/analytics/top-agents', { params: { limit } });
    return data;
  }

  /**
   * Get top submolts
   */
  async getTopSubmolts(limit: number = 10): Promise<Array<{
    name: string;
    count: number;
  }>> {
    const { data } = await this.client.get('/api/analytics/top-submolts', { params: { limit } });
    return data;
  }

  /**
   * Get agent statistics (from server)
   */
  async getAgentStats(agentId: string): Promise<{
    totalPosts: number;
    totalKarma: number;
    avgSentiment: number;
    avgEngagement: number;
    topSubmolts: Array<{ submolt: string; count: number }>;
    recentActivity: Array<{ date: string; posts: number }>;
  }> {
    const { data } = await this.client.get(`/api/analytics/agent/${agentId}/stats`);
    return data;
  }
}

// ========== Export Singleton ==========

export const api = new MoltBeatAPI();
