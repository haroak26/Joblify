# Email Engagement System Documentation

## Overview

The Email Engagement System is designed to help onboard new users by progressively introducing them to Joblify's features through timed, personalized email reminders.

## Features

### 1. Automated Welcome Email
- Sent **5 minutes** after user signs up
- Contains updated branding (briefcase logo, brand green color)
- Includes checklist of key features to try

### 2. Progressive Feature Engagement Emails
- Sent at **24-hour**, **48-hour**, and **72-hour** intervals after signup
- Only sent if user hasn't tried certain features
- Each email focuses on a single unused feature
- Includes detailed instructions on how to use the feature

### 3. Feature Tracking
- Automatically tracks when users try each feature:
  - Resume Builder
  - ATS Scanner
  - Cover Letter Generator
  - Job Match
  - Tailor (Resume & Cover Letter Tailoring)
- Prevents duplicate emails about features users have already tried

## Database Schema

### `user_feature_usage` Table
Tracks which features each user has used:
- `id`: UUID primary key
- `user_id`: References users table
- `feature_name`: Name of the feature (e.g., "resume_builder")
- `first_used_at`: Timestamp of first use
- `last_used_at`: Timestamp of most recent use
- `usage_count`: Number of times feature was used

### `scheduled_emails` Table
Manages scheduled and sent emails:
- `id`: UUID primary key
- `user_id`: References users table
- `email_type`: Type of email (welcome, feature_engagement_24h, etc.)
- `feature_name`: For feature engagement emails, which feature is highlighted
- `scheduled_for`: When the email should be sent
- `sent_at`: When the email was actually sent (null if not sent yet)
- `status`: pending, sent, failed, or cancelled
- `error`: Error message if sending failed

## How It Works

### User Registration Flow
1. User signs up and account is created
2. `initializeEmailEngagement()` is called automatically
3. Welcome email is scheduled for 5 minutes later
4. Feature engagement emails are scheduled for 24h, 48h, and 72h later

### Email Processing
1. Scheduler runs every 5 minutes (integrated into existing `server/scheduler.ts`)
2. Checks for pending emails where `scheduled_for <= NOW()` and `status = 'pending'`
3. For each email:
   - Checks user preferences (respects email notification settings)
   - For feature engagement emails:
     - Gets list of features user hasn't tried
     - Selects a feature not previously emailed about
     - Sends personalized email with instructions
   - Updates email status to "sent" or "failed"

### Feature Tracking
When a user visits a dashboard page:
1. `useFeatureTracking()` hook automatically calls the tracking API
2. Server records the feature usage in `user_feature_usage` table
3. If this is the first time using the feature, it's added to the database
4. Future engagement emails will skip this feature

## API Endpoints

### `POST /api/track-feature`
Manually track feature usage from the client.

**Request:**
```json
{
  "featureName": "resume_builder"
}
```

**Response:**
```json
{
  "success": true
}
```

## Email Templates

Each feature has a customized email template with:
- Feature name and tagline
- Description of what the feature does
- Step-by-step instructions
- Benefits and pro tips
- Call-to-action button linking directly to the feature

### Available Features
- **Resume Builder**: AI-powered resume creation
- **ATS Scanner**: Resume compatibility checking
- **Cover Letter Generator**: Personalized cover letters
- **Job Match**: Job tracking and organization
- **Tailor**: Resume and cover letter customization (Ultra feature)

## Configuration

### Environment Variables
- `SCHEDULE_RUNNER_ENABLED`: Set to `"true"` to enable the email scheduler
- `BREVO_API_KEY`: Required for sending emails
- `BREVO_SENDER_EMAIL`: Sender email address
- `BREVO_SENDER_NAME`: Sender name (default: "Joblify")

### Timing Configuration
Edit `server/scheduler.ts` to adjust timing:
- `EMAIL_PROCESSING_INTERVAL_MS`: How often to check for pending emails (default: 5 minutes)

Edit `server/email-engagement.ts` to adjust email schedules:
- Welcome email: 5 minutes after signup
- Feature engagement: 24h, 48h, 72h after signup

## Testing

### Manual Testing
1. Create a test user account
2. Check `scheduled_emails` table - should see 4 pending emails
3. Wait for scheduled times or manually update `scheduled_for` to past date
4. Check that emails are sent (status changes to "sent")
5. Try a feature (e.g., create a resume)
6. Check `user_feature_usage` table - should see the feature tracked
7. Future emails should not mention that feature

### Database Queries

Check pending emails:
```sql
SELECT * FROM scheduled_emails 
WHERE status = 'pending' 
ORDER BY scheduled_for;
```

Check user's tracked features:
```sql
SELECT * FROM user_feature_usage 
WHERE user_id = 'USER_ID';
```

Check sent emails:
```sql
SELECT * FROM scheduled_emails 
WHERE user_id = 'USER_ID' 
AND status = 'sent'
ORDER BY sent_at;
```

## Migration

Run the migration to create the required tables:
```bash
# The migration file is in migrations/0018_add_feature_tracking_and_email_engagement.sql
# Apply it to your database:
psql $DATABASE_URL < migrations/0018_add_feature_tracking_and_email_engagement.sql
```

## Troubleshooting

### Emails Not Sending
1. Check `BREVO_API_KEY` is set correctly
2. Check `SCHEDULE_RUNNER_ENABLED=true` in environment
3. Check server logs for errors
4. Check `scheduled_emails` table for failed emails and error messages

### Features Not Being Tracked
1. Check browser console for errors from `/api/track-feature`
2. Verify user is authenticated (check session)
3. Check server logs for tracking errors

### Duplicate Emails
The system is designed to prevent duplicates:
- Each feature is only highlighted once per user
- If a user tries a feature, no more emails about that feature
- Status tracking prevents resending emails

## Future Enhancements

Potential improvements:
- Add more granular tracking (e.g., track specific actions within features)
- A/B test different email timing intervals
- Add email open/click tracking
- Implement email preference center
- Add more email types (e.g., weekly digest, feature updates)
- Personalize email sending times based on user timezone
