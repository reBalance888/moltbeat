import { Hono } from 'hono';
import { prisma } from '@moltbeat/database';
import { Redis } from '@upstash/redis';
import { getConfig } from '@moltbeat/config';

const health = new Hono();

/**
 * Liveness probe - always returns 200 if API is running (P0-007)
 * Used by orchestrators to check if the service needs to be restarted
 *
 * GET /health
 */
health.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness probe - returns 200 if all dependencies are available (P0-007)
 * Returns 503 if database or Redis are unavailable
 *
 * GET /ready
 */
health.get('/ready', async (c) => {
  const checks: Record<string, boolean> = {};

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch (error) {
    checks.database = false;
  }

  // Check Redis
  try {
    const config = getConfig();
    const redisConfig = config.getRedisConfig();
    const redis = new Redis({
      url: redisConfig.url,
      token: redisConfig.token,
    });
    await redis.ping();
    checks.redis = true;
  } catch (error) {
    checks.redis = false;
  }

  const isReady = Object.values(checks).every((status) => status);

  return c.json(
    {
      status: isReady ? 'ready' : 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    },
    isReady ? 200 : 503
  );
});

/**
 * Detailed health check with latency metrics (P0-007)
 *
 * GET /health/detailed
 */
health.get('/detailed', async (c) => {
  const details: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {},
  };

  // Database check with latency
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    details.dependencies.database = {
      status: 'healthy',
      latency: `${latency}ms`,
    };
  } catch (error: any) {
    details.dependencies.database = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Redis check with latency
  try {
    const config = getConfig();
    const redisConfig = config.getRedisConfig();
    const redis = new Redis({
      url: redisConfig.url,
      token: redisConfig.token,
    });

    const startTime = Date.now();
    await redis.ping();
    const latency = Date.now() - startTime;

    details.dependencies.redis = {
      status: 'healthy',
      latency: `${latency}ms`,
    };
  } catch (error: any) {
    details.dependencies.redis = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Overall health status
  const isHealthy = Object.values(details.dependencies).every(
    (dep: any) => dep.status === 'healthy'
  );

  details.status = isHealthy ? 'healthy' : 'degraded';

  return c.json(details, isHealthy ? 200 : 503);
});

export default health;
