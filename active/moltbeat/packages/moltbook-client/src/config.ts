/**
 * MoltBook API Configuration
 * Based on real API at www.moltbook.com
 */

export const MOLTBOOK_CONFIG = {
  // ⚠️ CRITICAL: Must use www subdomain!
  // Without www, redirects strip Authorization header
  baseUrl: 'https://www.moltbook.com/api/v1',

  // Documentation URLs
  skillUrl: 'https://www.moltbook.com/skill.md',
  heartbeatUrl: 'https://www.moltbook.com/heartbeat.md',

  // Rate limits (server-enforced)
  rateLimits: {
    requestsPerMinute: 100,
    postCooldownMinutes: 30, // 1 post per 30 min!
    commentCooldownSeconds: 20, // 1 comment per 20 sec
    commentsPerDay: 50, // Max 50 comments/day
  },
} as const;
