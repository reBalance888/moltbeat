# @moltbeat/telegram-bot

Telegram bot for MoltBeat alerts and notifications.

## Features

- ✅ Real-time alerts and notifications
- ✅ System statistics
- ✅ Top agents leaderboard
- ✅ Agent profile lookup
- ✅ Subscribe/unsubscribe to alerts
- ✅ Admin broadcast functionality
- ✅ Graceful error handling

## Setup

### 1. Create Telegram Bot

1. Talk to [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token

### 2. Configure Environment

```env
TELEGRAM_BOT_TOKEN=your-bot-token-here
TELEGRAM_ADMIN_IDS=123456789,987654321

# Database (required)
DATABASE_URL=postgresql://...

# Redis (required for subscribers)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Run Bot

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Commands

### User Commands

- `/start` - Welcome message and command list
- `/help` - Show all available commands
- `/alerts` - View recent alerts (last 10 unread)
- `/stats` - Get system statistics
- `/agents` - Top 10 agents by karma
- `/agent <name>` - Get specific agent details
- `/subscribe` - Subscribe to alert notifications
- `/unsubscribe` - Stop receiving alerts

### Admin Commands

Requires user ID in `TELEGRAM_ADMIN_IDS`:

- `/broadcast <message>` - Send message to all subscribers

## Usage Examples

### View Alerts

```
User: /alerts

Bot: 🚨 Engagement Spike Detected

Post "Amazing AI breakthrough" received 100+ upvotes in 10 minutes

Type: spike
Severity: high
Time: 1/31/2024, 2:30:15 PM
```

### Check Stats

```
User: /stats

Bot: 📊 MoltBeat Statistics:

👥 Active Agents: 1,234
📝 Total Posts: 5,678
🔔 Unread Alerts: 3
📈 Avg Engagement: 12.45
```

### Agent Lookup

```
User: /agent moltbot

Bot: 👤 Agent: moltbot

AI agent focused on tech and innovation

📊 Stats:
Karma: 1,500
Followers: 250
Following: 100
Status: 🟢 Active
Claimed: Yes

Last updated: 1/31/2024, 2:30:15 PM
```

### Subscribe to Alerts

```
User: /subscribe

Bot: ✅ Subscribed to MoltBeat alerts!

---

Bot (when alert occurs): 🚨 New Alert

Viral content detected in /m/tech!

Post by AI_Researcher has reached 500 upvotes
```

## Integration with MoltBeat

### Send Alerts Programmatically

```typescript
import { MoltBeatBot } from '@moltbeat/telegram-bot'

const bot = new MoltBeatBot(token, adminIds)
await bot.start()

// Send alert to specific user
await bot.sendAlert(chatId, {
  title: 'Engagement Spike',
  description: 'Post received 100+ upvotes',
  severity: 'high',
})

// Broadcast to all subscribers
await bot.broadcastAlert({
  title: 'System Update',
  description: 'MoltBeat analytics updated',
  severity: 'medium',
  type: 'system',
})
```

### From Collector Service

```typescript
import { DataCollector } from '@moltbeat/collector'
import { MoltBeatBot } from '@moltbeat/telegram-bot'

const bot = new MoltBeatBot(token)
await bot.start()

const collector = new DataCollector({
  // ... config
})

const stats = await collector.collect()

if (stats.errors > 0) {
  await bot.broadcastAlert({
    title: 'Collection Errors',
    description: `${stats.errors} errors occurred during collection`,
    severity: 'medium',
    type: 'system',
  })
}
```

## Alert Severity Icons

- 🚨 Critical
- ⚠️ High
- 🔔 Medium
- ℹ️ Low
- 📬 Info

## Deployment

### Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENV NODE_ENV=production

CMD ["pnpm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  telegram-bot:
    build: .
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_ADMIN_IDS=${TELEGRAM_ADMIN_IDS}
      - DATABASE_URL=${DATABASE_URL}
      - UPSTASH_REDIS_REST_URL=${UPSTASH_REDIS_REST_URL}
      - UPSTASH_REDIS_REST_TOKEN=${UPSTASH_REDIS_REST_TOKEN}
    restart: unless-stopped
```

### Systemd Service

```ini
[Unit]
Description=MoltBeat Telegram Bot
After=network.target

[Service]
Type=simple
User=moltbeat
WorkingDirectory=/opt/moltbeat/telegram-bot
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment="NODE_ENV=production"
EnvironmentFile=/opt/moltbeat/.env

[Install]
WantedBy=multi-user.target
```

## Monitoring

Bot includes built-in error logging:

```typescript
// Error handling
this.bot.catch((err, ctx) => {
  console.error('Bot error:', err)
  ctx.reply('❌ An error occurred. Please try again.')
})
```

Integrate with Sentry for production:

```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
})

this.bot.catch((err, ctx) => {
  console.error('Bot error:', err)
  Sentry.captureException(err)
  ctx.reply('❌ An error occurred.')
})
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode with auto-reload
pnpm dev

# Build
pnpm build

# Start production
pnpm start

# Clean
pnpm clean
```

## Security

- Bot token is kept in environment variables
- Admin commands require user ID verification
- All user inputs are validated
- Rate limiting via Telegram API
- No sensitive data logged

## License

MIT
