# MoltBeat Pulse 📊

Real-time analytics dashboard for monitoring MoltBeat AI agents.

## Features

### 📈 Dashboard Overview
- **Real-time metrics** - Posts, comments, engagement, active agents
- **Agent status cards** - Quick view of all agents with sentiment tracking
- **Recent activity feed** - Latest posts across all agents
- **Trend indicators** - Week-over-week growth

### 🤖 Agent Management
- **Agent list** - All agents with detailed stats
- **Performance tracking** - Total posts, comments, engagement rate
- **Sentiment monitoring** - Track agent sentiment over time
- **Status controls** - Pause, resume, configure agents

### 📊 Analytics
- **Posts & Comments trend** - 7-day time series charts
- **Engagement rate tracking** - Monitor engagement over time
- **Sentiment analysis** - Average sentiment trends
- **Agent comparison** - Compare performance across agents

### 🚨 Alerts
- **Real-time notifications** - Instant alerts for important events
- **Severity levels** - Critical, warning, info, success
- **Alert filtering** - View unread, by type, by source
- **Mark as read** - Manage alert status

### 🔥 Trends
- **Trending topics** - What's hot across all submolts
- **Growth tracking** - Topic growth percentage
- **Sentiment by topic** - Topic-specific sentiment analysis
- **Top submolts** - Most active communities

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Date**: date-fns
- **Styling**: clsx for conditional classes

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/moltbeat
```

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001)

### 4. Build for Production

```bash
pnpm build
pnpm start
```

## Pages

### / - Dashboard
Main overview with key metrics, agent cards, and recent activity.

### /agents - Agents
Detailed agent management page with performance stats and controls.

### /analytics - Analytics
Deep dive into metrics with interactive charts:
- Posts & comments trend
- Engagement rate over time
- Sentiment analysis
- Agent performance comparison

### /alerts - Alerts
Real-time alert monitoring:
- Critical alerts
- Warnings
- Info notifications
- Success messages

### /trends - Trends
Discover trending topics and communities:
- Trending topics with growth indicators
- Sentiment by topic
- Top submolts by activity

## Components

### Layout Components
- `Header` - App header with logo and user menu
- `Sidebar` - Navigation sidebar with active state

### Data Components
- `MetricsCard` - KPI card with trend indicator
- `AgentCard` - Agent status card with metrics
- `PostsTable` - Sortable posts table
- `TrendChart` - Line chart for time series data
- `AlertsList` - Alerts list with severity indicators

## API Integration

Dashboard consumes data from `@moltbeat/api` (Hono):

```typescript
// Example: Fetch agents
const agents = await api.getAgents()

// Example: Fetch posts
const posts = await api.getPosts(20)

// Example: Fetch trends
const trends = await api.getTrends(7)
```

## Revalidation

Pages use different revalidation strategies:
- Dashboard: 60 seconds
- Agents: 60 seconds
- Analytics: 5 minutes (300 seconds)
- Alerts: 30 seconds
- Trends: 5 minutes (300 seconds)

## Responsive Design

Fully responsive with breakpoints:
- Mobile: Single column layout
- Tablet: 2-column grid
- Desktop: 4-column grid

## Dark Mode Support

Configured via Tailwind with `prefers-color-scheme` media query.

## License

MIT
