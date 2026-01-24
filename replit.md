# Joblify

## Overview

Joblify is a freelance job discovery platform that scans social media (Reddit, X/Twitter, Facebook) to find freelance opportunities matching user skills. The application provides skill-based job matching, job filtering/searching, and AI-powered outreach message generation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite with HMR support
- **Theme**: Light/dark mode with CSS variables and Fiverr/Upwork-inspired green color scheme

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful JSON APIs under `/api/*` prefix
- **Development**: Vite dev server proxied through Express for HMR

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` with Zod validation via drizzle-zod
- **Migrations**: Drizzle Kit for schema migrations (`db:push` command)
- **Current Storage**: In-memory storage implementation with sample data (database integration ready)

### Key Data Models
- **Users**: Authentication with username/password
- **Skills**: User-defined skills for job matching
- **JobPosts**: Scraped job opportunities with source, budget, matched skills, save/apply status

### API Endpoints
- `GET/POST /api/skills` - Manage user skills
- `GET /api/jobs` - Retrieve matched job listings
- `POST /api/jobs/:id/save` - Save job for later
- `POST /api/jobs/:id/apply` - Mark job as applied
- `POST /api/messages/generate` - AI message generation (placeholder)

### Build System
- **Development**: `npm run dev` - tsx for TypeScript execution with Vite HMR
- **Production Build**: Custom esbuild script bundles server, Vite builds client
- **Output**: Server as CJS bundle in `dist/index.cjs`, client in `dist/public`

## External Dependencies

### UI Components
- **shadcn/ui**: Full component library (Radix UI primitives + Tailwind)
- **Lucide React**: Icon library
- **react-icons**: Additional platform icons (Reddit, Facebook, etc.)

### Database & Validation
- **PostgreSQL**: Primary database (via DATABASE_URL environment variable)
- **Drizzle ORM**: Type-safe database queries
- **Zod**: Runtime schema validation

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner for Replit environment
- **PostCSS/Autoprefixer**: CSS processing

### Session Management
- **connect-pg-simple**: PostgreSQL session store (configured but not actively used)
- **express-session**: Session middleware support