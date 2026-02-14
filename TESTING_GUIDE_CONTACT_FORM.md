# Smart Contact Form - Testing Guide

## Manual Testing Checklist

### 1. Form Validation Testing
- [ ] Submit empty form → Should show validation errors
- [ ] Enter invalid email (e.g., "test@") → Should show email validation error
- [ ] Enter valid data → Should proceed to AI response
- [ ] Test form fields are disabled during submission
- [ ] Test form clears after successful AI acceptance

### 2. AI Response Flow Testing
- [ ] Submit question about pricing → AI should respond with plan details
- [ ] Submit question about features → AI should respond with feature info
- [ ] Submit question about export formats → AI should mention PDF/DOCX
- [ ] Submit question about security → AI should mention security/GDPR
- [ ] Submit technical account question → AI should recommend support

### 3. User Decision Testing
- [ ] Click "Yes, I'm satisfied" → Form should reset, success toast
- [ ] Click "Contact Support" → Should show loading state
- [ ] After "Contact Support" → Should show success dialog
- [ ] Verify buttons disabled during email sending

### 4. Email Functionality Testing
**Note: Requires valid BREVO_API_KEY in environment**

- [ ] Submit and click "Contact Support"
- [ ] Verify email received at support@joblifyai.com with:
  - User's name and email
  - Message content
  - AI response (in yellow warning box)
  - "Please prioritize" note
- [ ] Verify confirmation email sent to user with:
  - Copy of their message
  - Expected response time
  - Support email address

### 5. Error Handling Testing
- [ ] Disable POE API (invalid key) → Should show fallback message
- [ ] Disable Brevo API → Should show error toast with fallback email
- [ ] Test with slow network → Loading states should be visible
- [ ] Test AI timeout scenario → Should fallback gracefully

### 6. UI/UX Testing
- [ ] Verify smooth transitions between form and AI response
- [ ] Check animations (fade in/out) work correctly
- [ ] Verify no UI glitches during state changes
- [ ] Test on mobile devices (responsive layout)
- [ ] Test with different screen sizes
- [ ] Verify loading spinner animates correctly
- [ ] Check all icons display properly

### 7. Accessibility Testing
- [ ] Tab through form fields (keyboard navigation)
- [ ] Test with screen reader (all labels readable)
- [ ] Verify focus indicators visible
- [ ] Check color contrast meets WCAG standards
- [ ] Test with browser zoom (125%, 150%, 200%)

### 8. Integration Testing
- [ ] Verify contact page loads correctly
- [ ] Test navigation to/from contact page
- [ ] Verify Footer component renders
- [ ] Test links in navigation work
- [ ] Verify success dialog closes properly

## Automated Testing Commands

### Build Test
```bash
npm run build
# Should complete without errors
# Should generate dist/public/assets/
```

### TypeScript Check
```bash
npm run check
# Should compile with no errors (except known type def warnings)
```

### Security Scan
```bash
# CodeQL analysis should pass with 0 alerts
```

## Performance Testing

### Metrics to Check
- **AI Response Time:** Should be < 3 seconds for typical questions
- **Email Send Time:** Should be < 2 seconds
- **Animation Duration:** 300ms (smooth but not slow)
- **Page Load:** Contact page should load in < 1 second
- **Bundle Size:** Check client/dist/assets/ files aren't excessive

### Load Testing
- [ ] Send 10 rapid submissions → Should handle gracefully
- [ ] Test concurrent users (if possible)
- [ ] Verify API rate limiting doesn't block legitimate users

## Environment Variables Required for Testing

Create `.env` file with:
```env
# Required for AI functionality
POE_API_KEY=your-actual-poe-api-key
POE_API_BASE_URL=https://api.poe.com/v1

# Required for email functionality
BREVO_API_KEY=your-actual-brevo-api-key
BREVO_SENDER_EMAIL=noreply@joblifyai.com
BREVO_SENDER_NAME=Joblify

# Database (can be test DB)
DATABASE_URL=postgresql://user:pass@localhost:5432/joblify_test
SESSION_SECRET=test-secret-key
TWO_FACTOR_ENCRYPTION_KEY=test-2fa-key

# Application
NODE_ENV=development
BASE_URL=http://localhost:5000
PORT=5000
```

## Known Test Scenarios

### Scenario 1: Happy Path - AI Satisfies User
1. User fills form: "How do I export my resume?"
2. AI responds: "You can export in PDF or DOCX format..."
3. User clicks "Yes, I'm satisfied"
4. **Expected:** Form resets, no email sent, success toast shown

### Scenario 2: AI Response Insufficient
1. User fills form: "I forgot my password"
2. AI responds with password reset info
3. User clicks "Contact Support"
4. **Expected:** Loading state → Success dialog → 2 emails sent

### Scenario 3: Account-Specific Question
1. User fills form: "Why was my account suspended?"
2. AI recommends contacting support (question too specific)
3. User clicks "Contact Support"
4. **Expected:** Email to support with note about AI limitation

### Scenario 4: API Failure
1. POE API key is invalid/expired
2. User submits form
3. **Expected:** Graceful fallback message, option to email support

## Browser Compatibility Testing

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Regression Testing

Ensure existing functionality still works:
- [ ] Other pages load correctly
- [ ] Authentication still works
- [ ] Other forms (login, register) work
- [ ] Dashboard features unaffected
- [ ] Email verification still works

## Success Criteria

✅ All validation working correctly
✅ AI responses relevant and helpful
✅ Emails sent successfully with proper templates
✅ Smooth animations, no glitches
✅ No security vulnerabilities (CodeQL clean)
✅ Build completes successfully
✅ Mobile responsive
✅ Accessible (WCAG compliant)

## Troubleshooting Common Issues

### Issue: AI not responding
**Check:**
- POE_API_KEY is valid and active
- POE_API_BASE_URL is correct
- Network connectivity
- API quota/rate limits

### Issue: Emails not sending
**Check:**
- BREVO_API_KEY is valid
- Sender email verified in Brevo
- Email addresses are valid
- Brevo service status

### Issue: Animations glitchy
**Check:**
- Framer Motion installed (`npm list framer-motion`)
- Browser supports CSS transforms
- No conflicting CSS animations
- AnimatePresence wrapping transitions

### Issue: Form validation not working
**Check:**
- Input fields have `required` attribute
- Email field has `type="email"`
- Zod schema in backend matching frontend
- Browser JavaScript enabled

## Performance Benchmarks

**Target Metrics:**
- AI Response: < 3s (90th percentile)
- Email Send: < 2s (95th percentile)
- Page Load: < 1s (First Contentful Paint)
- Animation: Exactly 300ms
- Bundle Size: < 1.5MB (before gzip)

## Next Steps After Testing

1. Fix any bugs found during testing
2. Optimize any slow operations
3. Document any edge cases
4. Update user documentation if needed
5. Deploy to staging environment
6. Final verification on staging
7. Deploy to production
