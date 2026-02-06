# Joblify Production Deployment Guide

This guide covers deploying Joblify to production environments.

## Pre-Deployment Checklist

### Environment Configuration
- [ ] All environment variables set in `.env`
- [ ] `NODE_ENV=production`
- [ ] Strong `SESSION_SECRET` generated (32+ chars)
- [ ] Strong `TWO_FACTOR_ENCRYPTION_KEY` generated (64+ hex chars)
- [ ] PostgreSQL database provisioned and accessible
- [ ] Stripe API keys configured (live mode)
- [ ] Email service configured (Brevo)
- [ ] POE_API_KEY for AI features set

### Database Setup
- [ ] Run migrations: `npm run db:push`
- [ ] Verify all tables created correctly
- [ ] Test database connection
- [ ] Configure database backups
- [ ] Set up connection pooling if needed

### Build Process
- [ ] Run `npm run build` successfully
- [ ] Verify `dist/` directory created
- [ ] Test production build locally
- [ ] Ensure all assets bundled correctly

### Stripe Configuration
- [ ] Create products in live mode (Plus, Ultra, Lifetime)
- [ ] Note price IDs and add to environment
- [ ] Configure webhook endpoint: `https://yourdomain.com/webhooks/stripe`
- [ ] Test webhook with Stripe CLI
- [ ] Verify webhook secret matches environment

### Security Verification
- [ ] HTTPS/TLS certificate installed and valid
- [ ] Security headers active (test with securityheaders.com)
- [ ] Rate limiting configured and tested
- [ ] Session cookies set to `secure: true`
- [ ] CORS properly configured
- [ ] Database credentials secured

### Third-Party Services
- [ ] PostHog project created (optional)
- [ ] Zendesk workspace configured (optional)
- [ ] Email templates tested
- [ ] All API keys are for production, not test/sandbox

## Deployment Steps

### 1. Server Provisioning
Choose a hosting provider and provision a server with:
- Node.js 18+
- PostgreSQL 14+
- 1GB+ RAM minimum (2GB+ recommended)
- SSL/TLS certificate

### 2. Application Deployment
```bash
# Clone repository
git clone https://github.com/haroak26/Joblify-Freelance.git
cd Joblify-Freelance

# Install dependencies
npm ci --production

# Set up environment
cp .env.example .env
# Edit .env with production values

# Build application
npm run build

# Run database migrations
npm run db:push

# Start application
npm start
```

### 3. Process Management
Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start dist/index.cjs --name joblify
pm2 startup
pm2 save
```

### 4. Reverse Proxy Setup
Configure nginx or similar:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Post-Deployment Verification

### Functional Tests
- [ ] User registration works
- [ ] Email verification works
- [ ] Login works
- [ ] Password reset works
- [ ] Resume creation works
- [ ] AI chat responds correctly
- [ ] PDF export works
- [ ] DOCX export works (Plus+)
- [ ] ATS scanner works (Plus+)
- [ ] Cover letter generation works (Ultra+)
- [ ] Subscription upgrade works
- [ ] Payment processing works
- [ ] Data export works (GDPR)
- [ ] Data summary displays correctly
- [ ] Account deletion works

### Security Tests
- [ ] HTTPS redirects working
- [ ] Security headers present (check with browser dev tools)
- [ ] Rate limiting active (test with multiple requests)
- [ ] Session cookies httpOnly and secure
- [ ] No sensitive data in client-side JavaScript
- [ ] CORS only allows expected origins
- [ ] Webhook signatures verified

### Performance Tests
- [ ] Page load times acceptable (<3s)
- [ ] API response times acceptable (<500ms avg)
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Static assets cached properly

## Monitoring Setup

### Application Monitoring
Consider setting up:
- Error tracking (Sentry, Rollbar)
- Performance monitoring (New Relic, DataDog)
- Uptime monitoring (UptimeRobot, Pingdom)
- Log aggregation (LogDNA, Papertrail)

### Database Monitoring
- Query performance monitoring
- Connection pool monitoring
- Disk space alerts
- Backup verification

### Alerts to Configure
- Server down alerts
- High error rate alerts
- Database connection failures
- Payment processing failures
- High memory usage
- High CPU usage

## Backup Strategy

### Database Backups
- Daily automated backups
- Weekly full backups
- Monthly archive backups
- Test restoration process quarterly

### Application Backups
- Git repository (code)
- Environment configurations (encrypted)
- SSL certificates
- Uploaded files (if any)

## Rollback Procedure

If deployment fails:
1. Stop the new version: `pm2 stop joblify`
2. Restore previous version from git
3. Rebuild: `npm run build`
4. Restart: `pm2 restart joblify`
5. Verify functionality
6. Investigate issue in non-production environment

## Scaling Considerations

### Horizontal Scaling
Current limitations for multi-server setups:
- Account lockout tracking uses in-memory storage
- Session store uses MemoryStore

To scale horizontally:
1. Migrate to Redis for session storage
2. Use database or Redis for rate limiting
3. Configure load balancer with sticky sessions
4. Consider database read replicas

### Database Scaling
- Enable connection pooling
- Add read replicas for heavy read operations
- Optimize slow queries
- Consider database sharding for large datasets

## Environment-Specific Notes

### Staging Environment
- Use Stripe test mode
- Use separate database
- Configure separate PostHog project
- Test all features before promoting to production

### Production Environment
- Use Stripe live mode
- Enable all monitoring
- Configure automatic backups
- Set up disaster recovery
- Document all configuration

## Troubleshooting

### Common Issues

**Application won't start:**
- Check environment variables are set
- Verify database connection
- Check port 5000 is available
- Review application logs

**Database connection errors:**
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Verify network connectivity
- Check database credentials

**Stripe webhooks not working:**
- Verify webhook URL is accessible
- Check webhook secret matches environment
- Review Stripe dashboard for webhook logs
- Test with Stripe CLI

**Email not sending:**
- Verify Brevo API key
- Check email service logs
- Verify sender email is verified
- Test with simple email first

**AI features not working:**
- Verify POE_API_KEY is valid
- Check POE API quota
- Review error logs for details
- Test API key with curl

## Security Maintenance

### Regular Tasks
- Update dependencies monthly: `npm update`
- Review security advisories: `npm audit`
- Rotate encryption keys every 90 days
- Review access logs weekly
- Check for unusual activity

### Security Updates
- Apply critical security patches immediately
- Test in staging first
- Schedule maintenance window for non-critical updates
- Keep changelog of security updates

## Support Contacts

- **Security Issues**: privacy@joblifyai.com
- **Technical Support**: support@joblifyai.com
- **Deployment Questions**: Check documentation or create GitHub issue

---

**Last Updated**: February 2026
