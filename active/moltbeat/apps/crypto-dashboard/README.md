# Crypto Intelligence Dashboard

Real-time cryptocurrency sentiment analysis and trend detection from MoltBook.

## Features

- 📊 **Market Sentiment** - Overall, Bitcoin, and Altcoin sentiment indicators
- 🔥 **Trending Tokens** - Most mentioned cryptocurrencies with sentiment
- 👥 **Top Influencers** - Crypto influencers ranked by activity
- 🐋 **Whale Alerts** - Real-time whale activity mentions
- 🚀 **Breaking Trends** - Tokens experiencing rapid mention growth
- 🎨 **Beautiful UI** - Modern gradient design with Tailwind CSS
- ⚡ **Real-time** - Auto-revalidates every 5 minutes

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Data visualization
- **@moltbeat/crypto-intel** - Crypto intelligence engine

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

The dashboard runs on http://localhost:3003

## Environment Variables

Create `.env.local`:

```env
DATABASE_URL=your-database-url
```

## Dashboard Sections

### Market Sentiment Overview
Three cards showing:
- Overall market sentiment
- Bitcoin sentiment
- Altcoin sentiment

Each with visual indicators (Bullish/Bearish/Neutral).

### Trending Tokens
Top 8 most mentioned cryptocurrencies with:
- Mention count
- Sentiment trend (bullish/bearish/neutral)
- Visual sentiment indicators

### Top Influencers
Top 8 crypto influencers showing:
- Name and rank
- Number of crypto mentions
- Follower count
- Token specialization

### Breaking Trends
Tokens experiencing >50% mention growth:
- Growth percentage
- Token symbol
- Top viral post

### Whale Alerts
Recent whale activity mentions:
- Token affected
- Alert content
- Author
- Keywords matched
- Time ago

## Data Updates

The dashboard uses Next.js ISR (Incremental Static Regeneration) with:
- **Revalidation**: Every 5 minutes
- **Source**: Live data from MoltBook via crypto-intel package

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

### Docker

```bash
docker build -t crypto-dashboard .
docker run -p 3003:3003 crypto-dashboard
```

### Environment Variables

Set in Vercel dashboard or `.env.local`:
- `DATABASE_URL` - PostgreSQL connection string

## Architecture

```
app/
├── layout.tsx      # Root layout with metadata
├── page.tsx        # Home page with data fetching
└── globals.css     # Tailwind styles

components/
├── MarketSentiment.tsx    # Market overview cards
├── TrendingTokens.tsx     # Trending token list
├── TopInfluencers.tsx     # Influencer rankings
├── WhaleAlerts.tsx        # Whale activity feed
└── BreakingTrends.tsx     # Breaking trend highlights
```

## Customization

### Update Revalidation Interval

Edit `app/page.tsx`:
```typescript
export const revalidate = 300 // seconds (5 minutes)
```

### Change Port

Edit `package.json`:
```json
{
  "scripts": {
    "dev": "next dev -p YOUR_PORT"
  }
}
```

### Add More Tokens

Edit the crypto-intel package's `tokens.ts` to track additional cryptocurrencies.

## Performance

- **Server-side rendering** - Fast initial page load
- **Static generation** - Cached for 5 minutes
- **Optimized images** - Next.js automatic optimization
- **Code splitting** - Automatic component-level splitting

## License

MIT
