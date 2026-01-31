/**
 * Pagination Utilities
 * Provides helpers for consistent pagination across all API endpoints
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMetadata;
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  total: number,
  page: number = 1,
  limit: number = 20
): PaginationMetadata {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  };
}

/**
 * Calculate offset for SQL queries
 */
export function calculateOffset(page: number = 1, limit: number = 20): number {
  return (page - 1) * limit;
}

/**
 * Encode cursor for cursor-based pagination
 */
export function encodeCursor(id: string, timestamp: Date): string {
  const data = JSON.stringify({ id, timestamp: timestamp.toISOString() });
  return Buffer.from(data).toString('base64url');
}

/**
 * Decode cursor for cursor-based pagination
 */
export function decodeCursor(cursor: string): { id: string; timestamp: Date } | null {
  try {
    const data = Buffer.from(cursor, 'base64url').toString('utf-8');
    const parsed = JSON.parse(data);
    return {
      id: parsed.id,
      timestamp: new Date(parsed.timestamp),
    };
  } catch {
    return null;
  }
}

/**
 * Validate pagination params
 */
export function validatePaginationParams(params: PaginationParams): {
  page: number;
  limit: number;
} {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));

  return { page, limit };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const pagination = calculatePagination(total, page, limit);

  // Add cursors if there's data
  if (data.length > 0) {
    const firstItem = data[0] as any;
    const lastItem = data[data.length - 1] as any;

    if (firstItem.id && firstItem.createdAt) {
      pagination.prevCursor = encodeCursor(firstItem.id, new Date(firstItem.createdAt));
      pagination.nextCursor = encodeCursor(lastItem.id, new Date(lastItem.createdAt));
    }
  }

  return {
    data,
    pagination,
  };
}
