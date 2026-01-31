/**
 * Alert Repository
 * Database operations for alerts with pagination and filtering
 */

import { PrismaClient, Alert, Prisma } from '@prisma/client';
import {
  validatePaginationParams,
  createPaginatedResponse,
  calculateOffset,
  type PaginatedResult,
} from '../utils/pagination';

import { AlertType, AlertSeverity } from '@prisma/client';

export interface GetAlertsParams {
  page?: number;
  limit?: number;
  agentId?: string;
  type?: AlertType;
  severity?: AlertSeverity;
  read?: boolean;
  sortBy?: 'createdAt' | 'severity';
  order?: 'asc' | 'desc';
}

export class AlertRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get paginated list of alerts
   */
  async getAlerts(params: GetAlertsParams = {}): Promise<PaginatedResult<Alert>> {
    const { page, limit } = validatePaginationParams(params);
    const offset = calculateOffset(page, limit);

    // Build where clause
    const where: Prisma.AlertWhereInput = {};
    if (params.agentId) {
      where.agentId = params.agentId;
    }
    if (params.type) {
      where.type = params.type;
    }
    if (params.severity) {
      where.severity = params.severity;
    }
    if (params.read !== undefined) {
      where.read = params.read;
    }

    // Build order by clause
    const orderBy: Prisma.AlertOrderByWithRelationInput = {};
    const sortField = params.sortBy || 'createdAt';
    const sortOrder = params.order || 'desc';
    orderBy[sortField] = sortOrder;

    // Execute queries in parallel
    const [alerts, total] = await Promise.all([
      this.prisma.alert.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
      this.prisma.alert.count({ where }),
    ]);

    return createPaginatedResponse(alerts, total, page, limit);
  }

  /**
   * Get alert by ID
   */
  async getAlertById(id: string): Promise<Alert | null> {
    return this.prisma.alert.findUnique({
      where: { id },
    });
  }

  /**
   * Create new alert
   */
  async createAlert(data: {
    agentId?: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    metadata?: any;
  }): Promise<Alert> {
    return this.prisma.alert.create({
      data: {
        agentId: data.agentId,
        type: data.type,
        severity: data.severity,
        message: data.message,
        metadata: data.metadata,
        read: false,
      },
    });
  }

  /**
   * Mark alert as read
   */
  async markAsRead(id: string): Promise<Alert> {
    return this.prisma.alert.update({
      where: { id },
      data: { read: true },
    });
  }

  /**
   * Mark multiple alerts as read
   */
  async markManyAsRead(ids: string[]): Promise<number> {
    const result = await this.prisma.alert.updateMany({
      where: { id: { in: ids } },
      data: { read: true },
    });
    return result.count;
  }

  /**
   * Delete alert
   */
  async deleteAlert(id: string): Promise<void> {
    await this.prisma.alert.delete({
      where: { id },
    });
  }

  /**
   * Get unread count
   */
  async getUnreadCount(agentId?: string): Promise<number> {
    const where: Prisma.AlertWhereInput = { read: false };
    if (agentId) {
      where.agentId = agentId;
    }
    return this.prisma.alert.count({ where });
  }
}
