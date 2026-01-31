/**
 * Database Connection Pool Management
 * Optimized Prisma connection pooling configuration
 */

import { Prisma, PrismaClient } from '@prisma/client';

export interface PoolConfig {
  connectionLimit?: number;
  poolTimeout?: number;
  enableLogging?: boolean;
  statementTimeout?: number;
}

export const DEFAULT_POOL_CONFIG: Required<PoolConfig> = {
  connectionLimit: 10,
  poolTimeout: 30,
  enableLogging: false,
  statementTimeout: 60000,
};

export function buildDatasourceUrl(baseUrl: string, config: PoolConfig = {}): string {
  const finalConfig = { ...DEFAULT_POOL_CONFIG, ...config };
  const url = new URL(baseUrl);

  url.searchParams.set('connection_limit', finalConfig.connectionLimit.toString());
  url.searchParams.set('pool_timeout', finalConfig.poolTimeout.toString());

  if (finalConfig.statementTimeout) {
    url.searchParams.set('statement_timeout', `${finalConfig.statementTimeout}ms`);
  }

  if (process.env.NODE_ENV === 'production' && !url.searchParams.has('sslmode')) {
    url.searchParams.set('sslmode', 'require');
  }

  return url.toString();
}

export async function getPoolStats(client: PrismaClient): Promise<{
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
}> {
  try {
    const result = await client.$queryRaw<Array<{
      state: string;
      count: bigint;
    }>>`
      SELECT state, count(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
      GROUP BY state
    `;

    const active = result.find(r => r.state === 'active')?.count || BigInt(0);
    const idle = result.find(r => r.state === 'idle')?.count || BigInt(0);

    return {
      activeConnections: Number(active),
      idleConnections: Number(idle),
      waitingConnections: 0,
    };
  } catch {
    return { activeConnections: 0, idleConnections: 0, waitingConnections: 0 };
  }
}

export async function monitorPoolHealth(
  client: PrismaClient,
  warningThreshold: number = 0.8
): Promise<{ healthy: boolean; usage: number; warning?: string }> {
  const stats = await getPoolStats(client);
  const connectionLimit = DEFAULT_POOL_CONFIG.connectionLimit;

  const totalConnections = stats.activeConnections + stats.idleConnections;
  const usage = totalConnections / connectionLimit;

  if (usage >= 1.0) {
    return { healthy: false, usage, warning: 'Connection pool exhausted' };
  }

  if (usage >= warningThreshold) {
    return { healthy: true, usage, warning: `Pool usage above ${warningThreshold * 100}%` };
  }

  return { healthy: true, usage };
}
