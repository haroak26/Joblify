# Testing Guide for Scraper System Redesign

This guide explains how to test the improved scraper system.

## Prerequisites

### Required Environment Variables
```bash
APIFY_TOKEN=your_apify_token_here
POE_API_KEY=your_poe_api_key_here
```

## Unit Tests (No API Keys Required)

The validation test suite can run without API keys:

```bash
npx tsx /tmp/test-scrapers.ts
```

Expected output:
```
✅ PASS: Broad keywords simplified to "developer"
✅ PASS: Prompt includes simplified query rules
✅ PASS: Fallback queries are simple (1-2 words)
✅ PASS: Circuit breaker configured correctly
✅ PASS: Subreddit splitting works correctly
```

## Integration Tests (Requires API Keys)

### Test 1: Simple Query Scraping

1. Start the application:
```bash
npm run dev
```

2. Create a user profile with skills (e.g., "React", "TypeScript")

3. Trigger job scraping via the API

4. Expected behavior:
   - Query generated should be simple: "hiring" or "freelance"
   - No 404 errors in logs
   - Jobs returned from Reddit and/or X
   - Logs should show: `[Reddit Scraper] Success - Found X items`

### Test 2: Multi-Strategy Fallback

To test the fallback mechanism:

1. Temporarily disable Apify by commenting out the Apify call
2. Run scraping
3. Expected: Direct Reddit JSON API should activate
4. Logs should show: `[Reddit Scraper] Using direct Reddit JSON API fallback`

### Test 3: Circuit Breaker

To test circuit breaker:

1. Use invalid APIFY_TOKEN
2. Trigger scraping 3 times
3. Expected: After 3 failures, circuit opens
4. Log should show: `[Reddit Scraper] Circuit breaker is open. Waiting Xs before retry.`
5. Wait 5 minutes
6. Circuit should close and allow retries

### Test 4: Per-Subreddit Search

1. Enable logging in `server/scrapers/reddit.ts`
2. Trigger scraping
3. Logs should show:
```
[Reddit Scraper] Searching 13 subreddits individually
[Reddit Scraper] Attempt 1/3 - Query: "hiring" in r/forhire
[Reddit Scraper] Attempt 1/3 - Query: "hiring" in r/freelance_forhire
...
[Reddit Scraper] Combined results from individual searches: X items
```

## Manual Testing Checklist

- [ ] Simple queries work without 404 errors
- [ ] Reddit scraper returns jobs
- [ ] X scraper returns jobs
- [ ] Direct Reddit API fallback works when Apify fails
- [ ] Circuit breaker opens after 3 failures
- [ ] Circuit breaker closes after 5 minutes
- [ ] Per-subreddit search combines results correctly
- [ ] AI filtering removes irrelevant jobs
- [ ] Jobs are cached for future use
- [ ] No validation errors in console

## Expected Log Output (Success Case)

```
[Scraper] Starting job scraping - skills count: 3 maxJobs: 5
[Scraper] Generating search parameters with AI
[Scraper] AI-generated parameters: { redditQuery: 'hiring', ... }
[Reddit Scraper] Searching 13 subreddits individually
[Reddit Scraper] Attempt 1/3 - Query: "hiring" in r/forhire
[Reddit Scraper] Success - Found 5 items
[Reddit Scraper] Combined results from individual searches: 15 items
[X Scraper] Attempt 1/3 - Query: "freelance"
[X Scraper] Success - Found 5 items
[Scraper] AI filtered X results - kept 3 of 5
[Scraper] Reddit jobs after parsing and filtering: 12
[Scraper] X jobs after parsing and skill filtering: 3
[Scraper] Scraping complete - 2 succeeded, 0 failed
[Scraper] Final job count after sorting and limiting to 5: 5
```

## Expected Log Output (Fallback Case)

```
[Reddit Scraper] Attempt 1/3 - Query: "hiring" in r/forhire
[Reddit Scraper] Attempt 1/3 failed: Network error
[Reddit Scraper] Retrying in 1000ms...
[Reddit Scraper] Attempt 2/3 - Query: "hiring" in r/forhire
[Reddit Scraper] Attempt 2/3 failed: Network error
[Reddit Scraper] Retrying in 2000ms...
[Reddit Scraper] Attempt 3/3 - Query: "hiring" in r/forhire
[Reddit Scraper] Attempt 3/3 failed: Network error
[Reddit Scraper] Apify failed, trying direct Reddit API fallback
[Reddit Scraper] Using direct Reddit JSON API fallback
[Reddit Scraper] Fetching from: https://www.reddit.com/r/forhire/search.json?q=hiring&sort=new&limit=5&t=week
[Reddit Scraper] Direct API returned 5 posts
```

## Troubleshooting

### No Jobs Returned
- Check API keys are set correctly
- Verify network connectivity
- Check rate limits on Apify/Reddit
- Ensure subreddit names are valid

### 404 Errors
- Verify query is simple (1-2 words)
- Check subreddit names are valid
- Enable per-subreddit search

### Circuit Breaker Always Open
- Check APIFY_TOKEN is valid
- Wait 5 minutes for circuit to reset
- Restart application to reset circuit breaker state

### Validation Errors
- Check that all returned job objects have required fields
- Verify date parsing works correctly
- Check that URLs are valid

## Performance Metrics

Monitor these metrics in production:

1. **Success Rate**: % of scraping requests that return >0 jobs
   - Target: >80%

2. **Jobs Per Request**: Average number of jobs returned
   - Target: 5-10 jobs per request

3. **API Call Efficiency**: Jobs returned per API credit spent
   - Target: >1 job per credit

4. **Circuit Breaker Activations**: How often circuit opens
   - Target: <1% of requests

5. **Fallback Usage Rate**: % of requests using direct API
   - Target: <10% (shows Apify is working well)

## Security Testing

1. **Input Validation**: Try invalid subreddit names
   - Test: `r/test@hack` should be rejected
   - Expected: Error logged, fallback to safe default

2. **Query Injection**: Try special characters in queries
   - Test: Query with `"; DROP TABLE` etc.
   - Expected: Properly encoded, no SQL injection

3. **URL Validation**: Verify all URLs are valid
   - Check job `sourceUrl` fields
   - Expected: All URLs should be valid Reddit/X URLs
