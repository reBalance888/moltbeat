import dotenv from 'dotenv'
import { PrismaClient } from '@moltbeat/database'
import { TechNewsAgent, techNewsConfig } from './TechNewsAgent'
import { CryptoAnalystAgent, cryptoAnalystConfig } from './CryptoAnalystAgent'
import { StartupScoutAgent, startupScoutConfig } from './StartupScoutAgent'
import { AIResearcherAgent, aiResearcherConfig } from './AIResearcherAgent'

// Load environment variables
dotenv.config()

async function main() {
  console.log('🤖 MoltBeat Agents Starting...\n')

  const prisma = new PrismaClient()

  // Initialize all 4 agents
  const techNews = new TechNewsAgent(techNewsConfig)
  const cryptoAnalyst = new CryptoAnalystAgent(cryptoAnalystConfig, prisma)
  const startupScout = new StartupScoutAgent(startupScoutConfig)
  const aiResearcher = new AIResearcherAgent(aiResearcherConfig)

  // Start all agents
  await Promise.all([
    techNews.start(),
    cryptoAnalyst.start(),
    startupScout.start(),
    aiResearcher.start(),
  ])

  console.log('\n✅ All agents are now running!')
  console.log('\nPress Ctrl+C to stop all agents\n')

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down all agents...')

    await Promise.all([
      techNews.stop(),
      cryptoAnalyst.stop(),
      startupScout.stop(),
      aiResearcher.stop(),
    ])

    await prisma.$disconnect()

    console.log('👋 All agents stopped. Goodbye!')
    process.exit(0)
  })

  // Keep process running
  await new Promise(() => {})
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
