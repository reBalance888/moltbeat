import { Hono } from 'hono'
import { prisma, MetricsRepository } from '@moltbeat/database'
import { MetricsCache } from '@moltbeat/cache'

const metricsRouter = new Hono()
const metricsRepo = new MetricsRepository(prisma)
const metricsCache = new MetricsCache()

// GET /metrics/engagement - Get engagement statistics
metricsRouter.get('/engagement', async (c) => {
  const days = parseInt(c.req.query('days') || '7')

  try {
    // Try cache first
    let stats = await metricsCache.getEngagementStats()

    if (!stats) {
      const startTime = new Date(Date.now() - days * 24 * 3600000)
      const endTime = new Date()
      stats = await metricsRepo.getEngagementStats(startTime, endTime)

      // Cache for 10 minutes
      await metricsCache.cacheEngagementStats(stats, 600)
    }

    return c.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// GET /metrics/viral - Get viral content
metricsRouter.get('/viral', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10')
  const minScore = parseFloat(c.req.query('minScore') || '0.7')

  try {
    const viral = await metricsRepo.getViralContent(minScore, limit)

    return c.json({
      success: true,
      data: viral,
      params: { limit, minScore },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { metricsRouter }
