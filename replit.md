# Joblify - AI Resume Builder

## Overview
Joblify is an AI-powered resume builder that helps you create professional, ATS-optimized resumes through natural conversation. Build your resume by chatting with AI, get intelligent suggestions, and export to PDF or DOCX.

## Project Architecture

### Frontend (React + Vite)
- **Landing Page** (`/`) - Marketing page with platform overview
- **Dashboard** with sidebar navigation:
  - **Home** (`/dashboard`) - Overview with stats and quick actions
  - **My Resumes** (`/dashboard/resumes`) - Browse and manage your resumes
  - **Resume Builder** (`/dashboard/resume-builder/:id`) - AI-powered resume creation and editing
  - **ATS Scanner** (`/dashboard/ats-scanner`) - Analyze resume ATS compatibility
  - **Cover Letter** (`/dashboard/cover-letter`) - Generate personalized cover letters
  - **Account** (`/dashboard/account`) - Profile, subscription, and settings management

### Backend (Express)
- PostgreSQL database with Drizzle ORM
- API endpoints for resume CRUD operations
- OpenAI integration via Poe API for AI features
- Stripe integration for subscription payments
- Email notifications via Brevo

### Key Components
- `AppSidebar` - Navigation sidebar with Home, My Resumes, Account
- `DashboardLayout` - Wrapper with sidebar and header
- `ResumeBuilder` - AI-powered resume creation with chat interface
- `ResumeEditor` - Visual editor with live preview
- `ATSScanner` - Document analysis and optimization suggestions
- `CoverLetterGenerator` - AI-powered cover letter creation

## API Routes

### Authentication (Public)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new user account with email |
| POST | `/api/auth/login` | Login with username/password |
| POST | `/api/auth/logout` | Logout and destroy session |
| GET | `/api/auth/me` | Get current authenticated user |
| GET | `/api/auth/verify-email` | Verify email with token |
| POST | `/api/auth/resend-verification` | Resend verification email |
| POST | `/api/auth/request-password-reset` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |

### Protected Routes (Require Authentication)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile |
| POST | `/api/profile` | Update user profile |
| GET | `/api/resumes` | Get user's resumes |
| POST | `/api/resumes` | Create new resume |
| GET | `/api/resumes/:id` | Get specific resume |
| PATCH | `/api/resumes/:id` | Update resume |
| DELETE | `/api/resumes/:id` | Delete resume |
| POST | `/api/resumes/:id/pdf` | Generate PDF export |
| POST | `/api/resumes/:id/docx` | Generate DOCX export |
| POST | `/api/chat` | AI chat for resume building |
| POST | `/api/ai/enhance` | AI content enhancement |
| POST | `/api/ats/scan` | Scan resume for ATS compatibility |
| POST | `/api/cover-letter/generate` | Generate cover letter |
| GET | `/api/subscription` | Get subscription details and limits |
| GET | `/api/usage` | Get usage stats and limits |
| POST | `/api/stripe/create-checkout` | Create Stripe checkout session |
| POST | `/api/stripe/cancel` | Cancel subscription |
| GET | `/api/stripe/portal` | Get Stripe billing portal URL |
| DELETE | `/api/account` | Delete account and all data |

## Design System

### Colors
- **Primary**: Green (#1B9C5D) - Professional and modern
- **Background**: Clean white/dark mode support
- **No gradients, minimal shadows** - Clean, professional design
- **Rounded corners**: 0.75rem (12px) for cards and buttons

### Typography
- Font: Inter
- Clean, professional hierarchy

## Features
1. **AI Chat Builder** - Create resumes through natural conversation with Claude 3.5 Haiku
2. **Professional Templates** - Modern, Professional, Creative, Executive, Technical
3. **ATS Scanner** - Upload and analyze existing resumes (PDF/DOCX)
4. **AI-Powered Enhancements** - Content improvement, keyword optimization, grammar check
5. **Cover Letter Generator** - Generate personalized cover letters from resume data
6. **Multiple Export Formats** - PDF (all plans), DOCX (Plus and above)
7. **Dark Mode** - Full dark mode support
8. **Multi-Tier Subscription System**:
   - **Free Plan**: 1 resume, 5 AI edits/month, PDF export
   - **Plus Plan ($15/mo)**: 5 resumes, 100 AI edits/month, all features except cover letters
   - **Ultra Plan ($30/mo)**: Unlimited resumes, unlimited AI edits, all features
   - **Lifetime ($100)**: One-time payment, unlimited access forever
9. **Email Verification** - Required before accessing dashboard features
10. **Two-Factor Authentication** - Optional 2FA for enhanced security
11. **Stripe Payments** - Secure subscription billing
12. **GDPR Compliance** - Data export, account deletion, privacy controls

## AI Integration (Poe)
Uses Poe's OpenAI-compatible API with Claude 3.5 Haiku for:
- Building resumes through conversational AI
- Enhancing resume content and bullet points
- Generating cover letters
- Providing keyword suggestions
- ATS optimization recommendations

Environment variables (stored in Replit secrets):
- `POE_API_KEY`
- `POE_API_BASE_URL` (optional, defaults to `https://api.poe.com/v1`)

## Running the Project
```bash
npm run dev
```
The app serves on port 5000.

## Environment Variables
- `BREVO_API_KEY` - Required for sending verification and welcome emails via Brevo
- `POE_API_KEY` - Poe API key (stored in Replit secrets)
- `POE_API_BASE_URL` - Optional override for Poe API base URL
- `DATABASE_URL` - PostgreSQL connection string (auto-managed by Replit)
- `STRIPE_SECRET_KEY` - Stripe secret API key
- `STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (client-side checkout)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret for `/api/stripe/webhook`
- `STRIPE_PLUS_PRICE_ID` - Stripe price ID for Plus subscription
- `STRIPE_ULTRA_PRICE_ID` - Stripe price ID for Ultra subscription
- `STRIPE_LIFETIME_PRICE_ID` - Stripe price ID for the lifetime (one-time) plan
- `APIFY_TOKEN` - Apify API token for job scraping (optional)
- `APIFY_X_ACTOR` - Actor ID for X/Twitter scraping (optional)
- `APIFY_REDDIT_ACTOR` - Actor ID for Reddit scraping (optional)
- `APIFY_FACEBOOK_ACTOR` - Actor ID for Facebook scraping (optional)

## Stripe Integration
Uses direct Stripe API integration for:
- Checkout sessions for subscription upgrades and lifetime purchases
- Billing portal for subscription management
- Webhook processing for subscription and payment updates

To create products, run: `npx tsx server/seed-products.ts`

## Recent Changes
- January 2026: Added SaaS subscription features
  - Two-tier subscription system (Free/Plus) with usage limits
  - Stripe integration via direct API with webhook handling
  - Usage tracking (skills count, jobs scraped per month)
  - Monthly usage reset with automatic detection
  - Account page redesign with subscription info, usage stats
  - Schedules page gated to Plus subscribers
  - Email verification enforcement on all dashboard APIs
  - Toast notification system for user feedback
  - Account deletion with Stripe subscription cancellation
- January 2026: Added email verification with Brevo integration
  - Registration now collects email address with validation
  - Verification emails sent via Brevo with branded templates
  - Welcome emails sent after successful verification
  - User-specific data storage (profiles, skills, jobs per user)
  - Verify email page at /verify-email
  - Schedules page starts empty (no mock data)
- January 2026: Added custom authentication system
  - Login and registration pages with form validation
  - Session-based authentication with secure password hashing (scrypt)
  - Protected routes redirect unauthenticated users to login
  - All API routes require authentication
  - User info displayed in sidebar footer with logout button
  - Redesigned sidebar with cleaner, modern layout
- January 2026: Added sidebar navigation
  - New AppSidebar and DashboardLayout components
  - Split dashboard into 5 pages: Home, My Jobs, Generator, Schedules, Account
  - Home shows stats (opportunities, value, saved, applied) and job finder
  - Standalone message generator page
  - Schedules page for recurring automated job scans
  - Account page with subscription management (Free/Pro/Enterprise plans)
  - Account tab positioned at bottom of sidebar
  - Fixed URL routing (no more /dashboard/dashboard duplication)
  - Consistent input sizes (h-10), normal font weight buttons
  - Removed "(Twitter)" text, platform logos with proper colors
- January 2026: Added AI-powered skill suggestions from personal introduction
  - New ProfileSetup component with intro textarea
  - POST /api/suggest-skills endpoint using OpenAI
  - Enhanced message generator uses user's intro for personalization
  - Updated UI with more rounded corners (0.75rem)
  - Fiverr/Upwork inspired design with green primary color
