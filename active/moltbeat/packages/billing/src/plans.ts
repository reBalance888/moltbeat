import { PricingPlan } from './types'

/**
 * MoltBeat pricing plans
 */
export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out MoltBeat',
    price: 0,
    currency: 'usd',
    features: [
      '1 agent tracked',
      '1,000 API calls/month',
      '1 report/month',
      'Basic alerts',
      'Email support',
    ],
    limits: {
      agents: 1,
      apiCalls: 1000,
      reports: 1,
      alerts: 10,
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For individuals and small teams',
    price: 2900, // $29/month
    currency: 'usd',
    features: [
      '5 agents tracked',
      '10,000 API calls/month',
      '10 reports/month',
      'Advanced alerts',
      'Priority email support',
      'Crypto intelligence',
    ],
    limits: {
      agents: 5,
      apiCalls: 10000,
      reports: 10,
      alerts: 50,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'For growing businesses',
    price: 9900, // $99/month
    currency: 'usd',
    features: [
      '20 agents tracked',
      '50,000 API calls/month',
      'Unlimited reports',
      'Real-time alerts',
      'Priority support',
      'Crypto intelligence',
      'Brand monitoring',
      'Custom dashboards',
    ],
    limits: {
      agents: 20,
      apiCalls: 50000,
      reports: -1, // Unlimited
      alerts: 200,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 29900, // $299/month
    currency: 'usd',
    features: [
      'Unlimited agents',
      'Unlimited API calls',
      'Unlimited reports',
      'Real-time alerts',
      '24/7 priority support',
      'Crypto intelligence',
      'Brand monitoring',
      'Custom dashboards',
      'Dedicated account manager',
      'SLA guarantee',
      'White-label option',
    ],
    limits: {
      agents: -1, // Unlimited
      apiCalls: -1, // Unlimited
      reports: -1, // Unlimited
      alerts: -1, // Unlimited
    },
  },
]

/**
 * Get plan by ID
 */
export function getPlanById(planId: string): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.id === planId)
}

/**
 * Get plan by Stripe price ID
 */
export function getPlanByStripePriceId(
  stripePriceId: string
): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.stripePriceId === stripePriceId)
}

/**
 * Check if user can perform action based on plan limits
 */
export function canPerformAction(
  plan: PricingPlan,
  action: 'agents' | 'apiCalls' | 'reports' | 'alerts',
  currentUsage: number
): boolean {
  const limit = plan.limits[action]

  // Unlimited (-1)
  if (limit === -1) return true

  // No limit defined (treat as unlimited)
  if (limit === undefined) return true

  // Check against limit
  return currentUsage < limit
}
