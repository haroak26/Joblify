# AI-Powered Job Scraper Parameters

## Overview

This feature implements an intelligent system that generates optimal job scraper parameters based on user profiles. Instead of using hardcoded search terms, the system analyzes the user's skills, experience, and introduction to create personalized scraper configurations for Reddit and X/Twitter.

## Key Components

### 1. AI Parameter Generator (`server/aiParameterGenerator.ts`)

Generates scraper parameters using OpenAI/Poe API:
- Analyzes user skills and introduction
- Creates Reddit subreddit lists and search keywords
- Generates X/Twitter boolean search queries
- Falls back to rule-based generation if AI fails

### 2. Database Schema Updates (`shared/schema.ts`)

New fields in the `profiles` table:
- `scraperParameters` (jsonb) - Stores user-specific scraper configuration
- `parametersUpdatedAt` (timestamp) - Last parameter update time

### 3. API Endpoints (`server/routes.ts`)

- `GET /api/scraper-parameters` - Fetch user's scraper parameters
- `POST /api/scraper-parameters/generate` - Generate parameters using AI
- `POST /api/scraper-parameters` - Manually update parameters

### 4. Scraping Integration (`server/apify.ts`)

New function `scrapeJobsWithParameters()` that:
- Uses user-specific parameters instead of defaults
- Supports multiple queries per platform
- Maintains existing filtering and validation logic

### 5. Storage Service (`server/storage.ts`)

New methods:
- `getScraperParameters(userId)` - Retrieve parameters with validation
- `setScraperParameters(userId, parameters)` - Store parameters
- Updated `scrapeAndGenerateJobs()` to use custom parameters

## Deployment

### Prerequisites

1. Ensure OpenAI/Poe API key is configured:
   ```bash
   export POE_API_KEY="your-api-key"
   # or
   export OPENAI_API_KEY="your-api-key"
   ```

2. Apply database migration:
   ```bash
   npm run db:push
   ```
   Or manually run:
   ```sql
   ALTER TABLE "profiles" ADD COLUMN "scraper_parameters" jsonb;
   ALTER TABLE "profiles" ADD COLUMN "parameters_updated_at" timestamp;
   ```

### Automatic Parameter Generation

Parameters are automatically generated when:
1. User updates their profile with skills and intro (>= 20 chars)
2. Skills are changed
3. Intro is changed for the first time

This happens in the background and doesn't block the user.

### Manual Parameter Generation

Users can manually trigger parameter generation via API:

```bash
POST /api/scraper-parameters/generate
Authorization: Required (logged in user)
```

Response:
```json
{
  "parameters": {
    "reddit": {
      "subreddits": ["forhire", "freelance", "reactjs"],
      "searchKeywords": ["hiring react developer", "need frontend engineer"],
      "sort": "new",
      "timeFilter": "week"
    },
    "x": {
      "queries": [
        "(hiring OR looking for) (react developer) -retweet"
      ],
      "filters": {
        "links": "only",
        "verified": "",
        "safe": "on"
      }
    }
  }
}
```

## Usage Flow

1. **User completes profile** → Parameters auto-generated in background
2. **User clicks "Find Jobs"** → System checks for custom parameters
3. **Scraping executes**:
   - If custom parameters exist → Use `scrapeJobsWithParameters()`
   - If no parameters → Fall back to default `scrapeJobsForSkills()`
4. **Results returned** → User sees jobs matching their specific parameters

## Parameter Structure

### Reddit Parameters
```typescript
{
  subreddits: string[];        // Target subreddits to search
  searchKeywords: string[];    // Search terms combining skills + hiring keywords
  sort: "new" | "hot" | "top" | "relevance";
  timeFilter: "hour" | "day" | "week" | "month" | "year" | "all";
}
```

### X/Twitter Parameters
```typescript
{
  queries: string[];           // Boolean search queries
  filters: {
    links: "only" | "none" | "";     // Filter by link presence
    verified: "only" | "none" | "";  // Filter by verification status
    safe: "on" | "off" | "";        // Safe search filter
  }
}
```

## Example Scenarios

### Scenario 1: React Developer
**Profile:**
- Skills: React, TypeScript, Node.js
- Intro: "Full-stack developer with 5 years experience"

**Generated Parameters:**
```json
{
  "reddit": {
    "subreddits": ["forhire", "freelance", "reactjs", "webdev", "programmingjobs"],
    "searchKeywords": [
      "hiring react developer",
      "need typescript developer",
      "looking for fullstack"
    ],
    "sort": "new",
    "timeFilter": "week"
  },
  "x": {
    "queries": [
      "(hiring OR looking for) (react developer OR frontend engineer) -retweet",
      "freelance (typescript OR node.js) remote -retweet"
    ],
    "filters": {
      "links": "only",
      "verified": "",
      "safe": "on"
    }
  }
}
```

### Scenario 2: UI/UX Designer
**Profile:**
- Skills: Figma, UI Design, UX Research
- Intro: "Creative designer specializing in mobile apps"

**Generated Parameters:**
```json
{
  "reddit": {
    "subreddits": ["forhire", "freelance", "design_critiques", "graphic_design"],
    "searchKeywords": [
      "hiring ui designer",
      "need ux designer",
      "looking for figma"
    ],
    "sort": "new",
    "timeFilter": "week"
  },
  "x": {
    "queries": [
      "(hiring OR looking for) (ui designer OR ux designer) -retweet",
      "freelance (figma OR design) remote -retweet"
    ],
    "filters": {
      "links": "only",
      "verified": "",
      "safe": "on"
    }
  }
}
```

## Monitoring & Debugging

### Logging
The system logs:
- Parameter generation attempts
- Scraping with custom vs. default parameters
- Fallback to rule-based generation
- API errors

Check logs for:
```
"Using custom scraper parameters for user {userId}"
"Using default scraping for user {userId}"
"Error generating scraper parameters:"
```

### Testing Parameter Generation

Test the AI generator directly:
```javascript
import { generateScraperParameters } from './server/aiParameterGenerator';

const params = await generateScraperParameters(
  ["React", "TypeScript"],
  "I'm a full-stack developer",
  "mid-level",
  "Remote",
  "Short-term contracts"
);
console.log(params);
```

## Fallback Behavior

If AI parameter generation fails:
1. System logs the error
2. Falls back to rule-based parameter generation
3. Uses predefined subreddit lists
4. Generates basic keyword combinations
5. User still gets scraping functionality

## Performance Considerations

- Parameter generation happens in background (non-blocking)
- Parameters cached in database (no regeneration on every scrape)
- Only regenerates when skills change or first intro update
- Fallback mechanism ensures reliability

## Future Enhancements

Potential improvements:
1. User-facing UI to preview and edit parameters
2. Parameter testing/preview feature
3. Analytics on parameter effectiveness
4. Automatic parameter refinement based on results
5. Location-based parameter customization
6. Experience level-specific adjustments

## Troubleshooting

### Issue: Parameters not being generated
- Check if POE_API_KEY or OPENAI_API_KEY is set
- Verify user has both skills and intro (>= 20 chars)
- Check logs for API errors

### Issue: Scraping returns zero results
- Check if parameters were generated successfully
- Verify API keys for Apify scrapers are set
- Check if subreddits and queries are valid
- System will fall back to default scraping

### Issue: Database migration failed
- Manually run migration SQL
- Check database permissions
- Verify PostgreSQL version compatibility
