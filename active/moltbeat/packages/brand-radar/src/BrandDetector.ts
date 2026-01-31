import { BrandConfig } from './types'

/**
 * Detects brand mentions in text
 */
export class BrandDetector {
  /**
   * Detect brand mention in text
   */
  detectBrand(text: string, config: BrandConfig): boolean {
    const lowerText = text.toLowerCase()

    // Check brand name
    if (lowerText.includes(config.name.toLowerCase())) {
      return this.isValidMention(lowerText, config)
    }

    // Check keywords
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return this.isValidMention(lowerText, config)
      }
    }

    // Check aliases
    if (config.aliases) {
      for (const alias of config.aliases) {
        if (lowerText.includes(alias.toLowerCase())) {
          return this.isValidMention(lowerText, config)
        }
      }
    }

    return false
  }

  /**
   * Detect competitor mentions
   */
  detectCompetitor(text: string, config: BrandConfig): string | null {
    if (!config.competitors) return null

    const lowerText = text.toLowerCase()

    for (const competitor of config.competitors) {
      if (lowerText.includes(competitor.toLowerCase())) {
        return competitor
      }
    }

    return null
  }

  /**
   * Determine mention context
   */
  detectContext(
    text: string
  ): 'product' | 'support' | 'comparison' | 'review' | 'general' {
    const lowerText = text.toLowerCase()

    // Support-related keywords
    const supportKeywords = [
      'help',
      'support',
      'issue',
      'problem',
      'bug',
      'error',
      'broken',
      'not working',
      'customer service',
    ]
    if (supportKeywords.some((kw) => lowerText.includes(kw))) {
      return 'support'
    }

    // Comparison keywords
    const comparisonKeywords = [
      'vs',
      'versus',
      'compared to',
      'better than',
      'worse than',
      'alternative',
      'instead of',
    ]
    if (comparisonKeywords.some((kw) => lowerText.includes(kw))) {
      return 'comparison'
    }

    // Review keywords
    const reviewKeywords = [
      'review',
      'rating',
      'recommend',
      'experience',
      'tried',
      'used',
      'love',
      'hate',
    ]
    if (reviewKeywords.some((kw) => lowerText.includes(kw))) {
      return 'review'
    }

    // Product keywords
    const productKeywords = [
      'feature',
      'update',
      'release',
      'launch',
      'new',
      'product',
      'version',
    ]
    if (productKeywords.some((kw) => lowerText.includes(kw))) {
      return 'product'
    }

    return 'general'
  }

  /**
   * Check if brand mention is valid (not excluded)
   */
  private isValidMention(text: string, config: BrandConfig): boolean {
    if (!config.excludeKeywords) return true

    const lowerText = text.toLowerCase()

    // Check if any exclude keywords are present
    for (const exclude of config.excludeKeywords) {
      if (lowerText.includes(exclude.toLowerCase())) {
        return false
      }
    }

    return true
  }

  /**
   * Extract brand-related keywords from text
   */
  extractKeywords(text: string): string[] {
    const words = text.toLowerCase().match(/\b\w+\b/g) || []

    // Filter common words and short words
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'is',
      'was',
      'are',
      'been',
      'has',
      'have',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
    ])

    return words
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .slice(0, 10) // Top 10 keywords
  }
}
