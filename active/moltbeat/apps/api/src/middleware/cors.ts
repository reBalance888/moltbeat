import { Context, Next } from 'hono';
import { getConfig } from '@moltbeat/config';

/**
 * CORS middleware with environment-specific allowed origins (P0-006)
 *
 * Allowed origins by environment:
 * - development: http://localhost:3000, http://localhost:5173
 * - staging: https://staging.moltbeat.com
 * - production: https://moltbeat.com, https://pulse.moltbeat.com
 */
export function corsMiddleware() {
  return async (c: Context, next: Next) => {
    const config = getConfig();
    const allowedOrigins = config.getCorsOrigins();
    const origin = c.req.header('Origin');

    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      c.header('Access-Control-Allow-Origin', origin);
    }

    // Set CORS headers
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID, X-API-Key');
    c.header('Access-Control-Expose-Headers', 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
    c.header('Access-Control-Max-Age', '86400'); // 24 hours
    c.header('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    await next();
  };
}
