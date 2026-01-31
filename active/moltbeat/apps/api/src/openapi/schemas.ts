import { z } from 'zod';

/**
 * Enhanced OpenAPI schemas with examples and descriptions
 */

// Query schemas
export const AgentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ERROR']).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const PostsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  agentId: z.string().optional(),
  submolt: z.string().optional(),
  sortBy: z.enum(['createdAt', 'sentiment', 'engagementScore']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const MetricsQuerySchema = z.object({
  agentId: z.string().optional(),
  type: z.enum(['SENTIMENT', 'ENGAGEMENT', 'ACTIVITY', 'ERROR_RATE', 'RESPONSE_TIME', 'API_CALLS', 'CUSTOM']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const AlertsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  agentId: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  read: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'severity']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// Agent schemas
export const AgentSchema = z.object({
  id: z.string().describe('Unique agent identifier'),
  name: z.string().describe('Agent display name'),
  personality: z.string().optional().describe('Agent personality description'),
  submolts: z.array(z.string()).describe('Subscribed submolt communities'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ERROR']).describe('Current agent status'),
  lastActive: z.string().optional().describe('Last activity timestamp (ISO 8601)'),
  totalPosts: z.number().describe('Total number of posts created'),
  avgSentiment: z.number().optional().describe('Average sentiment score (-1 to 1)'),
  avgEngagement: z.number().optional().describe('Average engagement score'),
  errorCount: z.number().describe('Number of errors encountered'),
  createdAt: z.string().describe('Creation timestamp (ISO 8601)'),
  updatedAt: z.string().describe('Last update timestamp (ISO 8601)'),
});

export const CreateAgentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(100).describe('Agent name (1-100 characters)'),
  personality: z.string().max(500).optional().describe('Personality description (max 500 chars)'),
  submolts: z.array(z.string()).optional().describe('Initial submolt subscriptions'),
});

export const UpdateAgentSchema = z.object({
  personality: z.string().max(500).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

// Post schemas
export const PostSchema = z.object({
  id: z.string().describe('Unique post identifier'),
  agentId: z.string().describe('ID of the agent that created this post'),
  content: z.string().describe('Post content'),
  submolt: z.string().optional().describe('Submolt where posted'),
  sentiment: z.number().optional().describe('Sentiment score (-1 to 1)'),
  engagementScore: z.number().optional().describe('Engagement score'),
  likeCount: z.number().describe('Number of likes'),
  commentCount: z.number().describe('Number of comments'),
  shareCount: z.number().describe('Number of shares'),
  createdAt: z.string().describe('Creation timestamp (ISO 8601)'),
});

export const CreatePostSchema = z.object({
  id: z.string().optional(),
  agentId: z.string(),
  content: z.string().min(1).max(5000).describe('Post content (1-5000 characters)'),
  submolt: z.string().optional().describe('Target submolt community'),
});

// Metric schemas
export const MetricSchema = z.object({
  id: z.string().describe('Unique metric identifier'),
  agentId: z.string().optional().describe('Related agent ID'),
  type: z.enum(['SENTIMENT', 'ENGAGEMENT', 'ACTIVITY', 'ERROR_RATE', 'RESPONSE_TIME', 'API_CALLS', 'CUSTOM'])
    .describe('Metric type'),
  value: z.number().describe('Metric value'),
  metadata: z.record(z.any()).optional().describe('Additional metric metadata'),
  timestamp: z.string().describe('Metric timestamp (ISO 8601)'),
});

export const CreateMetricSchema = z.object({
  agentId: z.string().optional(),
  type: z.enum(['SENTIMENT', 'ENGAGEMENT', 'ACTIVITY', 'ERROR_RATE', 'RESPONSE_TIME', 'API_CALLS', 'CUSTOM']),
  value: z.number(),
  metadata: z.record(z.any()).optional(),
});

// Alert schemas
export const AlertSchema = z.object({
  id: z.string().describe('Unique alert identifier'),
  agentId: z.string().optional().describe('Related agent ID'),
  type: z.enum(['SENTIMENT_DROP', 'LOW_ENGAGEMENT', 'AGENT_ERROR', 'RATE_LIMIT', 'CUSTOM'])
    .describe('Alert type'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).describe('Alert severity'),
  message: z.string().describe('Alert message'),
  metadata: z.record(z.any()).optional().describe('Additional alert metadata'),
  read: z.boolean().describe('Whether alert has been read'),
  createdAt: z.string().describe('Creation timestamp (ISO 8601)'),
});

export const CreateAlertSchema = z.object({
  agentId: z.string().optional(),
  type: z.enum(['SENTIMENT_DROP', 'LOW_ENGAGEMENT', 'AGENT_ERROR', 'RATE_LIMIT', 'CUSTOM']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  message: z.string().min(1).max(1000),
  metadata: z.record(z.any()).optional(),
});

// Auth schemas
export const LoginSchema = z.object({
  email: z.string().email().describe('User email address'),
  password: z.string().min(8).describe('User password (min 8 characters)'),
});

export const RegisterSchema = z.object({
  email: z.string().email().describe('User email address'),
  password: z.string().min(8).describe('User password (min 8 characters)'),
  name: z.string().min(1).max(100).describe('Full name'),
});

export const TokenResponseSchema = z.object({
  accessToken: z.string().describe('JWT access token'),
  refreshToken: z.string().describe('JWT refresh token'),
  expiresIn: z.number().describe('Token expiration time in seconds'),
});

// Error schema
export const ErrorSchema = z.object({
  success: z.boolean().default(false),
  error: z.object({
    code: z.string().describe('Error code (e.g., AUTH_001, VALID_001)'),
    message: z.string().describe('Human-readable error message'),
    details: z.any().optional().describe('Additional error details'),
  }),
  timestamp: z.string().describe('Error timestamp (ISO 8601)'),
});

// Success response wrapper
export function successResponse<T>(dataSchema: z.ZodType<T>) {
  return z.object({
    success: z.boolean().default(true),
    data: dataSchema,
    timestamp: z.string().describe('Response timestamp (ISO 8601)'),
  });
}

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1).describe('Page number (1-indexed)'),
  limit: z.number().int().min(1).max(100).default(25).describe('Items per page (max 100)'),
  total: z.number().int().describe('Total number of items'),
  pages: z.number().int().describe('Total number of pages'),
});

// Response list wrappers
export const AgentListResponseSchema = z.object({
  data: z.array(AgentSchema),
  pagination: PaginationSchema,
});

export const PostListResponseSchema = z.object({
  data: z.array(PostSchema),
  pagination: PaginationSchema,
});

export const AlertListResponseSchema = z.object({
  data: z.array(AlertSchema),
  pagination: PaginationSchema,
});

// Health schemas
export const HealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  timestamp: z.string(),
  uptime: z.number(),
});

export const DetailedHealthResponseSchema = HealthResponseSchema.extend({
  checks: z.object({
    database: z.object({
      status: z.enum(['ok', 'down']),
      latency: z.number().optional(),
    }),
    cache: z.object({
      status: z.enum(['ok', 'down']),
      latency: z.number().optional(),
    }),
  }),
});
