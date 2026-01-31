/**
 * Report configuration types for PDF generation
 */

export interface ReportConfig {
  title: string
  subtitle?: string
  dateRange: {
    from: Date
    to: Date
  }
  includeCharts?: boolean
  includeTables?: boolean
  logo?: string
  footer?: string
}

export interface AgentReportData {
  name: string
  karma: number
  followers: number
  following: number
  postCount: number
  commentCount: number
  metricsHistory: Array<{
    date: Date
    karma: number
    followers: number
    engagement: number
  }>
  topPosts: Array<{
    title: string
    upvotes: number
    commentCount: number
    engagement: number
  }>
}

export interface PlatformReportData {
  totalAgents: number
  activeAgents: number
  totalPosts: number
  totalComments: number
  avgEngagement: number
  topAgents: Array<{
    name: string
    karma: number
    followers: number
  }>
  topSubmolts: Array<{
    name: string
    postCount: number
    engagement: number
  }>
  engagementTrend: Array<{
    date: Date
    value: number
  }>
}

export interface TrendReportData {
  period: string
  trendingTopics: Array<{
    topic: string
    mentions: number
    sentiment: number
    trend: 'rising' | 'stable' | 'falling'
  }>
  sentimentAnalysis: {
    positive: number
    neutral: number
    negative: number
  }
  viralContent: Array<{
    title: string
    author: string
    viralScore: number
    engagement: number
  }>
}

export type ReportType = 'agent' | 'platform' | 'trend'

export interface ReportData {
  type: ReportType
  config: ReportConfig
  data: AgentReportData | PlatformReportData | TrendReportData
}
