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
  xBroadKeyword: string; // Broader keyword for X searches to get more results
}

// Map of specific skills to broader search terms for X
const SKILL_TO_BROAD_KEYWORD: Record<string, string> = {
  // Frontend/Web
  'frontend designer': 'webdeveloper',
  'frontend developer': 'webdeveloper',
  'react': 'webdeveloper',
  'react developer': 'webdeveloper',
  'vue': 'webdeveloper',
  'angular': 'webdeveloper',
  'javascript': 'webdeveloper',
  'typescript': 'webdeveloper',
  'html': 'webdeveloper',
  'css': 'webdeveloper',
  'tailwind': 'webdeveloper',
  'next.js': 'webdeveloper',
  'nextjs': 'webdeveloper',
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
  'ios developer': 'mobile developer',
  'android developer': 'mobile developer',
  'react native': 'mobile developer',
  'flutter': 'mobile developer',
  'swift': 'mobile developer',
  'kotlin': 'mobile developer',
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

Generate SIMPLE, BROAD search queries that find hiring posts on Reddit and X (Twitter). Keep queries short and focused on hiring keywords.

IMPORTANT GUIDELINES:
1. Use simple hiring phrases: "hiring", "looking for", "need", "seeking"
2. Include 1-2 main skills max (e.g., "hiring react developer", "need freelancer")
3. DO NOT over-specify or combine too many skills
4. Keep queries under 6 words
5. Use common job-related terms
6. For X/Twitter: Use VERY broad terms to maximize results (we filter with AI later)

EXAMPLES OF GOOD QUERIES:
- "hiring react developer"
- "need freelance writer"
- "looking for designer"
- "seeking python developer"
- For X: "hiring ${broadKeyword}" or "need ${broadKeyword} freelance"

Return a JSON object with:
{
  "redditQuery": "short hiring-focused query (max 6 words)",
  "redditSubreddits": "${EXPANDED_SUBREDDITS}",
  "xQuery": "hiring ${broadKeyword} freelance"
}

Keep it simple and broad to maximize results.`;

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
      redditQuery: params.redditQuery || `hiring ${topSkill}`,
      redditSubreddits: params.redditSubreddits || EXPANDED_SUBREDDITS,
      xQuery: `hiring ${broadKeyword} freelance`, // Always use broad keyword for X
      xBroadKeyword: broadKeyword
    };
  } catch (error) {
    console.error('[Scraper] Error generating scraper parameters:', error);
    // Fallback to simple, proven defaults based on top skill
    const fallbackParams = {
      redditQuery: `hiring ${topSkill}`,
      redditSubreddits: EXPANDED_SUBREDDITS,
      xQuery: `hiring ${broadKeyword} freelance`,
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
  
  // Parse and validate date - handle invalid dates gracefully
  let postedAt: string;
  try {
    // Explicitly check for null/undefined to handle edge cases like 0 (valid Unix timestamp)
    const timestamp = (item.created_utc !== null && item.created_utc !== undefined) 
      ? item.created_utc * 1000 
      : Date.now();
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn('[Scraper] Reddit - Invalid date for post, using current time:', item.title.substring(0, 50));
      postedAt = new Date().toISOString();
    } else {
      postedAt = date.toISOString();
    }
  } catch (error) {
    console.warn('[Scraper] Reddit - Date parsing error, using current time:', error);
    postedAt = new Date().toISOString();
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
  
  // Parse and validate date - handle invalid dates gracefully
  let postedAt: string;
  try {
    // Explicitly check for null/undefined to handle edge cases like empty strings
    const dateValue = (item.createdAt !== null && item.createdAt !== undefined && item.createdAt !== '') 
      ? item.createdAt 
      : Date.now();
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn('[Scraper] X - Invalid date for post, using current time:', text.substring(0, 50));
      postedAt = new Date().toISOString();
    } else {
      postedAt = date.toISOString();
    }
  } catch (error) {
    console.warn('[Scraper] X - Date parsing error, using current time:', error);
    postedAt = new Date().toISOString();
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
 * Implements graceful degradation: if one scraper fails, continues with results from the other
 * @param intro - User's introduction/bio
 * @param skills - User's skills array
 * @param maxJobs - Maximum jobs to return (respects plan limits). Default is 5.
 */
export async function scrapeJobs(intro: string, skills: Skill[], maxJobs: number = 5): Promise<JobPost[]> {
  if (!skills.length) {
    console.log('[Scraper] No skills provided, returning empty results');
    return [];
  }
  
  if (maxJobs <= 0) {
    console.log('[Scraper] maxJobs is 0 or negative, returning empty results');
    return [];
  }
  
  console.log('[Scraper] Starting job scraping - skills count:', skills.length, 'maxJobs:', maxJobs);
  
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
