import { pipeline } from '@xenova/transformers'

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number
  confidence: number
  label: string
  rawScores: {
    positive: number
    negative: number
    neutral?: number
  }
}

export interface AnalysisOptions {
  /**
   * Minimum confidence threshold (0-1)
   * Results below this will be marked as 'neutral'
   */
  confidenceThreshold?: number
  /**
   * Custom model to use
   * Default: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
   */
  model?: string
}

/**
 * Sentiment Analyzer using Transformers.js
 * Runs locally without API calls - zero cost!
 */
export class SentimentAnalyzer {
  private pipeline: any | null = null
  private model: string
  private confidenceThreshold: number
  private isInitialized: boolean = false

  constructor(options: AnalysisOptions = {}) {
    this.model = options.model || 'Xenova/distilbert-base-uncessed-finetuned-sst-2-english'
    this.confidenceThreshold = options.confidenceThreshold || 0.6
  }

  /**
   * Initialize the model
   * Call this once before using analyze()
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.pipeline = await pipeline('sentiment-analysis', this.model)
      this.isInitialized = true
    } catch (error) {
      throw new Error(`Failed to initialize sentiment analyzer: ${error}`)
    }
  }

  /**
   * Analyze sentiment of text
   */
  async analyze(text: string): Promise<SentimentResult> {
    if (!this.isInitialized || !this.pipeline) {
      await this.initialize()
    }

    if (!text || text.trim().length === 0) {
      return {
        sentiment: 'neutral',
        score: 0.5,
        confidence: 0,
        label: 'NEUTRAL',
        rawScores: {
          positive: 0.5,
          negative: 0.5,
        },
      }
    }

    try {
      const result = await this.pipeline!(text)

      // Transformers.js returns array with label and score
      const firstResult = Array.isArray(result) ? result[0] : result
      const { label, score } = firstResult

      // Convert label to our format
      let sentiment: 'positive' | 'negative' | 'neutral'
      let rawScores: { positive: number; negative: number; neutral?: number }

      if (label === 'POSITIVE') {
        sentiment = score >= this.confidenceThreshold ? 'positive' : 'neutral'
        rawScores = {
          positive: score,
          negative: 1 - score,
        }
      } else if (label === 'NEGATIVE') {
        sentiment = score >= this.confidenceThreshold ? 'negative' : 'neutral'
        rawScores = {
          positive: 1 - score,
          negative: score,
        }
      } else {
        sentiment = 'neutral'
        rawScores = {
          positive: 0.5,
          negative: 0.5,
          neutral: score,
        }
      }

      return {
        sentiment,
        score,
        confidence: score,
        label,
        rawScores,
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error)
      return {
        sentiment: 'neutral',
        score: 0.5,
        confidence: 0,
        label: 'ERROR',
        rawScores: {
          positive: 0.5,
          negative: 0.5,
        },
      }
    }
  }

  /**
   * Batch analyze multiple texts
   */
  async analyzeBatch(texts: string[]): Promise<SentimentResult[]> {
    if (!this.isInitialized || !this.pipeline) {
      await this.initialize()
    }

    return Promise.all(texts.map((text) => this.analyze(text)))
  }

  /**
   * Get overall sentiment from multiple results
   */
  aggregateSentiments(results: SentimentResult[]): {
    overall: 'positive' | 'negative' | 'neutral'
    avgScore: number
    avgConfidence: number
    distribution: {
      positive: number
      negative: number
      neutral: number
    }
  } {
    const distribution = {
      positive: 0,
      negative: 0,
      neutral: 0,
    }

    let totalScore = 0
    let totalConfidence = 0

    results.forEach((result) => {
      distribution[result.sentiment]++
      totalScore += result.score
      totalConfidence += result.confidence
    })

    const avgScore = totalScore / results.length
    const avgConfidence = totalConfidence / results.length

    // Determine overall sentiment
    let overall: 'positive' | 'negative' | 'neutral'
    if (distribution.positive > distribution.negative && distribution.positive > distribution.neutral) {
      overall = 'positive'
    } else if (distribution.negative > distribution.positive && distribution.negative > distribution.neutral) {
      overall = 'negative'
    } else {
      overall = 'neutral'
    }

    return {
      overall,
      avgScore,
      avgConfidence,
      distribution: {
        positive: distribution.positive / results.length,
        negative: distribution.negative / results.length,
        neutral: distribution.neutral / results.length,
      },
    }
  }

  /**
   * Extract keywords from text (simple implementation)
   */
  extractKeywords(text: string, limit: number = 5): string[] {
    // Remove common words
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'as', 'are', 'was', 'were',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'must', 'can', 'of', 'to', 'in', 'for',
      'with', 'from', 'by', 'and', 'or', 'but', 'not', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'who', 'when',
      'where', 'why', 'how', 'if', 'so', 'than', 'such', 'about', 'into', 'through',
      'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again',
      'further', 'then', 'once',
    ])

    // Tokenize and filter
    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))

    // Count frequency
    const wordCount = new Map<string, number>()
    words.forEach((word) => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1)
    })

    // Sort by frequency and return top N
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word)
  }

  /**
   * Analyze with keyword extraction
   */
  async analyzeWithKeywords(
    text: string,
    keywordLimit: number = 5
  ): Promise<SentimentResult & { keywords: string[] }> {
    const sentiment = await this.analyze(text)
    const keywords = this.extractKeywords(text, keywordLimit)

    return {
      ...sentiment,
      keywords,
    }
  }
}
