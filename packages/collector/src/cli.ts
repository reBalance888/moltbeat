#!/usr/bin/env node

import { Scheduler } from './Scheduler'

async function main() {
  const apiKey = process.env.MOLTBOOK_API_KEY

  if (!apiKey) {
    console.error('Error: MOLTBOOK_API_KEY environment variable is required')
    process.exit(1)
  }

  const scheduler = new Scheduler(
    {
      moltbookApiKey: apiKey,
      collectAgents: true,
      collectPosts: true,
      collectMetrics: true,
      analyzeSentiment: true,
      submolts: ['general', 'announcements', 'tech'],
      maxAgents: 100,
      maxPosts: 50,
    },
    {
      cronExpression: process.env.COLLECTOR_CRON || '0 */5 * * *',
      runOnStartup: true,
      onComplete: async (stats) => {
        console.log('\n✅ Collection completed successfully')
      },
      onError: (error) => {
        console.error('\n❌ Collection failed:', error.message)
      },
    }
  )

  await scheduler.start()

  console.log('\nCollector is running. Press Ctrl+C to stop.')

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...')
    scheduler.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\nShutting down...')
    scheduler.stop()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
