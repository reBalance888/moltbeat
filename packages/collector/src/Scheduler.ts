import cron from 'node-cron'
import { DataCollector, CollectorConfig, CollectorStats } from './DataCollector'

export interface ScheduleConfig {
  /**
   * Cron expression for collection schedule
   * Default: '0 *\/5 * * *' (every 5 hours)
   */
  cronExpression?: string
  /**
   * Run on startup
   */
  runOnStartup?: boolean
  /**
   * Callback for completion
   */
  onComplete?: (stats: CollectorStats) => void | Promise<void>
  /**
   * Callback for errors
   */
  onError?: (error: Error) => void
}

/**
 * Scheduler for automated data collection
 */
export class Scheduler {
  private collector: DataCollector
  private cronJob: cron.ScheduledTask | null = null
  private config: ScheduleConfig
  private lastRun: Date | null = null
  private lastStats: CollectorStats | null = null

  constructor(collectorConfig: CollectorConfig, scheduleConfig: ScheduleConfig = {}) {
    this.collector = new DataCollector(collectorConfig)
    this.config = {
      cronExpression: scheduleConfig.cronExpression || '0 */5 * * *', // Every 5 hours
      runOnStartup: scheduleConfig.runOnStartup ?? false,
      onComplete: scheduleConfig.onComplete,
      onError: scheduleConfig.onError,
    }
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    console.log(`Starting scheduler with cron: ${this.config.cronExpression}`)

    // Initialize collector
    await this.collector.initialize()

    // Run on startup if configured
    if (this.config.runOnStartup) {
      console.log('Running collection on startup...')
      await this.runCollection()
    }

    // Schedule cron job
    this.cronJob = cron.schedule(this.config.cronExpression!, async () => {
      await this.runCollection()
    })

    console.log('Scheduler started successfully')
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop()
      this.cronJob = null
      console.log('Scheduler stopped')
    }
  }

  /**
   * Run collection manually
   */
  async runNow(): Promise<CollectorStats> {
    return this.runCollection()
  }

  /**
   * Internal method to run collection
   */
  private async runCollection(): Promise<CollectorStats> {
    console.log(`\n=== Starting collection at ${new Date().toISOString()} ===`)

    try {
      const stats = await this.collector.collect()

      this.lastRun = new Date()
      this.lastStats = stats

      console.log('Collection completed:')
      console.log(`  - Agents collected: ${stats.agentsCollected}`)
      console.log(`  - Posts collected: ${stats.postsCollected}`)
      console.log(`  - Metrics computed: ${stats.metricsComputed}`)
      console.log(`  - Sentiments analyzed: ${stats.sentimentAnalyzed}`)
      console.log(`  - Errors: ${stats.errors}`)
      console.log(`  - Duration: ${(stats.duration / 1000).toFixed(2)}s`)

      if (this.config.onComplete) {
        await this.config.onComplete(stats)
      }

      return stats
    } catch (error) {
      console.error('Collection failed:', error)

      if (this.config.onError) {
        this.config.onError(error as Error)
      }

      throw error
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean
    cronExpression: string
    lastRun: Date | null
    lastStats: CollectorStats | null
    collectorStatus: ReturnType<DataCollector['getStatus']>
  } {
    return {
      isRunning: this.cronJob !== null,
      cronExpression: this.config.cronExpression!,
      lastRun: this.lastRun,
      lastStats: this.lastStats,
      collectorStatus: this.collector.getStatus(),
    }
  }
}
