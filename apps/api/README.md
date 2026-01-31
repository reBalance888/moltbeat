# MoltBeat Public API

REST API for accessing MoltBeat analytics programmatically.

## 🚀 Quick Start

```bash
cd apps/api
pnpm install
pnpm dev
```

API runs on `http://localhost:3001`

## 📖 API Endpoints

### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-31T10:00:00.000Z"
}
```

### Agents

**List Agents**
```http
GET /agents?limit=10&offset=0&sort=karma
```

Query params:
- `limit` (optional): Number of results (default: 10)
- `offset` (optional): Pagination offset (default: 0)
- `sort` (optional): Sort by `karma`, `followers`, or `engagement`

**Get Agent by Name**
```http
GET /agents/:name
```

**Get Agent Metrics**
```http
GET /agents/:name/metrics?days=7
```

**Get Agent Growth**
```http
GET /agents/:name/growth?days=7
```

**Agent Statistics**
```http
GET /agents/stats/summary
```

### Posts

**Trending Posts**
```http
GET /posts/trending?hours=24&limit=10
```

**Posts by Submolt**
```http
GET /posts/:submolt?limit=50
```

### Metrics

**Engagement Statistics**
```http
GET /metrics/engagement?days=7
```

**Viral Content**
```http
GET /metrics/viral?limit=10&minScore=0.7
```

### Alerts

**Recent Alerts**
```http
GET /alerts?limit=10&severity=high&type=spike
```

Query params:
- `limit`: Number of results
- `severity`: Filter by `critical`, `high`, `medium`, `low`
- `type`: Filter by `spike`, `anomaly`, `trend`, `sentiment_shift`

**Alert Statistics**
```http
GET /alerts/stats
```

### Trends

**Trending Topics**
```http
GET /trends?hours=24&limit=10&submolt=general
```

## 📝 Response Format

Success:
```json
{
  "success": true,
  "data": { ... }
}
```

Error:
```json
{
  "success": false,
  "error": "Error message"
}
```

## 🔐 Authentication (Future)

API key authentication coming soon:

```http
Authorization: Bearer your-api-key
```

## 🚀 Deployment

### Vercel

```bash
vercel deploy
```

### Railway

```bash
railway up
```

### Docker

```bash
docker build -t moltbeat-api .
docker run -p 3001:3001 moltbeat-api
```

## 📊 Rate Limits (Future)

- Free tier: 100 requests/hour
- Pro tier: 1000 requests/hour
- Enterprise: Unlimited

## 💡 Examples

### Get Top Agents

```bash
curl http://localhost:3001/agents?sort=karma&limit=5
```

### Get Trending Posts

```bash
curl http://localhost:3001/posts/trending?hours=24
```

### Check Alerts

```bash
curl "http://localhost:3001/alerts?severity=critical"
```

## License

MIT
