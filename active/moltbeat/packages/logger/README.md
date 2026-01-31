# @moltbeat/logger

Structured logging with request context and performance metrics for MoltBeat API.

## Features

- **Structured JSON Logging** - Pino-based logging with configurable levels
- **Request Context** - Correlation IDs for request tracing
- **Performance Metrics** - Automatic request duration tracking
- **Sensitive Data Redaction** - Auto-redact passwords, tokens, API keys
- **Log Aggregation** - Built-in metrics (total requests, errors, avg duration)
- **Development Mode** - Pretty console output with colors
- **Production Ready** - JSON output for log aggregation systems

## Installation

```bash
npm install @moltbeat/logger
```

## Usage

### Basic Logger

```typescript
import { logger } from '@moltbeat/logger';

logger.info('Server started');
logger.error({ err: error }, 'Request failed');
logger.debug({ user: userId }, 'Processing request');
```

### Request Logger with Context

```typescript
import { RequestLogger, generateCorrelationId } from '@moltbeat/logger';

const reqLogger = new RequestLogger({
  correlationId: generateCorrelationId(),
  userId: '123',
  path: '/api/agents',
  method: 'GET',
  ip: '192.168.1.1',
});

reqLogger.info('Processing request');
reqLogger.complete(200, { itemsReturned: 10 });
```

### Hono Middleware

```typescript
import { Hono } from 'hono';
import { loggingMiddleware, getLogger } from '@moltbeat/logger';

const app = new Hono();

// Add logging middleware
app.use('*', loggingMiddleware({
  skipPaths: ['/health', '/ping'],
  logBody: false,
  enableMetrics: true,
}));

// Use logger in routes
app.get('/api/users', async (c) => {
  const logger = getLogger(c);
  logger.info('Fetching users');

  // ... your logic

  return c.json({ users });
});
```

### Performance Tracking

```typescript
import { PerformanceTimer } from '@moltbeat/logger';

const timer = new PerformanceTimer();

// Mark checkpoints
await fetchData();
timer.mark('data-fetched');

await processData();
timer.mark('data-processed');

logger.info('Operation completed', {
  marks: timer.getMarks(), // { 'data-fetched': 150, 'data-processed': 300 }
  total: timer.getDuration(), // 300
});
```

### Log Metrics

```typescript
import { getLogMetrics, resetLogMetrics } from '@moltbeat/logger';

// Get aggregated metrics
const metrics = getLogMetrics();
console.log(metrics);
// {
//   totalRequests: 1250,
//   errors: 15,
//   warnings: 42,
//   averageDuration: 125,
//   maxDuration: 1500,
//   minDuration: 10
// }

// Reset metrics (useful for testing)
resetLogMetrics();
```

## Configuration

### Environment Variables

- `LOG_LEVEL` - Log level (trace, debug, info, warn, error, fatal). Default: `info`
- `NODE_ENV` - Environment (development, production). Affects output format.

### Logger Config

```typescript
import { createLogger } from '@moltbeat/logger';

const logger = createLogger({
  level: 'debug',
  pretty: true, // Pretty output (default: true in dev, false in prod)
  redact: ['password', 'apiKey'], // Fields to redact
  destination: './logs/app.log', // Log file path
});
```

### Middleware Config

```typescript
loggingMiddleware({
  skipPaths: ['/health', '/ping'], // Don't log these paths
  logBody: false, // Log request body (careful with sensitive data)
  logResponse: false, // Log response body (can be verbose)
  enableMetrics: true, // Track request metrics
});
```

## Log Rotation

### Using logrotate (Linux)

Create `/etc/logrotate.d/moltbeat`:

```
/var/log/moltbeat/*.log {
  daily
  rotate 30
  size 10M
  compress
  delaycompress
  notifempty
  create 0640 node node
}
```

### Using pino-rotating-file-stream

```bash
npm install pino-rotating-file-stream
```

```typescript
import rfs from 'pino-rotating-file-stream';
import { createLogger } from '@moltbeat/logger';

const stream = rfs.createStream({
  path: './logs',
  size: '10M',
  interval: '1d',
  compress: true,
});

const logger = createLogger({ destination: stream });
```

## Output Format

### Development (Pretty)

```
[2025-01-31 12:00:00] INFO - Server started
[2025-01-31 12:00:01] INFO - Request completed in 125ms { statusCode: 200, duration: 125 }
[2025-01-31 12:00:02] ERROR - Request failed { err: { message: "Database error" } }
```

### Production (JSON)

```json
{"level":"info","time":"2025-01-31T12:00:00.000Z","env":"production","msg":"Server started"}
{"level":"info","time":"2025-01-31T12:00:01.000Z","correlationId":"abc123","statusCode":200,"duration":125,"msg":"Request completed in 125ms"}
{"level":"error","time":"2025-01-31T12:00:02.000Z","err":{"message":"Database error"},"msg":"Request failed"}
```

## Security

**Automatic redaction** of sensitive fields:
- `password`
- `apiKey`
- `secret`
- `token`
- `authorization`
- `req.headers.authorization`

You can add custom redaction rules:

```typescript
createLogger({
  redact: ['customSecret', 'user.ssn'],
});
```

## Best Practices

1. **Use correlation IDs** - Track requests across services
2. **Don't log sensitive data** - Passwords, tokens, PII
3. **Use appropriate log levels**:
   - `debug` - Detailed debugging info
   - `info` - General info (requests, state changes)
   - `warn` - Potential issues (slow queries, deprecated APIs)
   - `error` - Errors that need attention
   - `fatal` - Critical errors requiring immediate action
4. **Add context** - Include relevant data (user ID, request ID)
5. **Monitor metrics** - Track error rates and performance

## License

MIT
