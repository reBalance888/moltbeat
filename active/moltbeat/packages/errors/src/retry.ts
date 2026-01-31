import { MoltBeatError } from './MoltBeatError';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 5) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2 for exponential backoff) */
  backoffMultiplier?: number;
  /** Function to determine if error is retryable (default: check error.isRetryable) */
  shouldRetry?: (error: any, attempt: number) => boolean;
  /** Callback for each retry attempt */
  onRetry?: (error: any, attempt: number, delay: number) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Default retry predicate - checks if error is a MoltBeatError with isRetryable flag
 */
function defaultShouldRetry(error: any): boolean {
  if (error instanceof MoltBeatError) {
    return error.isRetryable;
  }
  // Retry network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return true;
  }
  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>>): number {
  const exponentialDelay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1);
  const clampedDelay = Math.min(exponentialDelay, options.maxDelay);

  // Add jitter (randomness) to prevent thundering herd
  const jitter = Math.random() * 0.3 * clampedDelay; // +/- 15%
  return Math.floor(clampedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Promise that resolves with function result or rejects with final error
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await moltbookApi.getAgent('agent-id'),
 *   { maxRetries: 3, initialDelay: 2000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const shouldRetry = options.shouldRetry || defaultShouldRetry;

  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt > opts.maxRetries) {
        break;
      }

      // Check if error is retryable
      if (!shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, opts);

      // Call retry callback if provided
      if (options.onRetry) {
        options.onRetry(error, attempt, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Create a retryable version of an async function
 *
 * @param fn - Function to wrap with retry logic
 * @param options - Retry configuration
 * @returns Wrapped function with automatic retry
 *
 * @example
 * ```typescript
 * const fetchWithRetry = createRetryable(
 *   async (url: string) => await fetch(url),
 *   { maxRetries: 3 }
 * );
 *
 * const response = await fetchWithRetry('https://api.example.com/data');
 * ```
 */
export function createRetryable<Args extends any[], Result>(
  fn: (...args: Args) => Promise<Result>,
  options: RetryOptions = {}
): (...args: Args) => Promise<Result> {
  return async (...args: Args): Promise<Result> => {
    return retryWithBackoff(() => fn(...args), options);
  };
}

/**
 * Circuit breaker to prevent cascading failures
 */
export interface CircuitBreakerMetrics {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  consecutiveFailures: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalCalls: number;
}

export class CircuitBreaker {
  private failures: number = 0;
  private successes: number = 0;
  private consecutiveFailures: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private totalCalls: number = 0;

  constructor(
    private readonly threshold: number = 10,
    private readonly timeout: number = 60000, // 1 minute
    private readonly halfOpenAttempts: number = 3
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    // Check if circuit is open
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure < this.timeout) {
        throw new MoltBeatError({
          code: 'CIRCUIT_BREAKER_OPEN',
          message: `Circuit breaker is open - too many consecutive failures (${this.consecutiveFailures}/${this.threshold})`,
          statusCode: 503,
          isRetryable: true,
        });
      }
      // Try to recover
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = Date.now();

    // Close circuit if it was half-open
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();

    if (this.consecutiveFailures >= this.threshold) {
      this.state = 'open';
    }
  }

  /**
   * Get current circuit breaker state
   */
  public getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  /**
   * Get circuit breaker metrics
   */
  public getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime || null,
      lastSuccessTime: this.lastSuccessTime || null,
      totalCalls: this.totalCalls,
    };
  }

  /**
   * Reset circuit breaker
   */
  public reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.consecutiveFailures = 0;
    this.lastFailureTime = 0;
    this.lastSuccessTime = 0;
    this.state = 'closed';
    this.totalCalls = 0;
  }
}

/**
 * HTTP-specific retry predicate
 * Retries on 5xx errors and specific network errors
 */
export function httpShouldRetry(error: any, statusCode?: number): boolean {
  // Retry on 5xx server errors
  if (statusCode && statusCode >= 500 && statusCode < 600) {
    return true;
  }

  // Retry on specific 4xx errors
  if (statusCode === 429) {
    // Too Many Requests - rate limit
    return true;
  }
  if (statusCode === 408) {
    // Request Timeout
    return true;
  }

  // Retry on network errors
  const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'EPIPE'];
  if (error.code && retryableCodes.includes(error.code)) {
    return true;
  }

  // Check MoltBeatError
  if (error instanceof MoltBeatError) {
    return error.isRetryable;
  }

  return false;
}

/**
 * Timeout wrapper for async functions
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timeout'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new MoltBeatError({
          code: 'TIMEOUT',
          message: errorMessage,
          statusCode: 408,
          isRetryable: true,
        })
      );
    }, timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Retry decorator for methods
 *
 * @example
 * ```typescript
 * class ApiClient {
 *   @Retryable({ maxRetries: 3 })
 *   async fetchData() {
 *     return await fetch('https://api.example.com/data');
 *   }
 * }
 * ```
 */
export function Retryable(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return retryWithBackoff(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}

/**
 * Batch retry - retry multiple operations with shared circuit breaker
 */
export class BatchRetry {
  private circuitBreaker: CircuitBreaker;

  constructor(
    private options: RetryOptions = {},
    circuitBreakerThreshold: number = 10
  ) {
    this.circuitBreaker = new CircuitBreaker(circuitBreakerThreshold);
  }

  /**
   * Execute multiple operations with retry and circuit breaker
   */
  async executeAll<T>(
    operations: Array<() => Promise<T>>,
    options: { failFast?: boolean } = {}
  ): Promise<Array<T | Error>> {
    const results: Array<T | Error> = [];

    for (const operation of operations) {
      try {
        const result = await this.circuitBreaker.execute(() =>
          retryWithBackoff(operation, this.options)
        );
        results.push(result);
      } catch (error) {
        results.push(error as Error);

        // Stop processing if failFast is enabled
        if (options.failFast) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
    return this.circuitBreaker.getMetrics();
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.circuitBreaker.reset();
  }
}
