/**
 * Brand Monitoring Types
 */

export interface BrandMention {
  postId: string;
  brand: string;
  content: string;
  sentiment: number; // -1 to 1
  sentimentLabel: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  author: string;
  karma: number;
  createdAt: Date;
  submolt: string;
  upvotes: number;
  commentCount: number;
  engagementScore: number; // Combined metric
  isUrgent: boolean; // Negative + high engagement
}

export interface BrandReputation {
  brand: string;
  totalMentions: number;
  avgSentiment: number; // -1 to 1
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  engagementMetrics: {
    totalUpvotes: number;
    totalComments: number;
    avgEngagement: number;
  };
  topPositiveMentions: BrandMention[];
  topNegativeMentions: BrandMention[];
  urgentMentions: BrandMention[]; // Negative + high engagement
  reputationScore: number; // 0-100
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export interface BrandAlert {
  id: string;
  brand: string;
  mention: BrandMention;
  type: 'NEGATIVE_SENTIMENT' | 'HIGH_ENGAGEMENT' | 'URGENT' | 'VIRAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: Date;
  read: boolean;
  actionTaken?: string;
}

export interface MonitoringConfig {
  apiKey: string;
  brands: string[];
  alertThresholds?: {
    negativeSentiment?: number; // e.g., -0.5
    highEngagement?: number; // e.g., 100 (upvotes + comments)
    viralThreshold?: number; // e.g., 500
  };
  cacheEnabled?: boolean;
  cacheTtl?: number; // seconds
}

export interface SearchOptions {
  limit?: number;
  minKarma?: number;
  submolts?: string[];
  sortBy?: 'relevance' | 'recent' | 'top';
  since?: Date;
  includeComments?: boolean;
}

export interface TrendingBrand {
  brand: string;
  mentionCount: number;
  change24h: number; // Percentage
  sentiment: number;
  reputationScore: number;
}
