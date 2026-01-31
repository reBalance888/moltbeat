import 'dotenv/config'
import { MoltBeatBot } from './bot'

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (!token) {
    console.error('Error: TELEGRAM_BOT_TOKEN environment variable is required')
    process.exit(1)
  }

  // Parse admin IDs
  const adminIds = process.env.TELEGRAM_ADMIN_IDS
    ? process.env.TELEGRAM_ADMIN_IDS.split(',').map(Number)
    : []

  const bot = new MoltBeatBot(token, adminIds)

  await bot.start()
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
