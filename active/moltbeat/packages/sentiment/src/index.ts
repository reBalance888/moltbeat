import { pipeline } from '@xenova/transformers';
import { createHash } from 'crypto';
import { cache } from '@moltbeat/cache';
import { logger } from '@moltbeat/logger';

/**
 * Sentiment analysis result
 */
export interface SentimentResult {
  score: number; // -1 to 1 (negative to positive)
  label: 'POSITIVE' | 'NEGATIVE';
  confidence: number; // 0 to 1
}

/**
 * Sentiment analyzer with caching (P1-004)
 * Uses Transformers.js with distilbert-base-uncased-finetuned-sst-2-english model
 * Caches results by content hash with 7-day TTL
 */
export class SentimentAnalyzer {
  private classifier: any;
  private initialized: boolean = false;
  private readonly CACHE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly CACHE_PREFIX = 'sentiment:';

  constructor() {}

  /**
   * Initialize the sentiment analysis model
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing sentiment analysis model...');

    this.classifier = await pipeline(
      'sentiment-analysis',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
    );

    this.initialized = true;
    logger.info('Sentiment analysis model initialized');
  }

  /**
   * Generate cache key from content
   * @param content - Text content
   * @returns Cache key
   */
  private getCacheKey(content: string): string {
    const hash = createHash('sha256').update(content).digest('hex');
    return `${this.CACHE_PREFIX}${hash}`;
  }

  /**
   * Analyze sentiment of text content
   * @param content - Text to analyze
   * @returns Sentiment result
   */
  async analyze(content: string): Promise<SentimentResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check cache first (P1-004)
    const cacheKey = this.getCacheKey(content);
    const cached = await cache.get<SentimentResult>(cacheKey);

    if (cached) {
      logger.debug({ cacheKey, hit: true }, 'Sentiment cache hit');
      return cached;
    }

    // Cache miss - perform analysis
    logger.debug({ cacheKey, hit: false }, 'Sentiment cache miss - analyzing');

    const startTime = Date.now();

    try {
      const result = await this.classifier(content);
      const duration = Date.now() - startTime;

      // Convert to our format (-1 to 1 scale)
      const rawResult = result[0];
      const isPositive = rawResult.label === 'POSITIVE';
      const confidence = rawResult.score;

      const sentimentResult: SentimentResult = {
        score: isPositive ? confidence : -confidence,
        label: rawResult.label,
        confidence,
      };

      // Cache result for 7 days (P1-004)
      await cache.set(cacheKey, sentimentResult, this.CACHE_TTL);

      logger.info(
        {
          duration,
          score: sentimentResult.score,
          label: sentimentResult.label,
          confidence: sentimentResult.confidence,
        },
        'Sentiment analysis completed'
      );

      return sentimentResult;
    } catch (error: any) {
      logger.error({ error: error.message }, 'Sentiment analysis failed');

      // Return neutral sentiment on error
      return {
        score: 0,
        label: 'POSITIVE',
        confidence: 0.5,
      };
    }
  }

  /**
   * Batch analyze multiple texts
   * @param contents - Array of texts
   * @returns Array of sentiment results
   */
  async analyzeBatch(contents: string[]): Promise<SentimentResult[]> {
    const results: SentimentResult[] = [];

    for (const content of contents) {
      const result = await this.analyze(content);
      results.push(result);
    }

    return results;
  }

  /**
   * Get cache statistics
   * @returns Cache hit rate and stats
   */
  async getCacheStats(): Promise<{ totalRequests: number; cacheHits: number; hitRate: number }> {
    // This is a simplified version - in production, you'd track these metrics
    return {
      totalRequests: 0,
      cacheHits: 0,
      hitRate: 0,
    };
  }
}

/**
 * Singleton sentiment analyzer instance
 */
export const sentimentAnalyzer = new SentimentAnalyzer();

/**
 * Convenience function to analyze sentiment
 * @param content - Text content
 * @returns Sentiment score (-1 to 1)
 */
export async function analyzeSentiment(content: string): Promise<number> {
  const result = await sentimentAnalyzer.analyze(content);
  return result.score;
}
