import { Hono } from 'hono'
import { prisma, AgentRepository, MetricsRepository } from '@moltbeat/database'
import { AgentCache } from '@moltbeat/cache'

const agentsRouter = new Hono()
const agentRepo = new AgentRepository(prisma)
const metricsRepo = new MetricsRepository(prisma)
const agentCache = new AgentCache()

// GET /agents - List agents
agentsRouter.get('/', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10')
  const offset = parseInt(c.req.query('offset') || '0')
  const sort = c.req.query('sort') || 'karma' // karma, followers, engagement

  try {
    let agents

    if (sort === 'karma') {
      agents = await agentRepo.getTopByKarma(limit)
    } else if (sort === 'followers') {
      agents = await agentRepo.getTopByFollowers(limit)
    } else {
      agents = await agentRepo.findMany({
        take: limit,
        skip: offset,
        orderBy: { karma: 'desc' },
      })
    }

    return c.json({
      success: true,
      data: agents,
      pagination: {
        limit,
        offset,
        total: await agentRepo.count({ isActive: true }),
      },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// GET /agents/:name - Get agent by name
agentsRouter.get('/:name', async (c) => {
  const name = c.req.param('name')

  try {
    // Try cache first
    let agent = await agentCache.getAgentByName(name)

    if (!agent) {
      // Fetch from database
      const dbAgent = await agentRepo.findByName(name)

      if (!dbAgent) {
        return c.json({ success: false, error: 'Agent not found' }, 404)
      }

      // Cache for next time
      await agentCache.setAgent({
        id: dbAgent.id,
        name: dbAgent.name,
        karma: dbAgent.karma,
        followerCount: dbAgent.followerCount,
        followingCount: dbAgent.followingCount,
        isActive: dbAgent.isActive,
        lastSynced: dbAgent.lastSyncedAt.toISOString(),
      })

      agent = dbAgent as any
    }

    return c.json({
      success: true,
      data: agent,
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// GET /agents/:name/metrics - Get agent metrics history
agentsRouter.get('/:name/metrics', async (c) => {
  const name = c.req.param('name')
  const days = parseInt(c.req.query('days') || '7')

  try {
    const agent = await agentRepo.findByName(name)

    if (!agent) {
      return c.json({ success: false, error: 'Agent not found' }, 404)
    }

    const startTime = new Date(Date.now() - days * 24 * 3600000)
    const endTime = new Date()

    const metrics = await metricsRepo.getAgentMetricsHistory(
      agent.id,
      startTime,
      endTime
    )

    return c.json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
        },
        metrics,
        period: { days, startTime, endTime },
      },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// GET /agents/:name/growth - Get agent growth stats
agentsRouter.get('/:name/growth', async (c) => {
  const name = c.req.param('name')
  const days = parseInt(c.req.query('days') || '7')

  try {
    const agent = await agentRepo.findByName(name)

    if (!agent) {
      return c.json({ success: false, error: 'Agent not found' }, 404)
    }

    const growth = await metricsRepo.getAgentGrowth(agent.id, days)

    return c.json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
        },
        growth,
        period: { days },
      },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// GET /agents/stats/summary - Get overall agent statistics
agentsRouter.get('/stats/summary', async (c) => {
  try {
    const [total, active, avgKarma] = await Promise.all([
      agentRepo.count(),
      agentRepo.getTotalActiveCount(),
      agentRepo.getAverageKarma(),
    ])

    return c.json({
      success: true,
      data: {
        total,
        active,
        avgKarma,
      },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { agentsRouter }
