/**
 * JWT Authentication Middleware (P0-004)
 *
 * Validates JWT tokens in Authorization header
 * Extracts user ID and adds to request context
 * Skips authentication for public routes
 */

import { Context, Next } from 'hono';
import { getConfig } from '@moltbeat/config';
import { verifyToken } from '@moltbeat/auth';

const PUBLIC_ROUTES = [
  '/health',
  '/health/ready',
  '/health/detailed',
  '/docs',
  '/api.json',
  '/auth/register',
  '/auth/login',
];

/**
 * Check if route is public (no auth required)
 */
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some((route) => path.startsWith(route));
}

/**
 * JWT authentication middleware
 */
export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const path = c.req.path;

    // Skip auth for public routes
    if (isPublicRoute(path)) {
      await next();
      return;
    }

    try {
      // Get authorization header
      const authHeader = c.req.header('Authorization');

      if (!authHeader) {
        return c.json(
          {
            error: {
              code: 'AUTH_001',
              message: 'Missing Authorization header',
              timestamp: new Date().toISOString(),
            },
          },
          401
        );
      }

      // Extract bearer token
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return c.json(
          {
            error: {
              code: 'AUTH_001',
              message: 'Invalid Authorization header format',
              timestamp: new Date().toISOString(),
            },
          },
          401
        );
      }

      const token = parts[1];

      // Verify token
      const decoded = verifyToken(token);

      if (!decoded) {
        return c.json(
          {
            error: {
              code: 'AUTH_001',
              message: 'Invalid or expired token',
              timestamp: new Date().toISOString(),
            },
          },
          401
        );
      }

      // Store user ID in context
      c.set('userId', decoded.userId);
      c.set('user', decoded);

      await next();
    } catch (error: any) {
      return c.json(
        {
          error: {
            code: 'AUTH_001',
            message: 'Authentication failed',
            details: error.message,
            timestamp: new Date().toISOString(),
          },
        },
        401
      );
    }
  };
}
