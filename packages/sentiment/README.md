# @moltbeat/sentiment

Sentiment analysis for MoltBeat using Transformers.js - runs locally with zero API costs!

## Features

- ✅ Local sentiment analysis (no API calls)
- ✅ Zero cost - runs entirely in Node.js
- ✅ DistilBERT model (fast and accurate)
- ✅ Batch processing support
- ✅ Keyword extraction
- ✅ Sentiment aggregation
- ✅ Configurable confidence threshold

## Installation

```bash
pnpm add @moltbeat/sentiment
```

## Usage

### Basic Analysis

```typescript
import { SentimentAnalyzer } from '@moltbeat/sentiment'

const analyzer = new SentimentAnalyzer()

// Initialize (downloads model on first run)
await analyzer.initialize()

// Analyze text
const result = await analyzer.analyze('This is amazing! I love it!')

console.log(result)
// {
//   sentiment: 'positive',
//   score: 0.9998,
//   confidence: 0.9998,
//   label: 'POSITIVE',
//   rawScores: {
//     positive: 0.9998,
//     negative: 0.0002
//   }
// }
```

### Batch Analysis

```typescript
const texts = [
  'I love this product!',
  'This is terrible.',
  'It works okay.',
]

const results = await analyzer.analyzeBatch(texts)

results.forEach((result, i) => {
  console.log(`Text ${i}: ${result.sentiment} (${result.confidence})`)
})
```

### With Keyword Extraction

```typescript
const result = await analyzer.analyzeWithKeywords(
  'The new AI agent is absolutely fantastic! Great features and excellent performance.',
  5 // top 5 keywords
)

console.log(result)
// {
//   sentiment: 'positive',
//   score: 0.9995,
//   confidence: 0.9995,
//   label: 'POSITIVE',
//   rawScores: { positive: 0.9995, negative: 0.0005 },
//   keywords: ['fantastic', 'features', 'excellent', 'performance', 'agent']
// }
```

### Aggregate Sentiments

```typescript
const results = await analyzer.analyzeBatch([
  'I love it!',
  'Pretty good',
  'Not bad',
  'Terrible',
])

const aggregated = analyzer.aggregateSentiments(results)

console.log(aggregated)
// {
//   overall: 'positive',
//   avgScore: 0.85,
//   avgConfidence: 0.85,
//   distribution: {
//     positive: 0.75,
//     negative: 0.25,
//     neutral: 0.0
//   }
// }
```

### Custom Configuration

```typescript
const analyzer = new SentimentAnalyzer({
  confidenceThreshold: 0.7, // Higher threshold for neutral classification
  model: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
})

await analyzer.initialize()
```

### Batch Processor

For large volumes of data:

```typescript
import { SentimentAnalyzer, BatchProcessor } from '@moltbeat/sentiment'

const analyzer = new SentimentAnalyzer()
await analyzer.initialize()

const processor = new BatchProcessor(analyzer)

// Process with concurrency control
const items = [
  { id: 'post-1', text: 'Great post!' },
  { id: 'post-2', text: 'Not good.' },
  // ... thousands more
]

const results = await processor.processBatch(items, {
  concurrency: 10, // Process 10 at a time
  delayMs: 100, // 100ms delay between batches
  onProgress: (current, total) => {
    console.log(`Progress: ${current}/${total}`)
  }
})

results.forEach((r) => {
  console.log(`${r.id}: ${r.result.sentiment}`)
})
```

### Filter by Sentiment

```typescript
// Get only positive results
const positive = await processor.processAndFilter(items, 'positive', {
  concurrency: 10
})

console.log(`Found ${positive.length} positive items`)
```

### Get Distribution

```typescript
const distribution = await processor.getDistribution(items, {
  concurrency: 10,
  onProgress: (current, total) => {
    console.log(`Analyzing: ${current}/${total}`)
  }
})

console.log(distribution)
// {
//   total: 1000,
//   positive: 600,
//   negative: 300,
//   neutral: 100,
//   avgScore: 0.72,
//   avgConfidence: 0.85
// }
```

### With Retry on Failure

```typescript
const results = await processor.processWithRetry(items, {
  maxRetries: 3,
  concurrency: 10,
  delayMs: 100
})
```

## API Reference

### SentimentAnalyzer

#### Constructor Options

```typescript
interface AnalysisOptions {
  confidenceThreshold?: number // 0-1, default: 0.6
  model?: string // Hugging Face model ID
}
```

#### Methods

- `initialize(): Promise<void>` - Initialize the model (call once)
- `analyze(text: string): Promise<SentimentResult>` - Analyze single text
- `analyzeBatch(texts: string[]): Promise<SentimentResult[]>` - Batch analysis
- `analyzeWithKeywords(text: string, limit?: number): Promise<SentimentResult & { keywords: string[] }>` - Analysis with keywords
- `aggregateSentiments(results: SentimentResult[]): AggregatedResult` - Aggregate multiple results
- `extractKeywords(text: string, limit?: number): string[]` - Extract keywords

### SentimentResult

```typescript
interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number // 0-1
  confidence: number // 0-1
  label: string // 'POSITIVE', 'NEGATIVE', etc.
  rawScores: {
    positive: number
    negative: number
    neutral?: number
  }
}
```

### BatchProcessor

#### Constructor

```typescript
new BatchProcessor(analyzer: SentimentAnalyzer)
```

#### Methods

- `processBatch(items, options): Promise<BatchResult[]>` - Process in batches
- `processWithRetry(items, options): Promise<BatchResult[]>` - Process with retry
- `processAndFilter(items, sentiment, options): Promise<BatchResult[]>` - Filter by sentiment
- `getDistribution(items, options): Promise<Distribution>` - Get sentiment distribution

### BatchOptions

```typescript
interface BatchOptions {
  concurrency?: number // Default: 10
  delayMs?: number // Default: 0
  onProgress?: (current: number, total: number) => void
}
```

## Model Information

**Default Model:** `Xenova/distilbert-base-uncased-finetuned-sst-2-english`

- **Type:** DistilBERT (distilled BERT)
- **Size:** ~250 MB
- **Speed:** ~50-100 texts/second (depends on hardware)
- **Accuracy:** 91% on SST-2 dataset
- **Languages:** English

### Model Download

Model is downloaded automatically on first `initialize()` call and cached locally.

**Cache Location:**
- Linux/Mac: `~/.cache/transformers/`
- Windows: `%USERPROFILE%\.cache\transformers\`

## Performance Tips

1. **Reuse analyzer instance** - Don't create new instances for each analysis
2. **Initialize once** - Call `initialize()` at app startup
3. **Use batch processing** - More efficient for multiple texts
4. **Adjust concurrency** - Find optimal value for your hardware
5. **Cache results** - Use Redis to cache sentiment for unchanged content

## Example: Integrate with Database

```typescript
import { SentimentAnalyzer } from '@moltbeat/sentiment'
import { prisma } from '@moltbeat/database'

const analyzer = new SentimentAnalyzer()
await analyzer.initialize()

// Analyze new posts
const posts = await prisma.post.findMany({
  where: {
    sentimentAnalysis: { none: {} }
  },
  take: 100
})

for (const post of posts) {
  const result = await analyzer.analyzeWithKeywords(
    post.content || post.title,
    5
  )

  await prisma.sentimentAnalysis.create({
    data: {
      contentType: 'post',
      postId: post.id,
      sentiment: result.sentiment,
      score: result.score,
      confidence: result.confidence,
      keywords: result.keywords,
    }
  })
}
```

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

## License

MIT
