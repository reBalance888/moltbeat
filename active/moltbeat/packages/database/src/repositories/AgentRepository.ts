import { PrismaClient, Agent, Prisma } from '@prisma/client'

export class AgentRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Agent | null> {
    return this.prisma.agent.findUnique({
      where: { id },
      include: {
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })
  }

  async findByName(name: string): Promise<Agent | null> {
    return this.prisma.agent.findUnique({
      where: { name },
      include: {
        metrics: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })
  }

  async findMany(params?: {
    skip?: number
    take?: number
    where?: Prisma.AgentWhereInput
    orderBy?: Prisma.AgentOrderByWithRelationInput
  }): Promise<Agent[]> {
    const { skip, take, where, orderBy } = params || {}
    return this.prisma.agent.findMany({
      skip,
      take,
      where,
      orderBy,
    })
  }

  async upsert(data: Prisma.AgentCreateInput): Promise<Agent> {
    return this.prisma.agent.upsert({
      where: { id: data.id },
      update: {
        ...data,
        lastSyncedAt: new Date(),
      },
      create: data,
    })
  }

  async upsertMany(agents: Prisma.AgentCreateInput[]): Promise<number> {
    const results = await this.prisma.$transaction(
      agents.map((agent) =>
        this.prisma.agent.upsert({
          where: { id: agent.id },
          update: {
            ...agent,
            lastSyncedAt: new Date(),
          },
          create: agent,
        })
      )
    )
    return results.length
  }

  async getTopByKarma(limit: number = 10): Promise<Agent[]> {
    return this.prisma.agent.findMany({
      take: limit,
      orderBy: { karma: 'desc' },
      where: { isActive: true },
    })
  }

  async getTopByFollowers(limit: number = 10): Promise<Agent[]> {
    return this.prisma.agent.findMany({
      take: limit,
      orderBy: { followerCount: 'desc' },
      where: { isActive: true },
    })
  }

  async getActive(limit?: number): Promise<Agent[]> {
    return this.prisma.agent.findMany({
      where: { isActive: true },
      orderBy: { karma: 'desc' },
      take: limit,
    })
  }

  async count(where?: Prisma.AgentWhereInput): Promise<number> {
    return this.prisma.agent.count({ where })
  }

  async getTotalActiveCount(): Promise<number> {
    return this.prisma.agent.count({
      where: { isActive: true },
    })
  }

  async getAverageKarma(): Promise<number> {
    const result = await this.prisma.agent.aggregate({
      _avg: { karma: true },
      where: { isActive: true },
    })
    return result._avg.karma || 0
  }

  async needsSync(maxAge: number = 3600000): Promise<Agent[]> {
    const threshold = new Date(Date.now() - maxAge)
    return this.prisma.agent.findMany({
      where: {
        lastSyncedAt: {
          lt: threshold,
        },
      },
      orderBy: { lastSyncedAt: 'asc' },
    })
  }
}
