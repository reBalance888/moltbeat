/**
 * Type definitions for billing and subscriptions
 */

export interface PricingPlan {
  id: string
  name: string
  description: string
  price: number // Monthly price in cents
  currency: string
  features: string[]
  limits: {
    agents?: number
    apiCalls?: number
    reports?: number
    alerts?: number
  }
  stripePriceId?: string
  stripeProductId?: string
}

export interface Subscription {
  id: string
  userId: string
  planId: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete'
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  trialEnd?: Date
  createdAt: Date
  updatedAt: Date
}

export interface UsageRecord {
  id: string
  subscriptionId: string
  metric: 'api_calls' | 'agents_tracked' | 'reports_generated' | 'alerts_sent'
  quantity: number
  timestamp: Date
}

export interface Invoice {
  id: string
  subscriptionId: string
  stripeInvoiceId: string
  amountDue: number
  amountPaid: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  periodStart: Date
  periodEnd: Date
  paidAt?: Date
  createdAt: Date
}

export interface PaymentMethod {
  id: string
  userId: string
  stripePaymentMethodId: string
  type: 'card'
  last4: string
  brand: string
  expMonth: number
  expYear: number
  isDefault: boolean
  createdAt: Date
}

export interface BillingPortalSession {
  url: string
  returnUrl: string
}

export interface CheckoutSession {
  id: string
  url: string
  sessionId: string
}

export interface WebhookEvent {
  type: string
  data: any
}
