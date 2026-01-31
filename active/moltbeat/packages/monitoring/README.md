# @moltbeat/monitoring

Error tracking and performance monitoring with Sentry for MoltBeat API.

## Features

- **Sentry Integration** - Automatic error tracking and reporting
- **Performance Monitoring** - Transaction tracing and profiling
- **Alert Rules** - Pre-configured alerts for critical errors
- **Error Budget** - Track error rate and SLO compliance
- **Hono Middleware** - Easy integration with Hono apps
- **Context Tracking** - Correlation IDs, user context, breadcrumbs
- **Source Maps** - Production error mapping

## Installation

```bash
npm install @moltbeat/monitoring
```

## Quick Start

### Initialize Sentry

```typescript
import { initSentry } from '@moltbeat/monitoring';

initSentry({
  dsn: process.env.SENTRY_DSN!,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.RELEASE_VERSION,
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1, // 10% profiling
});
```

### Add Middleware

```typescript
import { Hono } from 'hono';
import { sentryMiddleware, performanceMiddleware } from '@moltbeat/monitoring';

const app = new Hono();

// Add Sentry middleware FIRST
app.use('*', sentryMiddleware());
app.use('*', performanceMiddleware(1000)); // Alert on >1s requests

// ... your routes
```

### Capture Errors

```typescript
import { captureException, captureMessage } from '@moltbeat/monitoring';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    operation: 'riskyOperation',
    userId: '123',
  });
  throw error;
}

// Or capture message
captureMessage('Something interesting happened', 'info', {
  action: 'user_login',
});
```

## Configuration

### Environment Variables

```bash
# Required
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Optional
NODE_ENV=production
RELEASE_VERSION=1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

### Sentry Config

```typescript
initSentry({
  dsn: string,                     // Sentry DSN (required)
  environment: string,             // 'development' | 'production'
  release: string,                 // Version identifier
  sampleRate: number,              // Error sampling (0-1, default: 1.0)
  tracesSampleRate: number,        // Transaction sampling (0-1, default: 0.1)
  profilesSampleRate: number,      // Profiling sampling (0-1, default: 0.1)
  enableProfiling: boolean,        // Enable profiling (default: true)
  beforeSend: (event) => event,    // Filter/transform events
});
```

## API Reference

### Error Tracking

```typescript
// Capture exception
captureException(error: Error, context?: Record<string, unknown>): void

// Capture message
captureMessage(
  message: string,
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug',
  context?: Record<string, unknown>
): void

// Set user context
setUser(user: { id: string; email?: string; username?: string }): void

// Add breadcrumb
addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category?: string
): void
```

### Performance Monitoring

```typescript
// Start transaction
const transaction = startTransaction('operation-name', 'http.server', {
  userId: '123',
});

// ... do work

transaction.finish();

// Performance middleware (auto-tracks slow requests)
performanceMiddleware(slowThreshold: number = 1000)
```

### Tags and Context

```typescript
// Set tag
setTag('environment', 'production');

// Set multiple tags
setTags({
  version: '1.0.0',
  region: 'us-east-1',
});

// Set context
setContext('user', {
  id: '123',
  subscription: 'premium',
});
```

## Alert Rules

Pre-configured alert rules automatically categorize errors:

```typescript
import { configureAlerts, ALERT_RULES } from '@moltbeat/monitoring';

// Use default rules
configureAlerts();

// Or custom rules
configureAlerts([
  {
    name: 'Critical Database Error',
    condition: (event) => event.message?.includes('database'),
    severity: 'fatal',
    notify: true,
  },
]);
```

**Default Alert Rules:**
- High Error Rate
- Database Connection Failed
- API Rate Limit (429)
- Slow Query (>5s)
- Memory Leak

## Error Budget

Track error rate and SLO compliance:

```typescript
import { globalErrorBudget } from '@moltbeat/monitoring';

// Record request
globalErrorBudget.recordRequest(isError: boolean);

// Check budget
const metrics = globalErrorBudget.getMetrics();
console.log('Error rate:', metrics.errorRate);
console.log('Budget exceeded:', metrics.budgetExceeded);

// Custom error budget
import { ErrorBudget } from '@moltbeat/monitoring';

const budget = new ErrorBudget(
  0.01, // 1% error rate
  3600000 // 1 hour window
);

budget.recordRequest(false); // Success
budget.recordRequest(true);  // Error

if (budget.isBudgetExceeded()) {
  console.warn('Error budget exceeded!');
}
```

## Middleware

### Sentry Middleware

Automatically tracks requests and errors:

```typescript
app.use('*', sentryMiddleware());
```

**Features:**
- Creates transaction per request
- Sets request context (method, URL, headers)
- Captures user from auth middleware
- Adds breadcrumbs
- Captures uncaught errors

### Performance Middleware

Tracks slow requests:

```typescript
app.use('*', performanceMiddleware(1000)); // 1 second threshold
```

**Features:**
- Measures request duration
- Alerts on slow requests
- Adds `X-Response-Time` header
- Creates Sentry breadcrumbs

### Request ID Middleware

Adds correlation IDs:

```typescript
import { requestIdMiddleware } from '@moltbeat/monitoring';

app.use('*', requestIdMiddleware());
```

## Production Setup

### 1. Generate Source Maps

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "sourceMap": true,
    "inlineSources": true
  }
}
```

### 2. Upload Source Maps

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Upload source maps
sentry-cli sourcemaps upload \
  --org your-org \
  --project moltbeat-api \
  --release $RELEASE_VERSION \
  ./dist
```

### 3. Set Release Version

```bash
# In your deployment
export RELEASE_VERSION=$(git rev-parse --short HEAD)
```

### 4. Configure Alerts

In Sentry dashboard:
1. Go to **Alerts** → **Create Alert Rule**
2. Set conditions:
   - Error count > 100 in 1 hour
   - New issue created
   - Regression detected
3. Configure notifications (email, Slack, PagerDuty)

## Integration Examples

### With Logging

```typescript
import { RequestLogger } from '@moltbeat/logger';
import { captureException, addBreadcrumb } from '@moltbeat/monitoring';

const logger = new RequestLogger({ correlationId: '123' });

try {
  await fetchData();
} catch (error) {
  logger.error('Failed to fetch data', error);
  captureException(error, { operation: 'fetchData' });
  throw error;
}
```

### With Circuit Breaker

```typescript
import { CircuitBreaker } from '@moltbeat/errors';
import { captureMessage } from '@moltbeat/monitoring';

const breaker = new CircuitBreaker(10, 60000);

breaker.on('open', () => {
  captureMessage('Circuit breaker opened', 'warning', {
    service: 'external-api',
  });
});
```

### With Rate Limiter

```typescript
import { rateLimiter } from '@moltbeat/rate-limiter';
import { captureMessage } from '@moltbeat/monitoring';

app.use('*', rateLimiter({
  onRateLimit: (req) => {
    captureMessage('Rate limit exceeded', 'warning', {
      ip: req.ip,
      path: req.path,
    });
  },
}));
```

## Best Practices

1. **Set environment correctly** - Use 'production', 'staging', 'development'
2. **Use sampling in production** - 10% traces, 10% profiles to reduce costs
3. **Add context** - User ID, correlation ID, request data
4. **Filter sensitive data** - Use `beforeSend` to redact secrets
5. **Upload source maps** - Essential for readable stack traces
6. **Set up alerts** - Critical errors, high error rate, performance issues
7. **Monitor error budget** - Track SLO compliance
8. **Add breadcrumbs** - Help debug issues with event timeline

## Troubleshooting

### Errors not appearing in Sentry

- Check `SENTRY_DSN` is set correctly
- Ensure `enabled: true` in production
- Check `sampleRate` (should be 1.0 for all errors)
- Verify network connectivity to Sentry

### Source maps not working

- Ensure `sourceMap: true` in tsconfig.json
- Upload source maps with correct release version
- Match release version in code and Sentry CLI

### High costs

- Reduce `tracesSampleRate` (default: 0.1 is good)
- Reduce `profilesSampleRate` (default: 0.1)
- Filter noisy errors in `beforeSend`
- Set quotas in Sentry dashboard

## License

MIT
