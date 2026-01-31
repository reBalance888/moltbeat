# MoltBeat Load Tests

Performance and load testing for MoltBeat API using k6.

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D00
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Test Scenarios

### 1. Smoke Test (smoke.js)

**Purpose:** Verify system works under minimal load

**Configuration:**
- Duration: 1 minute
- VUs: 1-5
- Endpoints: Health, Agents, Posts

**Run:**
```bash
npm run test:smoke
```

**Thresholds:**
- 95% of requests < 500ms
- Error rate < 1%

### 2. Load Test (load.js)

**Purpose:** Test normal expected load

**Configuration:**
- Duration: 10 minutes
- VUs: 50-100
- Endpoints: All API endpoints

**Run:**
```bash
npm run test:load
```

**Thresholds:**
- 95% of requests < 1s
- 99% of requests < 2s
- Error rate < 5%

### 3. Stress Test (stress.js)

**Purpose:** Push system beyond normal capacity

**Configuration:**
- Duration: 15 minutes
- VUs: 100-500
- Pattern: Gradual increase to find breaking point

**Run:**
```bash
npm run test:stress
```

**Thresholds:**
- 95% of requests < 2s
- Error rate < 10%

### 4. Spike Test (spike.js)

**Purpose:** Test sudden surge of traffic

**Configuration:**
- Duration: 5 minutes
- VUs: 0→1000→0 (rapid spike)

**Run:**
```bash
npm run test:spike
```

**Thresholds:**
- 95% of requests < 5s
- Error rate < 20% (during spike)

### 5. Soak Test (soak.js)

**Purpose:** Extended period of sustained load (find memory leaks)

**Configuration:**
- Duration: 2 hours
- VUs: 50 (sustained)

**Run:**
```bash
npm run test:soak
```

**Thresholds:**
- 95% of requests < 1s
- Error rate < 1%
- No performance degradation over time

### 6. API Test (api.js)

**Purpose:** Comprehensive test of all API endpoints

**Configuration:**
- Duration: 5 minutes
- VUs: 50
- Tests: Agents, Posts, Metrics, Analytics

**Run:**
```bash
npm run test:api
```

### 7. WebSocket Test (websocket.js)

**Purpose:** Test WebSocket server capacity

**Configuration:**
- Duration: 5 minutes
- Connections: 100-500 concurrent

**Run:**
```bash
npm run test:websocket
```

## Environment Variables

```bash
# API URL
export API_URL=http://localhost:3000

# WebSocket URL
export WS_URL=ws://localhost:3000/ws

# Auth token (if needed)
export AUTH_TOKEN=your-jwt-token
```

## Running Tests

### Run all tests

```bash
npm test
```

### Run specific test

```bash
npm run test:smoke
npm run test:load
npm run test:stress
```

### Custom k6 options

```bash
k6 run --vus 100 --duration 30s scenarios/load.js
k6 run --out json=results.json scenarios/api.js
```

## Interpreting Results

### Key Metrics

- **http_req_duration**: Request response time
  - p(95): 95th percentile
  - p(99): 99th percentile
  - avg: Average
  - max: Maximum

- **http_req_failed**: Percentage of failed requests
  - Should be < 1% for production

- **http_reqs**: Total number of requests
  - Higher is better (throughput)

- **vus**: Virtual users (concurrent connections)

### Example Output

```
     ✓ status is 200

     checks.........................: 100.00% ✓ 1500      ✗ 0
     data_received..................: 3.2 MB  53 kB/s
     data_sent......................: 150 kB  2.5 kB/s
     http_req_blocked...............: avg=1.5ms   min=1µs     med=5µs     max=50ms    p(90)=10ms    p(95)=20ms
     http_req_duration..............: avg=150ms   min=50ms    med=120ms   max=800ms   p(90)=300ms   p(95)=400ms
     http_req_failed................: 0.00%   ✓ 0         ✗ 1500
     http_reqs......................: 1500    25/s
     vus............................: 50      min=50      max=50
```

### Performance Baselines

**Expected Performance:**
- Health check: < 50ms
- List endpoints (25 items): < 200ms
- Analytics overview: < 500ms
- Analytics timeseries: < 1s

**Acceptable Under Load:**
- 95% of requests < 1s
- 99% of requests < 2s
- Error rate < 5%
- Throughput > 100 req/s

## CI/CD Integration

### GitHub Actions

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D00
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Start API
        run: |
          cd apps/api
          npm install
          npm run build
          npm start &
          sleep 10

      - name: Run smoke test
        run: cd load-tests && npm run test:smoke

      - name: Run load test
        run: cd load-tests && npm run test:load

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: load-tests/*.json
```

## Best Practices

1. **Start small** - Run smoke test first
2. **Gradually increase** - Don't jump straight to stress test
3. **Monitor server** - Watch CPU, memory, disk I/O during tests
4. **Test realistic scenarios** - Use production-like data
5. **Run regularly** - Catch performance regressions early
6. **Set baselines** - Track performance over time
7. **Test on prod-like environment** - Same specs as production

## Troubleshooting

### High error rates

- Check server logs
- Verify rate limiting isn't too aggressive
- Check database connection pool
- Monitor memory usage

### Slow response times

- Enable database query logging
- Check for N+1 queries
- Verify caching is working
- Profile slow endpoints

### Connection errors

- Check max connections in database
- Verify WebSocket limits
- Check file descriptor limits: `ulimit -n`

## Monitoring During Tests

```bash
# Watch server logs
tail -f logs/api.log

# Monitor resources
top
htop
docker stats

# Database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Memory usage
free -m
```

## License

MIT
