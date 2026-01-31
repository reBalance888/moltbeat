# MoltBeat Deployment Guide

Complete guide for deploying MoltBeat in production.

## 📋 Prerequisites

- Docker & Docker Compose installed
- Supabase account (or PostgreSQL instance)
- Upstash Redis account
- Moltbook API key
- (Optional) Telegram Bot token
- (Optional) Domain name

## 🚀 Quick Deploy with Docker Compose

### 1. Clone Repository

```bash
git clone https://github.com/reBalance888/moltbeat.git
cd moltbeat
```

### 2. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Required variables:**
```env
MOLTBOOK_API_KEY=your-api-key-here
DATABASE_URL=postgresql://user:pass@host:port/db
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Optional:**
```env
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_ADMIN_IDS=123456789
COLLECTOR_CRON=0 */5 * * *
```

### 3. Build & Start Services

```bash
# Build Docker images
make docker-build

# Start all services
make docker-up

# View logs
make docker-logs
```

### 4. Initialize Database

```bash
# Generate Prisma client
make prisma-generate

# Run migrations
make prisma-migrate
```

### 5. Verify Deployment

```bash
# Check service status
docker-compose ps

# View collector logs
docker-compose logs -f collector

# View telegram bot logs
docker-compose logs -f telegram-bot
```

## 🏗️ Service Architecture

```
┌─────────────┐
│  Collector  │──┐
└─────────────┘  │
                 │    ┌──────────┐
┌─────────────┐  ├───→│ Postgres │
│Telegram Bot │──┘    └──────────┘
└─────────────┘            │
      │                    │
      └────────┬───────────┘
               │
         ┌──────────┐
         │  Redis   │
         └──────────┘
```

## 📦 Individual Service Deployment

### Collector Service

**Docker:**
```bash
cd packages/collector
docker build -t moltbeat-collector .
docker run -d \
  --name collector \
  -e MOLTBOOK_API_KEY=$MOLTBOOK_API_KEY \
  -e DATABASE_URL=$DATABASE_URL \
  -e UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL \
  -e UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_REST_TOKEN \
  moltbeat-collector
```

**PM2:**
```bash
cd packages/collector
pnpm build
pm2 start dist/cli.js --name moltbeat-collector
pm2 save
```

**Systemd:**
```ini
[Unit]
Description=MoltBeat Collector
After=network.target

[Service]
Type=simple
User=moltbeat
WorkingDirectory=/opt/moltbeat/packages/collector
ExecStart=/usr/bin/node dist/cli.js
Restart=on-failure
EnvironmentFile=/opt/moltbeat/.env

[Install]
WantedBy=multi-user.target
```

### Telegram Bot

**Docker:**
```bash
cd bots/telegram
docker build -t moltbeat-telegram .
docker run -d \
  --name telegram-bot \
  -e TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN \
  -e DATABASE_URL=$DATABASE_URL \
  moltbeat-telegram
```

**PM2:**
```bash
cd bots/telegram
pnpm build
pm2 start dist/index.js --name moltbeat-telegram
pm2 save
```

## ☁️ Cloud Deployment

### Railway

1. Create new project on [Railway](https://railway.app)
2. Connect GitHub repository
3. Add environment variables
4. Deploy!

**railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm -r build"
  },
  "deploy": {
    "startCommand": "cd packages/collector && pnpm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Render

1. Create new Web Service
2. Connect repository
3. Build command: `pnpm install && pnpm -r build`
4. Start command: `cd packages/collector && pnpm start`
5. Add environment variables

### Fly.io

**fly.toml:**
```toml
app = "moltbeat-collector"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 8080
  protocol = "tcp"

  [[services.ports]]
    port = 80
```

Deploy:
```bash
fly launch
fly secrets set MOLTBOOK_API_KEY=your-key
fly secrets set DATABASE_URL=your-db
fly deploy
```

### DigitalOcean App Platform

1. Create new app
2. Select repository
3. Configure build:
   - Build command: `pnpm install && pnpm -r build`
   - Run command: `cd packages/collector && pnpm start`
4. Add environment variables
5. Deploy

## 🗄️ Database Setup

### Using Supabase (Recommended)

1. Create project on [Supabase](https://supabase.com)
2. Get connection string from Settings → Database
3. Set `DATABASE_URL` in `.env`
4. Run migrations:

```bash
make prisma-migrate
```

### Using Neon (Serverless PostgreSQL)

1. Create database on [Neon](https://neon.tech)
2. Copy connection string
3. Set `DATABASE_URL` in `.env`
4. Run migrations

### Self-hosted PostgreSQL

**Docker:**
```bash
docker run -d \
  --name moltbeat-postgres \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=moltbeat \
  -v postgres-data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16-alpine
```

## 🔴 Redis Setup

### Using Upstash (Recommended)

1. Create database on [Upstash](https://upstash.com)
2. Copy REST URL and token
3. Set environment variables:

```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Self-hosted Redis

**Docker:**
```bash
docker run -d \
  --name moltbeat-redis \
  -p 6379:6379 \
  redis:alpine
```

**Note:** For self-hosted Redis, you'll need to modify the cache client to use `ioredis` instead of `@upstash/redis`.

## 📊 Monitoring

### Docker Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f collector
docker-compose logs -f telegram-bot

# Last 100 lines
docker-compose logs --tail=100 collector
```

### Health Checks

Add to `docker-compose.yml`:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "process.exit(0)"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Prometheus Metrics (Future)

```yaml
# docker-compose.yml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
  depends_on:
    - prometheus
```

## 🔐 Security Best Practices

1. **Environment Variables**
   - Never commit `.env` file
   - Use secrets management in production
   - Rotate API keys regularly

2. **Database**
   - Use connection pooling
   - Enable SSL/TLS
   - Restrict IP access
   - Regular backups

3. **Redis**
   - Enable TLS
   - Use authentication
   - Set memory limits

4. **Container Security**
   - Run as non-root user
   - Use minimal base images (alpine)
   - Scan for vulnerabilities
   - Keep images updated

5. **Network**
   - Use private networks
   - Firewall configuration
   - Rate limiting
   - DDoS protection

## 🔄 Updates & Maintenance

### Update Services

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
make docker-build
make docker-restart
```

### Database Migrations

```bash
# Create migration
cd packages/database
pnpm prisma migrate dev --name migration_name

# Deploy to production
pnpm prisma migrate deploy
```

### Backup & Restore

**Database:**
```bash
# Backup
pg_dump -U user -d moltbeat > backup.sql

# Restore
psql -U user -d moltbeat < backup.sql
```

**Docker volumes:**
```bash
# Backup
docker run --rm \
  -v moltbeat_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore
docker run --rm \
  -v moltbeat_postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

## 🚨 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs collector

# Check environment
docker-compose config

# Recreate container
docker-compose up -d --force-recreate collector
```

### Database Connection Issues

```bash
# Test connection
docker-compose exec postgres psql -U moltbeat -d moltbeat

# Check network
docker network inspect moltbeat-network
```

### Memory Issues

```bash
# Check resource usage
docker stats

# Set memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 512M
    reservations:
      memory: 256M
```

### Collector Not Collecting

1. Check API key is valid
2. Verify cron expression
3. Check database connection
4. Review logs for errors

```bash
docker-compose logs -f collector
```

## 📈 Scaling

### Horizontal Scaling

Run multiple collector instances with different submolts:

```yaml
# docker-compose.yml
collector-general:
  extends: collector
  environment:
    - COLLECTOR_SUBMOLTS=general,announcements

collector-tech:
  extends: collector
  environment:
    - COLLECTOR_SUBMOLTS=tech,dev
```

### Kubernetes (Advanced)

See `k8s/` directory for Kubernetes manifests.

```bash
kubectl apply -f k8s/
```

## 📞 Support

- Issues: [GitHub Issues](https://github.com/reBalance888/moltbeat/issues)
- Discussions: [GitHub Discussions](https://github.com/reBalance888/moltbeat/discussions)

---

Built with ❤️ for the AI agent community
