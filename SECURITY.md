# Security Documentation

## Overview
This document outlines the security features and best practices implemented in the Joblify platform.

## Table of Contents
- [Security Headers](#security-headers)
- [Authentication & Sessions](#authentication--sessions)
- [Two-Factor Authentication (2FA)](#two-factor-authentication-2fa)
- [Rate Limiting](#rate-limiting)
- [Data Encryption](#data-encryption)
- [Input Validation & Sanitization](#input-validation--sanitization)
- [GDPR/CCPA Compliance](#gdprccpa-compliance)
- [Audit Logging](#audit-logging)
- [Payment Security](#payment-security)
- [Vulnerability Reporting](#vulnerability-reporting)

## Security Headers

### Helmet.js Implementation
Location: `server/middleware/security.ts`

All HTTP responses include comprehensive security headers:

#### Content Security Policy (CSP)
- Restricts resource loading to trusted sources only
- Development: Allows `unsafe-inline` and `unsafe-eval` for Vite HMR
- Production: Strict CSP with only whitelisted domains

**Whitelisted Domains:**
- PostHog Analytics: `*.posthog.com`
- Zendesk Support: `*.zendesk.com`, `*.zdassets.com`
- App resources: `'self'`

#### HTTP Strict Transport Security (HSTS)
- Enforces HTTPS connections in production
- `max-age`: 31536000 seconds (1 year)
- `includeSubDomains`: true
- `preload`: true

#### Additional Headers
- **X-Content-Type-Options**: `nosniff` - Prevents MIME sniffing
- **X-Frame-Options**: `DENY` - Prevents clickjacking
- **Cross-Origin-Resource-Policy**: `same-origin`
- **Cross-Origin-Opener-Policy**: `same-origin`

## Authentication & Sessions

### Session Configuration
Location: `server/middleware/security.ts` and `server/auth.ts`

#### Session Security Features
- **httpOnly**: `true` - Prevents XSS cookie theft
- **secure**: `true` (production only) - HTTPS-only cookies
- **sameSite**: `lax` - CSRF protection
- **maxAge**: 30 days
- **rolling**: `true` - Session extends on activity

#### Session Storage
- **Development**: MemoryStore (session data in memory)
- **Production Recommendation**: Use PostgreSQL session store (`connect-pg-simple`)

#### Password Security
- All passwords hashed using **bcrypt** with salt rounds
- Password reset tokens expire after a configurable time period
- Old password reset tokens invalidated when new ones are issued

### Account Lockout Protection
Location: `server/middleware/security.ts`

- Tracks failed login attempts by username
- Locks account after **5 failed attempts**
- Lockout duration: **15 minutes**
- Automatic cleanup of expired locks
- IP-based tracking for enhanced security

**Note:** Current implementation uses in-memory storage. For multi-server production deployments, consider using Redis or the `security_events` table.

## Two-Factor Authentication (2FA)

### Implementation
Location: `server/lib/twoFactor.ts`

#### Features
- **TOTP-based** (Time-based One-Time Password)
- Compatible with Google Authenticator, Authy, Microsoft Authenticator
- 6-digit codes with 30-second time window
- Window of ±1 time step for clock drift tolerance
- QR code generation for easy setup
- 10 backup codes for account recovery

#### Security
- 2FA secrets encrypted with **AES-256-CBC**
- Backup codes individually encrypted
- Encryption key stored in environment variable (`TWO_FACTOR_ENCRYPTION_KEY`)
- Validation of encryption key on server startup (fail-fast in production)

#### Database Schema
```sql
-- users table
twoFactorEnabled: boolean (default: false)
twoFactorSecret: text (encrypted)
backupCodes: jsonb (array of encrypted codes)
```

## Rate Limiting

### Tiered Rate Limits by Plan
Location: `server/middleware/security.ts`

#### AI Features
- **Free Plan**: 10 requests/minute
- **Plus Plan**: 50 requests/minute
- **Ultra/Lifetime**: 200 requests/minute

#### Job Scraping
- **Free Plan**: 5 requests/minute
- **Plus Plan**: 30 requests/minute
- **Ultra/Lifetime**: 100 requests/minute

#### General API
- **Free Plan**: 100 requests/minute
- **Plus Plan**: 300 requests/minute
- **Ultra/Lifetime**: 1000 requests/minute

### Authentication Endpoints
- **Login**: 5 attempts per 15 minutes (brute force protection)
- **Registration**: 3 accounts per hour per IP (spam prevention)

### Implementation Notes
- Rate limiting active in all environments (including development)
- Uses standard rate limit headers (`X-RateLimit-*`)
- Plan-based limits retrieved from user session

## Data Encryption

### At Rest
- **Database**: All data stored in PostgreSQL with encryption at rest (if enabled at DB level)
- **2FA Secrets**: Encrypted using AES-256-CBC before storage
- **Backup Codes**: Individually encrypted before storage
- **Passwords**: Hashed using bcrypt (not encrypted, but cryptographically hashed)

### In Transit
- **HTTPS/TLS**: All production traffic encrypted via HTTPS
- **Secure Cookies**: Session cookies marked as secure in production
- **API Requests**: All client-server communication over TLS

### Encryption Keys
- `SESSION_SECRET`: Session encryption key
- `TWO_FACTOR_ENCRYPTION_KEY`: 2FA data encryption key

**Key Management Best Practices:**
- Generate keys using cryptographically secure random generators
- Rotate keys periodically (every 90-180 days recommended)
- Never commit keys to version control
- Use environment variables or secret management services

## Input Validation & Sanitization

### XSS Prevention
Location: `server/middleware/security.ts`

All request inputs (body, query, params) are automatically sanitized:
- HTML entity encoding for `<`, `>`, `&`, `"`, `'`, `/`
- Prevents script tag injection
- Prevents event handler injection
- Safe for storage and rendering

### Schema Validation
- All API inputs validated using **Zod** schemas
- Type-safe validation for TypeScript
- Automatic sanitization of user-provided data

### SQL Injection Prevention
- All database queries use **Drizzle ORM**
- Parameterized queries prevent SQL injection
- No raw SQL queries with user input

## GDPR/CCPA Compliance

### User Rights Implementation
Location: `server/lib/gdpr-compliance.ts`

#### Right to Access (GDPR Article 15, CCPA 1798.110)
- **Endpoint**: `GET /api/user/data-summary`
- View detailed summary of all collected data
- Lists data categories, purposes, retention periods
- Shows third-party data sharing

#### Right to Data Portability (GDPR Article 20, CCPA 1798.100)
- **Endpoint**: `GET /api/user/data-export`
- Export all personal data in JSON format
- Machine-readable and portable format
- Includes all resumes, cover letters, jobs, schedules, etc.

#### Right to Erasure (GDPR Article 17, CCPA 1798.105)
- **Endpoint**: `DELETE /api/account`
- Permanent deletion of all user data
- Cascade deletion of all related records
- Stripe subscription cancellation
- Session invalidation

#### Right to Withdraw Consent (GDPR Article 7)
- **Endpoint**: `POST /api/user/consent-withdraw`
- Logs consent withdrawal event
- Guides user through account deletion process

### Data Retention
- **Active Accounts**: Data retained as long as account exists
- **Security Events**: 90 days
- **Support Interactions**: As long as account exists
- **Deleted Accounts**: All data purged within 30 days

### Audit Logging
All GDPR data access requests are logged:
- Data export requests
- Data summary views
- Consent withdrawal events
- Account deletions

## Audit Logging

### Security Events Table
Location: `shared/schema.ts` - `securityEvents`

**Logged Events:**
- Login attempts (success/failure)
- Password changes
- 2FA enabled/disabled
- GDPR data access requests
- Consent withdrawal
- Account deletions

**Event Data:**
- User ID
- Event type
- IP address
- User agent
- Metadata (JSON)
- Timestamp

### Retention Policy
- Security events retained for **90 days**
- Automatic cleanup recommended (implement cron job)

## Payment Security

### Stripe Integration
- **PCI DSS Compliance**: Payment data never touches our servers
- Stripe handles all card processing
- Webhook signature verification for all Stripe events
- Secure webhook endpoint: `/webhooks/stripe`

### Webhook Security
- All webhooks verified using Stripe signature
- Replay attack prevention
- Failed payment handling
- Subscription lifecycle management

## Third-Party Services

### Data Sharing
All third-party services documented in privacy policy and data summary:

1. **Stripe** (Payment Processing)
   - Data shared: Email, name, payment information
   - Privacy policy: https://stripe.com/privacy

2. **Poe AI / Claude** (AI Features)
   - Data shared: Resume content, chat messages
   - Privacy policy: https://poe.com/privacy

3. **PostHog** (Analytics)
   - Data shared: User ID, feature usage events, anonymized behavior
   - Privacy policy: https://posthog.com/privacy

4. **Zendesk** (Customer Support)
   - Data shared: Email, name, support messages
   - Privacy policy: https://www.zendesk.com/company/agreements-and-terms/privacy-notice/

## Security Best Practices

### For Developers

1. **Never commit secrets** to version control
2. **Validate all user inputs** using Zod schemas
3. **Use parameterized queries** (Drizzle ORM)
4. **Sanitize outputs** before rendering
5. **Log security events** for audit trail
6. **Test security features** before deploying
7. **Keep dependencies updated** regularly
8. **Review security headers** in production

### For Deployment

1. **Set `NODE_ENV=production`** in production
2. **Enable HTTPS/TLS** on your server
3. **Configure database encryption at rest**
4. **Use strong session secrets** (32+ characters)
5. **Rotate encryption keys** periodically
6. **Monitor security events** regularly
7. **Enable firewall** on production servers
8. **Backup database** regularly
9. **Test disaster recovery** procedures

### For Users

1. **Enable 2FA** for enhanced account security
2. **Use strong passwords** (12+ characters, mixed case, numbers, symbols)
3. **Don't share account credentials**
4. **Review account activity** regularly
5. **Report suspicious activity** to support
6. **Keep backup codes safe** (offline storage recommended)

## Vulnerability Reporting

### Security Contact
- **Email**: privacy@joblifyai.com
- **Response Time**: 48 hours for acknowledgment
- **Investigation**: 7-14 days for assessment

### What to Report
- Authentication bypass vulnerabilities
- SQL injection vulnerabilities
- XSS vulnerabilities
- CSRF vulnerabilities
- Privilege escalation issues
- Data exposure issues
- Any security concerns

### Please Include
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Responsible Disclosure
- Give us time to fix before public disclosure
- We'll credit you in our changelog (if desired)
- We appreciate responsible security research

## Security Roadmap

### Planned Improvements
- [ ] Implement Redis for distributed session storage
- [ ] Add CAPTCHA to registration/login
- [ ] Implement Content Security Policy reporting
- [ ] Add automated security scanning (Dependabot, Snyk)
- [ ] Implement database encryption at rest
- [ ] Add security event monitoring/alerting
- [ ] Implement backup and disaster recovery
- [ ] Add penetration testing

## Compliance Certifications

### Current Status
- ✅ GDPR Compliant (EU General Data Protection Regulation)
- ✅ CCPA Compliant (California Consumer Privacy Act)
- ✅ PCI DSS Compliant (via Stripe)

### In Progress
- [ ] SOC 2 Type II Certification
- [ ] ISO 27001 Certification

## Resources

### Security Tools
- **Helmet.js**: Security headers middleware
- **bcrypt**: Password hashing
- **speakeasy**: TOTP 2FA implementation
- **express-rate-limit**: Rate limiting
- **Zod**: Schema validation

### Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Last Updated**: 2026-02-05  
**Document Version**: 1.0  
**Maintained By**: Joblify Security Team
