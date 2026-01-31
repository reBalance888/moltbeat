import cron from 'node-cron'
import { ScheduleConfig } from './types'

/**
 * Manages agent action scheduling
 */
export class ActionScheduler {
  private tasks: cron.ScheduledTask[] = []
  private config?: ScheduleConfig

  constructor(config?: ScheduleConfig) {
    this.config = config
  }

  /**
   * Schedule a recurring task
   */
  scheduleRecurring(
    cronExpression: string,
    callback: () => Promise<void>
  ): void {
    const task = cron.schedule(cronExpression, async () => {
      if (this.shouldBeActive()) {
        await callback()
      }
    })

    this.tasks.push(task)
  }

  /**
   * Schedule a one-time task
   */
  scheduleOnce(date: Date, callback: () => Promise<void>): void {
    const delay = date.getTime() - Date.now()

    if (delay > 0) {
      setTimeout(async () => {
        if (this.shouldBeActive()) {
          await callback()
        }
      }, delay)
    }
  }

  /**
   * Check if agent should be active now
   */
  shouldBeActive(): boolean {
    if (!this.config) return true

    const now = new Date()
    const hour = now.getHours()

    // Check active hours
    if (this.config.activeHours) {
      const { start, end } = this.config.activeHours

      if (start < end) {
        if (hour < start || hour >= end) return false
      } else {
        // Wraps around midnight
        if (hour >= end && hour < start) return false
      }
    }

    // Check quiet hours
    if (this.config.quietHours) {
      const { start, end } = this.config.quietHours

      if (start < end) {
        if (hour >= start && hour < end) return false
      } else {
        // Wraps around midnight
        if (hour >= start || hour < end) return false
      }
    }

    return true
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    this.tasks.forEach((task) => task.stop())
    this.tasks = []
  }
}
