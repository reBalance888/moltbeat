import { Hono } from 'hono'
import { prisma, PostRepository } from '@moltbeat/database'
import { PostCache } from '@moltbeat/cache'

const postsRouter = new Hono()
const postRepo = new PostRepository(prisma)
const postCache = new PostCache()

// GET /posts/trending - Get trending posts
postsRouter.get('/trending', async (c) => {
  const hours = parseInt(c.req.query('hours') || '24')
  const limit = parseInt(c.req.query('limit') || '10')

  try {
    const posts = await postRepo.getTrending(hours, limit)

    return c.json({
      success: true,
      data: posts,
      params: { hours, limit },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

// GET /posts/:submolt - Get posts by submolt
postsRouter.get('/:submolt', async (c) => {
  const submolt = c.req.param('submolt')
  const limit = parseInt(c.req.query('limit') || '50')

  try {
    // Try cache first
    let posts = await postCache.getFeed(submolt)

    if (!posts) {
      const dbPosts = await postRepo.getBySubmolt(submolt, limit)
      posts = dbPosts.map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        engagement: p.upvotes + p.commentCount * 2,
      })) as any
    }

    return c.json({
      success: true,
      data: posts,
      params: { submolt, limit },
    })
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500)
  }
})

export { postsRouter }
