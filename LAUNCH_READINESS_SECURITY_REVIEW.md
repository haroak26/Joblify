# Launch Readiness Security & Reliability Review

Date: 2026-02-16  
Reviewer: Codex (GPT-5.2-Codex)

## Scope Reviewed
- Authentication/session flows (`server/auth.ts`, `server/middleware/security.ts`, `server/middleware/csrf.ts`)
- Stripe billing + webhooks (`server/routes.ts`, `server/stripeClient.ts`)
- Admin authorization + audit logging (`server/middleware/admin.ts`, `server/admin-routes.ts`)
- Database bootstrap/connection (`server/db.ts`)
- Existing automated tests under `server/**/*.test.*`

## What I Executed
1. `node --test server/middleware/security.rateLimit.test.mjs`
2. `node --test server/routes.coverLetterGenerate.test.mjs server/auth.blockedAccount.test.mjs`
3. `npx tsx --test server/lib/fileValidation.test.ts server/storage.createUser.test.ts` (failed due registry/network policy)
4. `npm run check` (failed before dependency install due missing type defs)

## Findings Summary

### ✅ Fixed in this patch

1. **Critical Stripe breakage risk: CSRF webhook path mismatch** (fixed)
   - CSRF bypass list referenced `/api/stripe/webhook`, but actual Stripe route is `/api/webhooks/stripe`.
   - Result: legitimate Stripe webhooks can be rejected with 403 in production, causing subscription state drift.
   - **Fix applied:** CSRF bypass now includes the active `/api/webhooks/stripe` route while keeping legacy path compatibility.

2. **High risk open redirect / host-header trust in Stripe return URLs** (fixed)
   - Checkout and billing-portal URLs previously fell back to `req.protocol + req.get('host')` when `APP_URL`/`BASE_URL` were unset.
   - In production this can be abused through Host-header manipulation, generating payment flows with attacker-controlled redirects.
   - **Fix applied:** Added `resolveBillingBaseUrl()` that requires `APP_URL` or `BASE_URL` in production; host fallback is now dev-only.

### ⚠️ Must address before/just after launch

1. **In-memory login lockout cannot scale horizontally**
   - `loginAttempts` is process-local memory in `security.ts`.
   - In multi-instance deployments, brute-force protection is inconsistent and reset on restart.
   - Recommendation: move to Redis or DB-backed security-events lockout keyed by user/IP.

2. **Rate limiter storage defaults to in-memory**
   - `express-rate-limit` uses default memory store (no shared state across instances).
   - Recommendation: use a shared rate-limit store (Redis or database-backed) for production.

3. **Global input sanitization can mangle legitimate payloads**
   - Middleware escapes all strings globally (`/` to `&#x2F;`, etc.).
   - This can degrade data quality and break integrations that require exact string fidelity.
   - Recommendation: replace with schema validation + output encoding at render time; sanitize only rich-text fields.

4. **No explicit DB SSL policy in pool config**
   - `DATABASE_URL` is used directly with no `ssl` override.
   - Depending on provider URL defaults, this can create misconfigured transport security.
   - Recommendation: enforce SSL in production pool config (`ssl: { rejectUnauthorized: true }` or provider-specific CA settings).

## Test Coverage Assessment

### Existing test files discovered
- `server/lib/fileValidation.test.ts`
- `server/storage.createUser.test.ts`
- `server/middleware/security.rateLimit.test.mjs`
- `server/routes.coverLetterGenerate.test.mjs`
- `server/auth.blockedAccount.test.mjs`

### Coverage quality (practical launch view)
- **Strong enough in specific slices:** login blocking behavior, rate-limit plan resolution, and cover-letter route registration are tested.
- **Not sufficient for launch-critical integrations:** there is no observed automated test for Stripe webhook signature handling and state transitions, no end-to-end checkout/portal test, and no CSRF integration test to prevent future path regressions.

## Immediate launch checklist (highest ROI)
1. Ensure production env vars are present and correct:
   - `APP_URL` (or `BASE_URL`) set to canonical HTTPS origin.
   - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PLUS_PRICE_ID`, `STRIPE_ULTRA_PRICE_ID`.
2. Run a Stripe webhook replay test against production-like env and verify DB subscription transitions for:
   - `customer.subscription.created/updated/deleted`
   - `invoice.payment_succeeded/failed`
3. Configure shared rate-limiter + lockout store (Redis recommended).
4. Add one integration test for CSRF middleware + webhook path to prevent regressions.

## Confidence statement
After the two fixes in this patch, the Stripe integration path is materially safer and less likely to fail due to middleware misconfiguration. However, I do **not** recommend calling this “fully hardened” until shared-state rate limiting/lockout and Stripe end-to-end webhook validation are completed.
