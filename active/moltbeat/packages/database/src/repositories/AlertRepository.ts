import { PrismaClient, Alert, Prisma } from '@prisma/client'

export class AlertRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: Prisma.AlertCreateInput): Promise<Alert> {
    return this.prisma.alert.create({ data })
  }

  async findById(id: string): Promise<Alert | null> {
    return this.prisma.alert.findUnique({
      where: { id },
    })
  }

  async findMany(params?: {
    skip?: number
    take?: number
    where?: Prisma.AlertWhereInput
    orderBy?: Prisma.AlertOrderByWithRelationInput
  }): Promise<Alert[]> {
    const { skip, take, where, orderBy } = params || {}
    return this.prisma.alert.findMany({
      skip,
      take,
      where,
      orderBy: orderBy || { createdAt: 'desc' },
    })
  }

  async getUnread(limit?: number): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: { isRead: false },
      orderBy: [
        { severity: 'desc' }, // Critical first
        { createdAt: 'desc' },
      ],
      take: limit,
    })
  }

  async getUnresolved(limit?: number): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: { isResolved: false },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    })
  }

  async getByType(type: string, limit?: number): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: { type },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getBySeverity(severity: string, limit?: number): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: { severity },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getByAgent(agentId: string, limit?: number): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getBySubmolt(submolt: string, limit?: number): Promise<Alert[]> {
    return this.prisma.alert.findMany({
      where: { submolt },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async markAsRead(id: string): Promise<Alert> {
    return this.prisma.alert.update({
      where: { id },
      data: { isRead: true },
    })
  }

  async markManyAsRead(ids: string[]): Promise<number> {
    const result = await this.prisma.alert.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true },
    })
    return result.count
  }

  async markAsResolved(id: string): Promise<Alert> {
    return this.prisma.alert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    })
  }

  async count(where?: Prisma.AlertWhereInput): Promise<number> {
    return this.prisma.alert.count({ where })
  }

  async countUnread(): Promise<number> {
    return this.prisma.alert.count({
      where: { isRead: false },
    })
  }

  async countBySeverity(): Promise<any> {
    const alerts = await this.prisma.alert.groupBy({
      by: ['severity'],
      _count: true,
      where: { isResolved: false },
    })

    return alerts.reduce((acc, item) => {
      acc[item.severity] = item._count
      return acc
    }, {} as Record<string, number>)
  }

  async deleteOld(daysAgo: number = 30): Promise<number> {
    const threshold = new Date(Date.now() - daysAgo * 24 * 3600000)
    const result = await this.prisma.alert.deleteMany({
      where: {
        createdAt: {
          lt: threshold,
        },
        isResolved: true,
      },
    })
    return result.count
  }
}
