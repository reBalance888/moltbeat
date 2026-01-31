# @moltbeat/crypto-intel

Cryptocurrency intelligence and trend analysis for MoltBook posts.

## Features

- 🪙 **Token Detection** - Automatically detect 15+ cryptocurrencies in posts
- 📊 **Sentiment Analysis** - Analyze sentiment around specific tokens
- 📈 **Trend Detection** - Identify breaking crypto trends with growth metrics
- 🐋 **Whale Activity** - Track mentions of whale movements
- 💰 **Price Predictions** - Extract and analyze price predictions
- 👥 **Influencer Detection** - Find crypto influencers by mention count and engagement
- 📄 **Comprehensive Reports** - Generate full crypto intelligence reports

## Installation

```bash
pnpm install
```

## Usage

### Initialize

```typescript
import { PrismaClient } from '@prisma/client'
import { CryptoIntelligence } from '@moltbeat/crypto-intel'

const prisma = new PrismaClient()
const cryptoIntel = new CryptoIntelligence(prisma)
```

### Analyze Crypto Mentions

```typescript
const startDate = new Date('2024-01-01')
const endDate = new Date('2024-01-31')

const mentions = await cryptoIntel.analyzeMentions(startDate, endDate)

console.log(`Found ${mentions.length} crypto mentions`)
console.log(`Average sentiment: ${mentions.reduce((sum, m) => sum + m.sentiment, 0) / mentions.length}`)
```

### Get Token Sentiment

```typescript
const btcSentiment = await cryptoIntel.getTokenSentiment('BTC', 7)

console.log(`BTC Sentiment (7 days):`)
console.log(`  Mentions: ${btcSentiment.mentions}`)
console.log(`  Avg Sentiment: ${btcSentiment.avgSentiment}`)
console.log(`  Trend: ${btcSentiment.sentimentTrend}`)

if (btcSentiment.topBullishPost) {
  console.log(`  Top Bullish: ${btcSentiment.topBullishPost.content}`)
}
```

### Find Crypto Influencers

```typescript
const influencers = await cryptoIntel.findInfluencers(30)

console.log('Top Crypto Influencers:')
influencers.slice(0, 10).forEach((inf, i) => {
  console.log(`${i + 1}. ${inf.name}`)
  console.log(`   Mentions: ${inf.cryptoMentions}`)
  console.log(`   Followers: ${inf.followers}`)
  console.log(`   Specializes in: ${inf.specialization.join(', ')}`)
})
```

### Detect Trends

```typescript
const trends = await cryptoIntel.detectTrends(7)

console.log('Trending Tokens:')
trends.forEach((trend) => {
  console.log(`${trend.token}:`)
  console.log(`  Mention Growth: ${trend.mentionGrowth.toFixed(1)}%`)
  console.log(`  Sentiment Shift: ${trend.sentimentShift > 0 ? '+' : ''}${trend.sentimentShift.toFixed(2)}`)
  console.log(`  Breaking Out: ${trend.isBreakingOut ? 'YES' : 'No'}`)

  if (trend.viralPosts.length > 0) {
    console.log(`  Top Post: ${trend.viralPosts[0].content.substring(0, 50)}...`)
  }
})
```

### Detect Whale Activity

```typescript
const whaleActivity = await cryptoIntel.detectWhaleActivity(7)

console.log(`Whale Mentions: ${whaleActivity.mentions.length}`)
whaleActivity.mentions.forEach((mention) => {
  console.log(`${mention.token} - ${mention.author}:`)
  console.log(`  "${mention.content.substring(0, 100)}..."`)
  console.log(`  Keywords: ${mention.keywords.join(', ')}`)
})
```

### Get Price Predictions

```typescript
const btcPredictions = await cryptoIntel.getPriceDiscussions('BTC', 7)

console.log(`BTC Price Predictions:`)
console.log(`  Average Prediction: $${btcPredictions.avgPrediction.toFixed(2)}`)
console.log(`  Sentiment Bias: ${btcPredictions.sentimentBias}`)
console.log(`  Number of Predictions: ${btcPredictions.predictions.length}`)

btcPredictions.predictions.forEach((pred) => {
  console.log(`  ${pred.author}: $${pred.predictedPrice} by ${pred.timeframe}`)
})
```

### Generate Full Report

```typescript
const report = await cryptoIntel.generateReport(7)

console.log(`Crypto Intelligence Report (${report.period})\n`)

console.log('Market Sentiment:')
console.log(`  Overall: ${report.marketSentiment.overall.toFixed(2)}`)
console.log(`  Bitcoin: ${report.marketSentiment.bitcoin.toFixed(2)}`)
console.log(`  Altcoins: ${report.marketSentiment.altcoins.toFixed(2)}\n`)

console.log(`Top Tokens:`)
report.topTokens.slice(0, 5).forEach((token) => {
  console.log(`  ${token.token}: ${token.mentions} mentions, ${token.sentimentTrend}`)
})

console.log(`\nBreaking Trends: ${report.breakingTrends.length}`)
report.breakingTrends.forEach((trend) => {
  console.log(`  ${trend.token}: +${trend.mentionGrowth.toFixed(1)}% growth`)
})

console.log(`\nTop Influencers:`)
report.topInfluencers.slice(0, 5).forEach((inf) => {
  console.log(`  ${inf.name}: ${inf.cryptoMentions} mentions`)
})

console.log(`\nWhale Alerts: ${report.whaleAlerts.mentions.length}`)
```

## Supported Tokens

- Bitcoin (BTC)
- Ethereum (ETH)
- Solana (SOL)
- Cardano (ADA)
- Dogecoin (DOGE)
- Polkadot (DOT)
- Polygon (MATIC)
- Avalanche (AVAX)
- Chainlink (LINK)
- Uniswap (UNI)
- Ripple (XRP)
- Cosmos (ATOM)
- Aptos (APT)
- Sui (SUI)
- Arbitrum (ARB)

## Detection Features

### Context Detection
- **Price**: Mentions of price, targets, forecasts
- **Prediction**: Price predictions with timeframes
- **Tech**: Blockchain technology discussions
- **News**: Breaking news and announcements
- **General**: Other crypto-related content

### Whale Keywords
- whale, whales
- dump, dumping
- accumulation, accumulating
- large transfer
- massive buy/sell
- institutional

### Price Patterns
Detects:
- Dollar amounts: $50,000
- Shorthand: 50k, 100k
- Timeframes: "by next month", "in 2 weeks", "end of year"

## API Reference

### CryptoIntelligence

Main class for crypto intelligence analysis.

#### Methods

- `analyzeMentions(startDate, endDate)` - Analyze all crypto mentions in period
- `getTokenSentiment(token, days)` - Get sentiment analysis for specific token
- `findInfluencers(days)` - Find crypto influencers
- `detectTrends(days)` - Detect trending tokens with growth metrics
- `detectWhaleActivity(days)` - Find whale activity mentions
- `getPriceDiscussions(token, days)` - Extract price predictions
- `generateReport(days)` - Generate comprehensive crypto report

### TokenDetector

Utility class for token detection.

#### Methods

- `detectTokens(text)` - Detect all crypto tokens in text
- `detectContext(text)` - Determine context (price/tech/news/prediction/general)
- `extractPricePrediction(text)` - Extract price and timeframe from text
- `isCryptoRelated(text)` - Check if text is crypto-related

## Integration with Other Packages

```typescript
import { CryptoIntelligence } from '@moltbeat/crypto-intel'
import { ReportGenerator } from '@moltbeat/pdf-report'

// Generate crypto intelligence report
const cryptoIntel = new CryptoIntelligence(prisma)
const report = await cryptoIntel.generateReport(30)

// Create PDF report
const pdfGenerator = new ReportGenerator()
const pdfData = {
  type: 'trend',
  config: {
    title: 'Crypto Intelligence Report',
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date(),
    },
  },
  data: {
    period: report.period,
    trendingTopics: report.topTokens.map(t => ({
      topic: t.token,
      mentions: t.mentions,
      sentiment: t.avgSentiment,
      trend: t.sentimentTrend === 'bullish' ? 'rising' :
             t.sentimentTrend === 'bearish' ? 'falling' : 'stable'
    })),
    // ... more data
  }
}

await pdfGenerator.generateReportToFile(pdfData, './crypto-report.pdf')
```

## Use Cases

1. **Crypto Trading Signals** - Identify bullish/bearish trends before they go mainstream
2. **Influencer Marketing** - Find crypto influencers for partnerships
3. **Market Research** - Understand sentiment shifts in crypto community
4. **Risk Monitoring** - Track whale activity and market manipulation signals
5. **Content Creation** - Identify trending topics for content
6. **Investment Insights** - Aggregate price predictions from community

## License

MIT
