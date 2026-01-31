/**
 * Request Timeout Middleware
 * Graceful timeout handling for long-running requests
 */

import { Context, Next } from 'hono';

export interface TimeoutConfig {
  /**
   * Request timeout in milliseconds
   * Default: 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Custom error message
   */
  message?: string;

  /**
   * Whether to log timeout events
   */
  enableLogging?: boolean;
}

export const DEFAULT_TIMEOUT_CONFIG: Required<TimeoutConfig> = {
  timeout: 30000, // 30 seconds
  message: 'Request timeout - the server took too long to respond',
  enableLogging: true,
};

/**
 * Timeout error class
 */
export class TimeoutError extends Error {
  constructor(message: string, public readonly duration: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Request timeout middleware
 */
export function timeoutMiddleware(customConfig: TimeoutConfig = {}) {
  const config = { ...DEFAULT_TIMEOUT_CONFIG, ...customConfig };

  return async (c: Context, next: Next) => {
    const startTime = Date.now();
    let timeoutId: NodeJS.Timeout | null = null;
    let timedOut = false;

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        const duration = Date.now() - startTime;
        reject(new TimeoutError(config.message, duration));
      }, config.timeout);
    });

    try {
      // Race between request and timeout
      await Promise.race([
        next(),
        timeoutPromise,
      ]);

      // Clear timeout if request completed
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Check if timed out
      if (timedOut) {
        return c.json(
          {
            success: false,
            error: {
              code: 'TIMEOUT_001',
              message: config.message,
              timestamp: new Date().toISOString(),
            },
          },
          504 // Gateway Timeout
        );
      }
    } catch (error) {
      // Clear timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Handle timeout error
      if (error instanceof TimeoutError) {
        if (config.enableLogging) {
          console.error(`Request timeout: ${c.req.method} ${c.req.url} (${error.duration}ms)`);
        }

        return c.json(
          {
            success: false,
            error: {
              code: 'TIMEOUT_001',
              message: config.message,
              duration: error.duration,
              timestamp: new Date().toISOString(),
            },
          },
          504
        );
      }

      // Re-throw other errors
      throw error;
    }
  };
}

/**
 * Per-route timeout configuration
 */
export function withTimeout(handler: (c: Context) => Promise<Response>, timeout: number) {
  return async (c: Context) => {
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Request timeout after ${timeout}ms`, timeout));
      }, timeout);
    });

    try {
      return await Promise.race([
        handler(c),
        timeoutPromise,
      ]);
    } catch (error) {
      if (error instanceof TimeoutError) {
        return c.json(
          {
            success: false,
            error: {
              code: 'TIMEOUT_001',
              message: `Request timeout after ${timeout}ms`,
              timestamp: new Date().toISOString(),
            },
          },
          504
        );
      }
      throw error;
    }
  };
}

/**
 * Timeout monitoring middleware
 * Tracks slow requests without timing out
 */
export function slowRequestMiddleware(threshold: number = 5000) {
  return async (c: Context, next: Next) => {
    const startTime = Date.now();

    await next();

    const duration = Date.now() - startTime;

    if (duration > threshold) {
      console.warn(
        `Slow request: ${c.req.method} ${c.req.url} took ${duration}ms (threshold: ${threshold}ms)`
      );

      // Add performance hint header
      c.header('X-Response-Time', `${duration}ms`);
      c.header('X-Performance-Warning', 'slow');
    }
  };
}

/**
 * Adaptive timeout based on route complexity
 */
export function adaptiveTimeoutMiddleware() {
  return async (c: Context, next: Next) => {
    const path = c.req.path;

    // Different timeouts for different routes
    let timeout = 30000; // Default: 30s

    if (path.includes('/analytics')) {
      timeout = 60000; // Analytics: 60s
    } else if (path.includes('/export')) {
      timeout = 120000; // Export: 2min
    } else if (path.includes('/health')) {
      timeout = 5000; // Health check: 5s
    }

    // Apply timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Request timeout after ${timeout}ms`, timeout));
      }, timeout);
    });

    try {
      await Promise.race([next(), timeoutPromise]);
    } catch (error) {
      if (error instanceof TimeoutError) {
        return c.json(
          {
            success: false,
            error: {
              code: 'TIMEOUT_001',
              message: error.message,
              route: path,
              timestamp: new Date().toISOString(),
            },
          },
          504
        );
      }
      throw error;
    }
  };
}

/**
 * Timeout statistics
 */
let timeoutCount = 0;
let slowRequestCount = 0;

export function getTimeoutStats() {
  return {
    timeouts: timeoutCount,
    slowRequests: slowRequestCount,
  };
}

export function resetTimeoutStats() {
  timeoutCount = 0;
  slowRequestCount = 0;
}
