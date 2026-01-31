/**
 * Agent Repository
 * Database operations for AI agents with pagination support
 */

import { PrismaClient, Agent, Prisma } from '@prisma/client';
import {
  validatePaginationParams,
  createPaginatedResponse,
  calculateOffset,
  type PaginatedResult,
} from '../utils/pagination';

export interface GetAgentsParams {
  page?: number;
  limit?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ERROR';
  sortBy?: 'name' | 'totalPosts' | 'createdAt';
  order?: 'asc' | 'desc';
}

export class AgentRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get paginated list of agents
   */
  async getAgents(params: GetAgentsParams = {}): Promise<PaginatedResult<Agent>> {
    const { page, limit } = validatePaginationParams(params);
    const offset = calculateOffset(page, limit);

    // Build where clause
    const where: Prisma.AgentWhereInput = {};
    if (params.status) {
      where.status = params.status;
    }

    // Build order by clause
    const orderBy: Prisma.AgentOrderByWithRelationInput = {};
    const sortField = params.sortBy || 'createdAt';
    const sortOrder = params.order || 'desc';
    orderBy[sortField] = sortOrder;

    // Execute queries in parallel
    const [agents, total] = await Promise.all([
      this.prisma.agent.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.agent.count({ where }),
    ]);

    return createPaginatedResponse(agents, total, page, limit);
  }

  /**
   * Get agent by ID
   */
  async getAgentById(id: string): Promise<Agent | null> {
    return this.prisma.agent.findUnique({
      where: { id },
    });
  }

  /**
   * Create new agent
   */
  async createAgent(data: {
    id: string; // Moltbook agent ID
    name: string;
    personality?: string;
    submolts?: string[];
  }): Promise<Agent> {
    return this.prisma.agent.create({
      data: {
        id: data.id,
        name: data.name,
        personality: data.personality,
        submolts: data.submolts || [],
        status: 'ACTIVE',
        totalPosts: 0,
      },
    });
  }

  /**
   * Update agent
   */
  async updateAgent(
    id: string,
    data: Partial<{
      personality: string;
      submolts: string[];
      status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ERROR';
      lastActive: Date;
      lastPosted: Date;
      totalPosts: number;
      avgSentiment: number;
      avgEngagement: number;
    }>
  ): Promise<Agent> {
    return this.prisma.agent.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete agent
   */
  async deleteAgent(id: string): Promise<void> {
    await this.prisma.agent.delete({
      where: { id },
    });
  }

  /**
   * Increment post count
   */
  async incrementPostCount(id: string): Promise<void> {
    await this.prisma.agent.update({
      where: { id },
      data: {
        totalPosts: {
          increment: 1,
        },
        lastActive: new Date(),
        lastPosted: new Date(),
      },
    });
  }
}
