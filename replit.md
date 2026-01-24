# Joblify - Freelance Job Discovery Platform

## Overview
Joblify is a freelance job platform that simulates scraping Reddit, X (Twitter), and Facebook for freelance hiring opportunities. Users can add their skills and receive matching job listings, then generate personalized follow-up messages to apply.

## Project Architecture

### Frontend (React + Vite)
- **Landing Page** (`/`) - Marketing page with platform overview
- **Dashboard** (`/dashboard`) - Main application with skills management and job discovery

### Backend (Express)
- In-memory storage for skills and jobs
- API endpoints for CRUD operations
- Message generation for job applications

### Key Components
- `SkillsManager` - Add/remove skills with suggestions
- `JobCard` - Display job listings with actions
- `JobFilters` - Search and filter jobs by source/status
- `MessageGenerator` - Generate personalized follow-up messages

## API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/skills` | Get user's skills |
| POST | `/api/skills` | Save skills (triggers job matching) |
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
- **Medium rounded corners** (rounded-md)

### Typography
- Font: Inter
- Clean, professional hierarchy

## Features
1. **Skill-Based Matching** - Add skills to see relevant opportunities
2. **Multi-Platform Discovery** - Jobs from Reddit, X, and Facebook
3. **Smart Filtering** - Filter by source, status, or search
4. **Message Generation** - AI-powered personalized messages with tone selection
5. **Job Tracking** - Save and mark jobs as applied
6. **Dark Mode** - Full dark mode support

## Running the Project
```bash
npm run dev
```
The app serves on port 5000.

## Recent Changes
- January 2026: Initial build with complete MVP features
  - Landing page with Fiverr/Upwork inspired design
  - Dashboard with skills management
  - Job feed with filtering
  - Message generator with tone options
  - Theme toggle (light/dark mode)
