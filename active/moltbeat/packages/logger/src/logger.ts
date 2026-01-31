import pino from 'pino';
import { getConfig } from '@moltbeat/config';

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Create a Pino logger instance with environment-specific configuration
 */
function createLogger() {
  const config = getConfig();
  const isDevelopment = config.isDevelopment();
  const logLevel = process.env.LOG_LEVEL || 'info';

  return pino({
    level: logLevel,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    // Pretty print in development
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  });
}

/**
 * Global logger instance
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context
 * @param context - Additional context fields
 * @returns Child logger instance
 *
 * @example
 * ```typescript
 * const agentLogger = createChildLogger({ agentId: 'agent-123' });
 * agentLogger.info('Agent started');
 * ```
 */
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}

/**
 * Log request information
 * @param method - HTTP method
 * @param path - Request path
 * @param status - Response status code
 * @param duration - Request duration in ms
 * @param requestId - Request correlation ID
 */
export function logRequest(params: {
  method: string;
  path: string;
  status: number;
  duration: number;
  requestId?: string;
  userId?: string;
  error?: Error;
}) {
  const { method, path, status, duration, requestId, userId, error } = params;

  const logData = {
    type: 'request',
    method,
    path,
    status,
    duration,
    requestId,
    userId,
  };

  if (error) {
    logger.error({ ...logData, error: error.message, stack: error.stack }, 'Request failed');
  } else if (status >= 500) {
    logger.error(logData, 'Server error');
  } else if (status >= 400) {
    logger.warn(logData, 'Client error');
  } else {
    logger.info(logData, 'Request completed');
  }
}

/**
 * Log database query
 * @param query - SQL query
 * @param duration - Query duration in ms
 * @param params - Query parameters (will be redacted)
 */
export function logDatabaseQuery(params: {
  query: string;
  duration: number;
  params?: any[];
  error?: Error;
}) {
  const { query, duration, error } = params;

  const logData = {
    type: 'database_query',
    query: query.substring(0, 200), // Truncate long queries
    duration,
  };

  if (error) {
    logger.error({ ...logData, error: error.message }, 'Query failed');
  } else if (duration > 1000) {
    logger.warn(logData, 'Slow query detected');
  } else {
    logger.debug(logData, 'Query executed');
  }
}

/**
 * Log cache operation
 * @param operation - Cache operation (get, set, delete, invalidate)
 * @param key - Cache key
 * @param hit - Whether cache was hit (for get operations)
 * @param duration - Operation duration in ms
 */
export function logCacheOperation(params: {
  operation: 'get' | 'set' | 'delete' | 'invalidate';
  key: string;
  hit?: boolean;
  duration?: number;
  ttl?: number;
}) {
  const { operation, key, hit, duration, ttl } = params;

  logger.debug(
    {
      type: 'cache',
      operation,
      key,
      hit,
      duration,
      ttl,
    },
    `Cache ${operation}`
  );
}

/**
 * Log external API call
 * @param service - External service name
 * @param endpoint - API endpoint
 * @param method - HTTP method
 * @param status - Response status code
 * @param duration - Request duration in ms
 * @param error - Error if request failed
 */
export function logExternalApiCall(params: {
  service: string;
  endpoint: string;
  method: string;
  status?: number;
  duration: number;
  error?: Error;
}) {
  const { service, endpoint, method, status, duration, error } = params;

  const logData = {
    type: 'external_api',
    service,
    endpoint,
    method,
    status,
    duration,
  };

  if (error) {
    logger.error({ ...logData, error: error.message }, `${service} API call failed`);
  } else if (duration > 5000) {
    logger.warn(logData, `Slow ${service} API call`);
  } else {
    logger.info(logData, `${service} API call completed`);
  }
}

/**
 * Log agent activity
 * @param agentId - Agent ID
 * @param activity - Activity description
 * @param metadata - Additional metadata
 */
export function logAgentActivity(params: {
  agentId: string;
  activity: string;
  metadata?: Record<string, any>;
}) {
  const { agentId, activity, metadata } = params;

  logger.info(
    {
      type: 'agent_activity',
      agentId,
      activity,
      ...metadata,
    },
    `Agent ${agentId}: ${activity}`
  );
}

/**
 * Log error with context
 * @param error - Error object
 * @param context - Additional context
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error(
    {
      type: 'error',
      error: error.message,
      stack: error.stack,
      ...context,
    },
    error.message
  );
}

export default logger;
