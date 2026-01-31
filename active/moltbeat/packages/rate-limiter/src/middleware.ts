import { RateLimiter, RateLimitConfig } from './limiter';
import { RateLimitError } from '@moltbeat/errors';

/**
 * Express rate limit middleware
 */
export function rateLimitMiddleware(config: RateLimitConfig = {}) {
  const limiter = new RateLimiter(config);

  return async (req: any, res: any, next: any) => {
    // Use user ID if authenticated, otherwise IP address
    const key = req.user?.userId || req.ip || req.connection.remoteAddress;

    try {
      const result = await limiter.consume(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetTime);

      next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        res.setHeader('X-RateLimit-Limit', 0);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('Retry-After', (error as any).retryAfter || 60);
        next(error);
      } else {
        next(error);
      }
    }
  };
}

/**
 * Hono rate limit middleware
 */
export function honoRateLimitMiddleware(config: RateLimitConfig = {}) {
  const limiter = new RateLimiter(config);

  return async (c: any, next: any) => {
    // Use user ID if authenticated, otherwise IP address
    const user = c.get('user');
    const key = user?.userId || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    try {
      const result = await limiter.consume(key);

      // Set rate limit headers
      c.header('X-RateLimit-Limit', result.limit.toString());
      c.header('X-RateLimit-Remaining', result.remaining.toString());
      c.header('X-RateLimit-Reset', result.resetTime.toString());

      await next();
    } catch (error) {
      if (error instanceof RateLimitError) {
        c.header('X-RateLimit-Limit', '0');
        c.header('X-RateLimit-Remaining', '0');
        c.header('Retry-After', ((error as any).retryAfter || 60).toString());
        throw error;
      } else {
        throw error;
      }
    }
  };
}
