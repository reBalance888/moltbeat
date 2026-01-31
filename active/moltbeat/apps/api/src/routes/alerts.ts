import { Hono } from 'hono'
import { prisma, AlertRepository } from '@moltbeat/database'

const alertsRouter = new Hono()
const alertRepo = new AlertRepository(prisma)

// GET /alerts - Get recent alerts
alertsRouter.get('/', async (c) => {
  const limit = parseInt(c.req.query('limit') || '10')
  const severity = c.req.query('severity') as string | undefined
  const type = c.req.query('type') as string | undefined

  try {
    let alerts

    if (severity) {
      alerts = await alertRepo.getBySeverity(severity, limit)
    } else if (type) {
      alerts = await alertRepo.getByType(type, limit)
    } else {
      alerts = await alertRepo.getUnread(limit)
    }

    return c.json({
      success: true,
      data: alerts,
      params: { limit, severity, type },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// GET /alerts/stats - Get alert statistics
alertsRouter.get('/stats', async (c) => {
  try {
    const [unread, bySeverity] = await Promise.all([
      alertRepo.countUnread(),
      alertRepo.countBySeverity(),
    ])

    return c.json({
      success: true,
      data: {
        unread,
        bySeverity,
      },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { alertsRouter }
