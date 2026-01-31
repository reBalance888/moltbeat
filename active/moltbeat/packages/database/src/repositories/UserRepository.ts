import { PrismaClient, User, UserRole, Prisma } from '@prisma/client';
import { NotFoundError } from '@moltbeat/errors';

/**
 * User repository with parameterized queries (P0-011 SQL injection prevention)
 */
export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new user
   */
  async create(data: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase().trim(),
        password: data.password,
        name: data.name,
        role: data.role || 'USER',
      },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by ID or throw NotFoundError
   */
  async findByIdOrThrow(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * Update user
   */
  async update(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * List users with pagination
   */
  async list(params: {
    page?: number;
    limit?: number;
    role?: UserRole;
  } = {}): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 20, role } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = role ? { role } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email: email.toLowerCase().trim() },
    });
    return count > 0;
  }
}
