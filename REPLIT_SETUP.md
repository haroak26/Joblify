# Joblify - Replit Deployment Guide

This guide will help you deploy Joblify on Replit with all necessary environment variables and configuration.

## Prerequisites

- A Replit account
- PostgreSQL database (can use Replit's built-in PostgreSQL or external service like Neon, Supabase, or Railway)
- API keys for third-party services (see below)

## Required Environment Variables

### 1. Database Configuration (REQUIRED)

**`DATABASE_URL`**
- **Description**: PostgreSQL connection string
- **Format**: `postgresql://user:password@host:port/database`
- **How to get**: 
  - Replit PostgreSQL: Use the connection string from Replit's database tab
  - External: Create a database on Neon, Supabase, or Railway and copy the connection string
- **Example**: `postgresql://joblify:password123@db.example.com:5432/joblify_prod`

### 2. Session & Security (REQUIRED)

**`SESSION_SECRET`**
- **Description**: Secret key for session encryption
- **How to get**: Generate a random string
- **Generate command**: `openssl rand -base64 32`
- **Example**: `A7k9mP2xQ5vB8nC3wD6yE1fG4hJ7lK0m`

**`TWO_FACTOR_ENCRYPTION_KEY`**
- **Description**: Encryption key for two-factor authentication secrets
- **How to get**: Generate a random hex string
- **Generate command**: `openssl rand -hex 32`
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

**`NODE_ENV`**
- **Description**: Node environment mode
- **Value**: `production` (for Replit deployment)

### 3. AI Configuration (REQUIRED - CRITICAL)

**`POE_API_KEY`**
- **Description**: Poe API key for all AI features
- **CRITICAL**: Without this, the app will not work properly
- **How to get**: 
  1. Sign up at https://poe.com/
  2. Go to Settings → API Keys
  3. Generate a new API key
- **Used for**:
  - Resume chat builder
  - Content improvements
  - Keyword suggestions
  - ATS analysis
  - Cover letter generation
  - Job analysis
- **Example**: `pk_abc123def456ghi789jkl012mno345pqr678stu901`

**`POE_API_BASE_URL`**
- **Description**: Poe API base URL
- **Value**: `https://api.poe.com/v1`

### 4. Email Service (OPTIONAL - Recommended)

**`BREVO_API_KEY`**
- **Description**: Brevo (formerly SendinBlue) API key for email notifications
- **How to get**:
  1. Sign up at https://www.brevo.com/
  2. Go to Settings → API Keys
  3. Create a new API key
- **Used for**:
  - Email verification
  - Password reset emails
  - Subscription notifications
- **Example**: `xkeysib-abc123def456ghi789jkl012mno345pqr678stu901`

**`BREVO_SENDER_EMAIL`**
- **Description**: Email address to send notifications from
- **Requirements**: Must be verified in Brevo
- **Example**: `noreply@joblifyai.com`

**`BREVO_SENDER_NAME`**
- **Description**: Display name for sent emails
- **Example**: `Joblify`

### 5. Payment Processing (OPTIONAL)

**`STRIPE_SECRET_KEY`**
- **Description**: Stripe secret key for payment processing
- **How to get**:
  1. Sign up at https://stripe.com/
  2. Go to Developers → API Keys
  3. Copy the Secret key (starts with `sk_`)
- **Example**: `sk_test_abc123def456ghi789jkl012mno345`

**`STRIPE_WEBHOOK_SECRET`**
- **Description**: Stripe webhook secret for secure webhook verification
- **How to get**:
  1. Go to Developers → Webhooks
  2. Add a new endpoint with your Replit URL + `/api/webhooks/stripe`
  3. Copy the Signing secret (starts with `whsec_`)
- **Example**: `whsec_abc123def456ghi789jkl012mno345`

**`STRIPE_PRICE_ID_PLUS`**
- **Description**: Stripe price ID for Plus plan
- **How to get**:
  1. Go to Products in Stripe Dashboard
  2. Create a product for "Plus Plan"
  3. Add a price (e.g., $9.99/month)
  4. Copy the Price ID (starts with `price_`)
- **Example**: `price_1ABC2DEF3GHI4JKL5MNO6PQR`

**`STRIPE_PRICE_ID_ULTRA`**
- **Description**: Stripe price ID for Ultra plan
- **Example**: `price_1XYZ2WVU3TSR4QPO5NML6KJI`

**`STRIPE_PRICE_ID_LIFETIME`**
- **Description**: Stripe price ID for Lifetime plan (one-time payment)
- **Example**: `price_1ZZZ2YYY3XXX4WWW5VVV6UUU`

### 6. Application Configuration

**`BASE_URL`**
- **Description**: Base URL of your application
- **How to get**: Use your Replit app URL
- **Example**: `https://joblify.replit.app` or your custom domain

**`PORT`**
- **Description**: Port for the server to listen on
- **Default**: Replit automatically sets this, but you can set `5000` if needed

### 7. Analytics & Monitoring (OPTIONAL)

**`VITE_POSTHOG_API_KEY`**
- **Description**: PostHog API key for product analytics (client-side)
- **Note**: Must have `VITE_` prefix for Vite to expose to client
- **How to get**:
  1. Sign up at https://posthog.com/
  2. Create a project
  3. Copy the Project API Key
- **Example**: `phc_abc123def456ghi789jkl012mno345pqr678stu901`

**`VITE_POSTHOG_HOST`**
- **Description**: PostHog host URL
- **Value**: `https://app.posthog.com` (or your self-hosted instance)

### 8. Customer Support (OPTIONAL)

**`VITE_ZENDESK_KEY`**
- **Description**: Zendesk key for customer support widget (client-side)
- **Note**: Must have `VITE_` prefix
- **How to get**:
  1. Sign up at https://www.zendesk.com/
  2. Set up Web Widget (Classic)
  3. Copy the Widget Key
- **Example**: `abc12345-def6-7890-ghij-klmno1234567`

**`VITE_ZENDESK_SUBDOMAIN`**
- **Description**: Your Zendesk subdomain
- **Example**: `joblify` (if your Zendesk is joblify.zendesk.com)

## Deployment Steps

### Step 1: Create Replit Project

1. Fork or import this repository to Replit
2. Replit should auto-detect the Node.js project

### Step 2: Set Up Database

**Option A: Replit PostgreSQL**
1. Click on "Database" in the left sidebar
2. Enable PostgreSQL
3. Copy the connection string
4. Add to Secrets as `DATABASE_URL`

**Option B: External Database (Recommended for production)**
1. Create a PostgreSQL database on Neon, Supabase, or Railway
2. Copy the connection string
3. Add to Secrets as `DATABASE_URL`

### Step 3: Add Environment Variables

1. Click on "Tools" → "Secrets" (lock icon)
2. Add each required secret from the list above
3. At minimum, add:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `TWO_FACTOR_ENCRYPTION_KEY`
   - `POE_API_KEY`
   - `POE_API_BASE_URL`
   - `NODE_ENV`
   - `BASE_URL`

### Step 4: Install Dependencies & Run Migrations

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:push
```

### Step 5: Start the Application

Click the "Run" button in Replit, or run:

```bash
npm run build
npm start
```

### Step 6: Configure Webhooks (if using Stripe)

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-replit-url.replit.app/api/webhooks/stripe`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the Signing secret and add to Secrets as `STRIPE_WEBHOOK_SECRET`

## Environment Variables Summary

### Must Have (Core Functionality)
- ✅ `DATABASE_URL`
- ✅ `SESSION_SECRET`
- ✅ `TWO_FACTOR_ENCRYPTION_KEY`
- ✅ `POE_API_KEY`
- ✅ `POE_API_BASE_URL`
- ✅ `NODE_ENV`
- ✅ `BASE_URL`

### Highly Recommended (User Experience)
- 🔔 `BREVO_API_KEY`
- 🔔 `BREVO_SENDER_EMAIL`
- 🔔 `BREVO_SENDER_NAME`

### Optional (Monetization)
- 💰 `STRIPE_SECRET_KEY`
- 💰 `STRIPE_WEBHOOK_SECRET`
- 💰 `STRIPE_PRICE_ID_PLUS`
- 💰 `STRIPE_PRICE_ID_ULTRA`
- 💰 `STRIPE_PRICE_ID_LIFETIME`

### Optional (Analytics & Support)
- 📊 `VITE_POSTHOG_API_KEY`
- 📊 `VITE_POSTHOG_HOST`
- 💬 `VITE_ZENDESK_KEY`
- 💬 `VITE_ZENDESK_SUBDOMAIN`

## Troubleshooting

### Database Connection Issues
- Ensure `DATABASE_URL` is correctly formatted
- Check if database is accessible from Replit
- Verify database credentials are correct

### AI Features Not Working
- Ensure `POE_API_KEY` is set correctly
- Check Poe account has sufficient credits
- Verify `POE_API_BASE_URL` is set to `https://api.poe.com/v1`

### Email Not Sending
- Verify `BREVO_API_KEY` is valid
- Ensure sender email is verified in Brevo
- Check Brevo account limits

### Payment Issues
- Ensure all Stripe keys are from the same environment (test or live)
- Verify webhook endpoint is correctly configured
- Check Stripe Dashboard for error logs

## Production Checklist

Before going live, ensure:

- [ ] All required environment variables are set
- [ ] Database migrations have run successfully
- [ ] `NODE_ENV` is set to `production`
- [ ] `BASE_URL` points to your production domain
- [ ] Stripe is in live mode (not test mode)
- [ ] Brevo sender email is verified
- [ ] SSL/HTTPS is enabled (automatic on Replit)
- [ ] Backups are configured for the database
- [ ] Error monitoring is set up (PostHog or similar)

## Support

For issues or questions:
- Check the main README.md
- Review server logs in Replit console
- Contact: support@joblifyai.com

## Security Notes

- **Never commit secrets to Git** - Always use Replit Secrets
- **Rotate secrets regularly** - Especially session and encryption keys
- **Use strong passwords** - For database and API keys
- **Enable 2FA** - On all service accounts (Stripe, Brevo, etc.)
- **Monitor access logs** - Check for suspicious activity

---

Last updated: 2026-02-06
