import { prisma } from '@moltbeat/database';
import { cache } from '@moltbeat/cache';
import { logger } from '@moltbeat/logger';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

export interface HealthCheckResult {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: HealthStatus; latency?: number; error?: string };
    cache: { status: HealthStatus; latency?: number; error?: string };
  };
}

export class HealthChecker {
  private startTime = Date.now();

  /**
   * Simple liveness check - is the service running?
   */
  async checkLiveness(): Promise<{ status: 'ok'; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Readiness check - can the service handle requests?
   */
  async checkReadiness(): Promise<HealthCheckResult> {
    const [dbCheck, cacheCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
    ]);

    const overallStatus = this.determineOverallStatus([
      dbCheck.status,
      cacheCheck.status,
    ]);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks: {
        database: dbCheck,
        cache: cacheCheck,
      },
    };
  }

  /**
   * Detailed health check with all components
   */
  async checkDetailed(): Promise<HealthCheckResult & { version: string; environment: string }> {
    const readiness = await this.checkReadiness();

    return {
      ...readiness,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<{
    status: HealthStatus;
    latency?: number;
    error?: string;
  }> {
    const start = Date.now();

    try {
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      return {
        status: latency < 100 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        latency,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Database health check failed');

      return {
        status: HealthStatus.UNHEALTHY,
        error: error.message,
      };
    }
  }

  /**
   * Check cache (Redis) connectivity
   */
  private async checkCache(): Promise<{
    status: HealthStatus;
    latency?: number;
    error?: string;
  }> {
    const start = Date.now();

    try {
      const testKey = 'health:check';
      await cache.set(testKey, 'ok', 10);
      const value = await cache.get(testKey);
      await cache.delete(testKey);

      if (value !== 'ok') {
        throw new Error('Cache value mismatch');
      }

      const latency = Date.now() - start;

      return {
        status: latency < 50 ? HealthStatus.HEALTHY : HealthStatus.DEGRADED,
        latency,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, 'Cache health check failed');

      return {
        status: HealthStatus.UNHEALTHY,
        error: error.message,
      };
    }
  }

  /**
   * Determine overall status from component statuses
   */
  private determineOverallStatus(statuses: HealthStatus[]): HealthStatus {
    if (statuses.includes(HealthStatus.UNHEALTHY)) {
      return HealthStatus.UNHEALTHY;
    }

    if (statuses.includes(HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }

    return HealthStatus.HEALTHY;
  }
}
