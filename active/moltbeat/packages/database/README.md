# @moltbeat/database

Database layer for MoltBeat with Prisma and Supabase PostgreSQL.

## Features

- ✅ Prisma ORM with full type safety
- ✅ Supabase PostgreSQL backend
- ✅ Repository pattern for clean data access
- ✅ Comprehensive schema for analytics
- ✅ Automatic timestamps and indices
- ✅ Migration support

## Schema Overview

### Moltbook Cache
- **Agent** - Cached agent data from Moltbook
- **Post** - Cached posts with engagement metrics
- **Comment** - Cached comments

### Analytics
- **AgentMetrics** - Time-series agent performance data
- **ContentMetrics** - Time-series content performance data
- **TrendingTopic** - Trending topics and growth rates
- **SentimentAnalysis** - Sentiment analysis results

### Alerts
- **Alert** - System alerts (spikes, anomalies, trends)

### B2B / Users
- **User** - B2B users
- **Subscription** - Stripe subscriptions
- **BrandMonitor** - Brand monitoring configurations

### Crypto Intelligence
- **TokenMetrics** - Token price and sentiment metrics
- **MoltbookEconomyIndex** - Overall economy health metrics

## Installation

```bash
pnpm add @moltbeat/database
```

## Setup

1. Create `.env` file:
```env
DATABASE_URL="postgresql://user:password@host:port/database"
```

2. Generate Prisma Client:
```bash
pnpm prisma:generate
```

3. Run migrations:
```bash
pnpm prisma:migrate
```

## Usage

### Basic Client

```typescript
import { prisma } from '@moltbeat/database'

// Find agent
const agent = await prisma.agent.findUnique({
  where: { name: 'moltbot' }
})

// Create post
const post = await prisma.post.create({
  data: {
    id: 'post-123',
    submolt: 'general',
    title: 'Hello World',
    author: {
      connect: { id: 'agent-123' }
    }
  }
})
```

### Using Repositories

```typescript
import { AgentRepository, PostRepository, prisma } from '@moltbeat/database'

const agentRepo = new AgentRepository(prisma)
const postRepo = new PostRepository(prisma)

// Upsert agent from Moltbook API
await agentRepo.upsert({
  id: 'agent-123',
  name: 'moltbot',
  karma: 100,
  followerCount: 50,
  followingCount: 30,
})

// Get top agents by karma
const topAgents = await agentRepo.getTopByKarma(10)

// Get trending posts
const trending = await postRepo.getTrending(24, 10)

// Get posts needing sync
const stale = await postRepo.needsSync(1800000) // 30 min
```

### Agent Repository

```typescript
const agentRepo = new AgentRepository(prisma)

// Find methods
await agentRepo.findById('agent-123')
await agentRepo.findByName('moltbot')
await agentRepo.findMany({ take: 10, orderBy: { karma: 'desc' } })

// Upsert methods
await agentRepo.upsert({ id: '...', name: '...', karma: 100 })
await agentRepo.upsertMany([agent1, agent2, agent3])

// Analytics
await agentRepo.getTopByKarma(10)
await agentRepo.getTopByFollowers(10)
await agentRepo.getAverageKarma()

// Sync management
await agentRepo.needsSync(3600000) // 1 hour
```

### Post Repository

```typescript
const postRepo = new PostRepository(prisma)

// Find methods
await postRepo.findById('post-123')
await postRepo.getBySubmolt('general', 50)
await postRepo.getByAuthor('agent-123', 20)

// Analytics
await postRepo.getTrending(24, 10) // Last 24h, top 10
await postRepo.getTopByEngagement(10)

// Counts
await postRepo.count()
await postRepo.countBySubmolt('general')

// Cleanup
await postRepo.deleteOld(30) // Delete posts older than 30 days
```

### Metrics Repository

```typescript
const metricsRepo = new MetricsRepository(prisma)

// Agent metrics
await metricsRepo.createAgentMetrics({
  agent: { connect: { id: 'agent-123' } },
  karma: 100,
  followers: 50,
  following: 30,
  postsCount: 10,
  commentsCount: 20,
  avgUpvotes: 5.5,
  avgEngagement: 10.2,
  sentimentScore: 0.75,
})

await metricsRepo.getAgentMetricsHistory(
  'agent-123',
  new Date('2024-01-01'),
  new Date('2024-01-31')
)

// Content metrics
await metricsRepo.createContentMetrics({
  post: { connect: { id: 'post-123' } },
  upvotes: 10,
  downvotes: 2,
  comments: 5,
  engagement: 15.5,
  viralityScore: 0.8,
})

// Analytics
await metricsRepo.getViralContent(0.7, 10)
await metricsRepo.getTopAgentsByEngagement(10)
await metricsRepo.getEngagementStats(startDate, endDate)
await metricsRepo.getAgentGrowth('agent-123', 7)

// Cleanup
await metricsRepo.cleanupOldMetrics(90) // Delete metrics older than 90 days
```

### Alert Repository

```typescript
const alertRepo = new AlertRepository(prisma)

// Create alert
await alertRepo.create({
  type: 'spike',
  severity: 'high',
  title: 'Engagement Spike Detected',
  description: 'Post received 100+ upvotes in 10 minutes',
  postId: 'post-123',
  metadata: {
    upvotes: 120,
    timeWindow: '10m',
  },
})

// Get alerts
await alertRepo.getUnread(20)
await alertRepo.getUnresolved()
await alertRepo.getByType('spike', 10)
await alertRepo.getBySeverity('critical')

// Mark as read/resolved
await alertRepo.markAsRead('alert-123')
await alertRepo.markManyAsRead(['alert-1', 'alert-2'])
await alertRepo.markAsResolved('alert-123')

// Stats
await alertRepo.countUnread()
await alertRepo.countBySeverity()

// Cleanup
await alertRepo.deleteOld(30) // Delete resolved alerts older than 30 days
```

## Prisma Commands

```bash
# Generate Prisma Client
pnpm prisma:generate

# Create migration
pnpm prisma:migrate

# Deploy migrations (production)
pnpm prisma:deploy

# Push schema without migration (dev)
pnpm prisma:push

# Open Prisma Studio
pnpm prisma:studio

# Reset database
pnpm prisma:reset
```

## Type Safety

All database operations are fully typed:

```typescript
import type { Agent, Post, AgentMetrics } from '@moltbeat/database'

const agent: Agent = await agentRepo.findById('agent-123')
const posts: Post[] = await postRepo.getTrending(24, 10)
const metrics: AgentMetrics[] = await metricsRepo.getAgentMetricsHistory(...)
```

## Environment Variables

```env
# Required
DATABASE_URL="postgresql://user:pass@host:port/db?schema=public"

# Optional (for Supabase)
DIRECT_URL="postgresql://user:pass@host:port/db" # Direct connection (bypasses pooler)
```

## Development

```bash
# Install dependencies
pnpm install

# Generate Prisma Client
pnpm prisma:generate

# Build TypeScript
pnpm build

# Watch mode
pnpm dev
```

## Production Deployment

1. Set `DATABASE_URL` environment variable
2. Run migrations: `pnpm prisma:deploy`
3. Build: `pnpm build`

## License

MIT
