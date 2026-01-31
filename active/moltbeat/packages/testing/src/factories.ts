/**
 * Test data factories
 */

import { prisma, Agent, Post, Metric, Alert, User } from '@moltbeat/database';

/**
 * Create test user
 */
export async function createTestUser(overrides: Partial<User> = {}): Promise<User> {
  return prisma.user.create({
    data: {
      email: overrides.email || `test-${Date.now()}@example.com`,
      password: overrides.password || '$2b$12$hashedpassword', // Pre-hashed
      name: overrides.name || 'Test User',
      role: overrides.role || 'USER',
    },
  });
}

/**
 * Create test agent
 */
export async function createTestAgent(overrides: Partial<Agent> = {}): Promise<Agent> {
  return prisma.agent.create({
    data: {
      id: overrides.id || `agent-${Date.now()}`,
      name: overrides.name || 'TestAgent',
      personality: overrides.personality || 'Friendly test agent',
      submolts: overrides.submolts || ['general'],
      status: overrides.status || 'ACTIVE',
      totalPosts: overrides.totalPosts || 0,
      errorCount: overrides.errorCount || 0,
    },
  });
}

/**
 * Create test post
 */
export async function createTestPost(agentId: string, overrides: Partial<Post> = {}): Promise<Post> {
  return prisma.post.create({
    data: {
      id: overrides.id || `post-${Date.now()}`,
      agentId,
      content: overrides.content || 'Test post content',
      submolt: overrides.submolt || 'general',
      sentiment: overrides.sentiment || 0.5,
      engagementScore: overrides.engagementScore || 100,
      likeCount: overrides.likeCount || 10,
      commentCount: overrides.commentCount || 5,
      shareCount: overrides.shareCount || 2,
    },
  });
}

/**
 * Create test metric
 */
export async function createTestMetric(agentId: string, overrides: Partial<Metric> = {}): Promise<Metric> {
  return prisma.metric.create({
    data: {
      agentId,
      type: overrides.type || 'SENTIMENT',
      value: overrides.value || 0.8,
      metadata: overrides.metadata || {},
    },
  });
}

/**
 * Create test alert
 */
export async function createTestAlert(agentId: string, overrides: Partial<Alert> = {}): Promise<Alert> {
  return prisma.alert.create({
    data: {
      agentId,
      type: overrides.type || 'SENTIMENT_DROP',
      severity: overrides.severity || 'MEDIUM',
      message: overrides.message || 'Test alert message',
      metadata: overrides.metadata || {},
      read: overrides.read || false,
    },
  });
}

/**
 * Create complete test scenario with agent + posts + metrics + alerts
 */
export async function createTestScenario(): Promise<{
  agent: Agent;
  posts: Post[];
  metrics: Metric[];
  alerts: Alert[];
}> {
  const agent = await createTestAgent();
  const posts = await Promise.all([
    createTestPost(agent.id, { sentiment: 0.8 }),
    createTestPost(agent.id, { sentiment: 0.6 }),
    createTestPost(agent.id, { sentiment: -0.2 }),
  ]);
  const metrics = await Promise.all([
    createTestMetric(agent.id, { type: 'SENTIMENT', value: 0.7 }),
    createTestMetric(agent.id, { type: 'ENGAGEMENT', value: 150 }),
  ]);
  const alerts = await Promise.all([
    createTestAlert(agent.id, { severity: 'HIGH' }),
  ]);

  return { agent, posts, metrics, alerts };
}
