# MoltBeat

**Analytics platform for Moltbook** - the world's first AI-only social network.

## 🎯 What is MoltBeat?

MoltBeat provides comprehensive analytics, insights, and monitoring for Moltbook - a social network where only AI agents can participate. Track agent performance, content virality, sentiment trends, and network dynamics in real-time.

## 🏗️ Architecture

```
MoltBeat
├── packages/                 # Shared packages
│   ├── moltbook-client/     # Moltbook API client (TypeScript)
│   ├── database/            # Prisma ORM + Supabase PostgreSQL
│   ├── cache/               # Upstash Redis cache layer
│   ├── sentiment/           # Local ML sentiment analysis (Transformers.js)
│   └── collector/           # Data collection service
│
├── apps/                    # Applications
│   ├── pulse/              # Next.js dashboard (analytics)
│   └── api/                # Public API (Hono)
│
├── bots/                   # Bots
│   └── telegram/           # Telegram alert bot
│
├── agents/                 # AI Agents
│   ├── scout/             # Content discovery
│   ├── analyst/           # Trend analysis
│   ├── curator/           # Best content curation
│   └── moderator/         # Content moderation
│
└── extensions/            # Browser extensions
    └── chrome/           # Chrome extension for Moltbook
```

## ✨ Features

### Core Infrastructure
- ✅ **Moltbook API Client** - Full TypeScript client with rate limiting
- ✅ **Database Layer** - Prisma ORM with 12 models (agents, posts, metrics, etc.)
- ✅ **Cache Layer** - Redis caching with specialized managers
- ✅ **Sentiment Analysis** - Local ML (Transformers.js) - zero API costs!
- ✅ **Data Collector** - Automated collection with cron scheduling

### Analytics & Insights
- 📊 **Pulse Dashboard** - Real-time analytics visualization
- 📈 **Agent Metrics** - Track karma, followers, engagement
- 🔥 **Trending Topics** - Identify viral content and discussions
- 💭 **Sentiment Analysis** - Automatic mood detection
- 🎯 **Content Metrics** - Virality scores, engagement tracking

### Alerts & Tools
- ✅ **Telegram Bot** - Real-time alerts and notifications
- 🔔 **Alert System** - Spike detection, anomalies, trends
- 🌐 **Chrome Extension** - Enhanced Moltbook browsing
- 🔌 **Public API** - Access analytics programmatically

### AI Agent Network
- 🤖 **4 Specialized Agents** - Scout, Analyst, Curator, Moderator
- 🎭 **Autonomous Operation** - 24/7 monitoring and analysis
- 🧠 **Multi-LLM Support** - Claude, GPT-4, Gemini integration

### B2B Products
- 🎯 **MoltBeat Radar** - Brand monitoring and tracking
- 📄 **PDF Reports** - Automated analytics reports
- 💳 **Stripe Billing** - Subscription management (Pro/Enterprise)

### Crypto Intelligence
- 📊 **Token Metrics** - Track MOLT and related tokens
- 💹 **Economy Index** - Overall Moltbook economy health
- 🔗 **DeFi Integration** - CoinGecko, DeFiLlama APIs

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL (or Supabase account)
- Upstash Redis account
- Moltbook API key

### 1. Clone & Install

```bash
git clone https://github.com/reBalance888/moltbeat.git
cd moltbeat
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:
```env
MOLTBOOK_API_KEY=your-api-key
DATABASE_URL=postgresql://...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### 3. Database Setup

```bash
cd packages/database
pnpm prisma:generate
pnpm prisma:migrate
```

### 4. Start Collector

```bash
cd packages/collector
pnpm build
pnpm start
```

The collector will:
- Sync agents from Moltbook every 5 hours
- Collect posts from configured submolts
- Compute engagement metrics
- Analyze sentiment automatically

### 5. Start Telegram Bot (Optional)

```bash
# Get bot token from @BotFather
export TELEGRAM_BOT_TOKEN=your-token

cd bots/telegram
pnpm build
pnpm start
```

### 6. Launch Dashboard (Coming Soon)

```bash
cd apps/pulse
pnpm dev
```

Open http://localhost:3000

## 📦 Packages

### @moltbeat/moltbook-client

TypeScript client for Moltbook API with rate limiting and retry logic.

```typescript
import { MoltbookClient } from '@moltbeat/moltbook-client'

const client = new MoltbookClient({ apiKey: process.env.MOLTBOOK_API_KEY })

const agent = await client.getAgentProfile('moltbot')
const posts = await client.getPosts({ submolt: 'general', limit: 50 })
```

[Full Documentation →](./packages/moltbook-client/README.md)

### @moltbeat/database

Prisma ORM with 12 models and repository pattern.

```typescript
import { AgentRepository, prisma } from '@moltbeat/database'

const agentRepo = new AgentRepository(prisma)
const topAgents = await agentRepo.getTopByKarma(10)
```

[Full Documentation →](./packages/database/README.md)

### @moltbeat/cache

Redis caching with specialized managers (Agent, Post, Metrics).

```typescript
import { AgentCache } from '@moltbeat/cache'

const cache = new AgentCache()
await cache.setAgent({ id: '123', name: 'bot', karma: 100, ... })
const agent = await cache.getAgent('123')
```

[Full Documentation →](./packages/cache/README.md)

### @moltbeat/sentiment

Local sentiment analysis using Transformers.js - zero API costs!

```typescript
import { SentimentAnalyzer } from '@moltbeat/sentiment'

const analyzer = new SentimentAnalyzer()
await analyzer.initialize()

const result = await analyzer.analyze('This is amazing!')
// { sentiment: 'positive', score: 0.9998, ... }
```

[Full Documentation →](./packages/sentiment/README.md)

### @moltbeat/collector

Automated data collection with scheduling.

```typescript
import { Scheduler } from '@moltbeat/collector'

const scheduler = new Scheduler(config, { cronExpression: '0 */5 * * *' })
await scheduler.start()
```

[Full Documentation →](./packages/collector/README.md)

## 🤖 Telegram Bot

Real-time alerts and analytics via Telegram.

**Commands:**
- `/alerts` - View recent alerts
- `/stats` - System statistics
- `/agents` - Top agents by karma
- `/agent <name>` - Agent details
- `/subscribe` - Get notifications

[Full Documentation →](./bots/telegram/README.md)

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Run tests
pnpm -r test

# Clean all
pnpm -r clean
```

### Monorepo Structure

- **pnpm workspaces** - Package management
- **Turborepo** - Build orchestration
- **TypeScript** - Strict mode across all packages
- **Shared packages** - Reusable code

## 📊 Tech Stack

### Backend
- **Node.js** 20+
- **TypeScript** 5.9+
- **Prisma** ORM
- **Supabase** PostgreSQL
- **Upstash** Redis
- **Transformers.js** Local ML

### Frontend (Coming Soon)
- **Next.js** 14 App Router
- **React** 18
- **TailwindCSS** 3
- **Recharts** Data visualization
- **Sigma.js** Graph visualization

### Infrastructure
- **Telegraf.js** Telegram bot
- **Hono** Public API
- **node-cron** Scheduling
- **Stripe** Payments

### AI/ML
- **DistilBERT** Sentiment analysis
- **Claude Sonnet 4** Advanced analysis
- **GPT-4** Embeddings
- **Gemini 2.5** Alternative AI

## 🔒 Security

- API keys in environment variables (never committed)
- Comprehensive `.gitignore` for secrets
- Rate limiting on all external APIs
- Input validation and sanitization
- HTTPS only for production
- Encrypted environment variables

## 📈 Performance

### Data Collection
- **Agents:** ~2-3 per second
- **Posts:** ~5-10 per second
- **Metrics:** ~1-2 per second
- **Sentiment:** ~10-20 per second (local ML)

**Total cycle:** ~3-5 minutes for full collection

### Caching Strategy
- **Agent profiles:** 1 hour TTL
- **Posts:** 30 minutes TTL
- **Feeds:** 10 minutes TTL
- **Metrics:** 5-15 minutes TTL

## 🌐 API Integrations

- **Moltbook API** - Core data source
- **Supabase** - Database hosting
- **Upstash** - Redis caching
- **Stripe** - Payment processing
- **CoinGecko** - Crypto data
- **DeFiLlama** - DeFi metrics
- **Resend** - Transactional emails

## 📝 Environment Variables

See [.env.example](./.env.example) for complete list.

**Required:**
```env
MOLTBOOK_API_KEY=
DATABASE_URL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

**Optional:**
```env
TELEGRAM_BOT_TOKEN=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
```

## 🚀 Deployment

### Docker Compose

```bash
docker-compose up -d
```

Services:
- Collector (automated data collection)
- Telegram Bot (alerts)
- API (public REST API)
- Dashboard (Next.js frontend)

### Vercel (Dashboard)

```bash
cd apps/pulse
vercel deploy
```

### Railway (Collector + Bot)

```bash
railway up
```

## 📊 Roadmap

- [x] Core infrastructure (API client, database, cache)
- [x] Sentiment analysis (local ML)
- [x] Data collector service
- [x] Telegram bot
- [ ] Pulse dashboard (Next.js)
- [ ] Chrome extension
- [ ] Public API (Hono)
- [ ] AI agent network (4 agents)
- [ ] MoltBeat Radar (brand monitoring)
- [ ] PDF report generator
- [ ] Stripe billing
- [ ] Crypto intelligence dashboard

## 🤝 Contributing

Contributions welcome! Please read CONTRIBUTING.md first.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

- **Moltbook** - The AI-only social network
- **Transformers.js** - Local ML models
- **Vercel** - Hosting and deployment
- **Supabase** - Database infrastructure
- **Upstash** - Serverless Redis

---

Built with ❤️ for the AI agent community
