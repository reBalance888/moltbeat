import { Context, Next } from 'hono';
import { randomUUID } from 'crypto';

/**
 * Request ID and distributed tracing middleware (P0-008)
 *
 * Generates a unique request ID (UUID) for each request
 * Adds X-Request-ID header to response
 * Logs all requests with correlation ID
 */
export function tracingMiddleware() {
  return async (c: Context, next: Next) => {
    // Generate or use existing request ID
    const requestId = c.req.header('X-Request-ID') || randomUUID();

    // Store request ID in context
    c.set('requestId', requestId);

    // Add to response headers
    c.header('X-Request-ID', requestId);

    // Log request start
    const startTime = Date.now();
    const method = c.req.method;
    const path = c.req.path;

    console.log(JSON.stringify({
      type: 'request_start',
      requestId,
      method,
      path,
      timestamp: new Date().toISOString(),
    }));

    // Execute request
    await next();

    // Log request end
    const duration = Date.now() - startTime;
    const status = c.res.status;

    console.log(JSON.stringify({
      type: 'request_end',
      requestId,
      method,
      path,
      status,
      duration,
      timestamp: new Date().toISOString(),
    }));
  };
}
