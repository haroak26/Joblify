/**
 * Knowledge Base for AI-powered customer support
 * This contains information about Joblify features, pricing, and common issues
 */

export const KNOWLEDGE_BASE = `
# Joblify Knowledge Base

## Platform Features

### AI Chat Resume Builder
- Build resumes through natural conversation with our AI assistant
- The AI asks personalized follow-up questions based on your responses
- Real-time preview of your resume as you chat
- All plans include access to the AI chat resume builder
- Free plan: 3 AI edits per month
- Plus plan: 50 AI edits per month
- Ultra/Lifetime plans: Unlimited AI edits

### ATS Scanner
- Analyzes your resume for Applicant Tracking System compatibility
- Provides a score and specific improvement suggestions
- Available on Plus, Ultra, and Lifetime plans only
- Not available on Free plan

### Cover Letter Generator
- Generate tailored cover letters for specific jobs
- Uses your resume data and job description
- Available on Plus, Ultra, and Lifetime plans only

### LinkedIn Import
- Import job postings directly from LinkedIn
- Automatically extract job details and requirements
- Available on Plus, Ultra, and Lifetime plans only

### Resume Tailoring
- Customize your resume for specific job postings
- Optimizes keywords and highlights relevant experience
- Available on Ultra and Lifetime plans only
- Not available on Free or Plus plans

### Export Formats
- Free plan: PDF only
- Plus/Ultra/Lifetime plans: PDF and DOCX formats

### Job Scraping
- Automatically find relevant freelance jobs from Reddit and X (Twitter)
- Free plan: 5 jobs per month
- Plus plan: 100 jobs per month
- Ultra/Lifetime: Unlimited jobs

## Pricing Plans

### Free Plan
- 1 resume
- 3 AI edits per month
- PDF export only
- 5 job scrapes per month
- No ATS scanner
- No cover letter generator
- No LinkedIn import
- No resume tailoring

### Plus Plan ($9.99/month)
- 5 resumes
- 50 AI edits per month
- PDF and DOCX export
- 100 job scrapes per month
- ATS scanner included
- Cover letter generator included
- LinkedIn import included
- No resume tailoring

### Ultra Plan ($19.99/month)
- Unlimited resumes
- Unlimited AI edits
- PDF and DOCX export
- Unlimited job scrapes
- ATS scanner included
- Cover letter generator included
- LinkedIn import included
- Resume tailoring included

### Lifetime Plan ($99 one-time)
- All Ultra features forever
- No monthly fees
- Same as Ultra but pay once

## Common Questions

### Account Management

Q: How do I verify my email?
A: Check your email inbox for a verification link sent when you registered. Click the link to verify your account. If you didn't receive it, use the "Resend verification email" option on the dashboard.

Q: How do I reset my password?
A: Go to the login page and click "Forgot Password". Enter your email address and you'll receive a password reset link.

Q: How do I enable two-factor authentication (2FA)?
A: Go to Account Settings > Security > Enable 2FA. Scan the QR code with an authenticator app like Google Authenticator and enter the code to enable it.

Q: What are backup codes?
A: Backup codes are recovery codes you can use to access your account if you lose access to your 2FA device. Save them securely when 2FA is enabled.

### Subscription Management

Q: How do I upgrade my plan?
A: Go to your Dashboard > Subscription > Upgrade Plan. Choose your desired plan and complete payment through Stripe.

Q: How do I cancel my subscription?
A: Go to Account Settings > Subscription > Cancel Plan. Your subscription will remain active until the end of your billing period.

Q: Can I downgrade from Ultra to Plus?
A: Yes, go to Account Settings > Subscription. Your new plan will take effect at the end of your current billing cycle.

Q: What happens to my resumes if I downgrade?
A: You keep all your resumes, but you can only edit them within your new plan's limits. For example, if you have 10 resumes and downgrade to Plus (5 resumes), you can still access all 10 but can only edit 5.

### Resume Building

Q: How do I create a new resume?
A: Go to Dashboard > My Resumes > Create New Resume. Choose to start with the AI chat builder or create manually.

Q: How do I export my resume?
A: Open your resume, click the Export button, and choose PDF (all plans) or DOCX (Plus/Ultra/Lifetime only).

Q: Can I use different templates?
A: Yes, when creating or editing a resume, you can choose from Modern, Classic, or Creative templates.

Q: How do I edit an existing resume?
A: Go to My Resumes, click on the resume you want to edit, and make your changes. Changes are saved automatically.

### Job Features

Q: How do I save a job?
A: Click the "Save" button on any job listing. Saved jobs appear in your Dashboard > Saved Jobs.

Q: How do I track my applications?
A: After applying, mark the job as "Applied" in your saved jobs. You can update the status to "Interview Scheduled", "Offer Received", etc.

Q: How does job scraping work?
A: Our system automatically finds relevant freelance jobs based on your profile skills from Reddit and X. Jobs refresh daily.

### Technical Issues

Q: Why isn't the AI responding?
A: This could be due to:
1. Server overload - try again in a few minutes
2. Your AI edit limit may be reached for the month (check your plan limits)
3. Network connectivity issues - check your internet connection

Q: My resume won't export - what should I do?
A: Try these steps:
1. Refresh the page and try again
2. Check that your resume has content in all required sections
3. If exporting as DOCX, ensure you have Plus/Ultra/Lifetime plan
4. Clear your browser cache and try again

Q: I'm not receiving emails - what's wrong?
A: Check:
1. Spam/junk folder
2. Email address is correct in Account Settings
3. Email provider isn't blocking our emails
4. Whitelist emails from @joblify.com

## Error Messages

"Maximum AI edits reached for this month"
- You've used all your AI edits for the current month
- Wait until next month or upgrade your plan for more edits

"This feature requires Plus plan or higher"
- You're trying to use ATS Scanner, Cover Letter, or LinkedIn Import on Free plan
- Upgrade to Plus, Ultra, or Lifetime to access this feature

"Resume limit reached"
- Free: 1 resume max
- Plus: 5 resumes max
- Solution: Delete old resumes or upgrade to Ultra/Lifetime for unlimited

"Invalid export format for your plan"
- You're trying to export as DOCX on Free plan
- Upgrade to Plus or higher for DOCX exports

## Contact Support
If your question wasn't answered here, please provide:
- Your account email
- Current subscription plan
- Detailed description of your issue
- Screenshots if applicable (remove any sensitive data)
- Browser and operating system you're using
`;

export function buildSupportPrompt(userQuestion: string): string {
  return `You are a helpful customer support assistant for Joblify, an AI-powered resume builder platform.

Use the following knowledge base to answer the user's question. If the knowledge base contains information that answers their question, provide a clear, helpful response. If the knowledge base does not contain relevant information, respond with "I don't have specific information about that. Let me connect you with our support team who can help you better."

Knowledge Base:
${KNOWLEDGE_BASE}

User Question: ${userQuestion}

Instructions:
- Be friendly and helpful
- Give specific, actionable advice when possible
- Reference the knowledge base information
- If suggesting a plan upgrade, explain the benefits clearly
- If you don't know the answer, say so and suggest contacting support
- Keep responses concise but complete
- Use bullet points for lists when appropriate

Response:`;
}
