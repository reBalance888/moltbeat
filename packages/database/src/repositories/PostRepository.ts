import { PrismaClient, Post, Prisma } from '@prisma/client'

export class PostRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Post | null> {
    return this.prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        sentimentAnalysis: {
          orderBy: { analyzedAt: 'desc' },
          take: 1,
        },
      },
    })
  }

  async findMany(params?: {
    skip?: number
    take?: number
    where?: Prisma.PostWhereInput
    orderBy?: Prisma.PostOrderByWithRelationInput
    include?: Prisma.PostInclude
  }): Promise<Post[]> {
    const { skip, take, where, orderBy, include } = params || {}
    return this.prisma.post.findMany({
      skip,
      take,
      where,
      orderBy,
      include,
    })
  }

  async upsert(data: Prisma.PostCreateInput): Promise<Post> {
    return this.prisma.post.upsert({
      where: { id: data.id },
      update: {
        ...data,
        lastSyncedAt: new Date(),
      },
      create: data,
    })
  }

  async upsertMany(posts: any[]): Promise<number> {
    const results = await this.prisma.$transaction(
      posts.map((post) =>
        this.prisma.post.upsert({
          where: { id: post.id },
          update: {
            title: post.title,
            content: post.content,
            url: post.url,
            upvotes: post.upvotes,
            downvotes: post.downvotes,
            commentCount: post.commentCount,
            isPinned: post.isPinned,
            lastSyncedAt: new Date(),
          },
          create: {
            id: post.id,
            submolt: post.submolt,
            title: post.title,
            content: post.content,
            url: post.url,
            upvotes: post.upvotes,
            downvotes: post.downvotes,
            commentCount: post.commentCount,
            isPinned: post.isPinned,
            author: {
              connectOrCreate: {
                where: { id: post.authorId },
                create: {
                  id: post.authorId,
                  name: post.authorName,
                  karma: 0,
                },
              },
            },
          },
        })
      )
    )
    return results.length
  }

  async getBySubmolt(submolt: string, limit: number = 50): Promise<Post[]> {
    return this.prisma.post.findMany({
      where: { submolt },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: true,
      },
    })
  }

  async getTrending(hoursAgo: number = 24, limit: number = 10): Promise<Post[]> {
    const threshold = new Date(Date.now() - hoursAgo * 3600000)
    return this.prisma.post.findMany({
      where: {
        createdAt: {
          gte: threshold,
        },
      },
      orderBy: [
        { upvotes: 'desc' },
        { commentCount: 'desc' },
      ],
      take: limit,
      include: {
        author: true,
      },
    })
  }

  async getTopByEngagement(limit: number = 10): Promise<any[]> {
    // Get posts with highest engagement (upvotes + comments)
    const posts = await this.prisma.post.findMany({
      orderBy: [
        { upvotes: 'desc' },
        { commentCount: 'desc' },
      ],
      take: limit,
      include: {
        author: true,
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })

    return posts.map((post) => ({
      ...post,
      engagement: post.upvotes + post.commentCount * 2,
    }))
  }

  async getByAuthor(authorId: string, limit?: number): Promise<Post[]> {
    return this.prisma.post.findMany({
      where: { authorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: true,
      },
    })
  }

  async count(where?: Prisma.PostWhereInput): Promise<number> {
    return this.prisma.post.count({ where })
  }

  async countBySubmolt(submolt: string): Promise<number> {
    return this.prisma.post.count({
      where: { submolt },
    })
  }

  async needsSync(maxAge: number = 1800000): Promise<Post[]> {
    const threshold = new Date(Date.now() - maxAge)
    return this.prisma.post.findMany({
      where: {
        lastSyncedAt: {
          lt: threshold,
        },
      },
      orderBy: { lastSyncedAt: 'asc' },
      take: 100,
    })
  }

  async deleteOld(daysAgo: number = 30): Promise<number> {
    const threshold = new Date(Date.now() - daysAgo * 24 * 3600000)
    const result = await this.prisma.post.deleteMany({
      where: {
        createdAt: {
          lt: threshold,
        },
        isPinned: false,
      },
    })
    return result.count
  }
}
