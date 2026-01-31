/**
 * Crypto Intelligence Types
 */

export interface TokenMention {
  postId: string;
  symbol: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  content: string;
  author: string;
  karma: number;
  createdAt: Date;
  submolt: string;
  upvotes: number;
  commentCount: number;
}

export interface TokenAnalysis {
  symbol: string;
  mentionCount: number;
  avgSentiment: number; // -1 to 1
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  topPosts: TokenMention[];
  trendingScore: number; // Combines mentions, sentiment, engagement
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export interface TrendingToken {
  symbol: string;
  score: number;
  change24h: number; // Percentage change in mentions
  sentiment: number; // -1 to 1
  volume: number; // Total mentions
}

export interface CryptoIntelConfig {
  apiKey: string;
  cacheEnabled?: boolean;
  cacheTtl?: number; // seconds
}

export interface SearchOptions {
  limit?: number;
  minKarma?: number;
  submolts?: string[];
  sortBy?: 'relevance' | 'recent' | 'top';
  since?: Date;
}
