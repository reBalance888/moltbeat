/**
 * @moltbeat/logger
 * Structured logging with request context and performance metrics
 */

import pino from 'pino';

/**
 * Log levels
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Log context for request tracking
 */
export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestId?: string;
  path?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level?: LogLevel;
  pretty?: boolean;
  redact?: string[];
  destination?: string;
}

/**
 * Create logger instance
 */
export function createLogger(config: LoggerConfig = {}) {
  const {
    level = (process.env.LOG_LEVEL as LogLevel) || 'info',
    pretty = process.env.NODE_ENV !== 'production',
    redact = ['req.headers.authorization', 'password', 'apiKey', 'secret'],
    destination,
  } = config;

  const transport = pretty
    ? pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '{levelLabel} - {msg} {context}',
        },
      })
    : undefined;

  return pino(
    {
      level,
      redact,
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        env: process.env.NODE_ENV || 'development',
      },
    },
    transport || (destination ? pino.destination(destination) : undefined)
  );
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Child logger with context
 */
export function createContextLogger(context: LogContext) {
  return logger.child(context);
}

/**
 * Request logger with performance tracking
 */
export class RequestLogger {
  private logger: pino.Logger;
  private startTime: number;

  constructor(context: LogContext) {
    this.logger = createContextLogger(context);
    this.startTime = Date.now();
  }

  debug(message: string, data?: object) {
    this.logger.debug(data, message);
  }

  info(message: string, data?: object) {
    this.logger.info(data, message);
  }

  warn(message: string, data?: object) {
    this.logger.warn(data, message);
  }

  error(message: string, error?: Error | object) {
    if (error instanceof Error) {
      this.logger.error({ err: error }, message);
    } else {
      this.logger.error(error, message);
    }
  }

  /**
   * Log request completion with performance metrics
   */
  complete(statusCode: number, additionalData?: object) {
    const duration = Date.now() - this.startTime;
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this.logger[level](
      {
        statusCode,
        duration,
        ...additionalData,
      },
      `Request completed in ${duration}ms`
    );
  }
}

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  mark(label: string) {
    this.marks.set(label, Date.now() - this.startTime);
  }

  getMarks(): Record<string, number> {
    return Object.fromEntries(this.marks);
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Generate correlation ID
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize sensitive data from logs
 */
export function sanitizeLogData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = { ...data } as Record<string, unknown>;
  const sensitiveKeys = ['password', 'apiKey', 'secret', 'token', 'authorization'];

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Log aggregation for metrics
 */
interface LogMetrics {
  totalRequests: number;
  errors: number;
  warnings: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
}

class LogAggregator {
  private metrics: LogMetrics = {
    totalRequests: 0,
    errors: 0,
    warnings: 0,
    averageDuration: 0,
    maxDuration: 0,
    minDuration: Infinity,
  };

  private durations: number[] = [];

  recordRequest(duration: number, level: 'info' | 'warn' | 'error') {
    this.metrics.totalRequests++;
    this.durations.push(duration);

    if (level === 'error') this.metrics.errors++;
    if (level === 'warn') this.metrics.warnings++;

    this.metrics.maxDuration = Math.max(this.metrics.maxDuration, duration);
    this.metrics.minDuration = Math.min(this.metrics.minDuration, duration);
    this.metrics.averageDuration =
      this.durations.reduce((a, b) => a + b, 0) / this.durations.length;

    // Keep only last 1000 durations
    if (this.durations.length > 1000) {
      this.durations = this.durations.slice(-1000);
    }
  }

  getMetrics(): LogMetrics {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      errors: 0,
      warnings: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
    };
    this.durations = [];
  }
}

export const logAggregator = new LogAggregator();

export function getLogMetrics(): LogMetrics {
  return logAggregator.getMetrics();
}

export function resetLogMetrics() {
  logAggregator.reset();
}
