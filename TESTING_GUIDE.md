# Implementation Test Plan

## Manual Testing Checklist

### 1. Test AI Parameter Generation API

```bash
# Prerequisites: User must be logged in and have a session

# Test 1: Generate parameters for a complete profile
curl -X POST http://localhost:3000/api/scraper-parameters/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Expected: Returns generated parameters
# Should include Reddit subreddits, keywords, and X queries

# Test 2: Try to generate without profile
curl -X POST http://localhost:3000/api/scraper-parameters/generate \
  -H "Cookie: connect.sid=SESSION_WITHOUT_PROFILE"

# Expected: 400 error - "Profile incomplete"
```

### 2. Test Parameter Retrieval

```bash
# Get user's scraper parameters
curl -X GET http://localhost:3000/api/scraper-parameters \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Expected: Returns parameters or null if not generated
```

### 3. Test Manual Parameter Update

```bash
curl -X POST http://localhost:3000/api/scraper-parameters \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{
    "reddit": {
      "subreddits": ["forhire", "freelance"],
      "searchKeywords": ["hiring developer"],
      "sort": "new",
      "timeFilter": "week"
    },
    "x": {
      "queries": ["hiring developer -retweet"],
      "filters": {
        "links": "only",
        "verified": "",
        "safe": "on"
      }
    }
  }'

# Expected: 200 OK with saved parameters
```

### 4. Test Auto-Generation on Profile Update

```bash
# Update profile with skills and intro
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{
    "intro": "Full-stack developer with 5 years of experience in React and Node.js",
    "skills": [
      {"id": "1", "name": "React"},
      {"id": "2", "name": "TypeScript"},
      {"id": "3", "name": "Node.js"}
    ]
  }'

# Expected: Profile updated, parameters generated in background

# Wait 2-3 seconds, then check parameters
curl -X GET http://localhost:3000/api/scraper-parameters \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Expected: Parameters should now exist
```

### 5. Test Job Scraping with Parameters

```bash
# Trigger job refresh
curl -X POST http://localhost:3000/api/jobs/refresh \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Monitor logs for:
# "Using custom scraper parameters for user {userId}"
# or
# "Using default scraping for user {userId}"

# Check results
curl -X GET http://localhost:3000/api/jobs \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Expected: Jobs returned, more relevant with custom parameters
```

## Integration Test Scenarios

### Scenario A: New User Journey

1. User registers → No parameters
2. User adds profile (intro + skills) → Parameters auto-generated
3. User clicks "Find Jobs" → Uses custom parameters
4. User sees relevant jobs ✅

### Scenario B: Existing User Updates Profile

1. User has existing profile → May have old parameters
2. User updates skills → New parameters auto-generated
3. Next job search → Uses new parameters
4. Results more relevant ✅

### Scenario C: Fallback Behavior

1. User has profile but no parameters → Uses default scraping
2. AI generation fails → Falls back to rule-based generation
3. Scraping still works ✅

## Expected Outcomes

### Success Metrics

1. **Parameter Generation Rate**: >95% successful generation
2. **Job Discovery Rate**: 5-10+ jobs per search (vs 0-2 before)
3. **Relevance Score**: Jobs match user skills >70% of the time
4. **Error Rate**: <5% failures, all with graceful fallback

### Performance Benchmarks

- Parameter generation: <5 seconds
- Job scraping: 30-60 seconds (unchanged)
- Database queries: <100ms per operation
- API responses: <200ms (except scraping)

## Debugging Tips

### Check Logs

```bash
# Look for parameter generation
grep "custom scraper parameters" logs.txt

# Check for AI errors
grep "Error generating scraper parameters" logs.txt

# Verify fallback usage
grep "rule-based parameter generation" logs.txt
```

### Database Inspection

```sql
-- Check if parameters are stored
SELECT 
  u.email,
  p.scraper_parameters IS NOT NULL as has_params,
  p.parameters_updated_at
FROM users u
JOIN profiles p ON p.user_id = u.id
WHERE p.scraper_parameters IS NOT NULL;

-- View actual parameters
SELECT 
  u.email,
  p.scraper_parameters
FROM users u
JOIN profiles p ON p.user_id = u.id
WHERE p.scraper_parameters IS NOT NULL
LIMIT 1;
```

### API Key Verification

```bash
# Verify POE/OpenAI API key is set
echo $POE_API_KEY
echo $OPENAI_API_KEY

# Test API connection
curl https://api.poe.com/v1/models \
  -H "Authorization: Bearer $POE_API_KEY"
```

## Common Issues & Solutions

### Issue: "Missing Poe API credentials"
**Solution**: Set POE_API_KEY or OPENAI_API_KEY environment variable

### Issue: Parameters not auto-generating
**Solution**: 
- Check intro length (must be >= 20 chars)
- Check if skills exist
- Verify API key is valid
- Check logs for errors

### Issue: Still getting zero results
**Solution**:
- Verify Apify API tokens are set
- Check if parameters are valid
- Test scrapers individually
- Check subreddit and query validity

### Issue: Database migration failed
**Solution**:
```sql
-- Run manually
ALTER TABLE profiles ADD COLUMN scraper_parameters jsonb;
ALTER TABLE profiles ADD COLUMN parameters_updated_at timestamp;
```

## Monitoring Dashboard Queries

```sql
-- Parameter adoption rate
SELECT 
  COUNT(*) FILTER (WHERE scraper_parameters IS NOT NULL) as with_params,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE scraper_parameters IS NOT NULL) / COUNT(*), 2) as adoption_rate
FROM profiles;

-- Recent parameter updates
SELECT 
  u.email,
  p.parameters_updated_at,
  jsonb_array_length(p.scraper_parameters->'reddit'->'subreddits') as subreddit_count,
  jsonb_array_length(p.scraper_parameters->'reddit'->'searchKeywords') as keyword_count,
  jsonb_array_length(p.scraper_parameters->'x'->'queries') as query_count
FROM users u
JOIN profiles p ON p.user_id = u.id
WHERE p.scraper_parameters IS NOT NULL
ORDER BY p.parameters_updated_at DESC
LIMIT 10;

-- Job scraping success rate (by user with/without params)
SELECT 
  CASE 
    WHEN p.scraper_parameters IS NOT NULL THEN 'With Parameters'
    ELSE 'Without Parameters'
  END as param_status,
  COUNT(DISTINCT j.user_id) as users_with_jobs,
  AVG(job_count) as avg_jobs_per_user
FROM (
  SELECT user_id, COUNT(*) as job_count
  FROM jobs
  WHERE scraped_at > NOW() - INTERVAL '7 days'
  GROUP BY user_id
) j
JOIN profiles p ON p.user_id = j.user_id
GROUP BY param_status;
```
