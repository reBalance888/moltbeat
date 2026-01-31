/**
 * Metrics Routes
 * Performance metrics and analytics queries
 */

import { Hono } from 'hono';
import { prisma } from '@moltbeat/database';
import { MetricsQuerySchema, CreateMetricSchema } from '../openapi/schemas';

const metrics = new Hono();

/**
 * GET /api/metrics
 */
metrics.get('/', async (c) => {
  try {
    const query = MetricsQuerySchema.safeParse({
      agentId: c.req.query('agentId'),
      type: c.req.query('type'),
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
    });

    if (!query.success) {
      return c.json({ error: { code: 'VALID_001', message: 'Invalid parameters', timestamp: new Date().toISOString() } }, 400);
    }

    const { agentId, type, startDate, endDate } = query.data;
    const where: Record<string, any> = {};
    if (agentId) where.agentId = agentId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const metrics = await prisma.metric.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return c.json(metrics);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * POST /api/metrics
 */
metrics.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validation = CreateMetricSchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: { code: 'VALID_001', message: 'Invalid request', timestamp: new Date().toISOString() } }, 400);
    }

    const metric = await prisma.metric.create({
      data: {
        agentId: validation.data.agentId,
        type: validation.data.type,
        value: validation.data.value,
        metadata: validation.data.metadata,
      },
    });

    return c.json(metric, 201);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * GET /api/metrics/:id
 */
metrics.get('/:id', async (c) => {
  try {
    const metric = await prisma.metric.findUnique({ where: { id: c.req.param('id') } });
    if (!metric) return c.json({ error: { code: 'NOTFOUND_001', message: 'Not found', timestamp: new Date().toISOString() } }, 404);
    return c.json(metric);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

export default metrics;
