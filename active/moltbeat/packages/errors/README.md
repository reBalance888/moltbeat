# @moltbeat/errors

Standardized error handling with retry logic and circuit breaker for MoltBeat.

## Features

- **Structured Errors** - MoltBeatError class with error codes and metadata
- **Exponential Backoff** - Automatic retry with exponential backoff + jitter
- **Circuit Breaker** - Prevent cascading failures with automatic recovery
- **HTTP Retry Logic** - Smart retry for 5xx errors and rate limits
- **Timeout Support** - Wrap operations with configurable timeouts
- **Retry Decorators** - TypeScript decorators for automatic retry
- **Batch Operations** - Retry multiple operations with shared circuit breaker
- **Hono Middleware** - Error handling middleware for Hono apps

## Installation

```bash
npm install @moltbeat/errors
```

## Quick Start

### Basic Retry

```typescript
import { retryWithBackoff } from '@moltbeat/errors';

const data = await retryWithBackoff(
  async () => await fetch('https://api.example.com/data'),
  {
    maxRetries: 3,
    initialDelay: 1000,
    onRetry: (error, attempt, delay) => {
      console.log(`Retry ${attempt} after ${delay}ms`);
    },
  }
);
```

### HTTP Retry

```typescript
import { retryWithBackoff, httpShouldRetry, MoltBeatError } from '@moltbeat/errors';

const fetchData = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new MoltBeatError({
      code: 'HTTP_ERROR',
      message: `HTTP ${response.status}`,
      statusCode: response.status,
      isRetryable: response.status >= 500 || response.status === 429,
    });
  }

  return response.json();
};

const data = await retryWithBackoff(
  () => fetchData('https://api.example.com/data'),
  {
    maxRetries: 5,
    shouldRetry: (error) => httpShouldRetry(error, error.statusCode),
  }
);
```

### Circuit Breaker

```typescript
import { CircuitBreaker } from '@moltbeat/errors';

const breaker = new CircuitBreaker(
  10, // threshold: 10 consecutive failures
  60000 // timeout: 60 seconds recovery
);

for (let i = 0; i < 100; i++) {
  try {
    const result = await breaker.execute(() => callExternalApi());
    console.log('Success:', result);
  } catch (error) {
    console.error('Failed:', error);
  }
}

// Check circuit breaker state
const metrics = breaker.getMetrics();
console.log('State:', metrics.state); // 'closed' | 'open' | 'half-open'
console.log('Failures:', metrics.consecutiveFailures);
```

### Retry Decorator

```typescript
import { Retryable } from '@moltbeat/errors';

class ApiClient {
  @Retryable({
    maxRetries: 3,
    initialDelay: 1000,
  })
  async fetchPosts(): Promise<Post[]> {
    const response = await fetch('https://api.example.com/posts');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

const client = new ApiClient();
const posts = await client.fetchPosts(); // Automatic retry
```

### Timeout

```typescript
import { withTimeout } from '@moltbeat/errors';

const data = await retryWithBackoff(
  () => withTimeout(
    async () => await slowOperation(),
    5000, // 5 second timeout
    'Operation timed out'
  ),
  { maxRetries: 3 }
);
```

## API Reference

### `retryWithBackoff<T>(fn, options): Promise<T>`

Retry a function with exponential backoff.

**Options:**
- `maxRetries` (number, default: 5) - Maximum retry attempts
- `initialDelay` (number, default: 1000) - Initial delay in ms
- `maxDelay` (number, default: 30000) - Maximum delay in ms
- `backoffMultiplier` (number, default: 2) - Backoff multiplier
- `shouldRetry` (function) - Custom retry predicate
- `onRetry` (function) - Callback for each retry

### `createRetryable<Args, Result>(fn, options)`

Create a retryable version of a function.

```typescript
const fetchWithRetry = createRetryable(
  async (url: string) => await fetch(url),
  { maxRetries: 3 }
);

const data = await fetchWithRetry('https://api.example.com');
```

### `CircuitBreaker`

**Constructor:**
```typescript
new CircuitBreaker(threshold, timeout, halfOpenAttempts)
```

**Methods:**
- `execute<T>(fn): Promise<T>` - Execute function with circuit breaker
- `getState()` - Get current state ('closed' | 'open' | 'half-open')
- `getMetrics()` - Get circuit breaker metrics
- `reset()` - Reset circuit breaker

**Metrics:**
```typescript
{
  state: 'closed' | 'open' | 'half-open',
  failures: number,
  successes: number,
  consecutiveFailures: number,
  lastFailureTime: number | null,
  lastSuccessTime: number | null,
  totalCalls: number
}
```

### `httpShouldRetry(error, statusCode): boolean`

HTTP-specific retry predicate. Retries on:
- 5xx server errors
- 429 (Too Many Requests)
- 408 (Request Timeout)
- Network errors (ECONNREFUSED, ETIMEDOUT, etc.)

### `withTimeout<T>(fn, timeoutMs, errorMessage): Promise<T>`

Wrap async function with timeout.

### `@Retryable(options)`

TypeScript decorator for automatic retry.

### `BatchRetry`

Retry multiple operations with shared circuit breaker.

```typescript
const batchRetry = new BatchRetry(
  { maxRetries: 3 },
  10 // circuit breaker threshold
);

const operations = [
  () => fetch('https://api.example.com/1'),
  () => fetch('https://api.example.com/2'),
  () => fetch('https://api.example.com/3'),
];

const results = await batchRetry.executeAll(operations);

results.forEach((result, i) => {
  if (result instanceof Error) {
    console.error(`Operation ${i} failed:`, result);
  } else {
    console.log(`Operation ${i} succeeded:`, result);
  }
});
```

## MoltBeatError

```typescript
import { MoltBeatError } from '@moltbeat/errors';

throw new MoltBeatError({
  code: 'RESOURCE_NOT_FOUND',
  message: 'Agent not found',
  statusCode: 404,
  isRetryable: false,
  metadata: { agentId: '123' },
});
```

**Properties:**
- `code` (string) - Error code
- `message` (string) - Error message
- `statusCode` (number) - HTTP status code
- `isRetryable` (boolean) - Whether error is retryable
- `metadata` (object) - Additional context

## Hono Middleware

```typescript
import { Hono } from 'hono';
import { honoErrorHandler } from '@moltbeat/errors';

const app = new Hono();

// ... routes

app.onError(honoErrorHandler);
```

## Examples

### Twitter/X API Integration

```typescript
import { Retryable, CircuitBreaker, httpShouldRetry } from '@moltbeat/errors';

class TwitterApiClient {
  private breaker = new CircuitBreaker(10, 120000);

  @Retryable({
    maxRetries: 5,
    initialDelay: 5000,
    maxDelay: 60000,
    shouldRetry: (error) => httpShouldRetry(error, error.statusCode),
    onRetry: (error, attempt, delay) => {
      if (error.statusCode === 429) {
        console.log(`Rate limited - retry ${attempt} after ${delay}ms`);
      }
    },
  })
  async getTweet(tweetId: string) {
    return this.breaker.execute(async () => {
      const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`);

      if (response.status === 429) {
        throw new MoltBeatError({
          code: 'RATE_LIMITED',
          message: 'Twitter rate limit exceeded',
          statusCode: 429,
          isRetryable: true,
        });
      }

      if (!response.ok) {
        throw new MoltBeatError({
          code: 'TWITTER_API_ERROR',
          message: `HTTP ${response.status}`,
          statusCode: response.status,
          isRetryable: response.status >= 500,
        });
      }

      return response.json();
    });
  }
}
```

### Database Query Retry

```typescript
import { retryWithBackoff } from '@moltbeat/errors';

const queryWithRetry = async (sql: string) => {
  return retryWithBackoff(
    async () => await prisma.$queryRaw(sql),
    {
      maxRetries: 3,
      initialDelay: 500,
      shouldRetry: (error) => {
        // Retry on connection errors
        return error.code === 'P1001' || error.code === 'P1017';
      },
    }
  );
};
```

## Best Practices

1. **Use appropriate retry limits** - Don't retry indefinitely
2. **Add jitter** - Automatically included to prevent thundering herd
3. **Monitor circuit breakers** - Track metrics and alert on open circuits
4. **Set timeouts** - Combine retry with timeout for better control
5. **Log retries** - Use `onRetry` callback for observability
6. **Handle rate limits** - Use longer delays for 429 errors
7. **Circuit breaker for critical services** - Prevent cascading failures

## License

MIT
