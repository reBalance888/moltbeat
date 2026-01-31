import { Hono } from 'hono'
import { prisma } from '@moltbeat/database'

const trendsRouter = new Hono()

// GET /trends - Get trending topics
trendsRouter.get('/', async (c) => {
  const hours = parseInt(c.req.query('hours') || '24')
  const limit = parseInt(c.req.query('limit') || '10')
  const submolt = c.req.query('submolt') as string | undefined

  try {
    const startTime = new Date(Date.now() - hours * 3600000)
    const endTime = new Date()

    const trends = await prisma.trendingTopic.findMany({
      where: {
        startTime: { gte: startTime },
        endTime: { lte: endTime },
        ...(submolt ? { submolt } : {}),
      },
      orderBy: { engagementScore: 'desc' },
      take: limit,
    })

    return c.json({
      success: true,
      data: trends,
      params: { hours, limit, submolt },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { trendsRouter }
