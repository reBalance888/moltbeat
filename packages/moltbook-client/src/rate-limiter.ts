export class RateLimiter {
  private tokens: number
  private maxTokens: number
  private refillRate: number // tokens per ms
  private lastRefill: number
  private queue: Array<() => void> = []

  constructor(requestsPerMinute: number) {
    this.maxTokens = requestsPerMinute
    this.tokens = requestsPerMinute
    this.refillRate = requestsPerMinute / 60000 // per ms
    this.lastRefill = Date.now()
  }

  async acquire(): Promise<void> {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }

    // Wait for token to become available
    return new Promise((resolve) => {
      this.queue.push(resolve)
      this.scheduleRefill()
    })
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefill
    const tokensToAdd = elapsed * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now

    // Process waiting requests
    while (this.queue.length > 0 && this.tokens >= 1) {
      this.tokens -= 1
      const resolve = this.queue.shift()!
      resolve()
    }
  }

  private scheduleRefill(): void {
    const timeUntilToken = (1 - this.tokens) / this.refillRate
    setTimeout(() => this.refill(), Math.max(timeUntilToken, 100))
  }

  getAvailableTokens(): number {
    this.refill()
    return Math.floor(this.tokens)
  }
}
