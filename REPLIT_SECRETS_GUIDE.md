# Replit Secrets Configuration Guide

This guide lists all the environment variables that should be configured in Replit Secrets for the Joblify application.

## 🔴 CRITICAL - Required for Application to Run

These secrets are **absolutely required** for the application to start and function properly:

### 1. DATABASE_URL (Required)
**Description:** PostgreSQL database connection string  
**Format:** `postgresql://username:password@host:port/database`  
**How to get:**
- Use Replit's built-in PostgreSQL database, or
- Sign up for a free PostgreSQL instance at:
  - [Neon](https://neon.tech/)
  - [Supabase](https://supabase.com/)
  - [Railway](https://railway.app/)
  - [ElephantSQL](https://www.elephantsql.com/)
- Copy the connection string from your database provider

**Example:**
```
postgresql://joblify_user:mypassword@db.example.com:5432/joblify_db
```

### 2. SESSION_SECRET (Required)
**Description:** Secret key for encrypting session data  
**Format:** Random string (minimum 32 characters recommended)  
**How to generate:**
```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Use an online generator
# Visit: https://randomkeygen.com/ (use "CodeIgniter Encryption Keys")
```

**Example:**
```
8f2a9c3b5e7d1a4f6b8c0e2a4f6b8c0e2a4f6b8c0e2a4f6b8c0e
```

### 3. ENCRYPTION_KEY (Required in Production)
**Description:** AES-256 encryption key for sensitive data at rest  
**Format:** 64 hexadecimal characters (32 bytes)  
**How to generate:**
```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example:**
```
a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

### 4. TWO_FACTOR_ENCRYPTION_KEY (Required in Production)
**Description:** Encryption key for two-factor authentication secrets  
**Format:** 64 hexadecimal characters (32 bytes)  
**How to generate:**
```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example:**
```
c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4
```

---

## 🟡 HIGH PRIORITY - Required for Core Features

These secrets are needed for the application's main features to work:

### 5. POE_API_KEY (Required for AI Features)
**Description:** Poe API key for AI-powered resume building and chat  
**How to get:**
1. Visit [https://poe.com/](https://poe.com/)
2. Sign up or log in to your account
3. Navigate to Settings → API Keys
4. Create a new API key
5. Copy the key (starts with `poe-`)

**Required for:**
- AI Resume Builder
- Resume content improvements
- Keyword suggestions
- ATS analysis
- Cover letter generation
- AI chat features

**Example:**
```
poe-1234567890abcdef1234567890abcdef
```

### 6. POE_API_BASE_URL (Optional - defaults to Poe API)
**Description:** Base URL for Poe API  
**Default:** `https://api.poe.com/v1`  
**When to change:** Only if using a different AI provider or proxy

**Example:**
```
https://api.poe.com/v1
```

---

## 🟢 MEDIUM PRIORITY - Required for Email Features

### 7. BREVO_API_KEY (Required for Email Notifications)
**Description:** Brevo (formerly SendinBlue) API key for email service  
**How to get:**
1. Visit [https://app.brevo.com/](https://app.brevo.com/)
2. Sign up for a free account (includes 300 emails/day)
3. Navigate to Settings → SMTP & API → API Keys
4. Create a new API key
5. Copy the key (starts with `xkeysib-`)

**Required for:**
- Email verification
- Password reset emails
- Welcome emails
- Feature reminder emails
- Marketing emails (if enabled)

**Example:**
```
xkeysib-a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
```

### 8. BREVO_SENDER_EMAIL (Required if using Brevo)
**Description:** Email address to send notifications from  
**Format:** Valid email address (must be verified in Brevo)  
**How to set up:**
1. In Brevo dashboard, go to Senders & IP
2. Add and verify your email address
3. Use that verified email here

**Example:**
```
noreply@joblifyai.com
```

### 9. BREVO_SENDER_NAME (Optional)
**Description:** Display name for email sender  
**Default:** "Joblify"

**Example:**
```
Joblify AI Resume Builder
```

### 10. BREVO_SIGNUP_LIST_ID (Optional)
**Description:** Brevo contact list ID to add new users to  
**Format:** Numeric ID  
**How to get:**
1. In Brevo dashboard, go to Contacts → Lists
2. Create a new list for "New Signups"
3. Copy the list ID (visible in the URL or list settings)

**Example:**
```
12
```

---

## 🟣 OPTIONAL - For Payment Processing

### 11. STRIPE_SECRET_KEY (Required for Payments)
**Description:** Stripe secret key for payment processing  
**How to get:**
1. Visit [https://dashboard.stripe.com/](https://dashboard.stripe.com/)
2. Sign up or log in
3. Navigate to Developers → API keys
4. Copy the "Secret key" (starts with `sk_test_` for test mode)
5. For production, use live mode key (starts with `sk_live_`)

**Required for:**
- Subscription payments
- Plan upgrades
- Payment processing

**Example (Test):**
```
sk_test_51Abc123...xyz789
```

**Example (Live):**
```
sk_live_51Abc123...xyz789
```

### 12. STRIPE_WEBHOOK_SECRET (Required for Webhooks)
**Description:** Stripe webhook signing secret for security  
**How to get:**
1. In Stripe dashboard, go to Developers → Webhooks
2. Add a new endpoint: `https://your-replit-url.repl.co/api/stripe/webhook`
3. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the "Signing secret" (starts with `whsec_`)

**Example:**
```
whsec_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

### 13-15. STRIPE_PRICE_ID_* (Required for Subscriptions)
**Description:** Stripe Price IDs for different subscription plans  
**How to get:**
1. In Stripe dashboard, go to Products → Add Product
2. Create products for: Plus Plan, Ultra Plan, Lifetime Plan
3. Set up recurring pricing (or one-time for Lifetime)
4. Copy each Price ID (starts with `price_`)

**STRIPE_PRICE_ID_PLUS:** Plus plan price ID  
**STRIPE_PRICE_ID_ULTRA:** Ultra plan price ID  
**STRIPE_PRICE_ID_LIFETIME:** Lifetime plan price ID

**Examples:**
```
STRIPE_PRICE_ID_PLUS=price_1Abc123xyz789
STRIPE_PRICE_ID_ULTRA=price_1Def456uvw012
STRIPE_PRICE_ID_LIFETIME=price_1Ghi789rst345
```

---

## 🔵 OPTIONAL - For Analytics & Support

### 16. VITE_POSTHOG_API_KEY (Optional - Product Analytics)
**Description:** PostHog API key for product analytics (client-side)  
**Note:** Must have `VITE_` prefix to be exposed to client  
**How to get:**
1. Visit [https://app.posthog.com/](https://app.posthog.com/)
2. Sign up for free account
3. Go to Project Settings
4. Copy the Project API Key

**Example:**
```
phc_abcdefghijklmnopqrstuvwxyz1234567890
```

### 17. VITE_POSTHOG_HOST (Optional)
**Description:** PostHog instance host URL  
**Default:** `https://app.posthog.com`  
**Note:** Must have `VITE_` prefix

**Example:**
```
https://app.posthog.com
```

### 18. VITE_ZENDESK_KEY (Optional - Customer Support)
**Description:** Zendesk widget key for customer support  
**Note:** Must have `VITE_` prefix  
**How to get:**
1. Visit [https://www.zendesk.com/](https://www.zendesk.com/)
2. Sign up for account
3. Go to Admin → Channels → Web Widget
4. Copy the Widget Key

**Example:**
```
abc123def456ghi789
```

### 19. VITE_ZENDESK_SUBDOMAIN (Optional)
**Description:** Your Zendesk subdomain  
**Format:** Just the subdomain, not full URL  
**Note:** Must have `VITE_` prefix

**Example:**
```
joblify-support
```

---

## 🔷 OPTIONAL - Application Configuration

### 20. BASE_URL (Optional)
**Description:** Base URL of your application  
**Default:** `http://localhost:5000`  
**Used for:** Email links, redirects, webhooks

**For Replit:**
```
https://your-repl-name.your-username.repl.co
```

### 21. PORT (Optional)
**Description:** Port for the server to listen on  
**Default:** `5000`  
**Note:** Replit usually handles this automatically

**Example:**
```
5000
```

### 22. NODE_ENV (Automatically set by Replit)
**Description:** Node environment mode  
**Values:** `development`, `production`, `test`  
**Note:** Usually set automatically by Replit

**Example:**
```
production
```

### 23. LOG_REQUESTS (Optional - Debug)
**Description:** Enable detailed request logging  
**Values:** `true` or `false`  
**Default:** `false`  
**Use for:** Debugging API issues

**Example:**
```
true
```

### 24. SCHEDULE_RUNNER_ENABLED (Optional)
**Description:** Enable scheduled tasks (email reminders, etc.)  
**Values:** `true` or `false`  
**Default:** `false`  
**Note:** May increase resource usage

**Example:**
```
true
```

---

## 🚀 Quick Setup Guide

### Minimal Setup (Development/Testing)
To get the app running with basic features:

1. **DATABASE_URL** - Required
2. **SESSION_SECRET** - Required
3. **POE_API_KEY** - Required for AI features

### Recommended Setup (Full Features)
For a fully-functional application:

1. **DATABASE_URL** - Database connection
2. **SESSION_SECRET** - Session security
3. **ENCRYPTION_KEY** - Data encryption
4. **TWO_FACTOR_ENCRYPTION_KEY** - 2FA security
5. **POE_API_KEY** - AI features
6. **BREVO_API_KEY** - Email notifications
7. **BREVO_SENDER_EMAIL** - Email sender

### Production Setup (All Features + Payments)
For production deployment with payments:

All of the above, plus:
8. **STRIPE_SECRET_KEY** - Payment processing
9. **STRIPE_WEBHOOK_SECRET** - Webhook security
10. **STRIPE_PRICE_ID_PLUS** - Plus plan pricing
11. **STRIPE_PRICE_ID_ULTRA** - Ultra plan pricing
12. **STRIPE_PRICE_ID_LIFETIME** - Lifetime plan pricing
13. **BASE_URL** - Your production URL
14. **VITE_POSTHOG_API_KEY** (optional) - Analytics
15. **VITE_ZENDESK_KEY** (optional) - Support widget

---

## ⚙️ How to Add Secrets in Replit

1. Open your Repl
2. Click on the "Secrets" tool (🔐) in the left sidebar
3. Click "New Secret"
4. Enter the key name (e.g., `DATABASE_URL`)
5. Enter the value
6. Click "Add Secret"
7. Repeat for each secret
8. Restart your Repl to apply changes

---

## 🔒 Security Best Practices

1. **Never commit secrets to Git** - Always use Replit Secrets or environment variables
2. **Use different keys for development and production**
3. **Rotate secrets regularly** - Especially after team member changes
4. **Use strong, random values** - Never use simple or guessable secrets
5. **Limit secret access** - Only share with team members who need them
6. **Monitor for leaks** - Use tools like GitHub secret scanning
7. **Test in development first** - Always test new secrets in dev before production

---

## 🆘 Troubleshooting

### Application won't start
- Check that `DATABASE_URL` and `SESSION_SECRET` are set
- Verify database connection string is correct
- Check Repl logs for specific error messages

### AI features not working
- Verify `POE_API_KEY` is set and valid
- Check if API key has expired or hit rate limits
- Ensure you have credits in your Poe account

### Emails not sending
- Check `BREVO_API_KEY` is set
- Verify `BREVO_SENDER_EMAIL` is verified in Brevo dashboard
- Check Brevo account isn't suspended or over quota

### Payments not working
- Ensure all Stripe keys are from the same mode (test or live)
- Verify webhook endpoint is configured in Stripe dashboard
- Check webhook secret matches between Stripe and Replit

---

## 📚 Additional Resources

- [Replit Secrets Documentation](https://docs.replit.com/programming-ide/storing-sensitive-information-environment-variables)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Poe API Documentation](https://creator.poe.com/docs/quick-start)
- [Brevo API Documentation](https://developers.brevo.com/)
- [Stripe API Documentation](https://stripe.com/docs/api)

---

**Last Updated:** 2026-02-13  
**Version:** 1.0
