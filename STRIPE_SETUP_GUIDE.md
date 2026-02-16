# Stripe Subscription Integration Setup Guide

This guide explains how to configure and use the Stripe subscription integration in Joblify.

## Prerequisites

1. A Stripe account (https://stripe.com)
2. Stripe API keys (test and production)
3. Products and prices created in Stripe Dashboard

## Environment Variables

Add the following environment variables to your Replit Secrets or `.env` file:

```bash
# Stripe Secret Key (use test key for development)
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production

# Stripe Price IDs (from Stripe Dashboard)
STRIPE_PLUS_PRICE_ID=price_... # Plus plan monthly price ID
STRIPE_ULTRA_PRICE_ID=price_... # Ultra plan monthly price ID

# Stripe Webhook Secret (for webhook signature verification)
STRIPE_WEBHOOK_SECRET=whsec_...

# Base URL for redirect URLs
BASE_URL=https://your-domain.com # or http://localhost:5000 for development
```

## Setting Up Stripe Products and Prices

### Option 1: Use the Seed Script (Recommended)

Run the seed script to automatically create products and prices in Stripe:

```bash
npm run seed-products
```

This will create:
- **Joblify Plus**: $15/month
- **Joblify Ultra**: $30/month

After running, copy the price IDs from the console output and add them to your environment variables.

### Option 2: Manual Setup

1. Go to Stripe Dashboard → Products
2. Create two products:
   - **Joblify Plus**: $15/month (recurring)
   - **Joblify Ultra**: $30/month (recurring)
3. Copy the price IDs and add them to your environment variables

## Setting Up Webhooks

Webhooks are required for Stripe to notify your application about subscription changes.

### Development (Local Testing)

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to http://localhost:5000/api/webhooks/stripe
   ```
4. Copy the webhook signing secret and add it to your environment variables

### Production (Replit/Live Server)

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL: `https://your-domain.com/api/webhooks/stripe`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and add it to your environment variables

## Subscription Flow

### 1. Checkout Process

When a user clicks "Upgrade" on the pricing page:
1. User is redirected to Stripe Checkout
2. User enters payment information
3. On success, redirected back to `/account?session_id={CHECKOUT_SESSION_ID}`
4. Webhook receives subscription events and updates the database

### 2. Subscription Management

Users can manage their subscriptions from the Account → Billing tab:
- **Upgrade**: Immediate upgrade with prorated billing
- **Downgrade**: Takes effect at the end of billing period
- **Cancel**: Subscription remains active until period end, then reverts to free
- **Manage Billing**: Opens Stripe Customer Portal for payment method management

### 3. Account Deletion

When a user deletes their account:
- All active Stripe subscriptions are automatically cancelled
- User data is removed from the database
- Stripe customer record remains for billing history

## API Endpoints

### Client-Side Endpoints

```
POST /api/checkout
- Create a checkout session for plan upgrade
- Body: { plan: 'plus' | 'ultra' }
- Returns: { sessionId, url }

GET /api/subscription/portal
- Get Stripe billing portal URL
- Returns: { url }

POST /api/subscription/cancel
- Cancel subscription at period end
- Returns: { success, message }

POST /api/subscription/upgrade
- Upgrade to a higher plan
- Body: { newPlan: 'plus' | 'ultra' }
- Returns: { success, message }

POST /api/subscription/downgrade
- Downgrade to a lower plan
- Body: { newPlan: 'free' | 'plus' }
- Returns: { success, message }
```

### Webhook Endpoint

```
POST /api/webhooks/stripe
- Receives Stripe webhook events
- Handles subscription lifecycle events
- Secured with webhook signature verification
```

## Database Schema

Subscriptions are stored in the `subscriptions` table:

```typescript
{
  id: string;
  userId: string;
  plan: 'free' | 'plus' | 'ultra' | 'lifetime';
  status: 'active' | 'cancelled' | 'past_due';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  renewalReminderSent: boolean;
}
```

## Testing

### Test Card Numbers

Use these test card numbers in development:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires Authentication**: 4000 0025 0000 3155

Any future expiry date and any 3-digit CVC will work.

### Testing Webhooks

1. Create a subscription in test mode
2. Monitor webhook delivery in Stripe Dashboard → Developers → Webhooks
3. Check your application logs for webhook processing
4. Verify database updates using the account page

## Troubleshooting

### Webhook Signature Verification Failed

- Ensure `STRIPE_WEBHOOK_SECRET` is correctly set
- Check that the webhook endpoint URL matches exactly
- Verify the webhook is sending to the correct environment

### Checkout Session Not Creating

- Verify `STRIPE_SECRET_KEY` is set correctly
- Check that price IDs exist in Stripe Dashboard
- Ensure user is authenticated

### Subscription Not Updating

- Check webhook delivery status in Stripe Dashboard
- Review application logs for webhook processing errors
- Verify database connection

## Security Considerations

1. **Never expose secret keys**: Keep `STRIPE_SECRET_KEY` in environment variables only
2. **Verify webhook signatures**: Always verify webhook signatures to prevent replay attacks
3. **Use HTTPS in production**: Stripe requires HTTPS for live webhooks
4. **Validate user permissions**: Ensure users can only manage their own subscriptions

## Additional Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
