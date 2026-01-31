/**
 * MoltBook Crypto Intelligence Search
 * Uses semantic search to find cryptocurrency discussions
 */

import { MoltBookClient } from '@moltbeat/moltbook-client';
import { logger } from '@moltbeat/logger';
import { cached, invalidateByTags } from '@moltbeat/cache';
import type {
  CryptoIntelConfig,
  SearchOptions,
  TokenMention,
  TokenAnalysis,
  TrendingToken,
} from './types';

export class CryptoIntelligence {
  private client: MoltBookClient;
  private config: CryptoIntelConfig;

  constructor(config: CryptoIntelConfig) {
    this.client = new MoltBookClient({ apiKey: config.apiKey });
    this.config = config;

    logger.info({ config: { cacheEnabled: config.cacheEnabled } }, 'CryptoIntelligence initialized');
  }

  /**
   * Find all mentions of a cryptocurrency token
   */
  async findTokenMentions(symbol: string, options: SearchOptions = {}): Promise<TokenMention[]> {
    const cacheKey = `crypto:token:${symbol}:${JSON.stringify(options)}`;

    // Use cached helper if caching enabled
    const findMentions = async (): Promise<TokenMention[]> => {
      // Build semantic query
    const queries = [
      `${symbol} price prediction analysis`,
      `${symbol} token discussion`,
      `${symbol} cryptocurrency news`,
      `What do you think about ${symbol}?`,
    ];

    const allMentions: TokenMention[] = [];

    for (const query of queries) {
      try {
        const results = await this.client.search({
          q: query,
          limit: options.limit || 20,
          type: 'posts',
        });

        for (const result of results) {
          // Skip comments
          if (result.type !== 'post') continue;

          // Filter by options (limited info available from SearchResult)
          if (options.since && result.created_at && new Date(result.created_at) < options.since) continue;

          // Determine sentiment (simplified - real impl should use sentiment analysis)
          const sentiment = this.inferSentiment(result.content);

          allMentions.push({
            postId: result.post_id,
            symbol,
            sentiment,
            content: result.content,
            author: result.author.name,
            karma: 0, // Not available in SearchResult
            createdAt: result.created_at ? new Date(result.created_at) : new Date(),
            submolt: 'unknown', // Not available in SearchResult
            upvotes: result.upvotes,
            commentCount: 0, // Not available in SearchResult
          });
        }
      } catch (error) {
        logger.error({ error, query }, 'Search query failed');
      }
    }

      // Deduplicate by postId
      const uniqueMentions = Array.from(
        new Map(allMentions.map((m) => [m.postId, m])).values()
      );

      // Sort by date descending
      uniqueMentions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      logger.info({ symbol, count: uniqueMentions.length }, 'Found token mentions');
      return uniqueMentions;
    };

    // Use caching if enabled
    if (this.config.cacheEnabled) {
      return cached(cacheKey, findMentions, {
        ttl: this.config.cacheTtl || 300,
        tags: ['crypto', `token:${symbol}`],
      });
    }

    return findMentions();
  }

  /**
   * Analyze a token's overall presence and sentiment
   */
  async analyzeToken(symbol: string, options: SearchOptions = {}): Promise<TokenAnalysis> {
    const mentions = await this.findTokenMentions(symbol, options);

    if (mentions.length === 0) {
      return {
        symbol,
        mentionCount: 0,
        avgSentiment: 0,
        sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
        topPosts: [],
        trendingScore: 0,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };
    }

    // Calculate sentiment distribution
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    let totalSentiment = 0;

    for (const mention of mentions) {
      sentimentCounts[mention.sentiment.toLowerCase() as keyof typeof sentimentCounts]++;

      // Convert to numeric (-1 to 1)
      const sentimentValue =
        mention.sentiment === 'POSITIVE' ? 1 : mention.sentiment === 'NEGATIVE' ? -1 : 0;
      totalSentiment += sentimentValue;
    }

    const avgSentiment = totalSentiment / mentions.length;

    // Calculate trending score (mentions * engagement * sentiment)
    const totalEngagement = mentions.reduce((sum, m) => sum + m.upvotes + m.commentCount, 0);
    const avgEngagement = totalEngagement / mentions.length;
    const trendingScore = mentions.length * avgEngagement * (1 + avgSentiment);

    // Get top posts by engagement
    const topPosts = mentions
      .slice()
      .sort((a, b) => b.upvotes + b.commentCount - (a.upvotes + a.commentCount))
      .slice(0, 10);

    // Get date range
    const dates = mentions.map((m) => m.createdAt.getTime());
    const firstSeenAt = new Date(Math.min(...dates));
    const lastSeenAt = new Date(Math.max(...dates));

    logger.info(
      {
        symbol,
        mentionCount: mentions.length,
        avgSentiment,
        trendingScore,
      },
      'Token analysis complete'
    );

    return {
      symbol,
      mentionCount: mentions.length,
      avgSentiment,
      sentimentDistribution: sentimentCounts,
      topPosts,
      trendingScore,
      firstSeenAt,
      lastSeenAt,
    };
  }

  /**
   * Find trending tokens (most discussed with positive sentiment)
   */
  async findTrendingTokens(
    symbols: string[],
    options: SearchOptions = {}
  ): Promise<TrendingToken[]> {
    const cacheKey = `crypto:trending:${symbols.join(',')}:${JSON.stringify(options)}`;

    const findTrending = async (): Promise<TrendingToken[]> => {

    const analyses = await Promise.all(
      symbols.map((symbol) => this.analyzeToken(symbol, options))
    );

    // Get 24h ago data for comparison
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const options24h = { ...options, since: yesterday };

    const analyses24h = await Promise.all(
      symbols.map((symbol) => this.analyzeToken(symbol, options24h))
    );

    const trending: TrendingToken[] = analyses.map((current, idx) => {
      const previous = analyses24h[idx];
      const change24h =
        previous.mentionCount > 0
          ? ((current.mentionCount - previous.mentionCount) / previous.mentionCount) * 100
          : 0;

      return {
        symbol: current.symbol,
        score: current.trendingScore,
        change24h,
        sentiment: current.avgSentiment,
        volume: current.mentionCount,
      };
    });

      // Sort by trending score descending
      trending.sort((a, b) => b.score - a.score);

      logger.info({ count: trending.length }, 'Found trending tokens');
      return trending;
    };

    if (this.config.cacheEnabled) {
      return cached(cacheKey, findTrending, {
        ttl: this.config.cacheTtl || 300,
        tags: ['crypto', 'trending'],
      });
    }

    return findTrending();
  }

  /**
   * Search for discussions about a specific topic in crypto
   */
  async searchCryptoTopic(topic: string, options: SearchOptions = {}): Promise<TokenMention[]> {
    const cacheKey = `crypto:topic:${topic}:${JSON.stringify(options)}`;

    const searchTopic = async (): Promise<TokenMention[]> => {

      const results = await this.client.search({
        q: topic,
        limit: options.limit || 50,
        type: 'all',
      });

      const mentions: TokenMention[] = results
        .filter((r: any) => r.type === 'post')
        .map((result: any) => ({
          postId: result.post_id,
          symbol: 'N/A',
          sentiment: this.inferSentiment(result.content),
          content: result.content,
          author: result.author.name,
          karma: 0,
          createdAt: result.created_at ? new Date(result.created_at) : new Date(),
          submolt: 'unknown',
          upvotes: result.upvotes,
          commentCount: 0,
        }));

      logger.info({ topic, count: mentions.length }, 'Topic search complete');
      return mentions;
    };

    if (this.config.cacheEnabled) {
      return cached(cacheKey, searchTopic, {
        ttl: this.config.cacheTtl || 300,
        tags: ['crypto', 'topic'],
      });
    }

    return searchTopic();
  }

  /**
   * Infer sentiment from content (simplified)
   * Real implementation should use @moltbeat/sentiment package
   */
  private inferSentiment(content: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    const lowerContent = content.toLowerCase();

    const positiveWords = [
      'bullish',
      'moon',
      'pump',
      'buy',
      'good',
      'great',
      'excellent',
      'amazing',
      'profit',
      'gain',
      'up',
      'rise',
    ];
    const negativeWords = [
      'bearish',
      'dump',
      'sell',
      'bad',
      'terrible',
      'awful',
      'loss',
      'down',
      'fall',
      'crash',
      'scam',
      'rug',
    ];

    let score = 0;
    for (const word of positiveWords) {
      if (lowerContent.includes(word)) score++;
    }
    for (const word of negativeWords) {
      if (lowerContent.includes(word)) score--;
    }

    if (score > 0) return 'POSITIVE';
    if (score < 0) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  /**
   * Clear cache for crypto intelligence
   */
  async clearCache(): Promise<void> {
    if (this.config.cacheEnabled) {
      await invalidateByTags(['crypto']);
      logger.info('Crypto intelligence cache cleared');
    }
  }
}
