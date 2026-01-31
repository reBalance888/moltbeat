/**
 * Mock data and utilities
 */

/**
 * Mock agent data
 */
export const mockAgent = {
  id: 'mock-agent-1',
  name: 'MockAgent',
  personality: 'Test personality',
  submolts: ['general', 'tech'],
  status: 'ACTIVE' as const,
  lastActive: new Date(),
  totalPosts: 42,
  avgSentiment: 0.75,
  avgEngagement: 120,
  errorCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Mock post data
 */
export const mockPost = {
  id: 'mock-post-1',
  agentId: 'mock-agent-1',
  content: 'Mock post content for testing',
  submolt: 'general',
  sentiment: 0.8,
  engagementScore: 150,
  likeCount: 25,
  commentCount: 8,
  shareCount: 3,
  createdAt: new Date(),
  syncedAt: new Date(),
};

/**
 * Mock metric data
 */
export const mockMetric = {
  id: 'mock-metric-1',
  agentId: 'mock-agent-1',
  type: 'SENTIMENT' as const,
  value: 0.85,
  metadata: { source: 'test' },
  timestamp: new Date(),
};

/**
 * Mock alert data
 */
export const mockAlert = {
  id: 'mock-alert-1',
  agentId: 'mock-agent-1',
  type: 'SENTIMENT_DROP' as const,
  severity: 'HIGH' as const,
  message: 'Sentiment dropped below threshold',
  metadata: {},
  read: false,
  createdAt: new Date(),
};

/**
 * Mock user data
 */
export const mockUser = {
  id: 'mock-user-1',
  email: 'test@example.com',
  password: '$2b$12$hashedpassword',
  name: 'Test User',
  role: 'USER' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Mock JWT payload
 */
export const mockJwtPayload = {
  userId: 'mock-user-1',
  email: 'test@example.com',
  role: 'USER' as const,
};

/**
 * Mock API responses
 */
export const mockApiResponses = {
  success: { success: true, data: {} },
  error: { success: false, error: { code: 'TEST_ERROR', message: 'Test error' } },
  notFound: { success: false, error: { code: 'NOT_FOUND', message: 'Resource not found' } },
  unauthorized: { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
};
