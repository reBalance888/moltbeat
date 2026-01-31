/**
 * Logging Middleware
 * Request/response logging with correlation IDs and performance metrics
 */

import { Context, Next } from 'hono';
import {
  RequestLogger,
  generateCorrelationId,
  logAggregator,
  type LogContext,
} from '@moltbeat/logger';

/**
 * Logging middleware configuration
 */
export interface LoggingConfig {
  /**
   * Skip logging for these paths
   */
  skipPaths?: string[];

  /**
   * Log request body (be careful with sensitive data)
   */
  logBody?: boolean;

  /**
   * Log response body (can be verbose)
   */
  logResponse?: boolean;

  /**
   * Enable performance metrics
   */
  enableMetrics?: boolean;
}

export const DEFAULT_LOGGING_CONFIG: Required<LoggingConfig> = {
  skipPaths: ['/health', '/ping'],
  logBody: false,
  logResponse: false,
  enableMetrics: true,
};

/**
 * Request logging middleware
 */
export function loggingMiddleware(customConfig: LoggingConfig = {}) {
  const config = { ...DEFAULT_LOGGING_CONFIG, ...customConfig };

  return async (c: Context, next: Next) => {
    const path = c.req.path;

    // Skip logging for certain paths
    if (config.skipPaths.some((skipPath) => path.startsWith(skipPath))) {
      return next();
    }

    // Generate correlation ID
    const correlationId = c.req.header('x-correlation-id') || generateCorrelationId();
    c.header('x-correlation-id', correlationId);

    // Build log context
    const logContext: LogContext = {
      correlationId,
      requestId: correlationId,
      method: c.req.method,
      path,
      ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      userAgent: c.req.header('user-agent'),
    };

    // Add user ID if authenticated
    const user = c.get('user');
    if (user?.id) {
      logContext.userId = user.id;
    }

    // Create request logger
    const reqLogger = new RequestLogger(logContext);

    // Store logger in context for use in handlers
    c.set('logger', reqLogger);

    // Log incoming request
    const logData: Record<string, unknown> = {
      query: c.req.query(),
    };

    if (config.logBody && c.req.method !== 'GET') {
      try {
        const body = await c.req.raw.clone().json();
        logData.body = body;
      } catch {
        // Body not JSON, skip
      }
    }

    reqLogger.info('Incoming request', logData);

    try {
      // Process request
      await next();

      // Log response
      const statusCode = c.res.status;
      const responseData: Record<string, unknown> = {};

      if (config.logResponse) {
        try {
          const resClone = c.res.clone();
          const resBody = await resClone.json();
          responseData.body = resBody;
        } catch {
          // Response not JSON, skip
        }
      }

      reqLogger.complete(statusCode, responseData);

      // Record metrics
      if (config.enableMetrics) {
        const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
        logAggregator.recordRequest(
          Date.now() - (reqLogger as { startTime: number }).startTime,
          level
        );
      }
    } catch (error) {
      // Log error
      reqLogger.error('Request failed', error as Error);

      // Record error metric
      if (config.enableMetrics) {
        logAggregator.recordRequest(
          Date.now() - (reqLogger as { startTime: number }).startTime,
          'error'
        );
      }

      // Re-throw to be handled by error middleware
      throw error;
    }
  };
}

/**
 * Access logger middleware (simplified format)
 */
export function accessLoggerMiddleware() {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    const { method, path } = c.req;

    await next();

    const duration = Date.now() - start;
    const status = c.res.status;

    console.log(
      `${method} ${path} ${status} ${duration}ms ${c.req.header('user-agent')?.substring(0, 50) || '-'}`
    );
  };
}

/**
 * Correlation ID middleware (standalone)
 */
export function correlationIdMiddleware() {
  return async (c: Context, next: Next) => {
    const correlationId = c.req.header('x-correlation-id') || generateCorrelationId();
    c.header('x-correlation-id', correlationId);
    c.set('correlationId', correlationId);
    await next();
  };
}

/**
 * Get logger from context
 */
export function getLogger(c: Context): RequestLogger {
  const logger = c.get('logger');
  if (!logger) {
    throw new Error('Logger not available in context. Add loggingMiddleware first.');
  }
  return logger;
}

/**
 * Log rotation configuration helper
 */
export interface LogRotationConfig {
  /**
   * Log directory
   */
  directory: string;

  /**
   * File name pattern
   */
  filename: string;

  /**
   * Max file size (bytes)
   */
  maxSize: number;

  /**
   * Max number of files to keep
   */
  maxFiles: number;

  /**
   * Compress old files
   */
  compress: boolean;
}

export const DEFAULT_LOG_ROTATION_CONFIG: LogRotationConfig = {
  directory: './logs',
  filename: 'app-%DATE%.log',
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 30, // 30 days
  compress: true,
};

/**
 * Log rotation setup guide
 */
export function getLogRotationSetup(config: LogRotationConfig = DEFAULT_LOG_ROTATION_CONFIG) {
  return {
    config,
    instructions: `
# Log Rotation Setup

## Using logrotate (Linux/macOS)

1. Create logrotate configuration:
   sudo nano /etc/logrotate.d/moltbeat

2. Add configuration:
   ${config.directory}/*.log {
     daily
     rotate ${config.maxFiles}
     size ${config.maxSize}
     compress
     delaycompress
     notifempty
     create 0640 node node
     sharedscripts
     postrotate
       kill -USR1 $(cat /var/run/moltbeat.pid)
     endscript
   }

3. Test configuration:
   sudo logrotate -d /etc/logrotate.d/moltbeat

## Using pino-rotating-file-stream (Node.js)

1. Install:
   npm install pino-rotating-file-stream

2. Configure in logger:
   import { createLogger } from '@moltbeat/logger';
   import rfs from 'pino-rotating-file-stream';

   const stream = rfs.createStream({
     path: '${config.directory}',
     size: '${config.maxSize}',
     interval: '1d',
     compress: ${config.compress}
   });

   const logger = createLogger({ destination: stream });

## Docker

Add volume mount in docker-compose.yml:
   volumes:
     - ./logs:${config.directory}

## Environment Variables

Set LOG_LEVEL for production:
   LOG_LEVEL=info
   NODE_ENV=production
    `.trim(),
  };
}
