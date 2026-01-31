/**
 * Analytics Routes Tests
 * Tests for all 6 analytics endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Hono } from 'hono';
import { prisma } from '@moltbeat/database';
import analyticsRoutes from '../analytics';
import { createTestAgent, createTestPost, setupTests, cleanupTests } from '@moltbeat/testing';

describe('Analytics Routes', () => {
  let app: Hono;

  beforeEach(async () => {
    app = new Hono();
    app.route('/api/analytics', analyticsRoutes);
    await setupTests();
  });

  afterEach(async () => {
    await cleanupTests();
  });

  describe('GET /api/analytics/overview', () => {
    it('should return dashboard overview stats', async () => {
      // Create test data
      const agent = await createTestAgent({ name: 'TestBot', status: 'ACTIVE' });
      await createTestPost(agent.id, { sentiment: 0.8, engagementScore: 150 });

      const res = await app.request('/api/analytics/overview');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty('agents');
      expect(data).toHaveProperty('posts');
      expect(data).toHaveProperty('metrics');
      expect(data).toHaveProperty('alerts');
      expect(data.agents.total).toBeGreaterThanOrEqual(1);
      expect(data.agents.active).toBeGreaterThanOrEqual(1);
    });

    it('should include 24h change metrics', async () => {
      const res = await app.request('/api/analytics/overview');
      const data = await res.json();

      expect(data.agents).toHaveProperty('change24h');
      expect(data.posts).toHaveProperty('change24h');
      expect(typeof data.agents.change24h).toBe('number');
    });

    it('should calculate average sentiment and engagement', async () => {
      const agent = await createTestAgent();
      await createTestPost(agent.id, { sentiment: 0.8 });
      await createTestPost(agent.id, { sentiment: 0.6 });

      const res = await app.request('/api/analytics/overview');
      const data = await res.json();

      expect(data.metrics.avgSentiment).toBeGreaterThan(0);
    });
  });

  describe('GET /api/analytics/timeseries', () => {
    it('should return time series data for 30 days by default', async () => {
      const res = await app.request('/api/analytics/timeseries');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(30);
      expect(data[0]).toHaveProperty('date');
      expect(data[0]).toHaveProperty('posts');
      expect(data[0]).toHaveProperty('avgSentiment');
      expect(data[0]).toHaveProperty('avgEngagement');
    });

    it('should accept custom days parameter', async () => {
      const res = await app.request('/api/analytics/timeseries?days=7');
      const data = await res.json();

      expect(data.length).toBe(7);
    });

    it('should return 400 for invalid days parameter', async () => {
      const res = await app.request('/api/analytics/timeseries?days=999');

      expect(res.status).toBe(400);
    });

    it('should aggregate posts by date correctly', async () => {
      const agent = await createTestAgent();
      await createTestPost(agent.id, { sentiment: 0.5, engagementScore: 100 });

      const res = await app.request('/api/analytics/timeseries?days=7');
      const data = await res.json();

      const today = data[data.length - 1];
      expect(today.posts).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/analytics/sentiment-distribution', () => {
    it('should return sentiment distribution', async () => {
      const agent = await createTestAgent();
      await createTestPost(agent.id, { sentiment: 0.8 }); // Positive
      await createTestPost(agent.id, { sentiment: 0.2 }); // Neutral
      await createTestPost(agent.id, { sentiment: -0.7 }); // Negative

      const res = await app.request('/api/analytics/sentiment-distribution');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(3);

      const positive = data.find((item: any) => item.name === 'Positive');
      const neutral = data.find((item: any) => item.name === 'Neutral');
      const negative = data.find((item: any) => item.name === 'Negative');

      expect(positive).toBeDefined();
      expect(neutral).toBeDefined();
      expect(negative).toBeDefined();
      expect(positive.value).toBeGreaterThanOrEqual(1);
    });

    it('should include color codes for chart rendering', async () => {
      const res = await app.request('/api/analytics/sentiment-distribution');
      const data = await res.json();

      data.forEach((item: any) => {
        expect(item).toHaveProperty('color');
        expect(item.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('GET /api/analytics/top-agents', () => {
    it('should return top agents by karma', async () => {
      const agent1 = await createTestAgent({ name: 'TopBot' });
      const agent2 = await createTestAgent({ name: 'MediumBot' });

      await createTestPost(agent1.id, { likeCount: 100, commentCount: 50 });
      await createTestPost(agent2.id, { likeCount: 10, commentCount: 5 });

      const res = await app.request('/api/analytics/top-agents?limit=10');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);

      // First agent should have higher karma
      expect(data[0].karma).toBeGreaterThan(data[1].karma);
      expect(data[0]).toHaveProperty('id');
      expect(data[0]).toHaveProperty('name');
      expect(data[0]).toHaveProperty('postsCount');
    });

    it('should respect limit parameter', async () => {
      const res = await app.request('/api/analytics/top-agents?limit=5');
      const data = await res.json();

      expect(data.length).toBeLessThanOrEqual(5);
    });

    it('should calculate karma as likes + comments', async () => {
      const agent = await createTestAgent();
      await createTestPost(agent.id, { likeCount: 50, commentCount: 30 });

      const res = await app.request('/api/analytics/top-agents');
      const data = await res.json();

      const testAgent = data.find((a: any) => a.id === agent.id);
      expect(testAgent.karma).toBe(80); // 50 + 30
    });
  });

  describe('GET /api/analytics/top-submolts', () => {
    it('should return top submolts by post count', async () => {
      const agent = await createTestAgent();
      await createTestPost(agent.id, { submolt: 'tech' });
      await createTestPost(agent.id, { submolt: 'tech' });
      await createTestPost(agent.id, { submolt: 'ai' });

      const res = await app.request('/api/analytics/top-submolts?limit=10');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);

      const tech = data.find((s: any) => s.name === 'tech');
      expect(tech).toBeDefined();
      expect(tech.count).toBe(2);
    });

    it('should sort by count descending', async () => {
      const agent = await createTestAgent();
      await createTestPost(agent.id, { submolt: 'popular' });
      await createTestPost(agent.id, { submolt: 'popular' });
      await createTestPost(agent.id, { submolt: 'less-popular' });

      const res = await app.request('/api/analytics/top-submolts');
      const data = await res.json();

      if (data.length >= 2) {
        expect(data[0].count).toBeGreaterThanOrEqual(data[1].count);
      }
    });
  });

  describe('GET /api/analytics/agent/:id/stats', () => {
    it('should return detailed agent statistics', async () => {
      const agent = await createTestAgent({ name: 'DetailBot' });
      await createTestPost(agent.id, {
        likeCount: 50,
        commentCount: 25,
        sentiment: 0.7,
        engagementScore: 200,
        submolt: 'tech',
      });

      const res = await app.request(`/api/analytics/agent/${agent.id}/stats`);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveProperty('totalPosts');
      expect(data).toHaveProperty('totalKarma');
      expect(data).toHaveProperty('avgSentiment');
      expect(data).toHaveProperty('avgEngagement');
      expect(data).toHaveProperty('topSubmolts');
      expect(data).toHaveProperty('recentActivity');

      expect(data.totalPosts).toBe(1);
      expect(data.totalKarma).toBe(75); // 50 + 25
    });

    it('should return 404 for non-existent agent', async () => {
      const res = await app.request('/api/analytics/agent/non-existent-id/stats');

      expect(res.status).toBe(404);
    });

    it('should include top 5 submolts', async () => {
      const agent = await createTestAgent();
      await createTestPost(agent.id, { submolt: 'tech' });
      await createTestPost(agent.id, { submolt: 'tech' });
      await createTestPost(agent.id, { submolt: 'ai' });

      const res = await app.request(`/api/analytics/agent/${agent.id}/stats`);
      const data = await res.json();

      expect(Array.isArray(data.topSubmolts)).toBe(true);
      expect(data.topSubmolts.length).toBeLessThanOrEqual(5);
      expect(data.topSubmolts[0].submolt).toBe('tech');
      expect(data.topSubmolts[0].count).toBe(2);
    });

    it('should include 7 days of recent activity', async () => {
      const agent = await createTestAgent();
      await createTestPost(agent.id);

      const res = await app.request(`/api/analytics/agent/${agent.id}/stats`);
      const data = await res.json();

      expect(Array.isArray(data.recentActivity)).toBe(true);
      expect(data.recentActivity.length).toBe(7);

      data.recentActivity.forEach((day: any) => {
        expect(day).toHaveProperty('date');
        expect(day).toHaveProperty('posts');
        expect(typeof day.posts).toBe('number');
      });
    });

    it('should calculate averages correctly', async () => {
      const agent = await createTestAgent();
      await createTestPost(agent.id, { sentiment: 0.8, engagementScore: 100 });
      await createTestPost(agent.id, { sentiment: 0.6, engagementScore: 200 });

      const res = await app.request(`/api/analytics/agent/${agent.id}/stats`);
      const data = await res.json();

      expect(data.avgSentiment).toBeCloseTo(0.7, 1);
      expect(data.avgEngagement).toBe(150);
    });
  });

  describe('Error handling', () => {
    it('should return 500 on database error', async () => {
      // Mock database error
      jest.spyOn(prisma.agent, 'count').mockRejectedValueOnce(new Error('DB Error'));

      const res = await app.request('/api/analytics/overview');
      const data = await res.json();

      expect(res.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_001');
    });

    it('should handle empty database gracefully', async () => {
      await cleanupTests(); // Clear all data

      const res = await app.request('/api/analytics/overview');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.agents.total).toBe(0);
      expect(data.posts.total).toBe(0);
    });
  });
});
