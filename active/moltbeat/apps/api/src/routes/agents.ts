/**
 * Agent Management Routes
 * CRUD operations for AI agents on MoltBook
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '@moltbeat/database';
import {
  CreateAgentSchema,
  UpdateAgentSchema,
  AgentsQuerySchema,
} from '../openapi/schemas';

const agents = new Hono();

/**
 * GET /api/agents
 * List all agents with pagination
 */
agents.get('/', async (c) => {
  try {
    const query = AgentsQuerySchema.safeParse({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
      status: c.req.query('status'),
      sortBy: c.req.query('sortBy'),
      order: c.req.query('order'),
    });

    if (!query.success) {
      return c.json({ error: { code: 'VALID_001', message: 'Invalid parameters', timestamp: new Date().toISOString() } }, 400);
    }

    const { page, limit, status, sortBy, order } = query.data;
    const where: Record<string, any> = status ? { status } : {};
    const orderBy: Record<string, any> = { [sortBy]: order };

    const total = await prisma.agent.count({ where });
    const agents = await prisma.agent.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit });

    return c.json({
      data: agents,
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
 * POST /api/agents
 * Create a new agent
 */
agents.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validation = CreateAgentSchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: { code: 'VALID_001', message: 'Invalid request', timestamp: new Date().toISOString() } }, 400);
    }

    const agent = await prisma.agent.create({
      data: {
        id: validation.data.id,
        name: validation.data.name,
        personality: validation.data.personality,
        submolts: validation.data.submolts || [],
      },
    });

    return c.json(agent, 201);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * GET /api/agents/:id
 */
agents.get('/:id', async (c) => {
  try {
    const agent = await prisma.agent.findUnique({ where: { id: c.req.param('id') } });
    if (!agent) return c.json({ error: { code: 'NOTFOUND_001', message: 'Not found', timestamp: new Date().toISOString() } }, 404);
    return c.json(agent);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * PATCH /api/agents/:id
 */
agents.patch('/:id', async (c) => {
  try {
    const body = await c.req.json();
    const validation = UpdateAgentSchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: { code: 'VALID_001', message: 'Invalid request', timestamp: new Date().toISOString() } }, 400);
    }

    const agent = await prisma.agent.update({
      where: { id: c.req.param('id') },
      data: validation.data,
    });

    return c.json(agent);
  } catch (error: any) {
    if (error.code === 'P2025') return c.json({ error: { code: 'NOTFOUND_001', message: 'Not found', timestamp: new Date().toISOString() } }, 404);
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * DELETE /api/agents/:id
 */
agents.delete('/:id', async (c) => {
  try {
    await prisma.agent.delete({ where: { id: c.req.param('id') } });
    return c.newResponse(null, 204);
  } catch (error: any) {
    if (error.code === 'P2025') return c.json({ error: { code: 'NOTFOUND_001', message: 'Not found', timestamp: new Date().toISOString() } }, 404);
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

export default agents;
