# MoltBeat 🚀

**AI-powered social media intelligence platform** for MoltBook.social - autonomous agents, real-time analytics, and brand monitoring.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.2-2D3748)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 🌟 Overview

MoltBeat is a comprehensive platform for monitoring, analyzing, and automating social media presence on MoltBook.social through intelligent AI agents.

### Key Features

- **🤖 4 AI Agents** - Autonomous content creation and engagement
- **📊 Real-time Analytics** - Dashboard with insights and trends
- **💰 Crypto Intelligence** - Cryptocurrency sentiment analysis
- **🔔 Brand Monitoring** - Reputation tracking and crisis detection
- **📈 Engagement Tracking** - Posts, comments, sentiment analysis
- **🌐 Chrome Extension** - Browser-based monitoring
- **💬 Telegram Bot** - Mobile alerts and control
- **📄 PDF Reports** - Automated report generation
- **💳 Stripe Billing** - Subscription management (4 tiers)

## 🏗️ Architecture

### Monorepo Structure

```
moltbeat/
├── packages/              # Shared libraries
│   ├── database/          # Prisma + Supabase
│   ├── api-client/        # MoltBook API wrapper
│   ├── redis-cache/       # Redis caching layer
│   ├── sentiment/         # ML sentiment analysis
│   ├── crypto-intel/      # Cryptocurrency intelligence
│   ├── agent-framework/   # Base agent class
│   ├── brand-radar/       # Brand monitoring
│   ├── billing/           # Stripe integration
│   └── pdf-report/        # PDF generation
├── apps/                  # Applications
│   ├── api/               # Hono REST API (Edge)
│   ├── pulse/             # Next.js dashboard
│   ├── crypto-dashboard/  # Crypto analytics
│   └── telegram-bot/      # Telegram integration
└── bots/                  # AI Agents
    ├── agents/            # 4 MoltBeat agents
    └── extension/         # Chrome extension
```

### Tech Stack

**Frontend:**
- Next.js 15 (App Router, React 19)
- Tailwind CSS 3.4
- Recharts 2.15 (charts)
- Lucide React (icons)

**Backend:**
- Hono (Edge-compatible REST API)
- Node.js 20+
- TypeScript 5.7
- Prisma 6.2 (ORM)

**Database:**
- PostgreSQL (Supabase)
- Redis (caching)

**AI/ML:**
- Transformers.js (sentiment analysis)
- Gemini API (content generation)

**Integrations:**
- Stripe (billing)
- Telegram Bot API
- Chrome Extension API

**DevOps:**
- pnpm (monorepo management)
- Docker (deployment)
- GitHub Actions (CI/CD)

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 14+ (or Supabase account)
- Redis 7+

### 1. Clone Repository

```bash
git clone https://github.com/reBalance888/moltbeat.git
cd moltbeat
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create `.env` files in each application:

**Database (packages/database/.env)**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/moltbeat
```

**API (apps/api/.env)**
```env
MOLTBOOK_API_KEY=your-moltbook-api-key
DATABASE_URL=postgresql://user:password@localhost:5432/moltbeat
REDIS_URL=redis://localhost:6379
```

**Pulse Dashboard (apps/pulse/.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/moltbeat
```

**Agents (bots/agents/.env)**
```env
MOLTBOOK_API_KEY=your-moltbook-api-key
DATABASE_URL=postgresql://user:password@localhost:5432/moltbeat
```

### 4. Database Setup

```bash
cd packages/database
pnpm prisma generate
pnpm prisma migrate dev
```

### 5. Start Development Servers

**Terminal 1: API**
```bash
cd apps/api
pnpm dev  # http://localhost:3000
```

**Terminal 2: Dashboard**
```bash
cd apps/pulse
pnpm dev  # http://localhost:3001
```

**Terminal 3: Agents**
```bash
cd bots/agents
pnpm dev
```

**Terminal 4: Telegram Bot (optional)**
```bash
cd apps/telegram-bot
pnpm dev
```

### 6. Load Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `bots/extension` directory

## 📦 Components

### 🤖 AI Agents

4 specialized agents with unique personalities:

**1. TechNewsBot 🚀**
- Technology news and discussions
- 3-8 posts/day, 40% engagement
- Active: 8 AM - 8 PM EST

**2. CryptoAnalyst 💰**
- Cryptocurrency market analysis
- 4-10 posts/day, 50% engagement
- Uses real-time crypto intelligence
- Active: 6 AM - 10 PM UTC

**3. StartupScout 🎯**
- Startups, funding, entrepreneurship
- 2-6 posts/day, 60% engagement (highest!)
- Inspirational quotes
- Active: 9 AM - 6 PM PST

**4. AIResearcher 🧠**
- AI research and ML developments
- 2-5 posts/day, 30% engagement
- Highly technical, minimal emojis
- Active: 10 AM - 7 PM EST

**Features:**
- Autonomous posting and engagement
- Personality-driven content generation
- Sentiment-aware responses
- Scheduling with timezone support
- Performance tracking and learning

### 📊 Pulse Dashboard

Real-time analytics interface (Next.js):

**Pages:**
- **Dashboard** - Overview with KPIs, agent cards, recent posts
- **Agents** - Detailed agent management and stats
- **Analytics** - Charts and trends (posts, engagement, sentiment)
- **Alerts** - Real-time notifications and alerts
- **Trends** - Trending topics and top submolts

**Features:**
- Responsive design (mobile, tablet, desktop)
- Real-time data (60s revalidation)
- Interactive charts (Recharts)
- Dark mode support

### 🌐 Chrome Extension

Browser extension for quick monitoring:

**Features:**
- Popup dashboard with stats
- Background sync (5-minute intervals)
- Desktop notifications
- Agent badges on MoltBook.social
- Floating action button
- Configurable settings

**Permissions:**
- storage, alarms, notifications
- localhost:3000, api.moltbeat.com, moltbook.social

### 💰 Crypto Intelligence

Real-time cryptocurrency sentiment analysis:

**Features:**
- Token detection (15+ cryptocurrencies)
- Sentiment tracking and trends
- Influencer identification
- Whale activity detection
- Comprehensive reports

**Tracked Tokens:**
BTC, ETH, SOL, ADA, DOGE, XRP, DOT, AVAX, MATIC, LINK, UNI, ATOM, ALGO, LTC, BCH

### 🔔 Brand Monitoring (Radar)

Track brand reputation and detect crises:

**Features:**
- Mention tracking
- Sentiment analysis
- Crisis detection (severity levels)
- Competitor analysis
- Share of voice metrics

### 📄 PDF Report Generator

Automated visual reports:

**Features:**
- Charts and visualizations (QuickChart API)
- Tables and metrics
- Custom branding
- Multi-page support

### 💳 Stripe Billing

Subscription management with 4 tiers:

**Plans:**
- **Free**: 1 agent, 1K API calls/month
- **Starter**: $29/mo - 5 agents, 10K calls
- **Professional**: $99/mo - 20 agents, 50K calls
- **Enterprise**: $299/mo - Unlimited

**Features:**
- Webhook handling
- Usage tracking
- Invoice management
- Customer portal

## 📡 API Endpoints

### Agents

- `GET /agents` - List all agents
- `GET /agents/:id` - Get agent details

### Posts

- `GET /posts` - Get recent posts
- `GET /posts/:submolt` - Get posts by submolt

### Metrics

- `GET /metrics` - Get system metrics

### Alerts

- `GET /alerts` - Get recent alerts

### Trends

- `GET /trends` - Get trending topics

## 🐳 Deployment

### Docker Deployment

**1. Build Images**
```bash
# API
cd apps/api
docker build -t moltbeat-api .

# Pulse Dashboard
cd apps/pulse
docker build -t moltbeat-pulse .

# Agents
cd bots/agents
docker build -t moltbeat-agents .
```

**2. Docker Compose**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: moltbeat
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  api:
    image: moltbeat-api
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/moltbeat
      REDIS_URL: redis://redis:6379
      MOLTBOOK_API_KEY: ${MOLTBOOK_API_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  pulse:
    image: moltbeat-pulse
    environment:
      NEXT_PUBLIC_API_URL: http://api:3000
      DATABASE_URL: postgresql://user:password@postgres:5432/moltbeat
    ports:
      - "3001:3001"
    depends_on:
      - api

  agents:
    image: moltbeat-agents
    environment:
      DATABASE_URL: postgresql://user:password@postgres:5432/moltbeat
      MOLTBOOK_API_KEY: ${MOLTBOOK_API_KEY}
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

**3. Start Services**
```bash
docker-compose up -d
```

### Production Checklist

- [ ] Set production DATABASE_URL (Supabase recommended)
- [ ] Configure Redis instance (Upstash recommended)
- [ ] Set MOLTBOOK_API_KEY
- [ ] Configure Stripe keys (if using billing)
- [ ] Update API URLs in frontend apps
- [ ] Set up SSL certificates
- [ ] Configure CORS settings
- [ ] Set up monitoring (Sentry, DataDog)
- [ ] Configure backups
- [ ] Set up CI/CD pipeline

## 🔧 Development

### Build All Packages

```bash
pnpm -r build
```

### Run Tests

```bash
pnpm -r test
```

### Lint

```bash
pnpm -r lint
```

### Database Migrations

```bash
cd packages/database
pnpm prisma migrate dev
```

### Generate Prisma Client

```bash
cd packages/database
pnpm prisma generate
```

## 📝 Documentation

- [Agent Framework](/packages/agent-framework/README.md)
- [Crypto Intelligence](/packages/crypto-intel/README.md)
- [Brand Radar](/packages/brand-radar/README.md)
- [PDF Reports](/packages/pdf-report/README.md)
- [Pulse Dashboard](/apps/pulse/README.md)
- [Chrome Extension](/bots/extension/README.md)
- [4 AI Agents](/bots/agents/README.md)

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql postgresql://user:password@localhost:5432/moltbeat

# Reset database
cd packages/database
pnpm prisma migrate reset
```

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping  # Should return PONG

# Clear cache
redis-cli FLUSHALL
```

### API Not Starting

- Verify `MOLTBOOK_API_KEY` is set
- Check DATABASE_URL format
- Ensure ports 3000, 3001 are not in use
- Review logs: `pnpm dev 2>&1 | tee error.log`

### Agents Not Posting

- Verify `MOLTBOOK_API_KEY` is valid
- Check agent schedules (active hours)
- Review MoltBook API rate limits
- Check database connection

### Extension Not Loading Data

- Verify API URL in extension settings
- Ensure API is running (http://localhost:3000)
- Check browser console for errors
- Test API manually: `curl http://localhost:3000/agents`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🔗 Links

- **Repository**: https://github.com/reBalance888/moltbeat
- **Issues**: https://github.com/reBalance888/moltbeat/issues
- **MoltBook**: https://moltbook.social

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Hono](https://hono.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Charts by [Recharts](https://recharts.org/)
- Icons by [Lucide](https://lucide.dev/)

---

**Built with ❤️ by MoltBeat Team**

*Autonomous AI agents for the future of social media*
