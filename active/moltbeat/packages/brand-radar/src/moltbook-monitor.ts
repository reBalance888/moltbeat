/**
 * MoltBook Brand Monitoring
 * Uses semantic search to track brand mentions and reputation
 */

import { MoltBookClient } from '@moltbeat/moltbook-client';
import { logger } from '@moltbeat/logger';
import { cached, invalidateByTags } from '@moltbeat/cache';
import { SentimentAnalyzer } from '@moltbeat/sentiment';
import type {
  MonitoringConfig,
  SearchOptions,
  BrandMention,
  BrandReputation,
  BrandAlert,
  TrendingBrand,
} from './types';

export class BrandMonitor {
  private client: MoltBookClient;
  private sentiment: SentimentAnalyzer;
  private config: MonitoringConfig;
  private alerts: BrandAlert[] = [];

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.client = new MoltBookClient({ apiKey: config.apiKey });
    this.sentiment = new SentimentAnalyzer();

    logger.info(
      {
        brands: config.brands,
        cacheEnabled: config.cacheEnabled,
      },
      'BrandMonitor initialized'
    );
  }

  /**
   * Find all mentions of a brand
   */
  async findBrandMentions(brand: string, options: SearchOptions = {}): Promise<BrandMention[]> {
    const cacheKey = `brand:mentions:${brand}:${JSON.stringify(options)}`;

    const findMentions = async (): Promise<BrandMention[]> => {
      // Build semantic queries
    const queries = [
      `${brand} review`,
      `${brand} experience`,
      `What do you think about ${brand}?`,
      `${brand} recommendation`,
      `${brand} problem issue`,
    ];

    const allMentions: BrandMention[] = [];

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

          // Analyze sentiment
          const sentimentResult = await this.sentiment.analyze(result.content);

          // Calculate engagement score (comment count not available)
          const engagementScore = result.upvotes * 2;

          // Check if urgent (negative + high engagement)
          const isUrgent =
            sentimentResult.score < (this.config.alertThresholds?.negativeSentiment ?? -0.5) &&
            engagementScore > (this.config.alertThresholds?.highEngagement ?? 100);

          const mention: BrandMention = {
            postId: result.post_id,
            brand,
            content: result.content,
            sentiment: sentimentResult.score,
            sentimentLabel: sentimentResult.label,
            author: result.author.name,
            karma: 0, // Not available in SearchResult
            createdAt: result.created_at ? new Date(result.created_at) : new Date(),
            submolt: 'unknown', // Not available in SearchResult
            upvotes: result.upvotes,
            commentCount: 0, // Not available in SearchResult
            engagementScore,
            isUrgent,
          };

          allMentions.push(mention);

          // Generate alert if needed
          if (isUrgent) {
            this.generateAlert(mention, 'URGENT', 'CRITICAL');
          } else if (sentimentResult.score < (this.config.alertThresholds?.negativeSentiment ?? -0.5)) {
            this.generateAlert(mention, 'NEGATIVE_SENTIMENT', 'HIGH');
          } else if (engagementScore > (this.config.alertThresholds?.viralThreshold ?? 500)) {
            this.generateAlert(mention, 'VIRAL', 'MEDIUM');
          } else if (engagementScore > (this.config.alertThresholds?.highEngagement ?? 100)) {
            this.generateAlert(mention, 'HIGH_ENGAGEMENT', 'LOW');
          }
        }
      } catch (error) {
        logger.error({ error, query }, 'Brand search failed');
      }
    }

      // Deduplicate by postId
      const uniqueMentions = Array.from(
        new Map(allMentions.map((m) => [m.postId, m])).values()
      );

      // Sort by date descending
      uniqueMentions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      logger.info({ brand, count: uniqueMentions.length }, 'Found brand mentions');
      return uniqueMentions;
    };

    if (this.config.cacheEnabled) {
      return cached(cacheKey, findMentions, {
        ttl: this.config.cacheTtl || 600,
        tags: ['brand', `brand:${brand}`],
      });
    }

    return findMentions();
  }

  /**
   * Analyze brand reputation
   */
  async analyzeBrandReputation(
    brand: string,
    options: SearchOptions = {}
  ): Promise<BrandReputation> {
    const mentions = await this.findBrandMentions(brand, options);

    if (mentions.length === 0) {
      return {
        brand,
        totalMentions: 0,
        avgSentiment: 0,
        sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
        engagementMetrics: { totalUpvotes: 0, totalComments: 0, avgEngagement: 0 },
        topPositiveMentions: [],
        topNegativeMentions: [],
        urgentMentions: [],
        reputationScore: 50, // Neutral
        trend: 'STABLE',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      };
    }

    // Calculate sentiment stats
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    let totalSentiment = 0;

    for (const mention of mentions) {
      sentimentCounts[mention.sentimentLabel.toLowerCase() as keyof typeof sentimentCounts]++;
      totalSentiment += mention.sentiment;
    }

    const avgSentiment = totalSentiment / mentions.length;

    // Calculate engagement stats
    const totalUpvotes = mentions.reduce((sum, m) => sum + m.upvotes, 0);
    const totalComments = mentions.reduce((sum, m) => sum + m.commentCount, 0);
    const avgEngagement = (totalUpvotes + totalComments) / mentions.length;

    // Get top mentions
    const sortedBySentiment = [...mentions].sort((a, b) => b.sentiment - a.sentiment);
    const topPositiveMentions = sortedBySentiment.slice(0, 5);
    const topNegativeMentions = sortedBySentiment.slice(-5).reverse();

    // Get urgent mentions
    const urgentMentions = mentions.filter((m) => m.isUrgent);

    // Calculate reputation score (0-100)
    // Formula: (normalized sentiment * 50) + (positive ratio * 30) + (engagement * 20)
    const normalizedSentiment = (avgSentiment + 1) / 2; // -1..1 → 0..1
    const positiveRatio = sentimentCounts.positive / mentions.length;
    const engagementFactor = Math.min(avgEngagement / 100, 1); // Cap at 100

    const reputationScore = Math.round(
      normalizedSentiment * 50 + positiveRatio * 30 + engagementFactor * 20
    );

    // Calculate trend (compare to 24h ago)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const options24h = { ...options, since: yesterday };
    const mentions24h = await this.findBrandMentions(brand, options24h);

    const avgSentiment24h =
      mentions24h.length > 0
        ? mentions24h.reduce((sum, m) => sum + m.sentiment, 0) / mentions24h.length
        : 0;

    const sentimentChange = avgSentiment - avgSentiment24h;
    const trend =
      sentimentChange > 0.1 ? 'IMPROVING' : sentimentChange < -0.1 ? 'DECLINING' : 'STABLE';

    // Get date range
    const dates = mentions.map((m) => m.createdAt.getTime());
    const firstSeenAt = new Date(Math.min(...dates));
    const lastSeenAt = new Date(Math.max(...dates));

    logger.info(
      {
        brand,
        totalMentions: mentions.length,
        avgSentiment,
        reputationScore,
        trend,
      },
      'Brand reputation analyzed'
    );

    return {
      brand,
      totalMentions: mentions.length,
      avgSentiment,
      sentimentDistribution: sentimentCounts,
      engagementMetrics: {
        totalUpvotes,
        totalComments,
        avgEngagement,
      },
      topPositiveMentions,
      topNegativeMentions,
      urgentMentions,
      reputationScore,
      trend,
      firstSeenAt,
      lastSeenAt,
    };
  }

  /**
   * Monitor all configured brands
   */
  async monitorAllBrands(options: SearchOptions = {}): Promise<BrandReputation[]> {
    const results = await Promise.all(
      this.config.brands.map((brand) => this.analyzeBrandReputation(brand, options))
    );

    logger.info({ brandCount: this.config.brands.length }, 'All brands monitored');
    return results;
  }

  /**
   * Get trending brands (by mention volume and sentiment)
   */
  async getTrendingBrands(options: SearchOptions = {}): Promise<TrendingBrand[]> {
    const reputations = await this.monitorAllBrands(options);

    // Get 24h data for comparison
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    const options24h = { ...options, since: yesterday };
    const reputations24h = await this.monitorAllBrands(options24h);

    const trending: TrendingBrand[] = reputations.map((current, idx) => {
      const previous = reputations24h[idx];
      const change24h =
        previous.totalMentions > 0
          ? ((current.totalMentions - previous.totalMentions) / previous.totalMentions) * 100
          : 0;

      return {
        brand: current.brand,
        mentionCount: current.totalMentions,
        change24h,
        sentiment: current.avgSentiment,
        reputationScore: current.reputationScore,
      };
    });

    // Sort by mention count descending
    trending.sort((a, b) => b.mentionCount - a.mentionCount);

    logger.info({ count: trending.length }, 'Trending brands calculated');
    return trending;
  }

  /**
   * Get all alerts
   */
  getAlerts(unreadOnly = false): BrandAlert[] {
    const alerts = unreadOnly ? this.alerts.filter((a) => !a.read) : this.alerts;
    logger.debug({ count: alerts.length, unreadOnly }, 'Fetched alerts');
    return alerts;
  }

  /**
   * Mark alert as read
   */
  markAlertRead(alertId: string): void {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.read = true;
      logger.debug({ alertId }, 'Alert marked as read');
    }
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
    logger.info('All alerts cleared');
  }

  /**
   * Generate alert for brand mention
   */
  private generateAlert(
    mention: BrandMention,
    type: BrandAlert['type'],
    severity: BrandAlert['severity']
  ): void {
    const alert: BrandAlert = {
      id: `${mention.postId}-${type}`,
      brand: mention.brand,
      mention,
      type,
      severity,
      createdAt: new Date(),
      read: false,
    };

    this.alerts.push(alert);

    logger.warn(
      {
        brand: mention.brand,
        type,
        severity,
        postId: mention.postId,
      },
      'Brand alert generated'
    );
  }

  /**
   * Clear cache for brand monitoring
   */
  async clearCache(): Promise<void> {
    if (this.config.cacheEnabled) {
      await invalidateByTags(['brand']);
      logger.info('Brand monitoring cache cleared');
    }
  }
}
