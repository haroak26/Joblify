import { ApifyClient } from 'apify-client';
import type { JobPost } from '@shared/schema';
import { randomUUID } from 'crypto';

const client = process.env.APIFY_API_TOKEN 
  ? new ApifyClient({ token: process.env.APIFY_API_TOKEN })
  : null;

// Actors for different platforms
const ACTORS = {
  X: "pzMmk1t7AZ8OKJhfU", // Twitter/X Search Scraper
  REDDIT: "8B4S7Mmk1t7AZ8OKJ", // Reddit Scraper (Placeholder ID)
  FACEBOOK: "fb_groups_scraper" // Facebook Groups Scraper (Placeholder ID)
};

interface ScrapedItem {
  id?: string;
  text?: string;
  full_text?: string;
  body?: string; // Reddit
  title?: string;
  author?: { userName?: string; name?: string };
  user?: { screen_name?: string; name?: string };
  author_name?: string; // FB
  created_at?: string;
  createdAt?: string;
  url?: string;
}

export async function scrapeXPosts(query: string, maxResults: number = 50): Promise<JobPost[]> {
  if (!client) return [];
  try {
    const input = { mode: "Search", query, query_type: "Top", max_results: maxResults };
    const run = await client.actor(ACTORS.X).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return processItems(items, 'x');
  } catch (error) {
    console.error('Error scraping X posts:', error);
    return [];
  }
}

export async function scrapeReddit(query: string, maxResults: number = 20): Promise<JobPost[]> {
  if (!client) return [];
  try {
    // Note: In a real app, we'd use a specific Reddit actor like "shripad/reddit-scraper"
    const input = { searchQueries: [query], maxPosts: maxResults };
    const run = await client.actor("trunghieu/reddit-scraper").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return processItems(items, 'reddit');
  } catch (error) {
    console.error('Error scraping Reddit:', error);
    return [];
  }
}

export async function scrapeFacebook(query: string, maxResults: number = 20): Promise<JobPost[]> {
  if (!client) return [];
  try {
    // Note: Facebook scraping usually requires specific group IDs or page URLs
    const input = { queries: [query], maxResultsPerQuery: maxResults };
    const run = await client.actor("apify/facebook-groups-scraper").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return processItems(items, 'facebook');
  } catch (error) {
    console.error('Error scraping Facebook:', error);
    return [];
  }
}

function processItems(items: any[], source: 'x' | 'reddit' | 'facebook'): JobPost[] {
  return items
    .filter((item: ScrapedItem) => {
      const text = (item.text || item.full_text || item.body || item.title || '').toLowerCase();
      return text.includes('hire') || text.includes('hiring') || text.includes('looking for') || 
             text.includes('freelance') || text.includes('developer') || text.includes('designer');
    })
    .map((item: ScrapedItem) => {
      const text = item.text || item.full_text || item.body || item.title || '';
      const author = item.author?.name || item.user?.name || item.author_name || 'Unknown';
      const handle = item.author?.userName || item.user?.screen_name || '';
      
      let sourceUrl = item.url || '';
      if (source === 'x') sourceUrl = `https://x.com/${handle}/status/${item.id}`;
      
      return {
        id: randomUUID(),
        title: (item.title || text).slice(0, 100) + (text.length > 100 ? '...' : ''),
        description: text,
        source,
        sourceUrl,
        author,
        authorHandle: handle,
        postedAt: formatTimeAgo(item.created_at || item.createdAt || ''),
        matchedSkills: extractSkills(text),
        budget: extractBudget(text),
        isRemote: text.toLowerCase().includes('remote'),
        saved: false,
        applied: false,
      };
    });
}

function extractSkills(text: string): string[] {
  const skillKeywords = ['react', 'node', 'python', 'javascript', 'typescript', 'ui', 'ux', 'figma', 'wordpress', 'shopify', 'seo', 'mobile', 'ios', 'android', 'video', 'design'];
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  for (const skill of skillKeywords) {
    if (lowerText.includes(skill)) {
      const formatted = skill.charAt(0).toUpperCase() + skill.slice(1);
      if (!found.includes(formatted)) found.push(formatted);
    }
  }
  return found.slice(0, 5);
}

function extractBudget(text: string): string | undefined {
  const match = text.match(/\$[\d,]+(\s*[-–]\s*\$[\d,]+)?/);
  return match ? match[0] : undefined;
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return 'Recently';
  try {
    const diff = new Date().getTime() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  } catch { return 'Recently'; }
}

export async function scrapeJobsForSkills(skills: string[]): Promise<JobPost[]> {
  if (!client || skills.length === 0) return [];
  const query = skills.slice(0, 2).join(' OR ');
  const xResults = await scrapeXPosts(`hiring ${query}`, 15);
  const redditResults = await scrapeReddit(query, 10);
  const fbResults = await scrapeFacebook(query, 5);
  
  const all = [...xResults, ...redditResults, ...fbResults];
  return all.reduce((acc, job) => {
    if (!acc.find(j => j.sourceUrl === job.sourceUrl)) acc.push(job);
    return acc;
  }, [] as JobPost[]).slice(0, 50);
}
