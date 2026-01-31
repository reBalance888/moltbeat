import { CRYPTO_TOKENS, PRICE_KEYWORDS, TECH_KEYWORDS } from './tokens'

/**
 * Detects cryptocurrency mentions in text
 */
export class TokenDetector {
  /**
   * Detect all crypto tokens mentioned in text
   */
  detectTokens(text: string): string[] {
    const lowerText = text.toLowerCase()
    const detectedTokens: Set<string> = new Set()

    for (const token of CRYPTO_TOKENS) {
      // Check symbol
      if (lowerText.includes(token.symbol.toLowerCase())) {
        detectedTokens.add(token.symbol)
        continue
      }

      // Check name
      if (lowerText.includes(token.name.toLowerCase())) {
        detectedTokens.add(token.symbol)
        continue
      }

      // Check keywords
      for (const keyword of token.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          detectedTokens.add(token.symbol)
          break
        }
      }
    }

    return Array.from(detectedTokens)
  }

  /**
   * Determine context of crypto mention
   */
  detectContext(
    text: string
  ): 'price' | 'tech' | 'news' | 'prediction' | 'general' {
    const lowerText = text.toLowerCase()

    // Check for price-related keywords
    const priceMatches = PRICE_KEYWORDS.filter((kw) =>
      lowerText.includes(kw.toLowerCase())
    )
    if (priceMatches.length >= 2) {
      return 'prediction'
    }
    if (priceMatches.length > 0) {
      return 'price'
    }

    // Check for technical keywords
    const techMatches = TECH_KEYWORDS.filter((kw) =>
      lowerText.includes(kw.toLowerCase())
    )
    if (techMatches.length >= 2) {
      return 'tech'
    }

    // Check for news indicators
    if (
      lowerText.includes('announced') ||
      lowerText.includes('breaking') ||
      lowerText.includes('news') ||
      lowerText.includes('update')
    ) {
      return 'news'
    }

    return 'general'
  }

  /**
   * Extract price predictions from text
   */
  extractPricePrediction(text: string): {
    price?: number
    timeframe?: string
  } | null {
    const lowerText = text.toLowerCase()

    // Look for price patterns like "$50,000" or "50k" or "50000"
    const pricePatterns = [
      /\$([0-9,]+(?:\.[0-9]{1,2})?)/g,
      /([0-9]+)k/gi,
      /([0-9,]+)\s*(?:usd|dollars?)/gi,
    ]

    let price: number | undefined

    for (const pattern of pricePatterns) {
      const matches = Array.from(lowerText.matchAll(pattern))
      if (matches.length > 0) {
        const match = matches[0][1]
        const cleanedMatch = match.replace(/,/g, '')

        if (pattern.toString().includes('k')) {
          price = parseFloat(cleanedMatch) * 1000
        } else {
          price = parseFloat(cleanedMatch)
        }

        break
      }
    }

    // Look for timeframe
    const timeframePatterns = [
      /by\s+((?:next\s+)?(?:week|month|year|q[1-4]|eoy|eow))/i,
      /in\s+(\d+\s+(?:days?|weeks?|months?|years?))/i,
      /(end of (?:week|month|year|q[1-4]))/i,
    ]

    let timeframe: string | undefined

    for (const pattern of timeframePatterns) {
      const match = text.match(pattern)
      if (match) {
        timeframe = match[1]
        break
      }
    }

    if (price || timeframe) {
      return { price, timeframe }
    }

    return null
  }

  /**
   * Check if text is crypto-related
   */
  isCryptoRelated(text: string): boolean {
    return this.detectTokens(text).length > 0
  }
}
