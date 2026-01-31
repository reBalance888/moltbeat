/**
 * Alert Management Routes
 * Real-time alert monitoring and notification
 */

import { Hono } from 'hono';
import { prisma } from '@moltbeat/database';
import { AlertsQuerySchema, CreateAlertSchema } from '../openapi/schemas';
import { z } from 'zod';

const alerts = new Hono();

/**
 * GET /api/alerts
 */
alerts.get('/', async (c) => {
  try {
    const query = AlertsQuerySchema.safeParse({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
      agentId: c.req.query('agentId'),
      severity: c.req.query('severity'),
      read: c.req.query('read'),
      sortBy: c.req.query('sortBy'),
      order: c.req.query('order'),
    });

    if (!query.success) {
      return c.json({ error: { code: 'VALID_001', message: 'Invalid parameters', timestamp: new Date().toISOString() } }, 400);
    }

    const { page, limit, agentId, severity, read, sortBy, order } = query.data;
    const where: Record<string, any> = {};
    if (agentId) where.agentId = agentId;
    if (severity) where.severity = severity;
    if (read !== undefined) where.read = read;

    const total = await prisma.alert.count({ where });
    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    });

    return c.json({
      data: alerts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * POST /api/alerts
 */
alerts.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validation = CreateAlertSchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: { code: 'VALID_001', message: 'Invalid request', timestamp: new Date().toISOString() } }, 400);
    }

    const alert = await prisma.alert.create({
      data: {
        agentId: validation.data.agentId,
        type: validation.data.type,
        severity: validation.data.severity,
        message: validation.data.message,
        metadata: validation.data.metadata,
      },
    });

    return c.json(alert, 201);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * GET /api/alerts/:id
 */
alerts.get('/:id', async (c) => {
  try {
    const alert = await prisma.alert.findUnique({ where: { id: c.req.param('id') } });
    if (!alert) return c.json({ error: { code: 'NOTFOUND_001', message: 'Not found', timestamp: new Date().toISOString() } }, 404);
    return c.json(alert);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * PATCH /api/alerts/:id
 */
alerts.patch('/:id', async (c) => {
  try {
    const body = await c.req.json();
    const validation = z.object({ read: z.boolean().optional() }).safeParse(body);

    if (!validation.success) {
      return c.json({ error: { code: 'VALID_001', message: 'Invalid request', timestamp: new Date().toISOString() } }, 400);
    }

    const alert = await prisma.alert.update({
      where: { id: c.req.param('id') },
      data: { read: validation.data.read },
    });

    return c.json(alert);
  } catch (error: any) {
    if (error.code === 'P2025') return c.json({ error: { code: 'NOTFOUND_001', message: 'Not found', timestamp: new Date().toISOString() } }, 404);
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * DELETE /api/alerts/:id
 */
alerts.delete('/:id', async (c) => {
  try {
    await prisma.alert.delete({ where: { id: c.req.param('id') } });
    return c.newResponse(null, 204);
  } catch (error: any) {
    if (error.code === 'P2025') return c.json({ error: { code: 'NOTFOUND_001', message: 'Not found', timestamp: new Date().toISOString() } }, 404);
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

export default alerts;
