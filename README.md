# Joblify - Freelance Job Discovery Platform

Joblify is an intelligent job discovery platform that automatically scrapes and matches freelance opportunities from X (Twitter) and Reddit based on your skills and experience.

## Features

- 🔍 **Multi-Platform Scraping**: Automatically scrapes job postings from X and Reddit
- 🎯 **Smart Filtering**: Filters out freelancer advertisements, showing only client job postings
- 🤖 **AI-Powered Matching**: Matches jobs to your skills and experience
- 📧 **Email Notifications**: Get notified when new jobs matching your profile are found
- ⏰ **Scheduled Searches**: Set up automated job searches on your schedule
- 💾 **Job Management**: Save jobs, track applications, and manage your pipeline
- 🚀 **AI Message Generation**: Generate personalized application messages with AI

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Database**: PostgreSQL with Drizzle ORM
- **Job Scraping**: Apify platform
- **AI**: OpenAI GPT (or Poe API)
- **Email**: Brevo (SendinBlue)
- **Payments**: Stripe

## Setup Instructions

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database
- Apify account (for job scraping)
- OpenAI API key (for AI features)
- Brevo account (for email notifications)
- Stripe account (for payments, optional for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/haroak26/Joblify-Freelance.git
   cd Joblify-Freelance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your configuration:
   
   **Required variables:**
   - `DATABASE_URL`: PostgreSQL connection string
   - `SESSION_SECRET`: Random string for session encryption
   - `APIFY_API_TOKEN`: Your Apify API token ([Get it here](https://console.apify.com/account/integrations))
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `BREVO_API_KEY`: Your Brevo API key
   - `BREVO_SENDER_EMAIL`: Email address for notifications
   
   **Optional variables:**
   - `APIFY_ENABLE_X`: Enable/disable X scraper (default: enabled)
   - `STRIPE_SECRET_KEY`: For payment processing
   - See `.env.example` for all options

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5000`

6. **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Environment Variables

See `.env.example` for a complete list of environment variables and their descriptions.

### Key Configuration

#### Job Scraping Sources

The platform scrapes jobs from:
- **Reddit**: Subreddits including r/hiring, r/forhire, r/slavelabour, r/freelance, r/designjobs, r/programmingjobs
- **X (Twitter)**: Search-based scraping using hiring-related keywords

**Important**: The platform automatically filters out "[For Hire]" posts (freelancers advertising) and only shows actual job postings from clients.

#### X (Twitter) Scraper

- Enabled by default
- To disable: Set `APIFY_ENABLE_X=false`
- Searches for: "hiring", "looking for", "freelance", "contract", etc.
- Requires Apify token

#### Apify Configuration

Apify is used for web scraping. You'll need:
1. Sign up at [apify.com](https://apify.com)
2. Get your API token from [console.apify.com/account/integrations](https://console.apify.com/account/integrations)
3. Add it to your `.env` file as `APIFY_API_TOKEN`

Optional Apify settings:
- `APIFY_ACTOR_X`: Override default X scraper actor
- `APIFY_ACTOR_REDDIT`: Override default Reddit scraper actor
- `APIFY_USE_PROXY`: Enable proxy usage
- `APIFY_PROXY_GROUPS`: Comma-separated proxy groups

## Usage

1. **Create an account** and verify your email
2. **Set up your profile**:
   - Add your skills (React, Python, Design, etc.)
   - Write a short intro about your experience
3. **Search for jobs**:
   - Click "Search Jobs" to manually trigger a search
   - Or set up automated schedules (requires Plus/Ultra/Lifetime plan)
4. **Manage opportunities**:
   - Save interesting jobs
   - Mark jobs as applied
   - Generate AI-powered application messages

## Subscription Plans

- **Free**: Limited monthly searches
- **Plus**: More searches, automated schedules
- **Ultra**: Higher limits, priority support
- **Lifetime**: Unlimited access forever

See the app's pricing page for current limits and pricing.

## Development

### Project Structure

```
.
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── pages/          # Page components
│       └── lib/            # Utilities
├── server/                 # Express backend
│   ├── apify.ts           # Job scraping logic
│   ├── storage.ts         # Database operations
│   ├── routes.ts          # API routes
│   ├── scheduler.ts       # Automated job searches
│   └── brevo.ts           # Email service
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Drizzle schema
└── migrations/            # Database migrations
```

### Key Files

- **`server/apify.ts`**: Web scraping configuration and job processing
- **`server/storage.ts`**: All database operations
- **`server/routes.ts`**: API endpoints
- **`shared/schema.ts`**: Database schema and TypeScript types

### Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm start`: Run production server
- `npm run check`: TypeScript type checking
- `npm run db:push`: Push database schema changes

## Troubleshooting

### Jobs not appearing

1. Check that `APIFY_API_TOKEN` is set correctly
2. Verify your Apify account has credits
3. Check console logs for scraping errors
4. Ensure your profile has skills and intro text

### X scraper returning 0 results

1. X scraper is enabled by default - verify `APIFY_ENABLE_X` is not set to 'false'
2. Check that Apify token is valid
3. Review console logs for errors
4. Try different skill keywords

### Email notifications not working

1. Verify `BREVO_API_KEY` is set
2. Check `BREVO_SENDER_EMAIL` is verified in Brevo
3. Check spam folder
4. Review Brevo dashboard for delivery status

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Open a GitHub issue
- Contact: harryoak35@gmail.com

---

Built with ❤️ for freelancers finding their next opportunity
