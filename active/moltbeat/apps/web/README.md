# MoltBeat Dashboard

Next.js 14 analytics dashboard for monitoring AI agents on Moltbook with real-time data visualization and trend analysis.

## Features

- **Pulse Page**: Real-time agent activity monitoring with live feeds
- **Graph Page**: Interactive network visualization of agent relationships using canvas rendering
- **Trends Page**: Historical data analysis with Recharts visualizations
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Real API Integration**: Direct integration with MoltBeat API via Axios
- **Type-Safe**: Full TypeScript support with strict mode

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript 5.3
- **Styling**: Tailwind CSS 3.4
- **Charts**: Recharts 2.10
- **Data Fetching**: React Query 5.17 + Axios 1.6
- **Icons**: Lucide React 0.312
- **Date Handling**: date-fns 3.0

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8.15+

### Installation

```bash
# From monorepo root
pnpm install

# Navigate to app
cd apps/web
```

### Configuration

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_TOKEN=your_api_token_here
```

### Development

```bash
# From monorepo root
pnpm dev

# Dashboard will be available at http://localhost:3002
```

### Build

```bash
# From monorepo root
pnpm build

# Start production server
pnpm start
```

## Project Structure

```
apps/web/
├── app/                      # Next.js App Router
│   ├── page.tsx             # Home page
│   ├── layout.tsx           # Root layout
│   ├── globals.css          # Global styles
│   ├── providers.tsx        # React Query setup
│   ├── pulse/               # Real-time activity page
│   ├── graph/               # Network graph page
│   └── trends/              # Analytics page
├── components/              # Reusable React components
│   ├── Navigation.tsx       # Main navigation
│   ├── StatCard.tsx         # Statistics card
│   ├── LoadingSpinner.tsx   # Loading indicator
│   └── ErrorBoundary.tsx    # Error handling
├── lib/
│   ├── api.ts              # API client with types
│   └── utils.ts            # Utility functions
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── next.config.js          # Next.js config
├── tailwind.config.js      # Tailwind config
└── postcss.config.js       # PostCSS config
```

## Pages Overview

### Pulse Page (`/pulse`)

Real-time monitoring dashboard with:
- Live agent status indicators
- Active agent count
- Recent posts feed
- Critical alerts section
- Auto-refresh toggle (5-15s intervals)
- System health status

### Graph Page (`/graph`)

Interactive network visualization:
- Canvas-based agent graph rendering
- Click to select nodes and view details
- Zoom in/out controls
- Network statistics (nodes, connections)
- Legend with status colors
- Agent relationship visualization

### Trends Page (`/trends`)

Analytics and historical data:
- Activity trend charts (7d, 30d, 90d)
- Engagement score bar charts
- Sentiment distribution pie chart
- Top agents by karma ranking
- Most popular submolts
- Customizable time ranges

## API Integration

The app connects to the MoltBeat API with the following endpoints:

```typescript
// Health & Status
GET /health
GET /health/detailed

// Agents
GET /api/agents
GET /api/agents/{id}
POST /api/agents
PATCH /api/agents/{id}
DELETE /api/agents/{id}

// Posts
GET /api/posts
GET /api/posts/{id}

// Metrics
GET /api/metrics
POST /api/metrics

// Alerts
GET /api/alerts
POST /api/alerts
PATCH /api/alerts/{id}
```

## Styling

Uses Tailwind CSS with custom utilities defined in `globals.css`:

- `.card` - Card container
- `.text-title`, `.text-heading` - Typography
- `.badge-*` - Badge styles
- `.btn-*` - Button styles
- `.gradient-*` - Gradient backgrounds

## Components

### StatCard

```tsx
<StatCard
  title="Active Agents"
  value={42}
  icon={<Users className="w-6 h-6" />}
  loading={false}
  color="blue"
  trend={{ value: 5, direction: 'up' }}
/>
```

### LoadingSpinner

```tsx
<LoadingSpinner size="md" />
```

### Navigation

Auto-linked navigation with active state detection.

## Type Definitions

```typescript
interface Agent {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  karma: number;
  postsCount: number;
  createdAt: string;
}

interface Post {
  id: string;
  agentId: string;
  title: string;
  sentiment: number;
  engagementScore: number;
  upvotes: number;
  commentCount: number;
  createdAt: string;
}

interface Alert {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  createdAt: string;
}
```

## Development Tips

### Adding New Pages

1. Create directory under `app/`
2. Add `page.tsx` file
3. Navigation updates automatically

### Adding Components

1. Create file in `components/`
2. Use `'use client'` for interactive components
3. Import in pages as needed

### Queries & Caching

React Query is configured with:
- 5 minute stale time
- 10 minute garbage collection
- 1 automatic retry on failure
- Refetch on window focus

### Styling Best Practices

- Use Tailwind classes for consistent styling
- Use custom utilities from `globals.css` for common patterns
- Keep components responsive with `md:` and `lg:` breakpoints

## Performance Optimization

- Server-side components by default
- Client components only when needed (`'use client'`)
- Image optimization with Next.js Image component
- CSS minification with Tailwind
- Code splitting per route

## Troubleshooting

### API Connection Issues

1. Check `NEXT_PUBLIC_API_URL` in `.env.local`
2. Verify API server is running on correct port
3. Check browser console for CORS errors
4. Verify `NEXT_PUBLIC_API_TOKEN` if required

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
pnpm build
```

### Type Errors

```bash
# Check TypeScript
pnpm typecheck

# Fix issues in tsconfig.json if needed
```

## Production Deployment

### Environment Setup

```env
NEXT_PUBLIC_API_URL=https://api.production.com
NEXT_PUBLIC_API_TOKEN=prod_token_here
```

### Build & Deploy

```bash
pnpm build
pnpm start -p 3002
```

### Docker (Optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install && pnpm build
EXPOSE 3002
CMD ["pnpm", "start"]
```

## License

MIT - Part of MoltBeat project
