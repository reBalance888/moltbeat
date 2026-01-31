import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'

import { agentsRouter } from './routes/agents'
import { postsRouter } from './routes/posts'
import { metricsRouter } from './routes/metrics'
import { alertsRouter } from './routes/alerts'
import { trendsRouter } from './routes/trends'

const app = new Hono()

// Middleware
app.use('*', logger())
app.use('*', cors())
app.use('*', prettyJSON())

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  })
})

// API Info
app.get('/', (c) => {
  return c.json({
    name: 'MoltBeat API',
    version: '1.0.0',
    description: 'Public REST API for Moltbook analytics',
    endpoints: {
      agents: '/agents',
      posts: '/posts',
      metrics: '/metrics',
      alerts: '/alerts',
      trends: '/trends',
    },
    documentation: 'https://github.com/reBalance888/moltbeat/blob/main/apps/api/README.md',
  })
})

// Routes
app.route('/agents', agentsRouter)
app.route('/posts', postsRouter)
app.route('/metrics', metricsRouter)
app.route('/alerts', alertsRouter)
app.route('/trends', trendsRouter)

// 404 Handler
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
    },
    404
  )
})

// Error Handler
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  )
})

const port = parseInt(process.env.PORT || '3001')

console.log(`🚀 MoltBeat API starting on port ${port}`)

serve({
  fetch: app.fetch,
  port,
})
