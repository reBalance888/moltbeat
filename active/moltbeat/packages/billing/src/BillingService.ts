import Stripe from 'stripe'
import { PrismaClient } from '@moltbeat/database'
import {
  Subscription,
  CheckoutSession,
  BillingPortalSession,
  PaymentMethod,
  UsageRecord,
  Invoice,
} from './types'
import { getPlanById } from './plans'

/**
 * Stripe billing and subscription management
 */
export class BillingService {
  private stripe: Stripe

  constructor(
    private prisma: PrismaClient,
    stripeSecretKey: string
  ) {
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    })
  }

  /**
   * Create Stripe customer for user
   */
  async createCustomer(userId: string, email: string, name?: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    })

    return customer.id
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(
    userId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<CheckoutSession> {
    const plan = getPlanById(planId)
    if (!plan) {
      throw new Error(`Plan ${planId} not found`)
    }

    if (!plan.stripePriceId) {
      throw new Error(`Plan ${planId} does not have Stripe price ID`)
    }

    // Get or create customer
    let customerId = await this.getCustomerId(userId)
    if (!customerId) {
      // Create customer - will need user data
      const userData = await this.prisma.brandMonitor.findFirst({
        where: { userId },
      })
      customerId = await this.createCustomer(
        userId,
        userData?.userId || `user-${userId}@moltbeat.com`
      )
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planId,
      },
    })

    return {
      id: session.id,
      url: session.url!,
      sessionId: session.id,
    }
  }

  /**
   * Create billing portal session
   */
  async createPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<BillingPortalSession> {
    const customerId = await this.getCustomerId(userId)
    if (!customerId) {
      throw new Error('Customer not found')
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return {
      url: session.url,
      returnUrl,
    }
  }

  /**
   * Get customer ID for user
   */
  private async getCustomerId(userId: string): Promise<string | null> {
    // Check database for existing subscription
    const subscription = await this.prisma.brandMonitor.findFirst({
      where: { userId },
    })

    return subscription?.userId || null
  }

  /**
   * Create subscription record in database
   */
  async createSubscription(
    userId: string,
    planId: string,
    stripeSubscriptionId: string,
    stripeCustomerId: string
  ): Promise<Subscription> {
    const stripeSubscription =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId)

    const subscription: Subscription = {
      id: stripeSubscriptionId,
      userId,
      planId,
      status: stripeSubscription.status as any,
      stripeSubscriptionId,
      stripeCustomerId,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      trialEnd: stripeSubscription.trial_end
        ? new Date(stripeSubscription.trial_end * 1000)
        : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Store in database (would need proper schema)
    // await this.prisma.subscription.create({ data: subscription })

    return subscription
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, immediate: boolean = false): Promise<void> {
    if (immediate) {
      await this.stripe.subscriptions.cancel(subscriptionId)
    } else {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })
    }
  }

  /**
   * Resume subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })
  }

  /**
   * Update subscription plan
   */
  async updateSubscriptionPlan(
    subscriptionId: string,
    newPlanId: string
  ): Promise<void> {
    const newPlan = getPlanById(newPlanId)
    if (!newPlan || !newPlan.stripePriceId) {
      throw new Error(`Invalid plan: ${newPlanId}`)
    }

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
    const subscriptionItem = subscription.items.data[0]

    await this.stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscriptionItem.id,
          price: newPlan.stripePriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    })
  }

  /**
   * Record usage for metered billing
   */
  async recordUsage(
    subscriptionId: string,
    metric: string,
    quantity: number
  ): Promise<void> {
    // This would be used for usage-based billing
    // For now, just track in database

    const record: UsageRecord = {
      id: `usage-${Date.now()}`,
      subscriptionId,
      metric: metric as any,
      quantity,
      timestamp: new Date(),
    }

    // Store in database
    // await this.prisma.usageRecord.create({ data: record })
  }

  /**
   * Get upcoming invoice
   */
  async getUpcomingInvoice(customerId: string): Promise<Invoice | null> {
    try {
      const invoice = await this.stripe.invoices.retrieveUpcoming({
        customer: customerId,
      })

      return {
        id: 'upcoming',
        subscriptionId: invoice.subscription as string,
        stripeInvoiceId: 'upcoming',
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status as any,
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        createdAt: new Date(invoice.created * 1000),
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Get payment methods for customer
   */
  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })

    const customer = await this.stripe.customers.retrieve(customerId)
    const defaultPaymentMethodId =
      customer.deleted !== true
        ? (customer as Stripe.Customer).invoice_settings.default_payment_method
        : null

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      userId: customer.deleted !== true ? (customer as Stripe.Customer).metadata?.userId || '' : '',
      stripePaymentMethodId: pm.id,
      type: 'card',
      last4: pm.card!.last4,
      brand: pm.card!.brand,
      expMonth: pm.card!.exp_month,
      expYear: pm.card!.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
      createdAt: new Date(pm.created * 1000),
    }))
  }

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<void> {
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })
  }

  /**
   * Handle Stripe webhook
   */
  async handleWebhook(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Promise<void> {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    )

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  }

  /**
   * Handle subscription update webhook
   */
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    // Update subscription in database
    console.log('Subscription updated:', subscription.id)
    // await this.prisma.subscription.update({
    //   where: { stripeSubscriptionId: subscription.id },
    //   data: {
    //     status: subscription.status,
    //     currentPeriodStart: new Date(subscription.current_period_start * 1000),
    //     currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    //     cancelAtPeriodEnd: subscription.cancel_at_period_end,
    //   },
    // })
  }

  /**
   * Handle subscription deleted webhook
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('Subscription deleted:', subscription.id)
    // await this.prisma.subscription.update({
    //   where: { stripeSubscriptionId: subscription.id },
    //   data: {
    //     status: 'canceled',
    //   },
    // })
  }

  /**
   * Handle invoice payment succeeded webhook
   */
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('Invoice payment succeeded:', invoice.id)
    // Store invoice in database
  }

  /**
   * Handle invoice payment failed webhook
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('Invoice payment failed:', invoice.id)
    // Send notification to user
  }
}
