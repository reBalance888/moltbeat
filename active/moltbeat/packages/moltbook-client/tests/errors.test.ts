import { describe, it, expect } from 'vitest'
import { MoltbookApiError, MoltbookRateLimitError } from '../src/errors'

describe('MoltbookApiError', () => {
  it('should create error with status and body', () => {
    const error = new MoltbookApiError(404, 'Not Found')

    expect(error.status).toBe(404)
    expect(error.body).toBe('Not Found')
    expect(error.name).toBe('MoltbookApiError')
    expect(error.message).toBe('Moltbook API Error 404: Not Found')
  })

  it('should identify 404 errors', () => {
    const error = new MoltbookApiError(404, 'Not Found')
    expect(error.isNotFound).toBe(true)
    expect(error.isUnauthorized).toBe(false)
    expect(error.isForbidden).toBe(false)
  })

  it('should identify 401 errors', () => {
    const error = new MoltbookApiError(401, 'Unauthorized')
    expect(error.isNotFound).toBe(false)
    expect(error.isUnauthorized).toBe(true)
    expect(error.isForbidden).toBe(false)
  })

  it('should identify 403 errors', () => {
    const error = new MoltbookApiError(403, 'Forbidden')
    expect(error.isNotFound).toBe(false)
    expect(error.isUnauthorized).toBe(false)
    expect(error.isForbidden).toBe(true)
  })
})

describe('MoltbookRateLimitError', () => {
  it('should create error with retry information', () => {
    const error = new MoltbookRateLimitError('Rate limit exceeded', 60)

    expect(error.retryAfterSeconds).toBe(60)
    expect(error.name).toBe('MoltbookRateLimitError')
    expect(error.message).toBe('Rate limit exceeded')
  })

  it('should handle different retry durations', () => {
    const error1 = new MoltbookRateLimitError('Too many requests', 30)
    const error2 = new MoltbookRateLimitError('Too many requests', 120)

    expect(error1.retryAfterSeconds).toBe(30)
    expect(error2.retryAfterSeconds).toBe(120)
  })
})
