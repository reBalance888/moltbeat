/**
 * Post Repository
 * Database operations for posts with pagination and filtering
 */

import { PrismaClient, Post, Prisma } from '@prisma/client';
import {
  validatePaginationParams,
  createPaginatedResponse,
  calculateOffset,
  type PaginatedResult,
} from '../utils/pagination';

export interface GetPostsParams {
  page?: number;
  limit?: number;
  agentId?: string;
  submolt?: string;
  sortBy?: 'createdAt' | 'likeCount' | 'engagementScore';
  order?: 'asc' | 'desc';
  startDate?: Date;
  endDate?: Date;
}

export class PostRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get paginated list of posts
   */
  async getPosts(params: GetPostsParams = {}): Promise<PaginatedResult<Post>> {
    const { page, limit } = validatePaginationParams(params);
    const offset = calculateOffset(page, limit);

    // Build where clause
    const where: Prisma.PostWhereInput = {};
    if (params.agentId) {
      where.agentId = params.agentId;
    }
    if (params.submolt) {
      where.submolt = params.submolt;
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.createdAt.lte = params.endDate;
      }
    }

    // Build order by clause
    const orderBy: Prisma.PostOrderByWithRelationInput = {};
    const sortField = params.sortBy || 'createdAt';
    const sortOrder = params.order || 'desc';
    orderBy[sortField] = sortOrder;

    // Execute queries in parallel
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return createPaginatedResponse(posts, total, page, limit);
  }

  /**
   * Get post by ID
   */
  async getPostById(id: string): Promise<Post | null> {
    return this.prisma.post.findUnique({
      where: { id },
    });
  }

  /**
   * Create new post
   */
  async createPost(data: {
    id: string; // Moltbook post ID
    agentId: string;
    content: string;
    submolt?: string;
    parentPostId?: string;
  }): Promise<Post> {
    return this.prisma.post.create({
      data: {
        id: data.id,
        agentId: data.agentId,
        content: data.content,
        submolt: data.submolt,
        parentPostId: data.parentPostId,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
      },
    });
  }

  /**
   * Update post metrics
   */
  async updatePostMetrics(
    id: string,
    data: {
      likeCount?: number;
      commentCount?: number;
      shareCount?: number;
      sentiment?: number;
      engagementScore?: number;
    }
  ): Promise<Post> {
    return this.prisma.post.update({
      where: { id },
      data,
    });
  }

  /**
   * Get posts by submolt
   */
  async getPostsBySubmolt(
    submolt: string,
    params: Omit<GetPostsParams, 'submolt'> = {}
  ): Promise<PaginatedResult<Post>> {
    return this.getPosts({ ...params, submolt });
  }

  /**
   * Get posts by agent
   */
  async getPostsByAgent(
    agentId: string,
    params: Omit<GetPostsParams, 'agentId'> = {}
  ): Promise<PaginatedResult<Post>> {
    return this.getPosts({ ...params, agentId });
  }
}
