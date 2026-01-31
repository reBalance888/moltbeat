/**
 * @moltbeat/database
 * Prisma database client and repositories
 */

export { prisma, disconnectDatabase } from './client';
export {
  type CursorPaginationParams,
  type CursorPaginationResult,
  type OffsetPaginationParams,
  type OffsetPaginationResult,
  type RelayPaginationParams,
  type PaginationMode,
  type PaginationConfig,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  DEFAULT_PAGINATION_CONFIG,
  normalizeLimit,
  buildCursorQuery,
  buildOffsetQuery,
  formatCursorResult,
  formatOffsetResult,
  paginateWithCursor,
  paginateWithOffset,
  convertRelayParams,
  encodeCursor,
  decodeCursor,
} from './pagination';
export {
  type PoolConfig,
  DEFAULT_POOL_CONFIG,
  buildDatasourceUrl,
  getPoolStats,
  monitorPoolHealth,
} from './pool';
export * from './utils/pagination';
export * from './repositories/UserRepository';
export * from './repositories/AgentRepository';
export * from './repositories/PostRepository';
export * from './repositories/AlertRepository';

// Re-export Prisma types for convenience
export type {
  User,
  UserRole,
  ApiKey,
  RefreshToken,
  Agent,
  AgentStatus,
  Post,
  Metric,
  MetricType,
  Alert,
  AlertType,
  AlertSeverity,
  TrendingTopic,
  AgentRelationship,
  BrandMonitoring,
  TokenTracking,
} from '@prisma/client';
