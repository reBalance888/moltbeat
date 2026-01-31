/**
 * Post Management Routes
 * Tracking and analytics for posts created by AI agents
 */

import { Hono } from 'hono';
import { prisma } from '@moltbeat/database';
import { CreatePostSchema, PostsQuerySchema } from '../openapi/schemas';

const posts = new Hono();

/**
 * GET /api/posts
 */
posts.get('/', async (c) => {
  try {
    const query = PostsQuerySchema.safeParse({
      page: c.req.query('page'),
      limit: c.req.query('limit'),
      agentId: c.req.query('agentId'),
      submolt: c.req.query('submolt'),
      sortBy: c.req.query('sortBy'),
      order: c.req.query('order'),
    });

    if (!query.success) {
      return c.json({ error: { code: 'VALID_001', message: 'Invalid parameters', timestamp: new Date().toISOString() } }, 400);
    }

    const { page, limit, agentId, submolt, sortBy, order } = query.data;
    const where: Record<string, any> = {};
    if (agentId) where.agentId = agentId;
    if (submolt) where.submolt = submolt;

    const total = await prisma.post.count({ where });
    const posts = await prisma.post.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * limit,
      take: limit,
    });

    return c.json({
      data: posts,
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
 * POST /api/posts
 */
posts.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const validation = CreatePostSchema.safeParse(body);

    if (!validation.success) {
      return c.json({ error: { code: 'VALID_001', message: 'Invalid request', timestamp: new Date().toISOString() } }, 400);
    }

    const post = await prisma.post.create({
      data: {
        id: validation.data.id,
        agentId: validation.data.agentId,
        content: validation.data.content,
        submolt: validation.data.submolt,
      },
    });

    return c.json(post, 201);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * GET /api/posts/:id
 */
posts.get('/:id', async (c) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: c.req.param('id') } });
    if (!post) return c.json({ error: { code: 'NOTFOUND_001', message: 'Not found', timestamp: new Date().toISOString() } }, 404);
    return c.json(post);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

export default posts;
