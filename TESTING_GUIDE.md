# Testing Guide

## Manual Testing Checklist

### 1. Test User Registration and Authentication

```bash
# Register a new user
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'

# Expected: User created, verification email sent

# Login
curl -X POST http://localhost:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'

# Expected: Returns session cookie
```

### 2. Test Profile Management

```bash
# Prerequisites: User must be logged in and have a session

# Get profile
curl -X GET http://localhost:5000/api/profile \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Update profile
curl -X POST http://localhost:5000/api/profile \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{
    "intro": "I am a full-stack developer with 5 years of experience",
    "skills": [
      {"id": "1", "name": "React"},
      {"id": "2", "name": "Node.js"}
    ]
  }'

# Expected: Profile updated successfully
```

### 3. Test Job Management

```bash
# Get all jobs
curl -X GET http://localhost:5000/api/jobs \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Save a job
curl -X POST http://localhost:5000/api/jobs/JOB_ID/save \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Mark as applied
curl -X POST http://localhost:5000/api/jobs/JOB_ID/apply \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Expected: Job status updated
```

### 4. Test AI Message Generation

```bash
curl -X POST http://localhost:5000/api/generate-message \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{
    "jobTitle": "Full Stack Developer",
    "jobDescription": "We need a developer...",
    "skills": ["React", "Node.js"],
    "tone": "professional"
  }'

# Expected: Returns generated message
```

### 5. Test Schedule Management

```bash
# Create a schedule
curl -X POST http://localhost:5000/api/schedules \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_ID" \
  -d '{
    "name": "Daily Search",
    "frequency": "daily",
    "time": "09:00",
    "platforms": []
  }'

# Get all schedules
curl -X GET http://localhost:5000/api/schedules \
  -H "Cookie: connect.sid=YOUR_SESSION_ID"

# Expected: Schedule created and listed
```

## UI Testing

### Test User Flow

1. **Registration & Login**
   - Register a new account
   - Verify email (check console logs for token)
   - Login with credentials

2. **Profile Setup**
   - Navigate to profile page
   - Add skills
   - Write introduction
   - Save profile

3. **Job Management**
   - View jobs list
   - Filter jobs by status
   - Save interesting jobs
   - Mark jobs as applied

4. **Message Generation**
   - Open a job detail
   - Click "Generate Message"
   - Review AI-generated message
   - Copy to clipboard

5. **Subscription (if enabled)**
   - View pricing page
   - Select a plan
   - Test Stripe checkout

## Database Queries

```sql
-- Check user profiles
SELECT u.email, p.intro, p.skills
FROM users u
JOIN profiles p ON p.user_id = u.id;

-- View all jobs
SELECT 
  u.email,
  j.title,
  j.source,
  j.saved,
  j.applied
FROM jobs j
JOIN users u ON j.user_id = u.id;

-- Check schedules
SELECT 
  u.email,
  s.name,
  s.frequency,
  s.enabled,
  s.last_run
FROM schedules s
JOIN users u ON s.user_id = u.id;
```

## Common Issues

### Issue: Email verification not working
**Solution**:
- Check Brevo API key is set
- Verify sender email is configured
- Check console logs for verification token

### Issue: Jobs not appearing
**Solution**:
- Ensure profile has skills
- Check database for jobs
- Verify user is logged in

### Issue: Database connection failed
**Solution**:
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Run `npm run db:push` to sync schema
