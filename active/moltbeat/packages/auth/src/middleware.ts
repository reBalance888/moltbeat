import { verifyToken, JwtPayload } from './jwt';
import { hasRole } from './roles';
import { AuthenticationError, InsufficientPermissionsError } from '@moltbeat/errors';
import { UserRole } from '@moltbeat/database';

/**
 * Extend Express Request to include user
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token or null
 */
function extractToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Require authentication middleware (Express)
 * Verifies JWT and attaches user to req.user
 *
 * Usage:
 * ```typescript
 * app.get('/api/agents', requireAuth(), async (req, res) => {
 *   // req.user is populated
 * });
 * ```
 */
export function requireAuth() {
  return (req: any, res: any, next: any) => {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return next(new AuthenticationError('Authentication required'));
    }

    try {
      const payload = verifyToken(token);
      req.user = payload;
      next();
    } catch (error) {
      next(error); // TokenExpiredError or InvalidCredentialsError
    }
  };
}

/**
 * Optional authentication middleware (Express)
 * Attaches user if token is present, but doesn't fail if missing
 *
 * Usage:
 * ```typescript
 * app.get('/api/posts', optionalAuth(), async (req, res) => {
 *   // req.user may or may not be present
 * });
 * ```
 */
export function optionalAuth() {
  return (req: any, res: any, next: any) => {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return next();
    }

    try {
      const payload = verifyToken(token);
      req.user = payload;
    } catch (error) {
      // Ignore errors for optional auth
    }

    next();
  };
}

/**
 * Require specific role middleware (Express)
 * Must be used after requireAuth()
 *
 * Usage:
 * ```typescript
 * app.delete('/api/agents/:id', requireAuth(), requireRole('ADMIN'), async (req, res) => {
 *   // Only admins can access
 * });
 * ```
 */
export function requireRole(role: UserRole) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (!hasRole(req.user.role, role)) {
      return next(new InsufficientPermissionsError(`Requires ${role} role`));
    }

    next();
  };
}

/**
 * Hono-compatible authentication middleware
 *
 * Usage:
 * ```typescript
 * import { honoAuth } from '@moltbeat/auth';
 *
 * app.get('/api/agents', honoAuth(), async (c) => {
 *   const user = c.get('user');
 *   // user is populated
 * });
 * ```
 */
export function honoAuth(options: { optional?: boolean; role?: UserRole } = {}) {
  return async (c: any, next: any) => {
    const authHeader = c.req.header('Authorization');
    const token = extractToken(authHeader);

    if (!token) {
      if (options.optional) {
        return next();
      }
      throw new AuthenticationError('Authentication required');
    }

    try {
      const payload = verifyToken(token);

      // Check role if required
      if (options.role && !hasRole(payload.role, options.role)) {
        throw new InsufficientPermissionsError(`Requires ${options.role} role`);
      }

      c.set('user', payload);
      await next();
    } catch (error) {
      if (options.optional) {
        await next();
      } else {
        throw error;
      }
    }
  };
}
