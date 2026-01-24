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
- In-memory storage for profile and jobs
- API endpoints for CRUD operations
- OpenAI integration for skill suggestions and message generation

### Key Components
- `AppSidebar` - Navigation sidebar with Home, My Jobs, Generator, Account
- `DashboardLayout` - Wrapper with sidebar and header
- `ProfileSetup` - Introduction textarea with AI skill suggestions + manual skill management
- `JobCard` - Display job listings with save and generate message actions
- `JobFilters` - Search and filter jobs by source/status
- `MessageGenerator` - AI-powered personalized follow-up messages with tone selection

## API Routes

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
4. **Multi-Platform Discovery** - Simulated jobs from Reddit, X, and Facebook
5. **Smart Filtering** - Filter by source, status, or search
6. **AI Message Generation** - Personalized messages with tone selection (professional/friendly/enthusiastic)
7. **Job Tracking** - Save and mark jobs as applied
8. **Dark Mode** - Full dark mode support

## OpenAI Integration
Uses Replit AI Integrations with gpt-4o-mini model for:
- Suggesting skills from user's introduction
- Generating personalized follow-up messages

Environment variables (auto-managed by Replit):
- `AI_INTEGRATIONS_OPENAI_API_KEY`
- `AI_INTEGRATIONS_OPENAI_BASE_URL`

## Running the Project
```bash
npm run dev
```
The app serves on port 5000.

## Recent Changes
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
