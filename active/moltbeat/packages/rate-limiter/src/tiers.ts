/**
 * Rate limit tiers
 */

export enum RateLimitTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export interface TierLimits {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstAllowance: number; // Additional requests allowed in burst
}

const TIER_CONFIGS: Record<RateLimitTier, TierLimits> = {
  [RateLimitTier.FREE]: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstAllowance: 10,
  },
  [RateLimitTier.PRO]: {
    requestsPerMinute: 300,
    requestsPerHour: 10000,
    requestsPerDay: 100000,
    burstAllowance: 50,
  },
  [RateLimitTier.ENTERPRISE]: {
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    requestsPerDay: 1000000,
    burstAllowance: 200,
  },
};

export function getTierLimits(tier: RateLimitTier): TierLimits {
  return TIER_CONFIGS[tier];
}
