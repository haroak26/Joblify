# Joblify Resume Builder

**Build your perfect resume with AI** - Joblify is an AI-powered resume builder that helps you create professional resumes through natural conversation. No complicated forms, just chat naturally and watch your resume come to life.

## ✨ Features

### 🔐 Flexible Authentication
- Email/password authentication with strong password requirements
- **OAuth 2.0 Support**: Sign in with Google or Apple
- Email verification system
- Two-factor authentication (2FA) support
- Password reset functionality
- Secure session management

### 🤖 AI Chat Builder
- Create resumes through natural conversation with Claude 3.5 Haiku
- AI extracts structured information from your responses
- Get professional suggestions and improvements in real-time
- Build your resume section by section with guided prompts

### 📄 Professional Resume Editor
- Visual editor with live preview
- Multiple professional templates (Modern, Classic, Creative)
- Drag-and-drop section reordering
- Real-time updates as you type
- Support for multiple resumes per account

### 🔍 ATS Scanner
- Upload and analyze existing resumes (PDF/DOCX)
- Get ATS compatibility score (0-100)
- Identify missing keywords and optimization opportunities
- AI-powered suggestions to improve ATS compatibility

### ✍️ AI-Powered Enhancements
- **Content Improvement**: Rewrite bullet points professionally
- **Keyword Optimization**: Get industry-specific keyword suggestions
- **Grammar Check**: Fix errors and improve clarity
- **Tone Adjustment**: Switch between professional, creative, or technical tones

### 📧 Cover Letter Generator
- Generate personalized cover letters from resume data
- Customize tone (professional, enthusiastic, creative)
- Edit and refine AI-generated content
- Save and manage multiple cover letters

### 📥 Easy Export
- Download resumes as PDF (all plans)
- Export as DOCX (Plus and above)
- Print-friendly formatting
- Custom filename support

## 💎 Pricing Plans

| Feature | Free | Plus ($15/mo) | Ultra ($30/mo) | Lifetime ($100) |
|---------|------|--------------|----------------|-----------------|
| **Resumes** | 1 | 5 | Unlimited | Unlimited |
| **AI Edits/Month** | 5 | 100 | Unlimited | Unlimited |
| **Templates** | Basic | All | All | All |
| **PDF Export** | ✅ | ✅ | ✅ | ✅ |
| **DOCX Export** | ❌ | ✅ | ✅ | ✅ |
| **ATS Scanner** | ❌ | ✅ | ✅ | ✅ |
| **Cover Letters** | ❌ | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ✅ | ✅ | ✅ |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Poe API key (for AI features)
- Stripe account (for payments, optional)
- Brevo account (for email notifications, optional)

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

Edit `.env` and configure:
```env
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@localhost:5432/joblify

# Session secret (REQUIRED)
SESSION_SECRET=your-random-secret-here

# Two-factor authentication encryption key (REQUIRED)
# Generate with: openssl rand -hex 32
TWO_FACTOR_ENCRYPTION_KEY=your-random-2fa-encryption-key-here

# Poe API for AI features (REQUIRED)
POE_API_KEY=your-poe-api-key
POE_API_BASE_URL=https://api.poe.com/v1

# Stripe (optional - for payments)
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID_PLUS=price_xxx
STRIPE_PRICE_ID_ULTRA=price_xxx
STRIPE_PRICE_ID_LIFETIME=price_xxx

# Brevo (optional - for emails)
BREVO_API_KEY=your-brevo-key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
BREVO_SENDER_NAME=Joblify

# Analytics (optional - for product analytics)
VITE_POSTHOG_API_KEY=your-posthog-api-key
VITE_POSTHOG_HOST=https://app.posthog.com

# Customer Support (optional - for customer support widget)
VITE_ZENDESK_KEY=your-zendesk-key
VITE_ZENDESK_SUBDOMAIN=your-subdomain

# OAuth (optional - for social login)
# See OAUTH_SETUP.md for detailed setup instructions
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY=your-apple-private-key

# Application Configuration
BASE_URL=http://localhost:5000
PORT=5000
NODE_ENV=development
```

### Environment Variable Documentation

#### Required Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Random string for session encryption (generate with `openssl rand -base64 32`)
- `TWO_FACTOR_ENCRYPTION_KEY`: Encryption key for 2FA secrets (generate with `openssl rand -hex 32`)
- `POE_API_KEY`: API key for AI features (get from https://poe.com/)

#### Optional Variables
- **Stripe** (for payments): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs
- **Brevo** (for email notifications): `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`
- **PostHog** (for analytics): `VITE_POSTHOG_API_KEY`, `VITE_POSTHOG_HOST`
- **Zendesk** (for customer support): `VITE_ZENDESK_KEY`, `VITE_ZENDESK_SUBDOMAIN`
- **OAuth** (for social login): See [OAUTH_SETUP.md](./OAUTH_SETUP.md) for detailed setup instructions

**Note:** Variables prefixed with `VITE_` are exposed to the client-side application.

4. **Run database migrations**
```bash
npm run db:push
```

5. **Start development server**
```bash
npm run dev
```

The app will be available at `http://localhost:5000`

### Production Build
```bash
npm run build
npm start
```

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Wouter** - Routing
- **TanStack Query** - Data fetching
- **Radix UI** - Accessible components

### Backend
- **Express** - Web server
- **PostgreSQL** - Database
- **Drizzle ORM** - Type-safe database queries
- **Passport** - Authentication
- **Stripe** - Payments
- **Poe API (Claude 3.5 Haiku)** - AI features

### Document Processing
- **PDFKit** - PDF generation
- **docx** - DOCX generation
- **pdf-parse** - PDF parsing
- **mammoth** - DOCX parsing

## 📁 Project Structure

```
├── client/                 # Frontend React app
│   └── src/
│       ├── components/    # Reusable UI components
│       ├── pages/         # Page components
│       │   └── dashboard/ # Dashboard pages
│       └── hooks/         # Custom React hooks
├── server/                # Backend Express server
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   ├── stripe.ts         # Payment processing
│   └── auth.ts           # Authentication
├── shared/               # Shared code between client/server
│   └── schema.ts         # Database schema & types
└── migrations/           # Database migrations
```

## 🔑 Key API Endpoints

### Resume Management
- `GET /api/resumes` - List all resumes
- `POST /api/resumes` - Create new resume
- `GET /api/resumes/:id` - Get resume details
- `PUT /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

### AI Chat
- `POST /api/chat/resume/:id/message` - Send chat message
- `GET /api/chat/resume/:id/history` - Get conversation history

### AI Enhancements
- `POST /api/ai/improve-content` - Improve content
- `POST /api/ai/suggest-keywords` - Get keywords
- `POST /api/ai/check-grammar` - Grammar check
- `POST /api/ai/adjust-tone` - Adjust tone

### ATS & Export
- `POST /api/ats/scan` - Scan uploaded resume
- `POST /api/ats/analyze` - Analyze resume
- `POST /api/export/pdf/:id` - Export as PDF
- `POST /api/export/docx/:id` - Export as DOCX

### Cover Letters
- `POST /api/cover-letter/generate` - Generate cover letter
- `GET /api/cover-letters` - List cover letters
- `GET /api/cover-letter/:id` - Get cover letter
- `PUT /api/cover-letter/:id` - Update cover letter

### GDPR/CCPA Privacy Rights
- `GET /api/user/data-export` - Export all user data (JSON)
- `GET /api/user/data-summary` - View data collection summary
- `POST /api/user/consent-withdraw` - Withdraw consent for data processing

### Account Management
- `DELETE /api/account` - Delete account and all data
- `GET /api/subscription` - Get subscription details
- `GET /api/usage` - Get usage statistics

## 🎨 Design System

- **Primary Color**: Green (#1B9C5D)
- **Font**: Inter
- **Border Radius**: 0.75rem (12px)
- **Design Philosophy**: Clean, professional, no gradients or shadows
- **Dark Mode**: Full support

## 🔒 Security

- Session-based authentication with secure cookies
- Password hashing with bcrypt
- SQL injection prevention via Drizzle ORM
- XSS prevention with React
- File upload validation (size & type)
- Rate limiting on AI endpoints
- Plan limit enforcement

## 📝 Environment Variables

See `.env.example` for all available configuration options.

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `POE_API_KEY` - Poe API key for AI features

**Optional:**
- `STRIPE_*` - Stripe configuration for payments
- `BREVO_*` - Brevo configuration for emails
- `PORT` - Server port (default: 5000)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@joblify.com or open an issue on GitHub.

## 🙏 Acknowledgments

- Claude 3.5 Haiku by Anthropic via Poe API
- Radix UI for accessible components
- Tailwind CSS for styling system
- All open-source contributors

---

Built with ❤️ using AI-powered resume building technology
