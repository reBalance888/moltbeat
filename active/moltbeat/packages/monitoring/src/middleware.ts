/**
 * Sentry Middleware for Hono
 */

import { Context, Next } from 'hono';
import * as Sentry from '@sentry/node';
import { captureException, setUser, addBreadcrumb, startTransaction } from './sentry';

/**
 * Sentry error tracking middleware
 */
export function sentryMiddleware() {
  return async (c: Context, next: Next) => {
    const transaction = startTransaction(
      `${c.req.method} ${c.req.path}`,
      'http.server',
      {
        method: c.req.method,
        path: c.req.path,
        url: c.req.url,
      }
    );

    // Set request context
    Sentry.configureScope((scope) => {
      scope.setTransactionName(`${c.req.method} ${c.req.path}`);
      scope.setTag('http.method', c.req.method);
      scope.setTag('http.url', c.req.url);

      const correlationId = c.req.header('x-correlation-id');
      if (correlationId) {
        scope.setTag('correlation_id', correlationId);
      }
    });

    // Set user if authenticated
    const user = c.get('user');
    if (user?.id) {
      setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      });
    }

    // Add breadcrumb for request
    addBreadcrumb('HTTP Request', {
      method: c.req.method,
      url: c.req.url,
      path: c.req.path,
    }, 'http');

    try {
      await next();

      // Set response status
      transaction.setHttpStatus(c.res.status);
      transaction.finish();
    } catch (error) {
      // Capture error in Sentry
      const errorContext = {
        method: c.req.method,
        url: c.req.url,
        path: c.req.path,
        statusCode: c.res.status,
        correlationId: c.req.header('x-correlation-id'),
        userAgent: c.req.header('user-agent'),
      };

      if (error instanceof Error) {
        captureException(error, errorContext);
      } else {
        Sentry.captureMessage(`Non-Error exception: ${String(error)}`, {
          level: 'error',
          extra: errorContext,
        });
      }

      transaction.setHttpStatus(500);
      transaction.finish();

      // Re-throw to be handled by error middleware
      throw error;
    }
  };
}

/**
 * Request ID middleware (for Sentry correlation)
 */
export function requestIdMiddleware() {
  return async (c: Context, next: Next) => {
    const requestId = c.req.header('x-request-id') || crypto.randomUUID();
    c.header('x-request-id', requestId);

    Sentry.configureScope((scope) => {
      scope.setTag('request_id', requestId);
    });

    await next();
  };
}

/**
 * Performance tracking middleware
 */
export function performanceMiddleware(slowThreshold = 1000) {
  return async (c: Context, next: Next) => {
    const start = Date.now();

    await next();

    const duration = Date.now() - start;

    // Log slow requests
    if (duration > slowThreshold) {
      addBreadcrumb('Slow Request', {
        duration,
        threshold: slowThreshold,
        path: c.req.path,
      }, 'performance');

      Sentry.captureMessage('Slow request detected', {
        level: 'warning',
        extra: {
          duration,
          path: c.req.path,
          method: c.req.method,
          threshold: slowThreshold,
        },
      });
    }

    // Add performance header
    c.header('X-Response-Time', `${duration}ms`);
  };
}
