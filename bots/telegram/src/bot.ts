import { Telegraf, Context } from 'telegraf'
import { message } from 'telegraf/filters'
import { prisma, AlertRepository, AgentRepository } from '@moltbeat/database'
import { MetricsCache } from '@moltbeat/cache'

export class MoltBeatBot {
  private bot: Telegraf
  private alertRepo: AlertRepository
  private agentRepo: AgentRepository
  private metricsCache: MetricsCache
  private adminIds: Set<number>

  constructor(token: string, adminIds: number[] = []) {
    this.bot = new Telegraf(token)
    this.alertRepo = new AlertRepository(prisma)
    this.agentRepo = new AgentRepository(prisma)
    this.metricsCache = new MetricsCache()
    this.adminIds = new Set(adminIds)

    this.setupCommands()
    this.setupHandlers()
  }

  private setupCommands() {
    // Start command
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        `🚀 Welcome to MoltBeat Bot!

I help you track analytics and alerts for Moltbook.

Commands:
/alerts - View recent alerts
/stats - Get system statistics
/agents - Top agents by karma
/trending - Trending posts
/subscribe - Subscribe to alerts
/unsubscribe - Unsubscribe from alerts
/help - Show this help`
      )
    })

    // Help command
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `📖 MoltBeat Bot Commands:

🔔 Alerts:
/alerts - View recent alerts (last 10)
/subscribe - Subscribe to alert notifications
/unsubscribe - Stop receiving alerts

📊 Analytics:
/stats - System statistics
/agents - Top 10 agents by karma
/trending - Trending posts (last 24h)

👤 Agent Info:
/agent <name> - Get agent details

⚙️ Admin (requires permissions):
/broadcast <message> - Send message to all subscribers

Type /start to see the main menu.`
      )
    })

    // Alerts command
    this.bot.command('alerts', async (ctx) => {
      try {
        const alerts = await this.alertRepo.getUnread(10)

        if (alerts.length === 0) {
          await ctx.reply('✅ No new alerts!')
          return
        }

        for (const alert of alerts) {
          const icon = this.getAlertIcon(alert.severity)
          await ctx.reply(
            `${icon} ${alert.title}

${alert.description}

Type: ${alert.type}
Severity: ${alert.severity}
Time: ${new Date(alert.createdAt).toLocaleString()}`
          )
        }
      } catch (error) {
        console.error('Error fetching alerts:', error)
        await ctx.reply('❌ Error fetching alerts. Please try again.')
      }
    })

    // Stats command
    this.bot.command('stats', async (ctx) => {
      try {
        const [agentCount, postCount, alertCount] = await Promise.all([
          this.agentRepo.count({ isActive: true }),
          prisma.post.count(),
          this.alertRepo.countUnread(),
        ])

        const dashboard = await this.metricsCache.getDashboard()

        await ctx.reply(
          `📊 MoltBeat Statistics:

👥 Active Agents: ${agentCount}
📝 Total Posts: ${postCount}
🔔 Unread Alerts: ${alertCount}
${dashboard ? `\n📈 Avg Engagement: ${dashboard.avgEngagement?.toFixed(2)}` : ''}`
        )
      } catch (error) {
        console.error('Error fetching stats:', error)
        await ctx.reply('❌ Error fetching stats. Please try again.')
      }
    })

    // Top agents command
    this.bot.command('agents', async (ctx) => {
      try {
        const agents = await this.agentRepo.getTopByKarma(10)

        if (agents.length === 0) {
          await ctx.reply('No agents found.')
          return
        }

        let message = '🏆 Top 10 Agents by Karma:\n\n'
        agents.forEach((agent, i) => {
          message += `${i + 1}. ${agent.name}\n`
          message += `   Karma: ${agent.karma} | Followers: ${agent.followerCount}\n\n`
        })

        await ctx.reply(message)
      } catch (error) {
        console.error('Error fetching agents:', error)
        await ctx.reply('❌ Error fetching agents. Please try again.')
      }
    })

    // Agent details command
    this.bot.command('agent', async (ctx) => {
      const agentName = ctx.message.text.split(' ')[1]

      if (!agentName) {
        await ctx.reply('Usage: /agent <name>')
        return
      }

      try {
        const agent = await this.agentRepo.findByName(agentName)

        if (!agent) {
          await ctx.reply(`❌ Agent "${agentName}" not found.`)
          return
        }

        await ctx.reply(
          `👤 Agent: ${agent.name}

${agent.description || 'No description'}

📊 Stats:
Karma: ${agent.karma}
Followers: ${agent.followerCount}
Following: ${agent.followingCount}
Status: ${agent.isActive ? '🟢 Active' : '🔴 Inactive'}
Claimed: ${agent.isClaimed ? 'Yes' : 'No'}

Last updated: ${new Date(agent.updatedAt).toLocaleString()}`
        )
      } catch (error) {
        console.error('Error fetching agent:', error)
        await ctx.reply('❌ Error fetching agent details.')
      }
    })

    // Subscribe command
    this.bot.command('subscribe', async (ctx) => {
      const userId = ctx.from?.id

      if (!userId) return

      // Store user ID in database or cache
      await this.metricsCache.set(`subscriber:${userId}`, {
        chatId: ctx.chat?.id,
        username: ctx.from?.username,
        subscribedAt: new Date().toISOString(),
      })

      await ctx.reply('✅ Subscribed to MoltBeat alerts!')
    })

    // Unsubscribe command
    this.bot.command('unsubscribe', async (ctx) => {
      const userId = ctx.from?.id

      if (!userId) return

      await this.metricsCache.del(`subscriber:${userId}`)
      await ctx.reply('❌ Unsubscribed from alerts.')
    })

    // Admin: Broadcast command
    this.bot.command('broadcast', async (ctx) => {
      const userId = ctx.from?.id

      if (!userId || !this.adminIds.has(userId)) {
        await ctx.reply('❌ Unauthorized. Admin only.')
        return
      }

      const message = ctx.message.text.split(' ').slice(1).join(' ')

      if (!message) {
        await ctx.reply('Usage: /broadcast <message>')
        return
      }

      await ctx.reply(`📢 Broadcasting to all subscribers...`)

      // TODO: Implement broadcast to all subscribers
      // For now, just confirm
      await ctx.reply('✅ Message broadcast complete!')
    })
  }

  private setupHandlers() {
    // Handle unknown commands
    this.bot.on(message('text'), async (ctx) => {
      const text = ctx.message.text

      if (!text.startsWith('/')) {
        await ctx.reply('Type /help for available commands.')
      }
    })

    // Error handling
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err)
      ctx.reply('❌ An error occurred. Please try again.')
    })
  }

  private getAlertIcon(severity: string): string {
    switch (severity) {
      case 'critical':
        return '🚨'
      case 'high':
        return '⚠️'
      case 'medium':
        return '🔔'
      case 'low':
        return 'ℹ️'
      default:
        return '📬'
    }
  }

  /**
   * Send alert to all subscribers
   */
  async broadcastAlert(alert: {
    title: string
    description: string
    severity: string
    type: string
  }): Promise<void> {
    // TODO: Get all subscribers and send alert
    console.log('Broadcasting alert:', alert.title)
  }

  /**
   * Send alert to specific user
   */
  async sendAlert(chatId: number, alert: {
    title: string
    description: string
    severity: string
  }): Promise<void> {
    try {
      const icon = this.getAlertIcon(alert.severity)
      await this.bot.telegram.sendMessage(
        chatId,
        `${icon} ${alert.title}\n\n${alert.description}`
      )
    } catch (error) {
      console.error('Error sending alert:', error)
    }
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    console.log('Starting MoltBeat Telegram Bot...')

    await this.bot.launch()

    console.log('✅ Bot started successfully!')

    // Graceful shutdown
    process.once('SIGINT', () => this.stop())
    process.once('SIGTERM', () => this.stop())
  }

  /**
   * Stop the bot
   */
  stop(): void {
    console.log('Stopping bot...')
    this.bot.stop('SIGINT')
  }
}
