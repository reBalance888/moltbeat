import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RateLimiter } from '../src/rate-limiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should allow requests within rate limit', async () => {
    const limiter = new RateLimiter(60) // 60 req/min

    // Should allow first request immediately
    await limiter.acquire()
    expect(limiter.getAvailableTokens()).toBe(59)

    await limiter.acquire()
    expect(limiter.getAvailableTokens()).toBe(58)
  })

  it('should queue requests when rate limit exceeded', async () => {
    const limiter = new RateLimiter(2) // 2 req/min

    // Consume all tokens
    await limiter.acquire()
    await limiter.acquire()
    expect(limiter.getAvailableTokens()).toBe(0)

    // Next request should be queued
    const promise = limiter.acquire()

    // Advance time to refill tokens
    vi.advanceTimersByTime(30000) // 30 seconds = 1 token

    await promise
    expect(limiter.getAvailableTokens()).toBe(0)
  })

  it('should refill tokens over time', async () => {
    const limiter = new RateLimiter(60) // 60 req/min = 1 token per second

    await limiter.acquire()
    expect(limiter.getAvailableTokens()).toBe(59)

    // Advance 10 seconds
    vi.advanceTimersByTime(10000)

    // Should have refilled ~10 tokens (59 + 10 = 69, capped at 60)
    expect(limiter.getAvailableTokens()).toBe(60)
  })

  it('should not exceed max tokens', async () => {
    const limiter = new RateLimiter(100)

    // Wait for refill
    vi.advanceTimersByTime(120000) // 2 minutes

    // Should be capped at max
    expect(limiter.getAvailableTokens()).toBe(100)
  })

  it('should handle multiple concurrent requests', async () => {
    const limiter = new RateLimiter(5) // 5 req/min

    // Acquire 3 tokens
    await limiter.acquire()
    await limiter.acquire()
    await limiter.acquire()

    expect(limiter.getAvailableTokens()).toBe(2)
  })
})
