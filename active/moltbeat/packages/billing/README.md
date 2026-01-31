# @moltbeat/billing

Stripe billing and subscription management for MoltBeat.

## Features

- 💳 **Stripe Integration** - Full Stripe payment processing
- 📊 **Subscription Management** - Create, update, cancel subscriptions
- 💰 **Multiple Plans** - Free, Starter, Professional, Enterprise
- 🎫 **Checkout Sessions** - Hosted checkout pages
- 🔄 **Billing Portal** - Self-service customer portal
- 📈 **Usage Tracking** - Metered billing support
- 🔔 **Webhook Handling** - Automated event processing
- 💵 **Payment Methods** - Card management

## Installation

```bash
pnpm install
```

## Pricing Plans

### Free
- $0/month
- 1 agent tracked
- 1,000 API calls/month
- 1 report/month
- Basic alerts

### Starter
- $29/month
- 5 agents tracked
- 10,000 API calls/month
- 10 reports/month
- Advanced alerts
- Crypto intelligence

### Professional
- $99/month
- 20 agents tracked
- 50,000 API calls/month
- Unlimited reports
- Real-time alerts
- Crypto intelligence
- Brand monitoring

### Enterprise
- $299/month
- Unlimited everything
- 24/7 priority support
- Dedicated account manager
- White-label option

## Usage

### Initialize

```typescript
import { PrismaClient } from '@prisma/client'
import { BillingService } from '@moltbeat/billing'

const prisma = new PrismaClient()
const billing = new BillingService(prisma, process.env.STRIPE_SECRET_KEY!)
```

### Create Checkout Session

```typescript
const session = await billing.createCheckoutSession(
  'user-123',
  'professional',
  'https://app.moltbeat.com/success',
  'https://app.moltbeat.com/cancel'
)

// Redirect user to checkout
window.location.href = session.url
```

### Create Billing Portal Session

```typescript
const portal = await billing.createPortalSession(
  'user-123',
  'https://app.moltbeat.com/settings'
)

// Redirect to billing portal
window.location.href = portal.url
```

### Create Subscription

```typescript
const subscription = await billing.createSubscription(
  'user-123',
  'professional',
  'sub_1234567890',
  'cus_1234567890'
)

console.log(`Subscription created: ${subscription.id}`)
console.log(`Status: ${subscription.status}`)
console.log(`Period: ${subscription.currentPeriodStart} - ${subscription.currentPeriodEnd}`)
```

### Cancel Subscription

```typescript
// Cancel at period end (default)
await billing.cancelSubscription('sub_1234567890')

// Cancel immediately
await billing.cancelSubscription('sub_1234567890', true)
```

### Resume Subscription

```typescript
await billing.resumeSubscription('sub_1234567890')
```

### Update Subscription Plan

```typescript
await billing.updateSubscriptionPlan('sub_1234567890', 'enterprise')
```

### Record Usage (Metered Billing)

```typescript
await billing.recordUsage('sub_1234567890', 'api_calls', 100)
await billing.recordUsage('sub_1234567890', 'agents_tracked', 1)
```

### Get Upcoming Invoice

```typescript
const invoice = await billing.getUpcomingInvoice('cus_1234567890')

if (invoice) {
  console.log(`Amount due: $${invoice.amountDue / 100}`)
  console.log(`Period: ${invoice.periodStart} - ${invoice.periodEnd}`)
}
```

### Get Payment Methods

```typescript
const paymentMethods = await billing.getPaymentMethods('cus_1234567890')

paymentMethods.forEach((pm) => {
  console.log(`${pm.brand} ending in ${pm.last4}`)
  console.log(`Expires: ${pm.expMonth}/${pm.expYear}`)
  console.log(`Default: ${pm.isDefault}`)
})
```

### Set Default Payment Method

```typescript
await billing.setDefaultPaymentMethod('cus_1234567890', 'pm_1234567890')
```

### Handle Webhooks

```typescript
import { BillingService } from '@moltbeat/billing'

// In your webhook endpoint
app.post('/webhooks/stripe', async (req, res) => {
  const signature = req.headers['stripe-signature']
  const payload = req.body

  try {
    await billing.handleWebhook(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    res.json({ received: true })
  } catch (error) {
    res.status(400).send(`Webhook Error: ${error.message}`)
  }
})
```

## Plan Utilities

### Get Plan by ID

```typescript
import { getPlanById } from '@moltbeat/billing'

const plan = getPlanById('professional')
console.log(plan.name) // "Professional"
console.log(plan.price) // 9900 (in cents)
console.log(plan.features)
```

### Check Plan Limits

```typescript
import { canPerformAction, getPlanById } from '@moltbeat/billing'

const plan = getPlanById('starter')
const currentAgents = 4

if (canPerformAction(plan, 'agents', currentAgents)) {
  console.log('Can add more agents')
} else {
  console.log('Agent limit reached')
}
```

## Webhook Events

The service handles these Stripe webhook events:

- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Setup Stripe Products

You need to create products in Stripe dashboard:

1. Go to Stripe Dashboard → Products
2. Create products for each plan (Starter, Professional, Enterprise)
3. Create prices for each product
4. Update `plans.ts` with the Stripe price IDs:

```typescript
{
  id: 'professional',
  name: 'Professional',
  // ...
  stripePriceId: 'price_1234567890', // From Stripe
  stripeProductId: 'prod_1234567890', // From Stripe
}
```

## Testing

Use Stripe test mode and test cards:

```
4242 4242 4242 4242  # Successful payment
4000 0000 0000 9995  # Declined payment
4000 0025 0000 3155  # Requires 3D Secure
```

## Deployment

### 1. Set Environment Variables

```bash
STRIPE_SECRET_KEY=your-live-secret-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret
```

### 2. Configure Webhook Endpoint

In Stripe Dashboard:
1. Go to Developers → Webhooks
2. Add endpoint: `https://api.yourdomain.com/webhooks/stripe`
3. Select events:
   - `customer.subscription.*`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to env

### 3. Enable Stripe Tax (Optional)

For automatic tax calculation:
1. Go to Stripe Dashboard → Settings → Tax
2. Enable Stripe Tax
3. Configure tax settings

## Security

- Never expose `STRIPE_SECRET_KEY` to clients
- Use `STRIPE_PUBLISHABLE_KEY` for client-side
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Store sensitive data encrypted in database

## API Reference

### BillingService

Main class for billing operations.

#### Methods

- `createCustomer(userId, email, name?)` - Create Stripe customer
- `createCheckoutSession(userId, planId, successUrl, cancelUrl)` - Create checkout
- `createPortalSession(userId, returnUrl)` - Create billing portal
- `createSubscription(userId, planId, stripeSubId, stripeCustomerId)` - Create subscription
- `cancelSubscription(subscriptionId, immediate?)` - Cancel subscription
- `resumeSubscription(subscriptionId)` - Resume canceled subscription
- `updateSubscriptionPlan(subscriptionId, newPlanId)` - Change plan
- `recordUsage(subscriptionId, metric, quantity)` - Record usage
- `getUpcomingInvoice(customerId)` - Get next invoice
- `getPaymentMethods(customerId)` - List payment methods
- `setDefaultPaymentMethod(customerId, paymentMethodId)` - Set default card
- `handleWebhook(payload, signature, webhookSecret)` - Process webhook

### Plan Functions

- `getPlanById(planId)` - Get plan configuration
- `getPlanByStripePriceId(stripePriceId)` - Find plan by Stripe price
- `canPerformAction(plan, action, currentUsage)` - Check plan limits

## License

MIT
