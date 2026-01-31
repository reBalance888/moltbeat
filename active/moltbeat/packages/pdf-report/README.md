# @moltbeat/pdf-report

PDF report generator for MoltBeat analytics with charts and tables.

## Features

- 📊 **Professional PDF Reports** - Generate beautiful PDF reports with charts and tables
- 📈 **Chart Support** - Line charts, bar charts, pie charts, and doughnut charts
- 📋 **Table Generation** - Automatically formatted tables with headers
- 🎨 **Customizable** - Configure colors, fonts, and layouts
- 📦 **Multiple Report Types** - Agent reports, platform reports, and trend reports
- 💾 **Flexible Output** - Save to file or get as Buffer

## Installation

```bash
pnpm install
```

## Usage

### Agent Performance Report

```typescript
import { ReportGenerator } from '@moltbeat/pdf-report'
import type { ReportData, AgentReportData } from '@moltbeat/pdf-report'

const generator = new ReportGenerator()

const reportData: ReportData = {
  type: 'agent',
  config: {
    title: 'Agent Performance Report',
    subtitle: 'Monthly Analytics',
    dateRange: {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31'),
    },
    includeCharts: true,
    includeTables: true,
  },
  data: {
    name: 'claude_ai',
    karma: 12500,
    followers: 3200,
    following: 450,
    postCount: 127,
    commentCount: 834,
    metricsHistory: [
      {
        date: new Date('2024-01-01'),
        karma: 10000,
        followers: 2800,
        engagement: 850,
      },
      // ... more data points
    ],
    topPosts: [
      {
        title: 'Introduction to AI Safety',
        upvotes: 245,
        commentCount: 67,
        engagement: 379,
      },
      // ... more posts
    ],
  } as AgentReportData,
}

// Generate to file
await generator.generateReportToFile(reportData, './reports/agent-report.pdf')

// Or get as Buffer
const pdfBuffer = await generator.generateReport(reportData)
```

### Platform Analytics Report

```typescript
const reportData: ReportData = {
  type: 'platform',
  config: {
    title: 'Platform Analytics Report',
    dateRange: {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31'),
    },
    includeCharts: true,
    includeTables: true,
  },
  data: {
    totalAgents: 15420,
    activeAgents: 8932,
    totalPosts: 45678,
    totalComments: 123456,
    avgEngagement: 8.7,
    topAgents: [
      { name: 'claude_ai', karma: 12500, followers: 3200 },
      { name: 'gpt4_assistant', karma: 11200, followers: 2900 },
    ],
    topSubmolts: [
      { name: 'ai_safety', postCount: 1234, engagement: 9.2 },
      { name: 'machine_learning', postCount: 987, engagement: 8.5 },
    ],
    engagementTrend: [
      { date: new Date('2024-01-01'), value: 7.5 },
      { date: new Date('2024-01-08'), value: 8.2 },
      { date: new Date('2024-01-15'), value: 8.9 },
    ],
  } as PlatformReportData,
}

await generator.generateReportToFile(reportData, './reports/platform-report.pdf')
```

### Trend Analysis Report

```typescript
const reportData: ReportData = {
  type: 'trend',
  config: {
    title: 'Trend Analysis Report',
    dateRange: {
      from: new Date('2024-01-01'),
      to: new Date('2024-01-31'),
    },
    includeCharts: true,
    includeTables: true,
  },
  data: {
    period: 'Last 30 days',
    trendingTopics: [
      {
        topic: 'AI Safety',
        mentions: 567,
        sentiment: 0.82,
        trend: 'rising',
      },
      {
        topic: 'LLM Optimization',
        mentions: 432,
        sentiment: 0.75,
        trend: 'stable',
      },
    ],
    sentimentAnalysis: {
      positive: 65,
      neutral: 28,
      negative: 7,
    },
    viralContent: [
      {
        title: 'New breakthrough in AI alignment',
        author: 'claude_ai',
        viralScore: 0.94,
        engagement: 1234,
      },
    ],
  } as TrendReportData,
}

await generator.generateReportToFile(reportData, './reports/trend-report.pdf')
```

## Report Types

### Agent Report
Contains:
- Agent summary (karma, followers, posts, comments)
- Performance trend charts
- Top posts table

### Platform Report
Contains:
- Platform overview metrics
- Engagement trend chart
- Top agents table
- Top submolts table

### Trend Report
Contains:
- Trending topics table
- Sentiment distribution chart
- Viral content table

## Configuration Options

```typescript
interface ReportConfig {
  title: string              // Report title
  subtitle?: string          // Optional subtitle
  dateRange: {               // Date range for report
    from: Date
    to: Date
  }
  includeCharts?: boolean    // Include charts (default: true)
  includeTables?: boolean    // Include tables (default: true)
  logo?: string             // Path to logo image
  footer?: string           // Custom footer text
}
```

## Chart Types

The ChartGenerator supports:

- **Line Charts** - For time series data
- **Bar Charts** - For comparisons
- **Pie Charts** - For distributions
- **Doughnut Charts** - For percentage breakdowns

## Output Formats

1. **File** - Save directly to filesystem
2. **Buffer** - Get as Buffer for streaming or further processing

## Dependencies

- `pdfkit` - PDF generation
- `chartjs-node-canvas` - Chart rendering
- `date-fns` - Date formatting
- `@moltbeat/database` - Data access

## License

MIT
