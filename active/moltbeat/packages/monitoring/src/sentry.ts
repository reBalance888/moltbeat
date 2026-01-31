/**
 * Sentry Error Tracking Configuration
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  enableProfiling?: boolean;
  beforeSend?: (event: Sentry.Event) => Sentry.Event | null;
}

/**
 * Initialize Sentry
 */
export function initSentry(config: SentryConfig): void {
  const {
    dsn,
    environment = process.env.NODE_ENV || 'development',
    release = process.env.RELEASE_VERSION || 'unknown',
    sampleRate = 1.0,
    tracesSampleRate = 0.1,
    profilesSampleRate = 0.1,
    enableProfiling = true,
    beforeSend,
  } = config;

  const integrations = [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection({ mode: 'warn' }),
  ];

  if (enableProfiling) {
    integrations.push(new ProfilingIntegration());
  }

  Sentry.init({
    dsn,
    environment,
    release,
    sampleRate,
    tracesSampleRate,
    profilesSampleRate,
    integrations,
    beforeSend: beforeSend || defaultBeforeSend,

    // Don't send errors in development
    enabled: environment !== 'development',

    // Configure context
    initialScope: {
      tags: {
        service: 'moltbeat-api',
        runtime: 'node',
      },
    },
  });

  console.log(`✅ Sentry initialized (${environment}, ${release})`);
}

/**
 * Default beforeSend filter
 */
function defaultBeforeSend(event: Sentry.Event): Sentry.Event | null {
  // Filter out known non-critical errors
  const ignoredErrors = [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'AbortError',
    'CanceledError',
  ];

  if (event.exception?.values) {
    for (const exception of event.exception.values) {
      if (exception.value && ignoredErrors.some((err) => exception.value?.includes(err))) {
        return null; // Don't send to Sentry
      }
    }
  }

  // Sanitize sensitive data
  if (event.request?.headers) {
    delete event.request.headers.authorization;
    delete event.request.headers.cookie;
  }

  return event;
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): void {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category = 'default'
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string,
  data?: Record<string, unknown>
): Sentry.Transaction {
  return Sentry.startTransaction({
    name,
    op,
    data,
  });
}

/**
 * Flush pending events
 */
export async function flush(timeout = 2000): Promise<boolean> {
  return Sentry.flush(timeout);
}

/**
 * Close Sentry
 */
export async function close(timeout = 2000): Promise<boolean> {
  return Sentry.close(timeout);
}

/**
 * Error severity levels
 */
export const SeverityLevel = {
  Fatal: 'fatal' as Sentry.SeverityLevel,
  Error: 'error' as Sentry.SeverityLevel,
  Warning: 'warning' as Sentry.SeverityLevel,
  Info: 'info' as Sentry.SeverityLevel,
  Debug: 'debug' as Sentry.SeverityLevel,
};

/**
 * Configure scope with context
 */
export function configureScope(callback: (scope: Sentry.Scope) => void): void {
  Sentry.configureScope(callback);
}

/**
 * Set tag
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Set tags
 */
export function setTags(tags: Record<string, string>): void {
  Sentry.setTags(tags);
}

/**
 * Set context
 */
export function setContext(name: string, context: Record<string, unknown>): void {
  Sentry.setContext(name, context);
}
