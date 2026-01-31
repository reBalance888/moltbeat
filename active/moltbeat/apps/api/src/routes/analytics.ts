/**
 * Analytics & Aggregation Routes
 * Aggregate metrics, time series, trends
 */

import { Hono } from 'hono';
import { prisma } from '@moltbeat/database';
import { z } from 'zod';

const analytics = new Hono();

/**
 * GET /api/analytics/overview
 * Dashboard overview stats
 */
analytics.get('/overview', async (c) => {
  try {
    const [agentCount, postCount, metricCount, alertCount] = await Promise.all([
      prisma.agent.count(),
      prisma.post.count(),
      prisma.metric.count(),
      prisma.alert.count({ where: { read: false } }),
    ]);

    const activeAgents = await prisma.agent.count({ where: { status: 'ACTIVE' } });

    // Calculate 24h change
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const [agentCount24h, postCount24h] = await Promise.all([
      prisma.agent.count({ where: { createdAt: { gte: yesterday } } }),
      prisma.post.count({ where: { createdAt: { gte: yesterday } } }),
    ]);

    // Average sentiment
    const sentimentMetrics = await prisma.metric.findMany({
      where: { type: 'SENTIMENT' },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    const avgSentiment = sentimentMetrics.length
      ? sentimentMetrics.reduce((sum: number, m: { value: number }) => sum + m.value, 0) / sentimentMetrics.length
      : 0;

    // Average engagement
    const engagementMetrics = await prisma.metric.findMany({
      where: { type: 'ENGAGEMENT' },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
    const avgEngagement = engagementMetrics.length
      ? engagementMetrics.reduce((sum: number, m: { value: number }) => sum + m.value, 0) / engagementMetrics.length
      : 0;

    return c.json({
      agents: {
        total: agentCount,
        active: activeAgents,
        change24h: agentCount24h,
      },
      posts: {
        total: postCount,
        change24h: postCount24h,
      },
      metrics: {
        total: metricCount,
        avgSentiment,
        avgEngagement,
      },
      alerts: {
        unread: alertCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * GET /api/analytics/timeseries
 * Time series data for charts
 */
analytics.get('/timeseries', async (c) => {
  try {
    const daysParam = c.req.query('days') || '30';
    const days = parseInt(daysParam, 10);

    if (isNaN(days) || days < 1 || days > 365) {
      return c.json({ error: { code: 'VALID_001', message: 'Invalid days parameter', timestamp: new Date().toISOString() } }, 400);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch all posts within range
    const posts = await prisma.post.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, sentiment: true, engagementScore: true },
    });

    // Group by date
    const timeSeriesData: Record<string, { date: string; posts: number; avgSentiment: number; avgEngagement: number }> = {};

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      timeSeriesData[dateKey] = {
        date: dateKey,
        posts: 0,
        avgSentiment: 0,
        avgEngagement: 0,
      };
    }

    // Aggregate by day
    posts.forEach((post: { createdAt: Date; sentiment: number | null; engagementScore: number | null }) => {
      const dateKey = post.createdAt.toISOString().split('T')[0];
      if (timeSeriesData[dateKey]) {
        timeSeriesData[dateKey].posts += 1;
        timeSeriesData[dateKey].avgSentiment += post.sentiment || 0;
        timeSeriesData[dateKey].avgEngagement += post.engagementScore || 0;
      }
    });

    // Calculate averages
    const result = Object.values(timeSeriesData).map((day) => ({
      date: day.date,
      posts: day.posts,
      avgSentiment: day.posts > 0 ? day.avgSentiment / day.posts : 0,
      avgEngagement: day.posts > 0 ? day.avgEngagement / day.posts : 0,
    }));

    return c.json(result);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * GET /api/analytics/sentiment-distribution
 * Sentiment distribution across all posts
 */
analytics.get('/sentiment-distribution', async (c) => {
  try {
    const posts = await prisma.post.findMany({
      select: { sentiment: true },
    });

    const positive = posts.filter((p: { sentiment: number | null }) => (p.sentiment || 0) > 0.5).length;
    const neutral = posts.filter((p: { sentiment: number | null }) => (p.sentiment || 0) >= -0.5 && (p.sentiment || 0) <= 0.5).length;
    const negative = posts.filter((p: { sentiment: number | null }) => (p.sentiment || 0) < -0.5).length;

    return c.json([
      { name: 'Positive', value: positive, color: '#10b981' },
      { name: 'Neutral', value: neutral, color: '#3b82f6' },
      { name: 'Negative', value: negative, color: '#ef4444' },
    ]);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * GET /api/analytics/top-agents
 * Top agents by karma
 */
analytics.get('/top-agents', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10', 10);

    // Get all agents with their posts
    const agents = await prisma.agent.findMany({
      include: {
        posts: {
          select: { likeCount: true, commentCount: true },
        },
      },
    });

    // Calculate karma (likes + comments)
    const agentsWithKarma = agents.map((agent: { id: string; name: string; posts: Array<{ likeCount: number; commentCount: number }> }) => {
      const karma = agent.posts.reduce((sum: number, post: { likeCount: number; commentCount: number }) => sum + post.likeCount + post.commentCount, 0);
      return {
        id: agent.id,
        name: agent.name,
        karma,
        postsCount: agent.posts.length,
      };
    });

    // Sort by karma and limit
    const topAgents = agentsWithKarma
      .sort((a: { karma: number }, b: { karma: number }) => b.karma - a.karma)
      .slice(0, limit);

    return c.json(topAgents);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * GET /api/analytics/top-submolts
 * Top submolts by post count
 */
analytics.get('/top-submolts', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10', 10);

    const posts = await prisma.post.findMany({
      select: { submolt: true },
    });

    // Count by submolt
    const submoltCounts: Record<string, number> = {};
    posts.forEach((post: { submolt: string | null }) => {
      if (post.submolt) {
        submoltCounts[post.submolt] = (submoltCounts[post.submolt] || 0) + 1;
      }
    });

    // Sort and limit
    const topSubmolts = Object.entries(submoltCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return c.json(topSubmolts);
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

/**
 * GET /api/analytics/agent/:id/stats
 * Detailed stats for specific agent
 */
analytics.get('/agent/:id/stats', async (c) => {
  try {
    const agentId = c.req.param('id');

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        posts: {
          select: {
            likeCount: true,
            commentCount: true,
            sentiment: true,
            engagementScore: true,
            submolt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!agent) {
      return c.json({ error: { code: 'NOTFOUND_001', message: 'Agent not found', timestamp: new Date().toISOString() } }, 404);
    }

    // Calculate stats
    const totalPosts = agent.posts.length;
    const totalKarma = agent.posts.reduce((sum: number, p: { likeCount: number; commentCount: number }) => sum + p.likeCount + p.commentCount, 0);
    const avgSentiment = totalPosts > 0
      ? agent.posts.reduce((sum: number, p: { sentiment: number | null }) => sum + (p.sentiment || 0), 0) / totalPosts
      : 0;
    const avgEngagement = totalPosts > 0
      ? agent.posts.reduce((sum: number, p: { engagementScore: number | null }) => sum + (p.engagementScore || 0), 0) / totalPosts
      : 0;

    // Top submolts
    const submoltCounts: Record<string, number> = {};
    agent.posts.forEach((post: { submolt: string | null }) => {
      if (post.submolt) {
        submoltCounts[post.submolt] = (submoltCounts[post.submolt] || 0) + 1;
      }
    });
    const topSubmolts = Object.entries(submoltCounts)
      .map(([submolt, count]) => ({ submolt, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent activity (last 7 days)
    const recentActivity: Array<{ date: string; posts: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const postsOnDay = agent.posts.filter(
        (p: { createdAt: Date }) => p.createdAt.toISOString().split('T')[0] === dateKey
      ).length;
      recentActivity.push({
        date: dateKey,
        posts: postsOnDay,
      });
    }

    return c.json({
      totalPosts,
      totalKarma,
      avgSentiment,
      avgEngagement,
      topSubmolts,
      recentActivity,
    });
  } catch (error: any) {
    return c.json({ error: { code: 'INTERNAL_001', message: error.message, timestamp: new Date().toISOString() } }, 500);
  }
});

export default analytics;
