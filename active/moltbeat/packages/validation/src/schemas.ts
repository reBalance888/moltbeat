import { z } from 'zod';

/**
 * Common validation schemas
 */

// UUID v4 validation
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Agent ID (alphanumeric, 3-50 chars)
export const agentIdSchema = z
  .string()
  .min(3, 'Agent ID must be at least 3 characters')
  .max(50, 'Agent ID must not exceed 50 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Agent ID can only contain alphanumeric characters, hyphens, and underscores');

// Agent status enum
export const agentStatusSchema = z.enum(['active', 'inactive', 'suspended', 'error']);

// Post content (max 10000 chars)
export const postContentSchema = z
  .string()
  .min(1, 'Post content cannot be empty')
  .max(10000, 'Post content must not exceed 10000 characters');

// Submolt name (lowercase, 3-30 chars)
export const submoltSchema = z
  .string()
  .min(3, 'Submolt must be at least 3 characters')
  .max(30, 'Submolt must not exceed 30 characters')
  .regex(/^[a-z0-9_-]+$/, 'Submolt must be lowercase alphanumeric with hyphens or underscores');

// Sentiment score (-1 to 1)
export const sentimentScoreSchema = z
  .number()
  .min(-1, 'Sentiment score must be between -1 and 1')
  .max(1, 'Sentiment score must be between -1 and 1');

// Pagination parameters
export const paginationSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1, 'Page must be >= 1')
    .default('1'),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'Limit must be between 1 and 100')
    .default('20'),
});

// Date range validation
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  },
  { message: 'Start date must be before end date' }
);

/**
 * Agent schemas
 */

export const createAgentSchema = z.object({
  agentId: agentIdSchema,
  name: z.string().min(1).max(100),
  personality: z.string().max(500).optional(),
  submolts: z.array(submoltSchema).max(10).optional(),
  postingSchedule: z.string().optional(),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  personality: z.string().max(500).optional(),
  submolts: z.array(submoltSchema).max(10).optional(),
  status: agentStatusSchema.optional(),
  postingSchedule: z.string().optional(),
});

export const agentIdParamSchema = z.object({
  agentId: agentIdSchema,
});

/**
 * Post schemas
 */

export const createPostSchema = z.object({
  content: postContentSchema,
  submolt: submoltSchema.optional(),
  parentPostId: uuidSchema.optional(),
});

export const getPostsQuerySchema = paginationSchema.extend({
  agentId: agentIdSchema.optional(),
  submolt: submoltSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'sentiment', 'engagementScore']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const postIdParamSchema = z.object({
  postId: uuidSchema,
});

/**
 * Metrics schemas
 */

export const metricsQuerySchema = z.object({
  agentId: agentIdSchema.optional(),
  type: z.enum(['sentiment', 'engagement', 'activity', 'all']).default('all'),
  period: z.enum(['hour', 'day', 'week', 'month', 'year']).default('day'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Alert schemas
 */

export const createAlertSchema = z.object({
  type: z.enum(['sentiment_drop', 'low_engagement', 'agent_error', 'rate_limit', 'custom']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string().min(1).max(500),
  agentId: agentIdSchema.optional(),
  metadata: z.record(z.any()).optional(),
});

export const getAlertsQuerySchema = paginationSchema.extend({
  agentId: agentIdSchema.optional(),
  type: z.enum(['sentiment_drop', 'low_engagement', 'agent_error', 'rate_limit', 'custom']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  read: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

/**
 * Authentication schemas
 */

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1).max(100),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

/**
 * API Key schemas
 */

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.enum(['read', 'write', 'admin'])).min(1),
  expiresAt: z.string().datetime().optional(),
});

/**
 * Type inference helpers
 */

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type GetPostsQuery = z.infer<typeof getPostsQuerySchema>;
export type MetricsQuery = z.infer<typeof metricsQuerySchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type GetAlertsQuery = z.infer<typeof getAlertsQuerySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
