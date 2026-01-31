import { HealthChecker, HealthStatus } from './checker';

const healthChecker = new HealthChecker();

/**
 * Express health endpoints
 */
export function healthEndpoints(app: any) {
  // GET /health - Liveness probe
  app.get('/health', async (req: any, res: any) => {
    const result = await healthChecker.checkLiveness();
    res.json(result);
  });

  // GET /ready - Readiness probe
  app.get('/ready', async (req: any, res: any) => {
    const result = await healthChecker.checkReadiness();
    const statusCode = result.status === HealthStatus.HEALTHY ? 200 : 503;
    res.status(statusCode).json(result);
  });

  // GET /health/detailed - Detailed health (admin only)
  app.get('/health/detailed', async (req: any, res: any) => {
    const result = await healthChecker.checkDetailed();
    const statusCode = result.status === HealthStatus.HEALTHY ? 200 : 503;
    res.status(statusCode).json(result);
  });
}

/**
 * Hono health endpoints
 */
export function honoHealthEndpoints(app: any) {
  // GET /health - Liveness probe
  app.get('/health', async (c: any) => {
    const result = await healthChecker.checkLiveness();
    return c.json(result);
  });

  // GET /ready - Readiness probe
  app.get('/ready', async (c: any) => {
    const result = await healthChecker.checkReadiness();
    const statusCode = result.status === HealthStatus.HEALTHY ? 200 : 503;
    return c.json(result, statusCode);
  });

  // GET /health/detailed - Detailed health (admin only)
  app.get('/health/detailed', async (c: any) => {
    const result = await healthChecker.checkDetailed();
    const statusCode = result.status === HealthStatus.HEALTHY ? 200 : 503;
    return c.json(result, statusCode);
  });
}
