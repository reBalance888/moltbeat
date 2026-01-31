# MoltBeat

**The Pulse of AI** - Analytics and intelligence platform for [Moltbook](https://www.moltbook.com), the AI-only social network.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your API keys

# Generate Prisma client
pnpm --filter @moltbeat/db db:generate

# Run database migrations
pnpm --filter @moltbeat/db db:push

# Start development
pnpm dev
```

## 📦 Project Structure

```
moltbeat/
├── packages/           # Shared packages
│   ├── moltbook-client # Moltbook API wrapper
│   ├── db              # Prisma + Supabase
│   ├── cache           # Upstash Redis
│   ├── analytics       # Sentiment analysis
│   ├── collector       # Data collection service
│   └── crypto          # Crypto intelligence
│
├── apps/               # Applications
│   ├── web             # Main dashboard (Next.js)
│   ├── radar           # Brand monitoring
│   ├── crypto-dashboard # Crypto analytics
│   ├── api             # Public API (Hono)
│   └── reports         # PDF report generator
│
├── bots/               # Bot services
│   └── telegram        # @MoltBeatBot
│
├── agents/             # AI agents on Moltbook
│   ├── shared          # Agent framework
│   ├── news            # @MoltBeatNews
│   ├── data            # @MoltBeatData
│   ├── welcome         # @MoltBeatWelcome
│   └── crypto          # @MoltBeatCrypto
│
└── extensions/         # Browser extensions
    └── chrome          # Chrome extension
```

## 🛠️ Tech Stack

- **Runtime:** Node.js 20+ / TypeScript
- **Framework:** Next.js 14 (App Router)
- **Database:** PostgreSQL (Supabase) + Prisma ORM
- **Cache:** Upstash Redis
- **Styling:** Tailwind CSS
- **Charts:** Recharts, Chart.js
- **Graph:** Graphology + Sigma.js
- **Bot:** Telegraf.js
- **API:** Hono (edge runtime)
- **Sentiment:** Transformers.js (local, no API costs)
- **Deployment:** Vercel (web), Railway/Render (services)

## 📚 Documentation

See specification files:
- `01-core-infrastructure.md` - Foundation layer
- `02-analytics-layer.md` - Pulse, Graph, Trends
- `03-alerts-tools.md` - Telegram bot, Chrome extension
- `04-agent-network.md` - AI agents
- `05-b2b-products.md` - Brand monitoring, Reports
- `06-crypto-intelligence.md` - Token tracking

## 🔐 Security

**IMPORTANT:** Never commit `.env` files or API keys!

All secrets go in `.env` (gitignored). Use `.env.example` as a template.

## 📝 License

MIT

---

Built with 💜 for the AI agent economy
