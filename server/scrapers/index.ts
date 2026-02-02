import { scrapeRedditJobs } from './reddit';
import { scrapeXJobs } from './x';
import type { Skill, JobPost } from '@shared/schema';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';

// Validate API key is available
const apiKey = process.env.POE_API_KEY;
if (!apiKey) {
  console.warn('WARNING: No POE API key found. AI features will not work.');
}

const openai = new OpenAI({ 
  apiKey: apiKey || 'dummy-key-for-graceful-degradation',
  baseURL: process.env.POE_API_BASE_URL ?? "https://api.poe.com/v1"
});

interface ScraperParameters {
  redditQuery: string;
  redditSubreddits: string;
  xQuery: string;
}

/**
 * Generate optimal search parameters from user intro and skills using AI
 */
export async function generateScraperParameters(intro: string, skills: Skill[]): Promise<ScraperParameters> {
  const skillNames = skills.map(s => s.name).join(', ');
  
  const prompt = `You are a search query optimizer for finding freelance hiring posts (people looking to HIRE freelancers, NOT job seekers).

User Profile:
Introduction: ${intro}
Skills: ${skillNames}

Generate optimized search queries for Reddit and X (Twitter) to find posts from people/companies looking to hire freelancers with these skills.

CRITICAL: Focus on HIRING posts (e.g., "looking for", "need a", "hiring") NOT job seeking posts (e.g., "available for hire", "offering services", "looking for work").

Return a JSON object with:
{
  "redditQuery": "search query for Reddit (focus on hiring keywords)",
  "redditSubreddits": "comma-separated subreddit names (forhire, freelance_forhire, etc.)",
  "xQuery": "search query for X/Twitter (focus on hiring keywords)"
}

Make queries specific to the user's skills but focused on HIRING opportunities.`;

  try {
    console.log('[Scraper] Generating search parameters with AI');
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const params = JSON.parse(response.choices[0].message.content || '{}');
    console.log('[Scraper] AI-generated parameters:', params);
    
    return {
      redditQuery: params.redditQuery || `hiring ${skills[0]?.name || 'freelance'}`,
      redditSubreddits: params.redditSubreddits || 'forhire+freelance_forhire',
      xQuery: params.xQuery || `hiring ${skills[0]?.name || 'freelance'} freelance`
    };
  } catch (error) {
    console.error('[Scraper] Error generating scraper parameters:', error);
    // Fallback to simple defaults
    const fallbackParams = {
      redditQuery: `hiring ${skills[0]?.name || 'freelance'}`,
      redditSubreddits: 'forhire+freelance_forhire',
      xQuery: `hiring ${skills[0]?.name || 'freelance'} freelance`
    };
    console.log('[Scraper] Using fallback parameters:', fallbackParams);
    return fallbackParams;
  }
}

/**
 * Parse and normalize scraped data into JobPost format
 */
function parseRedditJob(item: any, userSkills: Skill[]): JobPost | null {
  if (!item.title || !item.url) return null;
  
  // Filter out job seeking posts - look for specific patterns indicating someone is offering their services
  const title = item.title.toLowerCase();
  const text = (item.selftext || '').toLowerCase();
  const fullText = title + ' ' + text;
  
  // Patterns that indicate job seeking (offering services)
  const seekingPatterns = [
    /\b(?:i am|i'm|we are|we're)\s+(?:available for hire|for hire|offering)/i,
    /\blooking for (?:work|gigs|projects|clients)/i,
    /\boffering (?:my |our )?services/i,
  ];
  
  if (seekingPatterns.some(pattern => pattern.test(fullText))) return null;
  
  const matchedSkills = userSkills
    .filter(skill => 
      item.title?.toLowerCase().includes(skill.name.toLowerCase()) ||
      item.selftext?.toLowerCase().includes(skill.name.toLowerCase())
    )
    .map(s => s.name);
  
  if (matchedSkills.length === 0) return null;
  
  return {
    id: randomUUID(),
    title: item.title,
    description: item.selftext || item.title,
    source: 'reddit',
    sourceUrl: item.url,
    author: item.author || 'unknown',
    authorHandle: item.author,
    postedAt: new Date(item.created_utc * 1000).toISOString(),
    matchedSkills,
    budget: extractBudget(item.title + ' ' + (item.selftext || '')),
    isRemote: true,
    saved: false,
    applied: false,
    relevanceScore: matchedSkills.length,
    rawData: item,
    scrapedAt: new Date()
  };
}

function parseXJob(item: any, userSkills: Skill[]): JobPost | null {
  if (!item.text || !item.url) return null;
  
  // Filter out job seeking posts - look for specific patterns indicating someone is offering their services
  const text = item.text.toLowerCase();
  
  // Patterns that indicate job seeking (offering services)
  const seekingPatterns = [
    /\b(?:i am|i'm|we are|we're)\s+(?:available for hire|for hire|offering)/i,
    /\blooking for (?:work|gigs|projects|clients)/i,
    /\boffering (?:my |our )?services/i,
  ];
  
  if (seekingPatterns.some(pattern => pattern.test(text))) return null;
  
  const matchedSkills = userSkills
    .filter(skill => item.text?.toLowerCase().includes(skill.name.toLowerCase()))
    .map(s => s.name);
  
  if (matchedSkills.length === 0) return null;
  
  return {
    id: randomUUID(),
    title: item.text.substring(0, 100) + (item.text.length > 100 ? '...' : ''),
    description: item.text,
    source: 'x',
    sourceUrl: item.url,
    author: item.author?.name || 'unknown',
    authorHandle: item.author?.userName,
    postedAt: new Date(item.createdAt).toISOString(),
    matchedSkills,
    budget: extractBudget(item.text),
    isRemote: true,
    saved: false,
    applied: false,
    relevanceScore: matchedSkills.length,
    rawData: item,
    scrapedAt: new Date()
  };
}

function extractBudget(text: string): string | undefined {
  const budgetPatterns = [
    /\$\d+(?:,\d{3})*(?:\.\d{2})?(?:\s*-\s*\$?\d+(?:,\d{3})*(?:\.\d{2})?)?/,
    /\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|usd|dollars?)/,
    /\$\d+(?:k|K)/
  ];
  
  for (const pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  return undefined;
}

/**
 * Main scraping function - returns max 5 jobs per run
 */
export async function scrapeJobs(intro: string, skills: Skill[]): Promise<JobPost[]> {
  if (!skills.length) {
    console.log('[Scraper] No skills provided, returning empty results');
    return [];
  }
  
  console.log('[Scraper] Starting job scraping - skills count:', skills.length);
  
  const params = await generateScraperParameters(intro, skills);
  console.log('[Scraper] Generated parameters:', params);
  
  const [redditResults, xResults] = await Promise.allSettled([
    scrapeRedditJobs({
      searchQuery: params.redditQuery,
      subreddit: params.redditSubreddits,
      maxPosts: 5
    }),
    scrapeXJobs({
      query: params.xQuery,
      maxItems: 5
    })
  ]);
  
  const allJobs: JobPost[] = [];
  
  if (redditResults.status === 'fulfilled') {
    console.log('[Scraper] Reddit scraping succeeded - raw items:', redditResults.value.length);
    const parsedReddit = redditResults.value
      .map((item: any) => parseRedditJob(item, skills))
      .filter((job): job is JobPost => job !== null);
    console.log('[Scraper] Reddit jobs after parsing and filtering:', parsedReddit.length);
    allJobs.push(...parsedReddit);
  } else {
    console.error('[Scraper] Reddit scraping failed:', redditResults.reason);
  }
  
  if (xResults.status === 'fulfilled') {
    console.log('[Scraper] X scraping succeeded - raw items:', xResults.value.length);
    const parsedX = xResults.value
      .map((item: any) => parseXJob(item, skills))
      .filter((job): job is JobPost => job !== null);
    console.log('[Scraper] X jobs after parsing and filtering:', parsedX.length);
    allJobs.push(...parsedX);
  } else {
    console.error('[Scraper] X scraping failed:', xResults.reason);
  }
  
  // Sort by relevance and return max 5
  const sortedJobs = allJobs
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
  
  console.log('[Scraper] Final job count after sorting and limiting:', sortedJobs.length);
  return sortedJobs;
}
