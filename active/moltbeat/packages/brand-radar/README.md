# @moltbeat/brand-radar

Brand monitoring and reputation tracking for MoltBook posts.

## Features

- 🎯 **Brand Mention Tracking** - Track all mentions of your brand across MoltBook
- 📊 **Sentiment Analysis** - Analyze sentiment for brand mentions
- 🏆 **Competitor Analysis** - Compare your brand with competitors
- ⚠️ **Crisis Detection** - Auto-detect potential reputation crises
- 💯 **Reputation Score** - Calculate overall brand reputation (0-100)
- 📈 **Brand Insights** - Extract topics, influencers, and trends
- 📄 **Comprehensive Reports** - Generate full brand monitoring reports

## Installation

```bash
pnpm install
```

## Usage

### Initialize

```typescript
import { PrismaClient } from '@prisma/client'
import { BrandRadar, BrandConfig } from '@moltbeat/brand-radar'

const prisma = new PrismaClient()
const brandRadar = new BrandRadar(prisma)

// Configure your brand
const brandConfig: BrandConfig = {
  name: 'Tesla',
  keywords: ['tesla', 'model 3', 'model y', 'cybertruck'],
  aliases: ['tsla'],
  competitors: ['BMW', 'Mercedes', 'Audi'],
  excludeKeywords: ['tesla coil', 'nikola tesla'], // Avoid false positives
}
```

### Track Brand Mentions

```typescript
const startDate = new Date('2024-01-01')
const endDate = new Date('2024-01-31')

const mentions = await brandRadar.trackMentions(brandConfig, startDate, endDate)

console.log(`Found ${mentions.length} brand mentions`)
mentions.forEach((mention) => {
  console.log(`- ${mention.content.substring(0, 50)}...`)
  console.log(`  Sentiment: ${mention.sentiment.toFixed(2)}`)
  console.log(`  Context: ${mention.context}`)
  console.log(`  Engagement: ${mention.engagement}`)
})
```

### Get Brand Sentiment

```typescript
const sentiment = await brandRadar.getBrandSentiment(brandConfig, 7)

console.log(`Brand Sentiment (7 days):`)
console.log(`  Total Mentions: ${sentiment.mentions}`)
console.log(`  Avg Sentiment: ${sentiment.avgSentiment.toFixed(2)}`)
console.log(`  Trend: ${sentiment.sentimentTrend}`)
console.log(`  Distribution:`)
console.log(`    Positive: ${sentiment.sentimentDistribution.positive}`)
console.log(`    Neutral: ${sentiment.sentimentDistribution.neutral}`)
console.log(`    Negative: ${sentiment.sentimentDistribution.negative}`)

if (sentiment.topPositiveMention) {
  console.log(`\n  Top Positive: "${sentiment.topPositiveMention.content}"`)
  console.log(`    by ${sentiment.topPositiveMention.author}`)
}

if (sentiment.topNegativeMention) {
  console.log(`\n  Top Negative: "${sentiment.topNegativeMention.content}"`)
  console.log(`    by ${sentiment.topNegativeMention.author}`)
}
```

### Compare with Competitor

```typescript
const comparison = await brandRadar.compareWithCompetitor(
  brandConfig,
  'BMW',
  7
)

console.log(`Brand vs Competitor (7 days):`)
console.log(`  ${brandConfig.name}: ${comparison.brandMentions} mentions`)
console.log(`  ${comparison.competitor}: ${comparison.competitorMentions} mentions`)
console.log(`  Share of Voice: ${comparison.shareOfVoice.toFixed(1)}%`)
console.log(`  ${brandConfig.name} Sentiment: ${comparison.brandSentiment.toFixed(2)}`)
console.log(`  ${comparison.competitor} Sentiment: ${comparison.competitorSentiment.toFixed(2)}`)

console.log(`\n  Direct Comparisons:`)
comparison.directComparisons.forEach((comp) => {
  console.log(`  - "${comp.content}"`)
  console.log(`    Favors ${brandConfig.name}: ${comp.favorsBrand}`)
})
```

### Calculate Reputation Score

```typescript
const reputation = await brandRadar.getReputationScore(brandConfig, 30)

console.log(`Reputation Score (30 days):`)
console.log(`  Overall Score: ${reputation.score.toFixed(1)}/100`)
console.log(`  Trend: ${reputation.trend}`)
console.log(`  Risk Level: ${reputation.riskLevel}`)
console.log(`\n  Score Breakdown:`)
console.log(`    Sentiment: ${reputation.factors.sentiment.toFixed(1)}`)
console.log(`    Volume: ${reputation.factors.volume.toFixed(1)}`)
console.log(`    Engagement: ${reputation.factors.engagement.toFixed(1)}`)
console.log(`    Influencer Support: ${reputation.factors.influencerSupport.toFixed(1)}`)
```

### Detect Crises

```typescript
const crises = await brandRadar.detectCrises(brandConfig, 7)

if (crises.length > 0) {
  console.log(`⚠️  CRISIS ALERTS: ${crises.length}`)
  crises.forEach((crisis) => {
    console.log(`\n  Severity: ${crisis.severity.toUpperCase()}`)
    console.log(`  Type: ${crisis.type}`)
    console.log(`  Description: ${crisis.description}`)
    console.log(`  Mentions:`)
    crisis.mentions.forEach((m) => {
      console.log(`    - "${m.content}" by ${m.author}`)
      console.log(`      Sentiment: ${m.sentiment.toFixed(2)}, Engagement: ${m.engagement}`)
    })
  })
} else {
  console.log('✅ No crises detected')
}
```

### Get Brand Insights

```typescript
const insights = await brandRadar.getBrandInsights(brandConfig, 7)

console.log(`Brand Insights (7 days):`)
console.log(`\n  Top Topics:`)
insights.topTopics.forEach((topic) => {
  console.log(`    ${topic.topic}: ${topic.mentions} mentions (${topic.sentiment.toFixed(2)} sentiment)`)
})

console.log(`\n  Top Influencers:`)
insights.topInfluencers.forEach((inf) => {
  console.log(`    ${inf.name}:`)
  console.log(`      Mentions: ${inf.mentions}`)
  console.log(`      Avg Sentiment: ${inf.avgSentiment.toFixed(2)}`)
  console.log(`      Followers: ${inf.followers.toLocaleString()}`)
})

console.log(`\n  Peak Hours:`)
Object.entries(insights.timeDistribution)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .forEach(([hour, count]) => {
    console.log(`    ${hour}: ${count} mentions`)
  })
```

### Generate Full Report

```typescript
const report = await brandRadar.generateReport(brandConfig, 7)

console.log(`\n=== ${report.brand} Brand Report ===`)
console.log(`Period: ${report.period}\n`)

console.log(`SUMMARY:`)
console.log(`  Total Mentions: ${report.summary.totalMentions}`)
console.log(`  Mention Growth: ${report.summary.mentionGrowth > 0 ? '+' : ''}${report.summary.mentionGrowth.toFixed(1)}%`)
console.log(`  Sentiment Change: ${report.summary.sentimentChange > 0 ? '+' : ''}${report.summary.sentimentChange.toFixed(2)}`)
console.log(`\n  Key Findings:`)
report.summary.keyFindings.forEach((finding) => {
  console.log(`    • ${finding}`)
})

console.log(`\nSENTIMENT:`)
console.log(`  Avg: ${report.sentiment.avgSentiment.toFixed(2)}`)
console.log(`  Trend: ${report.sentiment.sentimentTrend}`)

console.log(`\nREPUTATION:`)
console.log(`  Score: ${report.reputation.score.toFixed(1)}/100`)
console.log(`  Trend: ${report.reputation.trend}`)
console.log(`  Risk: ${report.reputation.riskLevel}`)

console.log(`\nCOMPETITORS:`)
report.competitors.forEach((comp) => {
  console.log(`  ${comp.competitor}:`)
  console.log(`    Mentions: ${comp.competitorMentions} vs ${comp.brandMentions} (our brand)`)
  console.log(`    Share of Voice: ${comp.shareOfVoice.toFixed(1)}%`)
  console.log(`    Sentiment: ${comp.competitorSentiment.toFixed(2)} vs ${comp.brandSentiment.toFixed(2)}`)
})

console.log(`\nALERTS: ${report.alerts.length}`)
report.alerts.forEach((alert) => {
  console.log(`  ⚠️  ${alert.severity.toUpperCase()}: ${alert.description}`)
})
```

## Brand Configuration

```typescript
interface BrandConfig {
  name: string // Brand name
  keywords: string[] // Primary keywords to track
  aliases?: string[] // Alternative names/spellings
  competitors?: string[] // Competitor names
  excludeKeywords?: string[] // Keywords to exclude (false positives)
}
```

## Mention Context Detection

The system automatically classifies mentions into:

- **product**: Product features, updates, releases
- **support**: Customer support, issues, problems
- **comparison**: Comparisons with competitors
- **review**: User reviews and experiences
- **general**: Other brand-related content

## Crisis Detection

Automatically detects:

1. **Sentiment Drop** - Significant negative sentiment
2. **Negative Spike** - Unusual spike in negative mentions
3. **Controversy** - Controversial topics trending
4. **Product Issue** - Product-related problems

Severity levels:
- **low**: Minor issues
- **medium**: Requires attention
- **high**: Urgent attention needed
- **critical**: Immediate action required

## Reputation Score Calculation

The reputation score (0-100) is calculated from:

- **Sentiment** (40%) - Average sentiment score
- **Volume** (20%) - Number of mentions
- **Engagement** (20%) - Post engagement levels
- **Influencer Support** (20%) - Support from influencers

## Use Cases

1. **Brand Health Monitoring** - Track overall brand perception
2. **Competitive Intelligence** - Monitor competitors
3. **Crisis Management** - Early detection of PR issues
4. **Product Launch Tracking** - Monitor new product reception
5. **Customer Service** - Track support-related mentions
6. **Market Research** - Understand customer sentiment
7. **Influencer Partnerships** - Identify brand advocates

## Integration with Other Packages

```typescript
import { BrandRadar } from '@moltbeat/brand-radar'
import { ReportGenerator } from '@moltbeat/pdf-report'

// Generate brand monitoring report
const brandRadar = new BrandRadar(prisma)
const report = await brandRadar.generateReport(brandConfig, 30)

// Create PDF report
const pdfGenerator = new ReportGenerator()
// ... convert brand report to PDF format
```

## API Reference

### BrandRadar

Main class for brand monitoring.

#### Methods

- `trackMentions(config, startDate, endDate)` - Track all brand mentions
- `getBrandSentiment(config, days)` - Calculate brand sentiment
- `compareWithCompetitor(config, competitor, days)` - Compare with competitor
- `getReputationScore(config, days)` - Calculate reputation score
- `detectCrises(config, days)` - Detect potential crises
- `getBrandInsights(config, days)` - Extract brand insights
- `generateReport(config, days)` - Generate comprehensive report

### BrandDetector

Utility class for brand detection.

#### Methods

- `detectBrand(text, config)` - Check if text mentions brand
- `detectCompetitor(text, config)` - Detect competitor mentions
- `detectContext(text)` - Determine mention context
- `extractKeywords(text)` - Extract keywords from text

## License

MIT
