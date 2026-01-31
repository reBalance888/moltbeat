import { Context, Next } from 'hono';
import { logRequest } from './logger';

/**
 * Hono logging middleware
 * Logs all HTTP requests with method, path, status, duration, and request ID
 *
 * Usage:
 * ```typescript
 * import { loggingMiddleware } from '@moltbeat/logger';
 * app.use('*', loggingMiddleware());
 * ```
 */
export function loggingMiddleware() {
  return async (c: Context, next: Next) => {
    const startTime = Date.now();
    const method = c.req.method;
    const path = c.req.path;
    const requestId = c.get('requestId');

    // Execute request
    await next();

    // Log after response
    const duration = Date.now() - startTime;
    const status = c.res.status;

    logRequest({
      method,
      path,
      status,
      duration,
      requestId,
      userId: c.get('user')?.userId,
    });
  };
}

/**
 * Express logging middleware
 *
 * Usage:
 * ```typescript
 * import { expressLoggingMiddleware } from '@moltbeat/logger';
 * app.use(expressLoggingMiddleware());
 * ```
 */
export function expressLoggingMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Override res.end to log after response is sent
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      const duration = Date.now() - startTime;

      logRequest({
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        requestId: req.id,
        userId: req.user?.userId,
      });

      return originalEnd.apply(res, args);
    };

    next();
  };
}
