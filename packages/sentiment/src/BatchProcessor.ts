import { SentimentAnalyzer, SentimentResult } from './SentimentAnalyzer'

export interface BatchOptions {
  /**
   * Number of items to process concurrently
   */
  concurrency?: number
  /**
   * Delay between batches in ms
   */
  delayMs?: number
  /**
   * Callback for progress updates
   */
  onProgress?: (current: number, total: number) => void
}

export interface BatchResult {
  id: string
  text: string
  result: SentimentResult
}

/**
 * Batch processor for sentiment analysis
 * Handles large volumes efficiently
 */
export class BatchProcessor {
  private analyzer: SentimentAnalyzer

  constructor(analyzer: SentimentAnalyzer) {
    this.analyzer = analyzer
  }

  /**
   * Process items in batches with concurrency control
   */
  async processBatch(
    items: Array<{ id: string; text: string }>,
    options: BatchOptions = {}
  ): Promise<BatchResult[]> {
    const {
      concurrency = 10,
      delayMs = 0,
      onProgress,
    } = options

    const results: BatchResult[] = []
    let processed = 0

    // Split into chunks
    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency)

      // Process chunk in parallel
      const chunkResults = await Promise.all(
        chunk.map(async (item) => {
          const result = await this.analyzer.analyze(item.text)
          return {
            id: item.id,
            text: item.text,
            result,
          }
        })
      )

      results.push(...chunkResults)
      processed += chunk.length

      if (onProgress) {
        onProgress(processed, items.length)
      }

      // Delay between batches if specified
      if (delayMs > 0 && i + concurrency < items.length) {
        await this.sleep(delayMs)
      }
    }

    return results
  }

  /**
   * Process with retry on failure
   */
  async processWithRetry(
    items: Array<{ id: string; text: string }>,
    options: BatchOptions & { maxRetries?: number } = {}
  ): Promise<BatchResult[]> {
    const { maxRetries = 3, ...batchOptions } = options
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.processBatch(items, batchOptions)
      } catch (error) {
        lastError = error as Error
        if (attempt < maxRetries - 1) {
          // Exponential backoff
          await this.sleep(Math.pow(2, attempt) * 1000)
        }
      }
    }

    throw lastError || new Error('Batch processing failed')
  }

  /**
   * Process and filter by sentiment
   */
  async processAndFilter(
    items: Array<{ id: string; text: string }>,
    sentiment: 'positive' | 'negative' | 'neutral',
    options: BatchOptions = {}
  ): Promise<BatchResult[]> {
    const results = await this.processBatch(items, options)
    return results.filter((r) => r.result.sentiment === sentiment)
  }

  /**
   * Get sentiment distribution
   */
  async getDistribution(
    items: Array<{ id: string; text: string }>,
    options: BatchOptions = {}
  ): Promise<{
    total: number
    positive: number
    negative: number
    neutral: number
    avgScore: number
    avgConfidence: number
  }> {
    const results = await this.processBatch(items, options)

    const distribution = {
      total: results.length,
      positive: 0,
      negative: 0,
      neutral: 0,
      avgScore: 0,
      avgConfidence: 0,
    }

    let totalScore = 0
    let totalConfidence = 0

    results.forEach((r) => {
      distribution[r.result.sentiment]++
      totalScore += r.result.score
      totalConfidence += r.result.confidence
    })

    distribution.avgScore = totalScore / results.length
    distribution.avgConfidence = totalConfidence / results.length

    return distribution
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
