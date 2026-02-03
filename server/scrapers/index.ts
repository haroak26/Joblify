import { scrapeRedditJobs } from './reddit';
import { scrapeXJobs } from './x';
import type { Skill, JobPost } from '@shared/schema';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { searchCachedJobs, saveJobsToCache } from '../jobCacheService';

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
  xBroadKeyword: string; // Broader keyword for X searches to get more results
}

// Map of specific skills to broader search terms for X
const SKILL_TO_BROAD_KEYWORD: Record<string, string> = {
  // Frontend/Web
  'frontend designer': 'developer',
  'frontend developer': 'developer',
  'react': 'developer',
  'react developer': 'developer',
  'vue': 'developer',
  'angular': 'developer',
  'javascript': 'developer',
  'typescript': 'developer',
  'html': 'developer',
  'css': 'developer',
  'tailwind': 'developer',
  'next.js': 'developer',
  'nextjs': 'developer',
  // Backend
  'backend developer': 'developer',
  'node.js': 'developer',
  'nodejs': 'developer',
  'python': 'developer',
  'java': 'developer',
  'go': 'developer',
  'golang': 'developer',
  'rust': 'developer',
  'ruby': 'developer',
  'php': 'developer',
  // Design
  'ui/ux': 'designer',
  'ui/ux design': 'designer',
  'ux design': 'designer',
  'ui design': 'designer',
  'graphic design': 'designer',
  'figma': 'designer',
  'sketch': 'designer',
  'adobe xd': 'designer',
  'product designer': 'designer',
  // Mobile
  'ios developer': 'developer',
  'android developer': 'developer',
  'react native': 'developer',
  'flutter': 'developer',
  'swift': 'developer',
  'kotlin': 'developer',
  // Data
  'data analyst': 'data',
  'data scientist': 'data',
  'machine learning': 'data',
  'ml engineer': 'data',
  'ai engineer': 'data',
  // Writing
  'content writer': 'writer',
  'copywriter': 'writer',
  'technical writer': 'writer',
  'blog writer': 'writer',
  'seo writer': 'writer',
  // Marketing
  'social media': 'marketing',
  'digital marketing': 'marketing',
  'seo specialist': 'marketing',
  'email marketing': 'marketing',
};

// Expanded list of subreddits focused on hiring
const EXPANDED_SUBREDDITS = [
  'forhire',
  'freelance_forhire', 
  'hiring',
  'jobbit',
  'remotework',
  'freelance',
  'jobs',
  'designjobs',
  'webdev',
  'programming',
  'startups',
  'entrepreneur',
  'slavelabour'
].join(',');

/**
 * Get a broader keyword for X searches based on a specific skill
 */
function getBroadKeyword(skill: string): string {
  const skillLower = skill.toLowerCase().trim();
  
  // Check for exact match first
  if (SKILL_TO_BROAD_KEYWORD[skillLower]) {
    return SKILL_TO_BROAD_KEYWORD[skillLower];
  }
  
  // Check for partial matches - only match if skill is a complete word within the key
  // This avoids false matches like "go" matching "google"
  for (const [key, value] of Object.entries(SKILL_TO_BROAD_KEYWORD)) {
    // Check if skill is the key or starts/ends with the key followed by a space or common separator
    const keyWords = key.split(/[\s/]+/);
    const skillWords = skillLower.split(/[\s/]+/);
    
    // Match if any skill word exactly matches any key word
    if (skillWords.some(sw => keyWords.includes(sw))) {
      return value;
    }
  }
  
  // Default to the skill itself or 'freelancer'
  return skill.length > 3 ? skill.split(' ')[0] : 'freelancer';
}

/**
 * Generate optimal search parameters from user intro and skills using AI
 */
export async function generateScraperParameters(intro: string, skills: Skill[]): Promise<ScraperParameters> {
  const skillNames = skills.map(s => s.name).join(', ');
  const topSkill = skills[0]?.name || 'developer';
  const broadKeyword = getBroadKeyword(topSkill);
  
  const prompt = `You are a search query optimizer for finding freelance hiring posts (people looking to HIRE freelancers).

User Profile:
Introduction: ${intro}
Skills: ${skillNames}

Generate EXTREMELY SIMPLE search queries that find hiring posts on Reddit and X (Twitter).

CRITICAL RULES:
1. Reddit query: Use ONLY 1-2 words max. Examples: "hiring", "freelance", "looking for"
2. DO NOT use AND, OR, or complex operators
3. DO NOT combine multiple skills in one query
4. Keep queries as simple as possible to avoid 404 errors
5. For X/Twitter: Use broad single-word terms

GOOD EXAMPLES:
- Reddit: "hiring" or "freelance" or "looking for"
- X: "freelance" or "hiring"

BAD EXAMPLES (DO NOT USE):
- "hiring react developer AND frontend"
- "need freelance writer with SEO"
- Any query with multiple conditions

Return a JSON object with:
{
  "redditQuery": "hiring",
  "redditSubreddits": "${EXPANDED_SUBREDDITS}",
  "xQuery": "freelance"
}

Keep it absolutely minimal - single words work best.`;

  try {
    console.log('[Scraper] Generating search parameters with AI');
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Lower temperature for more consistent, simpler outputs
      response_format: { type: "json_object" }
    });

    const params = JSON.parse(response.choices[0].message.content || '{}');
    console.log('[Scraper] AI-generated parameters:', params);
    
    return {
      redditQuery: params.redditQuery || 'hiring',
      redditSubreddits: params.redditSubreddits || EXPANDED_SUBREDDITS,
      xQuery: params.xQuery || 'freelance',
      xBroadKeyword: broadKeyword
    };
  } catch (error) {
    console.error('[Scraper] Error generating scraper parameters:', error);
    // Fallback to ultra-simple, proven defaults
    const fallbackParams = {
      redditQuery: 'hiring',
      redditSubreddits: EXPANDED_SUBREDDITS,
      xQuery: 'freelance',
      xBroadKeyword: broadKeyword
    };
    console.log('[Scraper] Using fallback parameters:', fallbackParams);
    return fallbackParams;
  }
}

/**
 * Get skill variants for more flexible matching
 * E.g., "react" -> ["react", "reactjs", "react.js", "react js"]
 */
function getSkillVariants(skill: string): string[] {
  const variants = [skill];
  
  // Common tech skill variations
  const skillMappings: Record<string, string[]> = {
    'react': ['reactjs', 'react.js', 'react js'],
    'node': ['nodejs', 'node.js', 'node js'],
    'vue': ['vuejs', 'vue.js', 'vue js'],
    'angular': ['angularjs', 'angular.js'],
    'next': ['nextjs', 'next.js'],
    'typescript': ['ts', 'type script'],
    'javascript': ['js', 'java script'],
    'python': ['py', 'python3'],
    'golang': ['go', 'go lang'],
    'frontend': ['front end', 'front-end'],
    'backend': ['back end', 'back-end'],
    'fullstack': ['full stack', 'full-stack'],
    'ui/ux': ['ui', 'ux', 'uiux', 'ui ux', 'user interface', 'user experience'],
    'machine learning': ['ml', 'machinelearning'],
    'artificial intelligence': ['ai', 'a.i.'],
    'web development': ['web dev', 'webdev'],
    'mobile development': ['mobile dev', 'mobiledev'],
  };
  
  // Add mapped variants
  for (const [key, values] of Object.entries(skillMappings)) {
    if (skill === key) {
      variants.push(...values);
    } else if (values.includes(skill)) {
      variants.push(key, ...values.filter(v => v !== skill));
    }
  }
  
  return Array.from(new Set(variants));
}

/**
 * Check if a post is within the maximum age limit (7 days)
 */
function isPostRecent(postedAt: Date): boolean {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  return postedAt >= sevenDaysAgo;
}

/**
 * Parse and validate a date from scraper data
 * Handles various edge cases and returns both Date object and ISO string
 */
function parseAndValidateDate(dateValue: any, fallbackToNow: boolean = true): { date: Date; isoString: string } {
  let date: Date;
  
  try {
    if (dateValue !== null && dateValue !== undefined && dateValue !== '') {
      date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        console.warn('[Scraper] Invalid date value, using current time');
        date = new Date();
      }
    } else {
      date = fallbackToNow ? new Date() : new Date(0);
    }
  } catch (error) {
    console.warn('[Scraper] Date parsing error, using current time:', error);
    date = fallbackToNow ? new Date() : new Date(0);
  }
  
  return {
    date,
    isoString: date.toISOString()
  };
}

/**
 * Parse and normalize scraped data into JobPost format
 * Uses more lenient skill matching to ensure jobs are returned
 */
function parseRedditJob(item: any, userSkills: Skill[]): JobPost | null {
  if (!item.title || !item.url) return null;
  
  // More lenient filtering - only exclude obvious job seeking posts
  const title = item.title.toLowerCase();
  const text = (item.selftext || '').toLowerCase();
  const fullText = title + ' ' + text;
  
  // Only filter out very explicit job seeking patterns (where someone is clearly offering their own services)
  const seekingPatterns = [
    /\b(?:i am|i'm)\s+(?:a|an)\s+\w+\s+(?:available for hire|for hire|seeking (?:work|clients))/i,
    /\b(?:i am|i'm)\s+offering\s+(?:my\s+)?services/i,
    /\bhire me\b/i,
  ];
  
  if (seekingPatterns.some(pattern => pattern.test(fullText))) {
    console.log('[Scraper] Reddit - Filtered out job seeking post:', title.substring(0, 50));
    return null;
  }
  
  // Match skills - be more flexible with partial matches and related terms
  const matchedSkills = userSkills
    .filter(skill => {
      const skillLower = skill.name.toLowerCase();
      
      // Check for exact match or skill as part of a word
      if (fullText.includes(skillLower)) return true;
      
      // Check for related terms (e.g., "react" matches "react.js", "reactjs")
      const skillVariants = getSkillVariants(skillLower);
      return skillVariants.some(variant => fullText.includes(variant));
    })
    .map(s => s.name);
  
  // If no skills matched but this looks like a hiring post, include it with a generic match
  const hiringIndicators = /\b(hiring|looking for|need|seeking|freelancer|contractor|developer|designer)\b/i;
  const isHiringPost = hiringIndicators.test(fullText);
  
  if (matchedSkills.length === 0 && !isHiringPost) {
    console.log('[Scraper] Reddit - No skill match and not a hiring post:', title.substring(0, 50));
    return null;
  }
  
  // For hiring posts without exact skill matches, use a lower relevance score
  const relevanceScore = matchedSkills.length || (isHiringPost ? 0.5 : 0);
  
  console.log('[Scraper] Reddit - Matched job:', title.substring(0, 50), 'Skills:', matchedSkills.join(', ') || 'none (hiring post)');
  
  // Parse and validate date using helper function
  const timestamp = (item.created_utc !== null && item.created_utc !== undefined) 
    ? item.created_utc * 1000 
    : Date.now();
  const { date: postedDate, isoString: postedAt } = parseAndValidateDate(timestamp);
  
  // Filter out posts older than 7 days
  if (!isPostRecent(postedDate)) {
    console.log('[Scraper] Reddit - Post too old (>7 days):', title.substring(0, 50));
    return null;
  }
  
  return {
    id: randomUUID(),
    title: item.title,
    description: item.selftext || item.title,
    source: 'reddit',
    sourceUrl: item.url,
    author: item.author || 'unknown',
    authorHandle: item.author,
    postedAt,
    matchedSkills, // Return actual matched skills (may be empty for generic hiring posts)
    budget: extractBudget(item.title + ' ' + (item.selftext || '')),
    isRemote: true,
    saved: false,
    applied: false,
    relevanceScore,
    rawData: item,
    scrapedAt: new Date()
  };
}

function parseXJob(item: any, userSkills: Skill[]): JobPost | null {
  if (!item.text || !item.url) return null;
  
  // More lenient filtering - only exclude obvious job seeking posts
  const text = item.text.toLowerCase();
  
  // Only filter out very explicit job seeking patterns (where someone is clearly offering their own services)
  const seekingPatterns = [
    /\b(?:i am|i'm)\s+(?:a|an)\s+\w+\s+(?:available for hire|for hire|seeking (?:work|clients))/i,
    /\b(?:i am|i'm)\s+offering\s+(?:my\s+)?services/i,
    /\bhire me\b/i,
  ];
  
  if (seekingPatterns.some(pattern => pattern.test(text))) {
    console.log('[Scraper] X - Filtered out job seeking post:', text.substring(0, 50));
    return null;
  }
  
  // Match skills - be more flexible with partial matches and related terms
  const matchedSkills = userSkills
    .filter(skill => {
      const skillLower = skill.name.toLowerCase();
      
      // Check for exact match or skill as part of text
      if (text.includes(skillLower)) return true;
      
      // Check for related terms
      const skillVariants = getSkillVariants(skillLower);
      return skillVariants.some(variant => text.includes(variant));
    })
    .map(s => s.name);
  
  // If no skills matched but this looks like a hiring post, include it with a generic match
  const hiringIndicators = /\b(hiring|looking for|need|seeking|freelancer|contractor|developer|designer)\b/i;
  const isHiringPost = hiringIndicators.test(text);
  
  if (matchedSkills.length === 0 && !isHiringPost) {
    console.log('[Scraper] X - No skill match and not a hiring post:', text.substring(0, 50));
    return null;
  }
  
  // For hiring posts without exact skill matches, use a lower relevance score
  const relevanceScore = matchedSkills.length || (isHiringPost ? 0.5 : 0);
  
  console.log('[Scraper] X - Matched job:', text.substring(0, 50), 'Skills:', matchedSkills.join(', ') || 'none (hiring post)');
  
  // Parse and validate date using helper function
  const dateValue = (item.createdAt !== null && item.createdAt !== undefined && item.createdAt !== '') 
    ? item.createdAt 
    : Date.now();
  const { date: postedDate, isoString: postedAt } = parseAndValidateDate(dateValue);
  
  // Filter out posts older than 7 days
  if (!isPostRecent(postedDate)) {
    console.log('[Scraper] X - Post too old (>7 days):', text.substring(0, 50));
    return null;
  }
  
  return {
    id: randomUUID(),
    title: item.text.substring(0, 100) + (item.text.length > 100 ? '...' : ''),
    description: item.text,
    source: 'x',
    sourceUrl: item.url,
    author: item.author?.name || 'unknown',
    authorHandle: item.author?.userName,
    postedAt,
    matchedSkills, // Return actual matched skills (may be empty for generic hiring posts)
    budget: extractBudget(item.text),
    isRemote: true,
    saved: false,
    applied: false,
    relevanceScore,
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
 * Use AI to filter X results for relevance to user's skills
 * Since X searches are broader, we filter results through AI to ensure relevance
 */
async function filterXResultsWithAI(items: any[], skills: Skill[]): Promise<any[]> {
  if (!items.length || !apiKey) return items;
  
  const skillNames = skills.map(s => s.name).join(', ');
  
  try {
    const itemTexts = items.slice(0, 15).map((item, idx) => `[${idx}] ${item.text?.substring(0, 200) || ''}`).join('\n\n');
    
    const prompt = `You are filtering tweets/posts to find HIRING posts relevant to someone with these skills: ${skillNames}

Posts to analyze:
${itemTexts}

Return a JSON object with an array of indices of posts that are:
1. Clearly HIRING or looking for freelancers/developers/designers (not offering services)
2. Relevant to at least one of the user's skills
3. Genuine job opportunities (not spam, not someone looking for work themselves)

Return format: {"relevant_indices": [0, 2, 5]} (indices of relevant posts)
Only include posts that are clearly hiring. If unsure, exclude.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{"relevant_indices": []}');
    const relevantIndices = result.relevant_indices || [];
    
    console.log('[Scraper] AI filtered X results - kept', relevantIndices.length, 'of', items.length);
    
    return relevantIndices.map((idx: number) => items[idx]).filter(Boolean);
  } catch (error) {
    console.error('[Scraper] AI filtering failed, returning all items:', error);
    return items; // Fall back to all items if AI fails
  }
}

/**
 * Main scraping function - returns max jobs based on plan limits
 * Implements cache-first approach: checks cache first, only scrapes if needed
 * Implements graceful degradation: if one scraper fails, continues with results from the other
 * @param intro - User's introduction/bio
 * @param skills - User's skills array
 * @param maxJobs - Maximum jobs to return (respects plan limits). Default is 5.
 * @param bypassCache - If true, skip cache and force fresh scraping. Default is false.
 */
export async function scrapeJobs(intro: string, skills: Skill[], maxJobs: number = 5, bypassCache: boolean = false): Promise<JobPost[]> {
  if (!skills.length) {
    console.log('[Scraper] No skills provided, returning empty results');
    return [];
  }
  
  if (maxJobs <= 0) {
    console.log('[Scraper] maxJobs is 0 or negative, returning empty results');
    return [];
  }
  
  console.log('[Scraper] Starting job scraping - skills count:', skills.length, 'maxJobs:', maxJobs, 'bypassCache:', bypassCache);
  
  // Step 1: Try to get jobs from cache first (unless bypassed)
  if (!bypassCache) {
    try {
      const { jobs: cachedJobs, fromCache } = await searchCachedJobs(intro, skills, maxJobs);
      
      if (fromCache && cachedJobs.length >= maxJobs) {
        console.log(`[Scraper] Found ${cachedJobs.length} jobs from cache, skipping API calls`);
        return cachedJobs.slice(0, maxJobs);
      } else if (fromCache && cachedJobs.length > 0) {
        console.log(`[Scraper] Found ${cachedJobs.length} jobs from cache, need ${maxJobs - cachedJobs.length} more from API`);
        // We'll supplement cache results with fresh scraping below
        const freshJobsNeeded = maxJobs - cachedJobs.length;
        const freshJobs = await performScraping(intro, skills, freshJobsNeeded);
        
        // Combine and deduplicate by sourceUrl
        const combinedJobs = [...cachedJobs, ...freshJobs];
        const seenUrls = new Set<string>();
        const uniqueJobs = combinedJobs.filter(job => {
          if (seenUrls.has(job.sourceUrl)) return false;
          seenUrls.add(job.sourceUrl);
          return true;
        });
        
        return uniqueJobs.slice(0, maxJobs);
      }
      
      console.log('[Scraper] Cache returned insufficient results, performing fresh scraping');
    } catch (error) {
      console.error('[Scraper] Error checking cache, falling back to fresh scraping:', error);
    }
  }
  
  // Step 2: Perform fresh scraping
  const freshJobs = await performScraping(intro, skills, maxJobs);
  
  // Step 3: Save scraped jobs to cache for future use
  try {
    await saveJobsToCache(freshJobs);
    console.log(`[Scraper] Saved ${freshJobs.length} jobs to cache for future use`);
  } catch (error) {
    console.error('[Scraper] Error saving to cache (non-fatal):', error);
    // Don't fail the whole operation if caching fails
  }
  
  return freshJobs;
}

/**
 * Perform actual scraping from Apify sources
 */
async function performScraping(intro: string, skills: Skill[], maxJobs: number): Promise<JobPost[]> {
  
  const params = await generateScraperParameters(intro, skills);
  console.log('[Scraper] Generated parameters:', params);
  
  // Fetch more items than needed to ensure we have enough after filtering
  // We fetch 3x the target because many items get filtered out (job seekers, no skill match, etc.)
  // Cap at 15 items per source to limit API costs while still getting diverse results
  const FETCH_MULTIPLIER = 3;
  const MAX_ITEMS_PER_SOURCE = 15;
  const fetchCount = Math.min(maxJobs * FETCH_MULTIPLIER, MAX_ITEMS_PER_SOURCE);
  
  // Use Promise.allSettled for graceful degradation - if one fails, continue with the other
  const [redditResults, xResults] = await Promise.allSettled([
    scrapeRedditJobs({
      searchQuery: params.redditQuery,
      subreddit: params.redditSubreddits,
      maxPosts: fetchCount
    }, {
      perSubreddit: true // Search each subreddit individually to avoid 404s
    }).catch((error) => {
      console.error('[Scraper] Reddit scraper caught error:', error.message);
      return []; // Return empty array on error for graceful degradation
    }),
    scrapeXJobs({
      query: params.xQuery,
      maxItems: fetchCount
    }).catch((error) => {
      console.error('[Scraper] X scraper caught error:', error.message);
      return []; // Return empty array on error for graceful degradation
    })
  ]);
  
  const allJobs: JobPost[] = [];
  let scrapersSucceeded = 0;
  let scrapersFailed = 0;
  
  if (redditResults.status === 'fulfilled') {
    const redditItems = redditResults.value || [];
    console.log('[Scraper] Reddit scraping succeeded - raw items:', redditItems.length);
    const parsedReddit = redditItems
      .map((item: any) => parseRedditJob(item, skills))
      .filter((job): job is JobPost => job !== null);
    console.log('[Scraper] Reddit jobs after parsing and filtering:', parsedReddit.length);
    allJobs.push(...parsedReddit);
    scrapersSucceeded++;
  } else {
    console.error('[Scraper] Reddit scraping failed:', redditResults.reason?.message || redditResults.reason);
    scrapersFailed++;
  }
  
  if (xResults.status === 'fulfilled') {
    let xItems = xResults.value || [];
    console.log('[Scraper] X scraping succeeded - raw items:', xItems.length);
    
    // Apply AI filtering to X results for better relevance
    if (xItems.length > 0) {
      xItems = await filterXResultsWithAI(xItems, skills);
      console.log('[Scraper] X items after AI filtering:', xItems.length);
    }
    
    const parsedX = xItems
      .map((item: any) => parseXJob(item, skills))
      .filter((job): job is JobPost => job !== null);
    console.log('[Scraper] X jobs after parsing and skill filtering:', parsedX.length);
    allJobs.push(...parsedX);
    scrapersSucceeded++;
  } else {
    console.error('[Scraper] X scraping failed:', xResults.reason?.message || xResults.reason);
    scrapersFailed++;
  }
  
  console.log(`[Scraper] Scraping complete - ${scrapersSucceeded} succeeded, ${scrapersFailed} failed`);
  
  // Sort by relevance and return max based on plan limits
  const sortedJobs = allJobs
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxJobs);
  
  console.log('[Scraper] Final job count after sorting and limiting to', maxJobs, ':', sortedJobs.length);
  
  // If both scrapers failed and we have no jobs, log a warning but don't throw
  if (scrapersSucceeded === 0) {
    console.warn('[Scraper] WARNING: All scrapers failed, returning empty results');
  }
  
  return sortedJobs;
}
