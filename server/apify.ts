import { ApifyClient } from 'apify-client';
import type { JobPost } from '@shared/schema';
import { randomUUID } from 'crypto';

const client = process.env.APIFY_API_TOKEN 
  ? new ApifyClient({ token: process.env.APIFY_API_TOKEN })
  : null;

// Specific actor IDs for each platform
const ACTORS = {
  X: "G8hR9sp2nkjI2om8X",
  REDDIT: "lqOcm2Bgsg4LGNATd",
  FACEBOOK: "Lnz4QRVI89bcQAUGQ"
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
  permalink?: string;
  link?: string;
  postUrl?: string;
}

export async function scrapeXPosts(query: string, maxResults: number = 50): Promise<JobPost[]> {
  if (!client) {
    return [];
  }
  try {
    const input = { 
      maxItems: maxResults,
      query: query,
      username: "",
      replies: false,
      retweets: false,
      quotes: false,
      verified: "",
      links: "",
      media: "",
      images: "",
      videos: "",
      nativeVideos: "",
      proVideos: "",
      news: "",
      safe: "",
      near: "",
      language: "en",
      includeReplies: false,
      includeRetweets: false,
      includeQuotes: false
    };
    const run = await client.actor(ACTORS.X).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return processItems(items, 'x', maxResults);
  } catch (error) {
    console.error('Error scraping X posts:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function scrapeReddit(query: string, maxResults: number = 20): Promise<JobPost[]> {
  if (!client) {
    return [];
  }
  try {
    const input = { 
      mode: "search",
      searchQuery: query,
      searchSubreddit: "all",
      sort: "hot",
      timeFilter: "all",
      maxPosts: maxResults,
      maxComments: 0,
      includeComments: false,
      outputFormat: "markdown",
      includeImages: false,
      delaySeconds: 1,
      debugMode: false,
      proxyConfiguration: {
        useApifyProxy: true
      }
    };
    const run = await client.actor(ACTORS.REDDIT).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    if (items.length === 0 && query.includes("OR")) {
      const fallbackInput = { ...input, searchQuery: query.replace(/OR/gi, "") };
      const fallbackRun = await client.actor(ACTORS.REDDIT).call(fallbackInput);
      const { items: fallbackItems } = await client.dataset(fallbackRun.defaultDatasetId).listItems();
      return processItems(fallbackItems, 'reddit', maxResults);
    }
    return processItems(items, 'reddit', maxResults);
  } catch (error) {
    console.error('Error scraping Reddit:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function scrapeFacebook(query: string, maxResults: number = 20): Promise<JobPost[]> {
  if (!client) {
    return [];
  }
  try {
    const input = { 
      cookies: [],
      function: "facebook_search_scraper",
      keyword: query,
      filter_by_recent_posts: false,
      since: "all_times",
      profile_urls: [],
      post_urls: [],
      post_urls_for_comments: [],
      fetch_reaction_map: false,
      results_limit: maxResults,
      min_wait_time_in_sec: 1,
      max_wait_time_in_sec: 4,
      proxyConfiguration: {
        useApifyProxy: true
      },
      timezone: "UTC",
      locale: "en_US"
    };
    const run = await client.actor(ACTORS.FACEBOOK).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return processItems(items, 'facebook', maxResults);
  } catch (error) {
    console.error('Error scraping Facebook:', error instanceof Error ? error.message : error);
    return [];
  }
}

const HIRING_PHRASES = [
  "hiring",
  "we're hiring",
  "we are hiring",
  "looking for",
  "seeking",
  "need a",
  "need an",
  "wanted",
  "contract",
  "freelance",
  "gig",
  "paid",
  "budget",
  "rate"
];

const EXCLUDED_PHRASES = ["for hire", "available for work", "open to work"];

function isHiringPost(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasHiringSignal = HIRING_PHRASES.some((phrase) => normalized.includes(phrase));
  const isSelfPromo = EXCLUDED_PHRASES.some((phrase) => normalized.includes(phrase));
  return hasHiringSignal && !isSelfPromo;
}

function buildSourceUrl(item: ScrapedItem, source: 'x' | 'reddit' | 'facebook'): string {
  if (item.url) return item.url;
  if (source === 'x' && item.id && (item.user?.screen_name || item.author?.userName)) {
    const handle = item.user?.screen_name || item.author?.userName;
    return `https://x.com/${handle}/status/${item.id}`;
  }
  if (source === 'reddit' && item.permalink) {
    return `https://reddit.com${item.permalink}`;
  }
  return item.link || item.postUrl || '';
}

function processItems(items: any[], source: 'x' | 'reddit' | 'facebook', maxResults: number): JobPost[] {
  return items
    .filter((item: ScrapedItem) => {
      const text = (item.text || item.full_text || item.body || item.title || '');
      return isHiringPost(text);
    })
    .map((item: ScrapedItem) => {
      const text = item.text || item.full_text || item.body || item.title || '';
      const author = item.author?.name || item.user?.name || item.author_name || 'Unknown';
      const handle = (
        item.author?.userName ||
        item.user?.screen_name ||
        item.author_name ||
        (typeof item.author === "string" ? item.author : "") ||
        item.author?.name ||
        item.user?.name ||
        ""
      )
        .toString()
        .replace(/^@/, "");

      const sourceUrl = buildSourceUrl(item, source);
      const budget = extractBudget(text);
      const details = extractCoreDetails(text);
      const description = formatDescription(text, budget, details);

      return {
        id: randomUUID(),
        title: (item.title || text).slice(0, 100) + (text.length > 100 ? '...' : ''),
        description,
        source,
        sourceUrl,
        author,
        authorHandle: handle,
        postedAt: formatTimeAgo(item.created_at || item.createdAt || ''),
        matchedSkills: extractSkills(text),
        budget,
        isRemote: text.toLowerCase().includes('remote'),
        saved: false,
        applied: false,
      };
    })
    .filter((job) => job.sourceUrl)
    .slice(0, maxResults);
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
  const match = text.match(/(\$|usd\s?)\s?[\d,]+(\s*[-–]\s*(\$|usd\s?)\s?[\d,]+)?/i);
  if (match) {
    return match[0].replace(/usd\s?/i, "$");
  }
  const hourlyMatch = text.match(/([\d,]+)\s?(?:usd)?\s?\/\s?hr/i);
  if (hourlyMatch) {
    return `$${hourlyMatch[1]}/hr`;
  }
  return match ? match[0] : undefined;
}

function extractCoreDetails(text: string): string[] {
  const details: string[] = [];
  const normalized = text.toLowerCase();

  if (normalized.includes("remote")) details.push("Remote");
  if (normalized.includes("on-site") || normalized.includes("onsite")) details.push("On-site");
  if (normalized.includes("contract")) details.push("Contract");
  if (normalized.includes("full-time") || normalized.includes("full time")) details.push("Full-time");
  if (normalized.includes("part-time") || normalized.includes("part time")) details.push("Part-time");
  if (normalized.includes("hourly")) details.push("Hourly");
  if (normalized.includes("fixed price") || normalized.includes("fixed-price")) details.push("Fixed-price");

  const durationMatch = text.match(/(\d+\s?(weeks?|months?|days?))/i);
  if (durationMatch) details.push(`Duration: ${durationMatch[1]}`);

  return details;
}

function formatDescription(text: string, budget?: string, details: string[] = []): string {
  const summaryParts = [...details];
  if (budget) summaryParts.push(`Budget: ${budget}`);
  if (summaryParts.length === 0) return text;
  return `${text}\n\nDetails: ${summaryParts.join(" • ")}`;
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
  const query = buildSearchQuery(skills);
  const xResults = await scrapeXPosts(query.x, 5);
  const redditResults = await scrapeReddit(query.reddit, 5);
  const fbResults = await scrapeFacebook(query.facebook, 5);
  
  const all = [...xResults, ...redditResults, ...fbResults];
  return all.reduce((acc, job) => {
    if (!acc.find(j => j.sourceUrl === job.sourceUrl)) acc.push(job);
    return acc;
  }, [] as JobPost[]).slice(0, 15);
}

function buildSearchQuery(skills: string[]): { x: string; reddit: string; facebook: string } {
  const trimmedSkills = skills.filter(Boolean).slice(0, 3);
  const skillQuery = trimmedSkills.length > 0 ? trimmedSkills.map((s) => `"${s}"`).join(" OR ") : "";
  const hiringQuery = HIRING_PHRASES.map((phrase) => `"${phrase}"`).join(" OR ");
  const base = skillQuery ? `(${skillQuery}) (${hiringQuery})` : hiringQuery;
  const exclude = EXCLUDED_PHRASES.map((phrase) => `-"${phrase}"`).join(" ");

  return {
    x: `${base} ${exclude}`.trim(),
    reddit: `${base} ${exclude}`.trim(),
    facebook: `${base} ${exclude}`.trim()
  };
}
