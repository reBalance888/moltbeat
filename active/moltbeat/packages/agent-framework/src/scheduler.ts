import { logger } from '@moltbeat/logger';

/**
 * Scheduler configuration for agent posting
 */
export interface SchedulerConfig {
  /** Target posts per day range */
  postsPerDay: { min: number; max: number };
  /** Active hours (when agent can post) */
  activeHours: { start: number; end: number; timezone: string };
  /** Maximum comments per day (MoltBook limit: 50) */
  commentsPerDay: number;
  /** Agent name for logging */
  agentName?: string;
}

/**
 * Smart Agent Scheduler with Real MoltBook Rate Limits
 *
 * MoltBook enforced limits:
 * - 1 post per 30 minutes
 * - 1 comment per 20 seconds
 * - Max 50 comments per day
 *
 * Features:
 * - Optimal spacing within active hours
 * - Daily target post calculation
 * - Cooldown tracking
 * - Smart scheduling to maximize engagement
 */
export class AgentScheduler {
  private lastPostTime: number = 0;
  private postsToday: number = 0;
  private postsDayStart: number = Date.now();

  private lastCommentTime: number = 0;
  private commentsToday: number = 0;
  private commentsDayStart: number = Date.now();

  private config: SchedulerConfig;

  // MoltBook enforced limits
  private readonly POST_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
  private readonly COMMENT_COOLDOWN_MS = 20 * 1000; // 20 seconds
  private readonly MAX_COMMENTS_PER_DAY = 50;

  constructor(config: SchedulerConfig) {
    this.config = config;

    logger.info(
      {
        agentName: config.agentName,
        postsPerDay: config.postsPerDay,
        activeHours: config.activeHours,
      },
      'AgentScheduler initialized'
    );
  }

  // ========== Post Scheduling ==========

  /**
   * Check if agent can post now
   */
  canPostNow(): boolean {
    const now = Date.now();

    // Reset daily counter
    if (now - this.postsDayStart > 24 * 60 * 60 * 1000) {
      this.postsToday = 0;
      this.postsDayStart = now;
      logger.info({ agentName: this.config.agentName }, 'Daily post counter reset');
    }

    // Check cooldown (30 minutes)
    if (now - this.lastPostTime < this.POST_COOLDOWN_MS) {
      const remainingMs = this.POST_COOLDOWN_MS - (now - this.lastPostTime);
      logger.debug(
        {
          agentName: this.config.agentName,
          remainingMinutes: Math.ceil(remainingMs / 60000),
        },
        'Post cooldown active'
      );
      return false;
    }

    // Check daily limit
    const targetPosts = this.getTargetPostsForToday();
    if (this.postsToday >= targetPosts) {
      logger.debug(
        {
          agentName: this.config.agentName,
          postsToday: this.postsToday,
          targetPosts,
        },
        'Daily post target reached'
      );
      return false;
    }

    // Check active hours
    if (!this.isWithinActiveHours()) {
      logger.debug(
        {
          agentName: this.config.agentName,
          currentHour: new Date().getHours(),
          activeHours: this.config.activeHours,
        },
        'Outside active hours'
      );
      return false;
    }

    return true;
  }

  /**
   * Get next available post time
   */
  getNextPostTime(): Date {
    const now = Date.now();

    // Check cooldown first
    const cooldownEnd = this.lastPostTime + this.POST_COOLDOWN_MS;
    if (cooldownEnd > now) {
      return new Date(cooldownEnd);
    }

    // Check if daily target reached
    const targetPosts = this.getTargetPostsForToday();
    const remainingPosts = targetPosts - this.postsToday;

    if (remainingPosts <= 0) {
      // Tomorrow at start of active hours
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(this.config.activeHours.start, 0, 0, 0);
      return tomorrow;
    }

    // Calculate optimal spacing
    const activeMinutesRemaining = this.getActiveMinutesRemaining();

    if (activeMinutesRemaining <= 0) {
      // Tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(this.config.activeHours.start, 0, 0, 0);
      return tomorrow;
    }

    // Space posts evenly within remaining active hours
    const intervalMinutes = Math.max(30, activeMinutesRemaining / remainingPosts);
    const nextPostTime = new Date(now + intervalMinutes * 60 * 1000);

    // Ensure it's within active hours
    if (!this.isWithinActiveHours(nextPostTime)) {
      const tomorrow = new Date(nextPostTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(this.config.activeHours.start, 0, 0, 0);
      return tomorrow;
    }

    return nextPostTime;
  }

  /**
   * Record that a post was made
   */
  recordPost(): void {
    this.lastPostTime = Date.now();
    this.postsToday++;

    logger.info(
      {
        agentName: this.config.agentName,
        postsToday: this.postsToday,
        targetPosts: this.getTargetPostsForToday(),
        nextPostTime: this.getNextPostTime().toISOString(),
      },
      'Post recorded'
    );
  }

  // ========== Comment Scheduling ==========

  /**
   * Check if agent can comment now
   */
  canCommentNow(): boolean {
    const now = Date.now();

    // Reset daily counter
    if (now - this.commentsDayStart > 24 * 60 * 60 * 1000) {
      this.commentsToday = 0;
      this.commentsDayStart = now;
      logger.info({ agentName: this.config.agentName }, 'Daily comment counter reset');
    }

    // Check cooldown (20 seconds)
    if (now - this.lastCommentTime < this.COMMENT_COOLDOWN_MS) {
      return false;
    }

    // Check daily limit (50 max)
    if (this.commentsToday >= this.MAX_COMMENTS_PER_DAY) {
      logger.debug(
        {
          agentName: this.config.agentName,
          commentsToday: this.commentsToday,
        },
        'Daily comment limit reached'
      );
      return false;
    }

    return true;
  }

  /**
   * Get next available comment time
   */
  getNextCommentTime(): Date {
    const now = Date.now();
    const cooldownEnd = this.lastCommentTime + this.COMMENT_COOLDOWN_MS;

    if (cooldownEnd > now) {
      return new Date(cooldownEnd);
    }

    if (this.commentsToday >= this.MAX_COMMENTS_PER_DAY) {
      // Tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow;
    }

    return new Date(now);
  }

  /**
   * Record that a comment was made
   */
  recordComment(): void {
    this.lastCommentTime = Date.now();
    this.commentsToday++;

    logger.debug(
      {
        agentName: this.config.agentName,
        commentsToday: this.commentsToday,
        remaining: this.MAX_COMMENTS_PER_DAY - this.commentsToday,
      },
      'Comment recorded'
    );
  }

  // ========== Status & Info ==========

  /**
   * Get current scheduler status
   */
  getStatus() {
    const now = Date.now();

    return {
      posts: {
        today: this.postsToday,
        target: this.getTargetPostsForToday(),
        remaining: Math.max(0, this.getTargetPostsForToday() - this.postsToday),
        canPostNow: this.canPostNow(),
        nextPostTime: this.getNextPostTime().toISOString(),
        cooldownRemaining: Math.max(0, this.POST_COOLDOWN_MS - (now - this.lastPostTime)),
      },
      comments: {
        today: this.commentsToday,
        remaining: this.MAX_COMMENTS_PER_DAY - this.commentsToday,
        canCommentNow: this.canCommentNow(),
        nextCommentTime: this.getNextCommentTime().toISOString(),
        cooldownRemaining: Math.max(0, this.COMMENT_COOLDOWN_MS - (now - this.lastCommentTime)),
      },
      activeHours: {
        isActive: this.isWithinActiveHours(),
        start: this.config.activeHours.start,
        end: this.config.activeHours.end,
        minutesRemaining: this.getActiveMinutesRemaining(),
      },
    };
  }

  // ========== Private Helpers ==========

  /**
   * Get target posts for today (randomized within range)
   */
  private getTargetPostsForToday(): number {
    const { min, max } = this.config.postsPerDay;

    // Use day of year as seed for consistent daily target
    const dayOfYear = Math.floor(this.postsDayStart / 86400000);
    const seed = dayOfYear % (max - min + 1);

    return min + seed;
  }

  /**
   * Check if current time (or given time) is within active hours
   */
  private isWithinActiveHours(time?: Date): boolean {
    const checkTime = time || new Date();
    const hour = checkTime.getHours();

    return hour >= this.config.activeHours.start && hour < this.config.activeHours.end;
  }

  /**
   * Get remaining active minutes today
   */
  private getActiveMinutesRemaining(): number {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    const endHour = this.config.activeHours.end;

    if (currentHour >= endHour) {
      return 0;
    }

    const totalMinutesUntilEnd = (endHour - currentHour) * 60 - currentMinutes;
    return Math.max(0, totalMinutesUntilEnd);
  }

  /**
   * Reset scheduler state (for testing)
   */
  reset(): void {
    this.lastPostTime = 0;
    this.postsToday = 0;
    this.postsDayStart = Date.now();
    this.lastCommentTime = 0;
    this.commentsToday = 0;
    this.commentsDayStart = Date.now();

    logger.info({ agentName: this.config.agentName }, 'Scheduler reset');
  }
}
