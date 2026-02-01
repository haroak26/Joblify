# Joblify - Freelance Job Discovery Platform

Joblify is an intelligent job discovery platform designed to help freelancers manage and track job opportunities based on their skills and experience.

## Features

- 🎯 **Job Management**: Save jobs, track applications, and manage your pipeline
- 🤖 **AI-Powered Matching**: View jobs matched to your skills and experience
- 📧 **Email Notifications**: Get notified when new jobs are added
- ⏰ **Scheduled Searches**: Set up automated job searches on your schedule
- 🚀 **AI Message Generation**: Generate personalized application messages with AI
- 💼 **Subscription Plans**: Multiple tiers with different features and limits

## Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Database**: PostgreSQL with Drizzle ORM
- **AI**: OpenAI GPT (or Poe API)
- **Email**: Brevo (SendinBlue)
- **Payments**: Stripe

## Setup Instructions

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database
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
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `BREVO_API_KEY`: Your Brevo API key
   - `BREVO_SENDER_EMAIL`: Email address for notifications
   
   **Optional variables:**
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

## How It Works

## Usage

1. **Create an account** and verify your email
2. **Set up your profile**:
   - Add your skills (React, Python, Design, etc.)
   - Write a short intro about your experience
3. **Manage opportunities**:
   - View and save interesting jobs
   - Mark jobs as applied
   - Generate AI-powered application messages
4. **Set up schedules** (requires Plus/Ultra/Lifetime plan):
   - Automate periodic updates

## Subscription Plans

- **Free**: Limited features
- **Plus**: More features, automated schedules
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
│   ├── storage.ts         # Database operations
│   ├── routes.ts          # API routes
│   ├── scheduler.ts       # Automated schedules
│   └── brevo.ts           # Email service
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Drizzle schema
└── migrations/            # Database migrations
```

### Key Files

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

1. Ensure your profile has skills and intro text
2. Check console logs for any errors
3. Verify database connection

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
