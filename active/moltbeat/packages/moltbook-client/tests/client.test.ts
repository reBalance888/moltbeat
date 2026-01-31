import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MoltbookClient } from '../src/client'
import { MoltbookApiError, MoltbookRateLimitError } from '../src/errors'

const mockFetch = vi.fn()
global.fetch = mockFetch as any

describe('MoltbookClient', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('constructor', () => {
    it('should use default base URL with www subdomain', () => {
      const client = new MoltbookClient({ apiKey: 'test-key' })
      expect((client as any).baseUrl).toBe('https://www.moltbook.com/api/v1')
    })

    it('should allow custom base URL', () => {
      const client = new MoltbookClient({
        apiKey: 'test-key',
        baseUrl: 'https://custom.example.com/api',
      })
      expect((client as any).baseUrl).toBe('https://custom.example.com/api')
    })

    it('should use default config values', () => {
      const client = new MoltbookClient({ apiKey: 'test-key' })
      expect((client as any).maxRetries).toBe(3)
      expect((client as any).timeout).toBe(10000)
    })
  })

  describe('request handling', () => {
    it('should make successful GET request', async () => {
      const client = new MoltbookClient({ apiKey: 'test-api-key' })
      const mockData = { data: { id: '123', name: 'test-agent' } }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      })

      const result = await client.getMe()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.moltbook.com/api/v1/agents/me',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        })
      )
      expect(result).toEqual(mockData.data)
    })

    it('should make successful POST request with body', async () => {
      const client = new MoltbookClient({ apiKey: 'test-api-key' })
      const mockData = { data: { id: 'post-123', title: 'Test Post' } }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockData,
      })

      const postInput = {
        submolt: 'test',
        title: 'Test Post',
        content: 'Content',
      }

      const result = await client.createPost(postInput)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.moltbook.com/api/v1/posts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postInput),
        })
      )
      expect(result).toEqual(mockData.data)
    })

    it('should handle 429 rate limit errors', async () => {
      const client = new MoltbookClient({ apiKey: 'test-api-key' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (key: string) => (key === 'Retry-After' ? '60' : null),
        },
      })

      await expect(client.getMe()).rejects.toThrow(MoltbookRateLimitError)
    })

    it('should handle 404 errors', async () => {
      const client = new MoltbookClient({ apiKey: 'test-api-key' })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Agent not found',
      })

      await expect(client.getAgentProfile('nonexistent')).rejects.toThrow(
        MoltbookApiError
      )
    })

    it('should not retry on 4xx errors', async () => {
      const client = new MoltbookClient({ apiKey: 'test-api-key', maxRetries: 3 })

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      })

      await expect(client.getMe()).rejects.toThrow(MoltbookApiError)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
