/**
 * Retry Logic with Exponential Backoff and Circuit Breaker
 * For resilient agent operations
 */

import { logger } from '@moltbeat/logger';

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold?: number; // Open circuit after N failures
  successThreshold?: number; // Close circuit after N successes
  timeout?: number; // Time to wait before half-open (ms)
}

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Too many failures, reject all
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = 0;
  private config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold || 5,
      successThreshold: config.successThreshold || 2,
      timeout: config.timeout || 60000, // 1 minute
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, name: string = 'operation'): Promise<T> {
    // Check circuit state
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(
          `Circuit breaker is OPEN for ${name}. Next attempt in ${Math.ceil((this.nextAttempt - Date.now()) / 1000)}s`
        );
      }
      // Try half-open
      this.state = CircuitState.HALF_OPEN;
      logger.info({ name, state: this.state }, 'Circuit breaker entering HALF_OPEN state');
    }

    try {
      const result = await fn();

      // Success
      this.onSuccess(name);
      return result;
    } catch (error) {
      // Failure
      this.onFailure(name);
      throw error;
    }
  }

  private onSuccess(name: string): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info({ name }, 'Circuit breaker CLOSED (service recovered)');
      }
    }
  }

  private onFailure(name: string): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.timeout;
      logger.error(
        {
          name,
          failureCount: this.failureCount,
          nextAttempt: new Date(this.nextAttempt).toISOString(),
        },
        'Circuit breaker OPENED (too many failures)'
      );
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  context: { operation?: string; agentName?: string } = {}
): Promise<T> {
  const maxRetries = config.maxRetries || 5;
  const initialDelay = config.initialDelayMs || 1000;
  const maxDelay = config.maxDelayMs || 30000;
  const backoffMultiplier = config.backoffMultiplier || 2;
  const retryableErrors = config.retryableErrors || [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    '5',
  ]; // 5xx errors

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();

      if (attempt > 0) {
        logger.info(
          {
            ...context,
            attempt,
            maxRetries,
          },
          'Operation succeeded after retry'
        );
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = retryableErrors.some(
        (code) =>
          error.code?.includes(code) ||
          error.message?.includes(code) ||
          error.statusCode?.toString().startsWith(code)
      );

      if (!isRetryable || attempt >= maxRetries) {
        logger.error(
          {
            ...context,
            attempt,
            maxRetries,
            error: error.message,
            isRetryable,
          },
          'Operation failed (not retryable or max retries reached)'
        );
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt), maxDelay);

      logger.warn(
        {
          ...context,
          attempt: attempt + 1,
          maxRetries,
          delayMs: delay,
          error: error.message,
        },
        'Operation failed, retrying...'
      );

      // Wait before retry
      await sleep(delay);
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry decorator for class methods
 */
export function Retryable(config: RetryConfig = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return retryWithBackoff(
        () => originalMethod.apply(this, args),
        config,
        {
          operation: propertyKey,
          agentName: (this as any).agentName || (this as any).name,
        }
      );
    };

    return descriptor;
  };
}

/**
 * Circuit breaker decorator for class methods
 */
export function WithCircuitBreaker(breaker: CircuitBreaker) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return breaker.execute(
        () => originalMethod.apply(this, args),
        `${target.constructor.name}.${propertyKey}`
      );
    };

    return descriptor;
  };
}

/**
 * Combined retry + circuit breaker
 */
export async function retryWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  breaker: CircuitBreaker,
  retryConfig: RetryConfig = {},
  context: { operation?: string; agentName?: string } = {}
): Promise<T> {
  return breaker.execute(() => retryWithBackoff(fn, retryConfig, context), context.operation || 'operation');
}
