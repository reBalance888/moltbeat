# @moltbeat/cache

Redis cache layer for MoltBeat with Upstash.

## Features

- ✅ Upstash Redis integration (serverless-friendly)
- ✅ Specialized cache managers (Agent, Post, Metrics)
- ✅ Generic CacheManager for custom use cases
- ✅ Automatic key namespacing
- ✅ TTL management
- ✅ Pattern-based invalidation
- ✅ Sorted sets for leaderboards
- ✅ Hash support for complex objects
- ✅ Pipeline support for batch operations

## Installation

```bash
pnpm add @moltbeat/cache
```

## Setup

Create `.env` file:
```env
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

## Usage

### Generic Cache Manager

```typescript
import { CacheManager } from '@moltbeat/cache'

const cache = new CacheManager({ namespace: 'myapp' })

// Get/Set
await cache.set('user:123', { name: 'John', age: 30 }, 3600) // 1 hour TTL
const user = await cache.get('user:123')

// Get or set pattern
const data = await cache.getOrSet('expensive-data', async () => {
  // Fetch from DB or API
  return await fetchExpensiveData()
}, 1800)

// Check existence
const exists = await cache.exists('user:123')

// Delete
await cache.del('user:123')
await cache.delMany(['user:123', 'user:456'])

// Invalidate by pattern
await cache.invalidatePattern('user:*') // Deletes all user:* keys
```

### Agent Cache

```typescript
import { AgentCache } from '@moltbeat/cache'

const agentCache = new AgentCache()

// Cache agent profile
await agentCache.setAgent({
  id: 'agent-123',
  name: 'moltbot',
  karma: 1000,
  followerCount: 500,
  followingCount: 100,
  isActive: true,
  lastSynced: new Date().toISOString(),
}, 3600)

// Get agent by ID or name
const agent = await agentCache.getAgent('agent-123')
const agentByName = await agentCache.getAgentByName('moltbot')

// Cache leaderboards
await agentCache.cacheTopByKarma([
  { id: 'a1', name: 'bot1', karma: 1000, ... },
  { id: 'a2', name: 'bot2', karma: 800, ... },
], 1800)

const topAgents = await agentCache.getTopByKarma(10) // ['a1', 'a2', ...]

// Invalidate
await agentCache.invalidateAgent('agent-123', 'moltbot')
```

### Post Cache

```typescript
import { PostCache } from '@moltbeat/cache'

const postCache = new PostCache()

// Cache single post
await postCache.setPost({
  id: 'post-123',
  submolt: 'general',
  title: 'Hello World',
  content: 'Content here',
  authorId: 'agent-123',
  upvotes: 10,
  downvotes: 2,
  commentCount: 5,
  createdAt: new Date().toISOString(),
  engagement: 15,
}, 1800)

const post = await postCache.getPost('post-123')

// Cache feed
await postCache.cacheFeed('general', [post1, post2, post3], 600)
const feed = await postCache.getFeed('general')

// Cache trending
await postCache.cacheTrending([
  { id: 'p1', engagement: 100, ... },
  { id: 'p2', engagement: 80, ... },
], 24, 600)

const trending = await postCache.getTrending(24, 10) // ['p1', 'p2', ...]

// Invalidate
await postCache.invalidatePost('post-123')
await postCache.invalidateFeed('general')
await postCache.invalidateAllFeeds()
```

### Metrics Cache

```typescript
import { MetricsCache } from '@moltbeat/cache'

const metricsCache = new MetricsCache()

// Cache agent metrics
await metricsCache.cacheAgentMetrics('agent-123', {
  timestamp: new Date().toISOString(),
  karma: 1000,
  followers: 500,
  avgEngagement: 12.5,
  sentimentScore: 0.75,
}, 900)

const metrics = await metricsCache.getAgentMetrics('agent-123')

// Cache dashboard data
await metricsCache.cacheDashboard({
  totalAgents: 1000,
  activePosts: 500,
  avgEngagement: 10.2,
  topAgents: [...],
}, 300)

const dashboard = await metricsCache.getDashboard()

// Cache viral content
await metricsCache.cacheViralContent([
  { postId: 'p1', viralityScore: 0.9 },
  { postId: 'p2', viralityScore: 0.85 },
], 900)

const viral = await metricsCache.getViralContent()

// Invalidate
await metricsCache.invalidateAgentMetrics('agent-123')
await metricsCache.invalidateContentMetrics('post-123')
```

### Advanced: Sorted Sets

```typescript
const cache = new CacheManager({ namespace: 'app' })

// Add to sorted set (score, member)
await cache.zadd('leaderboard', 100, 'user1')
await cache.zadd('leaderboard', 200, 'user2')
await cache.zadd('leaderboard', 150, 'user3')

// Get top members (highest scores)
const top3 = await cache.zrevrange('leaderboard', 0, 2)
// ['user2', 'user3', 'user1']

// Get with scores
const withScores = await cache.zrevrangeWithScores('leaderboard', 0, 2)
// [{ member: 'user2', score: 200 }, { member: 'user3', score: 150 }, ...]

// Remove member
await cache.zrem('leaderboard', 'user1')

// Get set size
const size = await cache.zcard('leaderboard')
```

### Advanced: Hashes

```typescript
const cache = new CacheManager({ namespace: 'app' })

// Set hash field
await cache.hset('user:123', 'name', 'John')
await cache.hset('user:123', 'age', 30)

// Get hash field
const name = await cache.hget('user:123', 'name')

// Get all fields
const user = await cache.hgetall('user:123')
// { name: 'John', age: 30 }

// Delete field
await cache.hdel('user:123', 'age')
```

### Batch Operations

```typescript
const cache = new CacheManager({ namespace: 'app' })

// Get multiple keys
const values = await cache.mget(['user:1', 'user:2', 'user:3'])

// Set multiple keys
await cache.mset({
  'user:1': { name: 'John' },
  'user:2': { name: 'Jane' },
  'user:3': { name: 'Bob' },
}, 3600)
```

### TTL Management

```typescript
const cache = new CacheManager({ namespace: 'app' })

// Set with TTL
await cache.set('key', 'value', 3600)

// Get remaining TTL
const ttl = await cache.ttl('key') // seconds remaining

// Set expiration on existing key
await cache.expire('key', 7200)

// Remove expiration
await cache.persist('key')
```

### Counters

```typescript
const cache = new CacheManager({ namespace: 'app' })

// Increment
await cache.incr('views:post:123') // 1
await cache.incr('views:post:123') // 2

// Decrement
await cache.decr('likes:post:123')

// Increment by value
await cache.incrBy('score:user:1', 10)
```

## Cache Strategy Recommendations

### Agent Profiles
- **TTL:** 1 hour (3600s)
- **Invalidate:** On agent update

### Posts
- **TTL:** 30 minutes (1800s)
- **Invalidate:** On post update, vote, or comment

### Feeds
- **TTL:** 10 minutes (600s)
- **Invalidate:** On new post in submolt

### Trending
- **TTL:** 10 minutes (600s)
- **Recalculate:** Every 5-10 minutes

### Metrics/Analytics
- **TTL:** 5-15 minutes (300-900s)
- **Invalidate:** After new metric computation

### Dashboard
- **TTL:** 5 minutes (300s)
- **Invalidate:** On major data updates

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test
```

## Environment Variables

```env
# Required
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

## License

MIT
