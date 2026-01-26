# Joblify - Freelance Job Discovery Platform

## Overview
Joblify is a freelance job platform that simulates scraping Reddit, X (Twitter), and Facebook for freelance hiring opportunities. Users can add their skills and receive matching job listings, then generate personalized follow-up messages to apply.

## Project Architecture

### Frontend (React + Vite)
- **Landing Page** (`/`) - Marketing page with platform overview
- **Dashboard** with sidebar navigation:
  - **Home** (`/dashboard`) - Overview with stats, job finder, and profile setup
  - **My Jobs** (`/dashboard/jobs`) - Browse and manage job opportunities
  - **Generator** (`/dashboard/generator`) - Standalone AI message generator
  - **Schedules** (`/dashboard/schedules`) - Recurring automated job scans
  - **Account** (`/dashboard/account`) - Profile, subscription, and settings management (at sidebar bottom)

### Backend (Express)
- PostgreSQL database with Drizzle ORM
- API endpoints for CRUD operations
- OpenAI integration for skill suggestions and message generation
- Stripe integration for subscription payments (via Replit connector)
- Apify integration for job scraping from social platforms

### Key Components
- `AppSidebar` - Navigation sidebar with Home, My Jobs, Generator, Account
- `DashboardLayout` - Wrapper with sidebar and header
- `ProfileSetup` - Introduction textarea with AI skill suggestions + manual skill management
- `JobCard` - Display job listings with save and generate message actions
- `JobFilters` - Search and filter jobs by source/status
- `MessageGenerator` - AI-powered personalized follow-up messages with tone selection

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

### Protected Routes (Require Authentication)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile (intro + skills) |
| POST | `/api/profile` | Save profile and trigger job matching |
| GET | `/api/skills` | Get user's skills |
| POST | `/api/skills` | Save skills (triggers job matching) |
| POST | `/api/suggest-skills` | AI suggests skills from intro text |
| GET | `/api/jobs` | Get matched job listings |
| POST | `/api/jobs/refresh` | Refresh job listings |
| POST | `/api/jobs/:id/save` | Toggle save status |
| POST | `/api/jobs/:id/apply` | Mark as applied |
| POST | `/api/generate-message` | Generate follow-up message |
| GET | `/api/subscription` | Get user subscription details and limits |
| GET | `/api/usage` | Get current usage stats and remaining limits |
| POST | `/api/stripe/create-checkout` | Create Stripe checkout session for upgrade |
| POST | `/api/stripe/cancel` | Cancel subscription at period end |
| GET | `/api/stripe/portal` | Get Stripe billing portal URL |
| DELETE | `/api/account` | Delete user account and all data |

## Design System

### Colors
- **Primary**: Green (#1B9C5D) inspired by Fiverr/Upwork
- **Background**: Clean white/dark mode support
- **No gradients, no shadows** as per requirements
- **Rounded corners**: 0.75rem (12px) for cards and buttons

### Typography
- Font: Inter
- Clean, professional hierarchy

## Features
1. **Personal Introduction** - Write about yourself to help AI understand your background
2. **AI Skill Suggestions** - Get skill recommendations based on your intro using GPT-4o-mini
3. **Skill-Based Matching** - Add skills to see relevant opportunities from sample data
4. **Multi-Platform Discovery** - Jobs from Reddit, X, and Facebook via Apify scraping
5. **Smart Filtering** - Filter by source, status, or search
6. **AI Message Generation** - Personalized messages with tone selection (professional/friendly/enthusiastic)
7. **Job Tracking** - Save and mark jobs as applied
8. **Dark Mode** - Full dark mode support
9. **Two-Tier Subscription System**:
   - **Free Plan**: 5 skills max, 5 job scrapes/month
   - **Plus Plan ($19/mo)**: Unlimited skills, 300 job scrapes/month, schedule access
10. **Email Verification** - Required before accessing dashboard features
11. **Stripe Payments** - Secure subscription billing via Stripe
12. **Account Management** - View usage, upgrade/cancel subscription, delete account

## AI Integration (Poe)
Uses Poe's OpenAI-compatible API with the gpt-5-nano model for:
- Suggesting skills from user's introduction
- Generating personalized follow-up messages

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
- `STRIPE_PLUS_PRICE_ID` - Stripe price ID for Plus subscription
- `APIFY_TOKEN` - Apify API token for job scraping (optional)
- `APIFY_X_ACTOR` - Actor ID for X/Twitter scraping (optional)
- `APIFY_REDDIT_ACTOR` - Actor ID for Reddit scraping (optional)
- `APIFY_FACEBOOK_ACTOR` - Actor ID for Facebook scraping (optional)

## Stripe Integration
Uses Replit Stripe connector with stripe-replit-sync for:
- Automatic schema creation and data sync
- Managed webhooks
- Checkout sessions for subscription upgrades
- Billing portal for subscription management

To create products, run: `npx tsx server/seed-products.ts`

## Recent Changes
- January 2026: Added SaaS subscription features
  - Two-tier subscription system (Free/Plus) with usage limits
  - Stripe integration via Replit connector with stripe-replit-sync
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
