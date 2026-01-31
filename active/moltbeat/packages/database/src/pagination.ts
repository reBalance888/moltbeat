/**
 * Cursor-based Pagination
 * Efficient pagination for large datasets using cursor-based approach
 */

import { Prisma } from '@prisma/client';

export interface CursorPaginationParams {
  /**
   * Cursor for next page (usually the ID of the last item)
   */
  cursor?: string;

  /**
   * Number of items per page
   */
  limit?: number;

  /**
   * Sort direction
   */
  direction?: 'forward' | 'backward';

  /**
   * Sort field (defaults to 'id')
   */
  sortBy?: string;

  /**
   * Sort order
   */
  order?: 'asc' | 'desc';
}

export interface CursorPaginationResult<T> {
  /**
   * Page data
   */
  data: T[];

  /**
   * Pagination metadata
   */
  pageInfo: {
    /**
     * Cursor for the next page
     */
    nextCursor: string | null;

    /**
     * Cursor for the previous page
     */
    prevCursor: string | null;

    /**
     * Whether there is a next page
     */
    hasNextPage: boolean;

    /**
     * Whether there is a previous page
     */
    hasPreviousPage: boolean;

    /**
     * Total count (optional, expensive operation)
     */
    totalCount?: number;
  };
}

export interface OffsetPaginationParams {
  /**
   * Page number (1-indexed)
   */
  page?: number;

  /**
   * Items per page
   */
  limit?: number;

  /**
   * Sort field
   */
  sortBy?: string;

  /**
   * Sort order
   */
  order?: 'asc' | 'desc';
}

export interface OffsetPaginationResult<T> {
  /**
   * Page data
   */
  data: T[];

  /**
   * Pagination metadata
   */
  pagination: {
    /**
     * Current page number
     */
    page: number;

    /**
     * Items per page
     */
    limit: number;

    /**
     * Total number of items
     */
    total: number;

    /**
     * Total number of pages
     */
    totalPages: number;

    /**
     * Whether there is a next page
     */
    hasNextPage: boolean;

    /**
     * Whether there is a previous page
     */
    hasPreviousPage: boolean;
  };
}

/**
 * Default pagination limits
 */
export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;
export const MIN_LIMIT = 1;

/**
 * Normalize limit to be within bounds
 */
export function normalizeLimit(limit?: number): number {
  if (!limit) return DEFAULT_LIMIT;
  return Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, limit));
}

/**
 * Build cursor-based pagination query
 */
export function buildCursorQuery<T extends { id: string }>(
  params: CursorPaginationParams
): {
  cursor?: { id: string };
  take: number;
  skip?: number;
  orderBy: Record<string, 'asc' | 'desc'>;
} {
  const {
    cursor,
    limit = DEFAULT_LIMIT,
    direction = 'forward',
    sortBy = 'createdAt',
    order = 'desc',
  } = params;

  const normalizedLimit = normalizeLimit(limit);

  const query: any = {
    take: direction === 'backward' ? -normalizedLimit : normalizedLimit,
    orderBy: { [sortBy]: order },
  };

  if (cursor) {
    query.cursor = { id: cursor };
    query.skip = 1; // Skip the cursor itself
  }

  return query;
}

/**
 * Build offset-based pagination query
 */
export function buildOffsetQuery(
  params: OffsetPaginationParams
): {
  skip: number;
  take: number;
  orderBy: Record<string, 'asc' | 'desc'>;
} {
  const {
    page = 1,
    limit = DEFAULT_LIMIT,
    sortBy = 'createdAt',
    order = 'desc',
  } = params;

  const normalizedLimit = normalizeLimit(limit);
  const normalizedPage = Math.max(1, page);

  return {
    skip: (normalizedPage - 1) * normalizedLimit,
    take: normalizedLimit,
    orderBy: { [sortBy]: order },
  };
}

/**
 * Format cursor pagination result
 */
export function formatCursorResult<T extends { id: string }>(
  data: T[],
  params: CursorPaginationParams,
  totalCount?: number
): CursorPaginationResult<T> {
  const { limit = DEFAULT_LIMIT, direction = 'forward' } = params;
  const normalizedLimit = normalizeLimit(limit);

  const hasMore = data.length > normalizedLimit;
  const items = hasMore ? data.slice(0, normalizedLimit) : data;

  const nextCursor = items.length > 0 ? items[items.length - 1].id : null;
  const prevCursor = items.length > 0 ? items[0].id : null;

  return {
    data: items,
    pageInfo: {
      nextCursor: direction === 'forward' && hasMore ? nextCursor : null,
      prevCursor: direction === 'backward' && hasMore ? prevCursor : null,
      hasNextPage: direction === 'forward' && hasMore,
      hasPreviousPage: direction === 'backward' && hasMore,
      totalCount,
    },
  };
}

/**
 * Format offset pagination result
 */
export function formatOffsetResult<T>(
  data: T[],
  total: number,
  params: OffsetPaginationParams
): OffsetPaginationResult<T> {
  const { page = 1, limit = DEFAULT_LIMIT } = params;
  const normalizedLimit = normalizeLimit(limit);
  const normalizedPage = Math.max(1, page);
  const totalPages = Math.ceil(total / normalizedLimit);

  return {
    data,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      totalPages,
      hasNextPage: normalizedPage < totalPages,
      hasPreviousPage: normalizedPage > 1,
    },
  };
}

/**
 * Paginate with cursor
 * Generic cursor-based pagination helper
 */
export async function paginateWithCursor<T extends { id: string }>(
  findMany: (args: any) => Promise<T[]>,
  params: CursorPaginationParams,
  where?: any,
  includeCount = false
): Promise<CursorPaginationResult<T>> {
  const query = buildCursorQuery(params);

  // Fetch one extra item to determine if there's a next page
  const take = query.take > 0 ? query.take + 1 : query.take - 1;

  const data = await findMany({
    ...query,
    take,
    where,
  });

  let totalCount: number | undefined;
  if (includeCount && typeof findMany === 'function') {
    // This requires passing a count function separately
    // For now, we'll leave it undefined
    totalCount = undefined;
  }

  return formatCursorResult(data, params, totalCount);
}

/**
 * Paginate with offset
 * Generic offset-based pagination helper
 */
export async function paginateWithOffset<T>(
  findMany: (args: any) => Promise<T[]>,
  count: (args: any) => Promise<number>,
  params: OffsetPaginationParams,
  where?: any
): Promise<OffsetPaginationResult<T>> {
  const query = buildOffsetQuery(params);

  const [data, total] = await Promise.all([
    findMany({ ...query, where }),
    count({ where }),
  ]);

  return formatOffsetResult(data, total, params);
}

/**
 * Convert cursor pagination params to GraphQL Relay-style format
 */
export interface RelayPaginationParams {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

export function convertRelayParams(params: RelayPaginationParams): CursorPaginationParams {
  if (params.first !== undefined) {
    return {
      cursor: params.after,
      limit: params.first,
      direction: 'forward',
    };
  }

  if (params.last !== undefined) {
    return {
      cursor: params.before,
      limit: params.last,
      direction: 'backward',
    };
  }

  return {
    limit: DEFAULT_LIMIT,
    direction: 'forward',
  };
}

/**
 * Encode cursor (base64 encoding of ID)
 */
export function encodeCursor(id: string): string {
  return Buffer.from(id).toString('base64');
}

/**
 * Decode cursor
 */
export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64').toString('utf-8');
}

/**
 * Type-safe pagination helpers for common models
 */

export type PaginationMode = 'cursor' | 'offset';

export interface PaginationConfig {
  mode: PaginationMode;
  defaultLimit: number;
  maxLimit: number;
}

export const DEFAULT_PAGINATION_CONFIG: PaginationConfig = {
  mode: 'cursor',
  defaultLimit: DEFAULT_LIMIT,
  maxLimit: MAX_LIMIT,
};
