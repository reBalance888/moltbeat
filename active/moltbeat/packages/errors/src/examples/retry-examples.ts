/**
 * Retry Logic Examples for External APIs
 */

import {
  retryWithBackoff,
  createRetryable,
  CircuitBreaker,
  httpShouldRetry,
  withTimeout,
  Retryable,
  BatchRetry,
} from '../retry';
import { MoltBeatError } from '../MoltBeatError';

/**
 * Example 1: Simple retry with default options
 */
async function example1_basicRetry() {
  const fetchUser = async (userId: string) => {
    const response = await fetch(`https://api.example.com/users/${userId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.status}`);
    }
    return response.json();
  };

  try {
    const user = await retryWithBackoff(
      () => fetchUser('123'),
      {
        maxRetries: 3,
        initialDelay: 1000,
        onRetry: (error, attempt, delay) => {
          console.log(`Retry attempt ${attempt} after ${delay}ms:`, error.message);
        },
      }
    );
    console.log('User:', user);
  } catch (error) {
    console.error('All retries exhausted:', error);
  }
}

/**
 * Example 2: HTTP-specific retry logic
 */
async function example2_httpRetry() {
  const fetchData = async (url: string) => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new MoltBeatError({
        code: 'HTTP_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
        isRetryable: response.status >= 500 || response.status === 429,
      });
    }

    return response.json();
  };

  try {
    const data = await retryWithBackoff(
      () => fetchData('https://api.example.com/data'),
      {
        maxRetries: 5,
        initialDelay: 2000,
        maxDelay: 30000,
        shouldRetry: (error) => httpShouldRetry(error, error.statusCode),
      }
    );
    console.log('Data:', data);
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
}

/**
 * Example 3: Retry with timeout
 */
async function example3_retryWithTimeout() {
  const slowOperation = async () => {
    // Simulate slow operation
    await new Promise((resolve) => setTimeout(resolve, 10000));
    return 'result';
  };

  try {
    const result = await retryWithBackoff(
      () => withTimeout(slowOperation, 5000, 'Slow operation timed out'),
      {
        maxRetries: 3,
        initialDelay: 1000,
      }
    );
    console.log('Result:', result);
  } catch (error) {
    console.error('Operation failed:', error);
  }
}

/**
 * Example 4: Circuit breaker pattern
 */
async function example4_circuitBreaker() {
  const breaker = new CircuitBreaker(
    5, // threshold: 5 consecutive failures
    60000 // timeout: 1 minute
  );

  const unreliableApi = async () => {
    // Simulate unreliable API
    if (Math.random() > 0.7) {
      return { data: 'success' };
    }
    throw new Error('API error');
  };

  // Make multiple calls
  for (let i = 0; i < 10; i++) {
    try {
      const result = await breaker.execute(unreliableApi);
      console.log(`Call ${i + 1}: Success`, result);
    } catch (error) {
      console.error(`Call ${i + 1}: Failed`, error instanceof Error ? error.message : error);
    }

    // Show circuit breaker state
    const metrics = breaker.getMetrics();
    console.log('Circuit breaker state:', metrics.state);
    console.log('Consecutive failures:', metrics.consecutiveFailures);

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Example 5: Retryable decorator
 */
class ApiClient {
  @Retryable({
    maxRetries: 3,
    initialDelay: 1000,
    shouldRetry: (error) => httpShouldRetry(error, error.statusCode),
  })
  async fetchPosts(): Promise<any[]> {
    const response = await fetch('https://api.example.com/posts');
    if (!response.ok) {
      throw new MoltBeatError({
        code: 'FETCH_FAILED',
        message: `Failed to fetch posts: ${response.status}`,
        statusCode: response.status,
        isRetryable: response.status >= 500,
      });
    }
    return response.json();
  }

  @Retryable({
    maxRetries: 5,
    initialDelay: 2000,
    maxDelay: 30000,
  })
  async fetchAgent(agentId: string): Promise<any> {
    const response = await fetch(`https://api.example.com/agents/${agentId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch agent: ${response.status}`);
    }
    return response.json();
  }
}

async function example5_decorator() {
  const client = new ApiClient();

  try {
    const posts = await client.fetchPosts();
    console.log('Posts:', posts);

    const agent = await client.fetchAgent('agent-123');
    console.log('Agent:', agent);
  } catch (error) {
    console.error('API call failed:', error);
  }
}

/**
 * Example 6: Batch retry with circuit breaker
 */
async function example6_batchRetry() {
  const batchRetry = new BatchRetry(
    {
      maxRetries: 3,
      initialDelay: 1000,
    },
    5 // circuit breaker threshold
  );

  const operations = [
    () => fetch('https://api.example.com/endpoint1').then((r) => r.json()),
    () => fetch('https://api.example.com/endpoint2').then((r) => r.json()),
    () => fetch('https://api.example.com/endpoint3').then((r) => r.json()),
    () => fetch('https://api.example.com/endpoint4').then((r) => r.json()),
  ];

  const results = await batchRetry.executeAll(operations);

  results.forEach((result, index) => {
    if (result instanceof Error) {
      console.error(`Operation ${index + 1} failed:`, result.message);
    } else {
      console.log(`Operation ${index + 1} succeeded:`, result);
    }
  });

  // Show metrics
  console.log('Batch retry metrics:', batchRetry.getMetrics());
}

/**
 * Example 7: Create reusable retryable functions
 */
const fetchWithRetry = createRetryable(
  async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
  }
);

async function example7_reusableRetryable() {
  try {
    const data1 = await fetchWithRetry('https://api.example.com/data1');
    const data2 = await fetchWithRetry('https://api.example.com/data2');

    console.log('Data 1:', data1);
    console.log('Data 2:', data2);
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}

/**
 * Example 8: Twitter/X API integration with retry
 */
class TwitterApiClient {
  private circuitBreaker = new CircuitBreaker(10, 120000); // 2 minute recovery

  @Retryable({
    maxRetries: 5,
    initialDelay: 5000, // Twitter rate limits can be strict
    maxDelay: 60000,
    shouldRetry: (error) => {
      // Retry on rate limits (429) and server errors (5xx)
      return httpShouldRetry(error, error.statusCode);
    },
    onRetry: (error, attempt, delay) => {
      console.log(`Twitter API retry ${attempt}: waiting ${delay}ms`);
      if (error.statusCode === 429) {
        console.log('Rate limited - backing off exponentially');
      }
    },
  })
  async getTweet(tweetId: string): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
        },
      });

      if (response.status === 429) {
        // Rate limited
        const resetTime = response.headers.get('x-rate-limit-reset');
        throw new MoltBeatError({
          code: 'RATE_LIMITED',
          message: `Twitter rate limit exceeded. Reset at ${resetTime}`,
          statusCode: 429,
          isRetryable: true,
        });
      }

      if (!response.ok) {
        throw new MoltBeatError({
          code: 'TWITTER_API_ERROR',
          message: `Twitter API error: ${response.status}`,
          statusCode: response.status,
          isRetryable: response.status >= 500,
        });
      }

      return response.json();
    });
  }

  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics();
  }
}

async function example8_twitterIntegration() {
  const client = new TwitterApiClient();

  try {
    const tweet = await client.getTweet('1234567890');
    console.log('Tweet:', tweet);

    // Monitor circuit breaker
    const metrics = client.getCircuitBreakerMetrics();
    console.log('Twitter API health:', metrics);
  } catch (error) {
    console.error('Failed to fetch tweet:', error);
  }
}

/**
 * Run all examples
 */
export async function runRetryExamples() {
  console.log('=== Example 1: Basic Retry ===');
  await example1_basicRetry();

  console.log('\n=== Example 2: HTTP Retry ===');
  await example2_httpRetry();

  console.log('\n=== Example 3: Retry with Timeout ===');
  await example3_retryWithTimeout();

  console.log('\n=== Example 4: Circuit Breaker ===');
  await example4_circuitBreaker();

  console.log('\n=== Example 5: Decorator ===');
  await example5_decorator();

  console.log('\n=== Example 6: Batch Retry ===');
  await example6_batchRetry();

  console.log('\n=== Example 7: Reusable Retryable ===');
  await example7_reusableRetryable();

  console.log('\n=== Example 8: Twitter Integration ===');
  await example8_twitterIntegration();
}
