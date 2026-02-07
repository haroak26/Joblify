# Joblify API Documentation

Complete API reference for Joblify backend endpoints.

## Base URL
- **Development**: `http://localhost:5000`
- **Production**: `https://yourdomain.com`

## Authentication
Most endpoints require authentication via session cookies. Include credentials in requests:
```javascript
fetch('/api/endpoint', {
  credentials: 'include'
})
```

## Common Response Codes
- `200` - Success
- `400` - Bad request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `429` - Too many requests (rate limit exceeded)
- `500` - Server error

## Authentication Endpoints

### POST /api/auth/register
Create new user account.

**Request Body:**
```json
{
  "username": "string (required)",
  "email": "string (required, valid email)",
  "password": "string (required, min 8 chars)"
}
```

**Response:** `201 Created`
```json
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string"
  }
}
```

### POST /api/auth/login
Authenticate user.

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "message": "Login successful",
  "user": { /* user object */ }
}
```

### POST /api/auth/logout
End user session.

**Response:** `200 OK`

### GET /api/auth/me
Get current user information.

**Response:** `200 OK`
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "emailVerified": "boolean"
  }
}
```

## Resume Endpoints

### GET /api/resumes
List all resumes for authenticated user.

**Query Parameters:**
- None

**Response:** `200 OK`
```json
{
  "resumes": [
    {
      "id": "uuid",
      "userId": "uuid",
      "title": "string",
      "template": "modern|classic|creative",
      "data": { /* resume data object */ },
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

### POST /api/resumes
Create new resume.

**Request Body:**
```json
{
  "title": "string (optional)",
  "template": "modern|classic|creative (optional)"
}
```

**Response:** `201 Created`

### GET /api/resumes/:id
Get specific resume.

**Response:** `200 OK`

### PUT /api/resumes/:id
Update resume.

**Request Body:**
```json
{
  "title": "string (optional)",
  "template": "string (optional)",
  "data": { /* resume data (optional) */ }
}
```

**Response:** `200 OK`

### DELETE /api/resumes/:id
Delete resume.

**Response:** `200 OK`

### POST /api/resumes/:id/duplicate
Create copy of existing resume.

**Response:** `201 Created`

## AI Chat Endpoints

### POST /api/chat/resume/:id/message
Send message to AI resume builder.

**Request Body:**
```json
{
  "message": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "response": "string (AI response)",
  "extractedData": { /* any extracted resume data */ },
  "suggestions": ["string"]
}
```

**Rate Limits:**
- Free: 10 req/min
- Plus: 50 req/min
- Ultra/Lifetime: 200 req/min

### GET /api/chat/resume/:id/history
Get chat conversation history.

**Response:** `200 OK`
```json
{
  "messages": [
    {
      "role": "user|assistant",
      "content": "string",
      "timestamp": "timestamp"
    }
  ]
}
```

## AI Enhancement Endpoints

### POST /api/ai/improve-content
Improve resume content with AI.

**Request Body:**
```json
{
  "content": "string (required)",
  "type": "bullet|summary|experience (required)"
}
```

**Response:** `200 OK`
```json
{
  "improved": "string"
}
```

### POST /api/ai/suggest-keywords
Get keyword suggestions for resume.

**Request Body:**
```json
{
  "jobTitle": "string (required)",
  "industry": "string (optional)"
}
```

**Response:** `200 OK`
```json
{
  "keywords": ["string"]
}
```

### POST /api/ai/check-grammar
Check grammar and spelling.

**Request Body:**
```json
{
  "text": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "corrected": "string",
  "suggestions": [
    {
      "original": "string",
      "suggestion": "string",
      "reason": "string"
    }
  ]
}
```

### POST /api/ai/adjust-tone
Adjust content tone.

**Request Body:**
```json
{
  "content": "string (required)",
  "tone": "professional|creative|technical (required)"
}
```

**Response:** `200 OK`
```json
{
  "adjusted": "string"
}
```

## ATS Scanner Endpoints

### POST /api/ats/scan
Scan uploaded resume file (PDF/DOCX).

**Request:** `multipart/form-data`
- `file`: Resume file (max 5MB)

**Response:** `200 OK`
```json
{
  "score": 85,
  "keywords": ["keyword1", "keyword2"],
  "missingKeywords": ["keyword3"],
  "suggestions": ["Add more technical skills"],
  "formatIssues": []
}
```

**Plan Requirements:** Plus, Ultra, or Lifetime

### POST /api/ats/analyze
Analyze resume data against job description.

**Request Body:**
```json
{
  "resumeId": "uuid (required)",
  "jobDescription": "string (required)"
}
```

**Response:** `200 OK`
```json
{
  "matchScore": 78,
  "matchedKeywords": ["skill1", "skill2"],
  "missingKeywords": ["skill3"],
  "recommendations": ["Add experience with X"]
}
```

## Export Endpoints

### POST /api/export/pdf/:id
Export resume as PDF.

**Response:** `200 OK`
- Content-Type: `application/pdf`
- File download

**Available:** All plans

### POST /api/export/docx/:id
Export resume as DOCX.

**Response:** `200 OK`
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- File download

**Available:** Plus, Ultra, Lifetime only

## Cover Letter Endpoints

### POST /api/cover-letter/generate
Generate cover letter from resume.

**Request Body:**
```json
{
  "resumeId": "uuid (required)",
  "jobTitle": "string (required)",
  "companyName": "string (required)",
  "jobDescription": "string (optional)",
  "tone": "professional|enthusiastic|creative (optional)"
}
```

**Response:** `201 Created`
```json
{
  "coverLetter": {
    "id": "uuid",
    "content": "string",
    "jobTitle": "string",
    "companyName": "string"
  }
}
```

**Available:** Ultra and Lifetime plans only

### GET /api/cover-letters
List all cover letters.

**Response:** `200 OK`

### GET /api/cover-letter/:id
Get specific cover letter.

**Response:** `200 OK`

### PUT /api/cover-letter/:id
Update cover letter content.

**Request Body:**
```json
{
  "content": "string (required)"
}
```

**Response:** `200 OK`

### DELETE /api/cover-letter/:id
Delete cover letter.

**Response:** `200 OK`

### POST /api/export/cover-letter/pdf/:id
Export cover letter as PDF.

**Response:** `200 OK`
- Content-Type: `application/pdf`

## Subscription & Account Endpoints

### GET /api/subscription
Get subscription details.

**Response:** `200 OK`
```json
{
  "subscription": {
    "plan": "free|plus|ultra|lifetime",
    "status": "active|cancelled|past_due",
    "currentPeriodEnd": "timestamp"
  },
  "limits": {
    "maxSkills": 10,
    "maxJobsPerMonth": 5,
    "hasScheduleAccess": false
  }
}
```

### GET /api/usage
Get usage statistics.

**Response:** `200 OK`
```json
{
  "usage": {
    "skillsCount": 5,
    "jobsScrapedThisMonth": 3,
    "monthResetDate": "timestamp"
  },
  "remaining": {
    "skills": 5,
    "jobsThisMonth": 2
  }
}
```

### DELETE /api/account
Delete user account and all data.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

## GDPR/CCPA Privacy Endpoints

### GET /api/user/data-export
Export all user data (GDPR Right to Portability).

**Response:** `200 OK`
- Content-Type: `application/json`
- File download with complete user data

**Logs:** Security event logged for audit

### GET /api/user/data-summary
Get summary of collected data (GDPR Right to Access).

**Response:** `200 OK`
```json
{
  "dataCategories": {
    "personalInformation": {
      "description": "string",
      "fields": ["field1"],
      "dataPresent": true,
      "purpose": "string",
      "retention": "string"
    }
    // ... more categories
  },
  "thirdPartySharing": {
    "stripe": {
      "name": "Stripe",
      "purpose": "Payment processing",
      "dataShared": ["email", "name"]
    }
    // ... more services
  },
  "yourRights": { /* GDPR rights */ },
  "contactInformation": {
    "privacyEmail": "privacy@joblifyai.com"
  }
}
```

### POST /api/user/consent-withdraw
Log consent withdrawal request.

**Request Body:**
```json
{
  "reason": "string (optional)"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Consent withdrawal logged",
  "nextSteps": ["Delete your account to remove all data"]
}
```

## Stripe Webhook Endpoint

### POST /webhooks/stripe
Handle Stripe webhook events.

**Headers Required:**
- `stripe-signature`: Webhook signature

**Events Handled:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

**Response:** `200 OK`

## Rate Limiting Headers

All responses include rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1645564800
```

## Error Response Format

All errors follow this format:
```json
{
  "error": "Error type",
  "message": "Human-readable message",
  "code": "ERROR_CODE (optional)"
}
```

## Pagination

Endpoints that return lists support pagination:
```
GET /api/endpoint?page=1&limit=20
```

Response includes:
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

---

**API Version**: 1.0  
**Last Updated**: February 2026
