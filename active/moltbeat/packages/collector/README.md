# @moltbeat/collector

Data collector service for MoltBeat - orchestrates data collection from Moltbook API.

## Features

- ✅ Automated data collection from Moltbook
- ✅ Agent profile synchronization
- ✅ Post and comment collection
- ✅ Metrics computation
- ✅ Sentiment analysis integration
- ✅ Cron-based scheduling
- ✅ Batch processing with progress tracking
- ✅ Cache layer integration
- ✅ Error handling and retry logic

## Installation

```bash
pnpm add @moltbeat/collector
```

## Usage

### As a Scheduled Service

```typescript
import { Scheduler } from '@moltbeat/collector'

const scheduler = new Scheduler(
  {
    moltbookApiKey: process.env.MOLTBOOK_API_KEY!,
    collectAgents: true,
    collectPosts: true,
    collectMetrics: true,
    analyzeSentiment: true,
    submolts: ['general', 'tech', 'announcements'],
    maxAgents: 100,
    maxPosts: 50,
  },
  {
    cronExpression: '0 */5 * * *', // Every 5 hours
    runOnStartup: true,
    onComplete: async (stats) => {
      console.log('Collection completed:', stats)
    },
    onError: (error) => {
      console.error('Collection failed:', error)
    },
  }
)

await scheduler.start()
```

### Manual Collection

```typescript
import { DataCollector } from '@moltbeat/collector'

const collector = new DataCollector({
  moltbookApiKey: process.env.MOLTBOOK_API_KEY!,
  collectAgents: true,
  collectPosts: true,
  collectMetrics: true,
  analyzeSentiment: true,
})

await collector.initialize()

const stats = await collector.collect()

console.log('Collection stats:', stats)
// {
//   agentsCollected: 50,
//   postsCollected: 200,
//   commentsCollected: 0,
//   metricsComputed: 50,
//   sentimentAnalyzed: 200,
//   errors: 0,
//   duration: 45000
// }
```

### Run as CLI

```bash
# Set environment variables
export MOLTBOOK_API_KEY="your-api-key"
export DATABASE_URL="postgresql://..."
export UPSTASH_REDIS_REST_URL="https://..."
export UPSTASH_REDIS_REST_TOKEN="..."

# Optional: Custom cron schedule
export COLLECTOR_CRON="0 */3 * * *" # Every 3 hours

# Run collector
pnpm start
```

## Configuration

### CollectorConfig

```typescript
interface CollectorConfig {
  moltbookApiKey: string         // Required
  collectAgents?: boolean         // Default: false
  collectPosts?: boolean          // Default: false
  collectMetrics?: boolean        // Default: false
  analyzeSentiment?: boolean      // Default: false
  submolts?: string[]             // Submolts to collect from
  maxAgents?: number              // Max agents to sync per run
  maxPosts?: number               // Max posts per submolt
}
```

### ScheduleConfig

```typescript
interface ScheduleConfig {
  cronExpression?: string         // Default: '0 */5 * * *'
  runOnStartup?: boolean          // Default: false
  onComplete?: (stats) => void
  onError?: (error) => void
}
```

## Cron Expression Examples

```typescript
'*/5 * * * *'     // Every 5 minutes
'0 * * * *'       // Every hour
'0 */3 * * *'     // Every 3 hours
'0 */6 * * *'     // Every 6 hours
'0 0 * * *'       // Daily at midnight
'0 0 */2 * *'     // Every 2 days
'0 9,17 * * *'    // Daily at 9 AM and 5 PM
```

## Collection Flow

1. **Agent Collection**
   - Fetches stale agents from database (not synced in 1 hour)
   - Updates from Moltbook API
   - Upserts to database
   - Updates cache

2. **Post Collection**
   - Fetches latest posts for configured submolts
   - Upserts posts and creates agent records if needed
   - Caches feeds per submolt

3. **Metrics Computation**
   - Calculates metrics for active agents
   - Computes engagement scores
   - Aggregates sentiment scores
   - Saves to database and cache

4. **Sentiment Analysis**
   - Finds posts without sentiment analysis
   - Batch processes with Transformers.js
   - Extracts keywords
   - Saves results to database

## Scheduler API

```typescript
const scheduler = new Scheduler(collectorConfig, scheduleConfig)

// Start scheduler
await scheduler.start()

// Stop scheduler
scheduler.stop()

// Run collection manually
const stats = await scheduler.runNow()

// Get status
const status = scheduler.getStatus()
// {
//   isRunning: true,
//   cronExpression: '0 */5 * * *',
//   lastRun: Date,
//   lastStats: CollectorStats,
//   collectorStatus: { isRunning: false, config: {...} }
// }
```

## DataCollector API

```typescript
const collector = new DataCollector(config)

// Initialize (required before collect)
await collector.initialize()

// Run collection
const stats = await collector.collect()

// Get status
const status = collector.getStatus()
```

## Example: Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV COLLECTOR_CRON="0 */3 * * *"

CMD ["pnpm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  collector:
    build: .
    environment:
      - MOLTBOOK_API_KEY=${MOLTBOOK_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
      - UPSTASH_REDIS_REST_URL=${UPSTASH_REDIS_REST_URL}
      - UPSTASH_REDIS_REST_TOKEN=${UPSTASH_REDIS_REST_TOKEN}
      - COLLECTOR_CRON=0 */3 * * *
    restart: unless-stopped
```

## Monitoring

The collector logs detailed information:

```
=== Starting collection at 2024-01-31T10:00:00.000Z ===
Collecting agents...
Collected 50 agents
Collecting posts...
Collected 200 posts
Computing metrics...
Computed 50 metrics
Analyzing sentiments...
Sentiment analysis progress: 200/200
Analyzed 200 sentiments
Collection completed:
  - Agents collected: 50
  - Posts collected: 200
  - Metrics computed: 50
  - Sentiments analyzed: 200
  - Errors: 0
  - Duration: 45.23s
```

## Error Handling

Errors are logged but don't stop the collection:

```typescript
// Continues even if agent sync fails
for (const agent of agents) {
  try {
    await syncAgent(agent)
  } catch (error) {
    console.error(`Error syncing agent ${agent.name}:`, error)
    // Continue with next agent
  }
}
```

## Performance

- **Agents:** ~2-3 per second
- **Posts:** ~5-10 per second
- **Metrics:** ~1-2 per second (includes DB queries)
- **Sentiment:** ~10-20 per second (local ML)

Typical collection time for:
- 100 agents: ~30-50 seconds
- 500 posts: ~50-100 seconds
- 100 metrics: ~50-100 seconds
- 500 sentiments: ~25-50 seconds

**Total:** ~3-5 minutes for full collection

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Run CLI
pnpm start
```

## License

MIT
