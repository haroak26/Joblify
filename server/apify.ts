import { ApifyClient } from 'apify-client';
import type { JobPost } from '@shared/schema';
import { randomUUID } from 'crypto';

const apifyToken = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
const client = apifyToken
  ? new ApifyClient({ token: apifyToken })
  : null;
// Enable X scraper by default unless explicitly disabled
const enableXScraper = process.env.APIFY_ENABLE_X !== 'false';

const useApifyProxy = process.env.APIFY_USE_PROXY === 'true';
const apifyProxyGroups = process.env.APIFY_PROXY_GROUPS
  ? process.env.APIFY_PROXY_GROUPS.split(',').map((group) => group.trim()).filter(Boolean)
  : [];

function getProxyConfiguration() {
  if (!useApifyProxy) {
    return {
      useApifyProxy: false,
    };
  }
  if (apifyProxyGroups.length > 0) {
    return {
      useApifyProxy: true,
      apifyProxyGroups,
    };
  }
  return {
    useApifyProxy: true,
  };
}

// Apify actor IDs - can be overridden via environment variables
// Default to well-known community actors if not specified
const ACTORS = {
  X: process.env.APIFY_ACTOR_X || "quacker/twitter-scraper",
  REDDIT: process.env.APIFY_ACTOR_REDDIT || "apify/reddit-scraper"
};

// Hiring-related search terms for scraping queries
const HIRING_SEARCH_TERMS = {
  X: 'hiring OR "looking for" OR freelance OR freelancer OR contract OR contractor OR "need a" OR "seeking" OR "job opportunity" OR gig OR "developer needed" OR "designer needed" OR "help wanted"',
  REDDIT: "hiring OR freelance OR contract OR looking"
};

interface ScrapedItem {
  id?: string;
  id_str?: string;
  tweetId?: string;
  tweet_id?: string;
  text?: string;
  full_text?: string;
  fullText?: string;
  tweetText?: string;
  tweet_text?: string;
  body?: string;
  selftext?: string;
  title?: string;
  author?: { userName?: string; name?: string } | string;
  user?: { screen_name?: string; name?: string };
  author_name?: string;
  authorName?: string;
  tweetUrl?: string;
  tweet_url?: string;
  statusUrl?: string;
  status_url?: string;
  created_at?: string;
  createdAt?: string;
  created_utc?: number;
  url?: string;
  permalink?: string;
  link?: string;
  postUrl?: string;
  post_url?: string;
  permalink_url?: string;
  postText?: string;
  post_text?: string;
  message?: string;
  content?: string;
}

export type ScrapeStatusUpdate = {
  step: "defining" | "x" | "reddit";
  label: string;
};

export async function scrapeXPosts(query: string, maxResults: number = 50): Promise<JobPost[]> {
  if (!client || !enableXScraper) {
    console.log('X scraper disabled or Apify client not configured');
    return [];
  }
  try {
    // Flexible input schema that works with various X/Twitter scrapers.
    // Different actors use different parameter names, so we provide multiple
    // to ensure compatibility with whichever actor is configured.
    const input = { 
      searchTerms: [query],  // Used by apidojo/tweet-scraper
      queries: [query],      // Used by some tweet scrapers
      query: query,          // Generic query parameter
      hashtags: [],
      maxTweets: maxResults, // Used by most tweet scrapers
      maxItems: maxResults,  // Used by some scrapers
      addUserInfo: true,
      scrapeTweetReplies: false,
      proxyConfiguration: getProxyConfiguration()
    };
    console.log(`Starting X scraper (${ACTORS.X}) with query:`, query);
    const run = await client.actor(ACTORS.X).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`X scraper returned ${items.length} items`);
    return processItems(items, 'x', maxResults);
  } catch (error) {
    console.error('Error scraping X posts:', error instanceof Error ? error.message : error);
    return [];
  }
}

const REDDIT_SUBREDDITS = [
  "hiring",
  "forhire",
  "slavelabour",
  "freelance",
  "designjobs",
  "programmingjobs"
];

export async function scrapeReddit(query: string, maxResults: number = 20): Promise<JobPost[]> {
  if (!client) {
    console.log('Apify client not configured');
    return [];
  }
  try {
    const maxPostsPerSubreddit = Math.max(5, Math.ceil((maxResults * 2) / REDDIT_SUBREDDITS.length));
    
    // Calculate a sinceDate that is 3 months ago for recent job posts
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const sinceDate = threeMonthsAgo.toISOString().split('T')[0];
    
    const results = await Promise.allSettled(
      REDDIT_SUBREDDITS.map(async (subreddit) => {
        // Flexible input schema that works with various Reddit scrapers.
        // Different actors use different parameter names, so we provide multiple
        // to ensure compatibility with whichever actor is configured.
        const input = {
          startUrls: [{ url: `https://www.reddit.com/r/${subreddit}/search/?q=${encodeURIComponent(query)}&sort=new&t=month` }],  // URL-based scrapers
          subreddits: [subreddit],      // Used by some scrapers (array)
          subreddit: subreddit,         // Used by some scrapers (string)
          searchQuery: query,           // Used by apify/reddit-scraper
          searches: [{ term: query, subreddit, sort: "new" }],  // Used by some scrapers
          maxItems: maxPostsPerSubreddit,      // Generic limit
          maxPosts: maxPostsPerSubreddit,      // Used by apify/reddit-scraper
          maxPostCount: maxPostsPerSubreddit,  // Used by some scrapers
          maxComments: 0,
          includeComments: false,
          sort: "new",
          time: "month",
          sinceDate,
          proxyConfiguration: getProxyConfiguration(),
          proxy: getProxyConfiguration()  // Some scrapers use 'proxy' instead
        };

        console.log(`Starting Reddit scraper (${ACTORS.REDDIT}) for r/${subreddit} with query: ${query}`);
        const run = await client.actor(ACTORS.REDDIT).call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        console.log(`Reddit scraper returned ${items.length} items for r/${subreddit}`);
        return items as any[];
      })
    );

    const items = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
    console.log(`Reddit scraper returned ${items.length} total items`);

    return processItems(items, 'reddit', maxResults);
  } catch (error) {
    console.error('Error scraping Reddit:', error instanceof Error ? error.message : error);
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
  "freelancer",
  "gig",
  "paid",
  "budget",
  "rate",
  "[hiring]",
  "[task]",
  "[job]",
  "contractor",
  "developer needed",
  "designer needed",
  "help wanted",
  "project",
  "job opportunity"
];

const EXCLUDED_PHRASES = [
  "for hire", 
  "[for hire]",
  "available for work", 
  "open to work", 
  "looking for work", 
  "seeking employment", 
  "looking for job",
  "i am a",
  "i'm a",
  "my services",
  "offering services",
  "available now"
];
const EXCLUDED_CONTEXTS = [
  "how to get",
  "tips for",
  "resume",
  "cv",
  "portfolio",
  "tutorial",
  "bootcamp",
  "course",
  "interview",
  "career advice",
  "job search",
  "looking for a job",
  "looking for work",
  "seeking employment",
  "open to work"
];
const REMOTE_PHRASES = ["remote", "work from home", "wfh", "anywhere", "distributed", "location independent"];

const COMMON_JOB_KEYWORDS = [
  "developer",
  "designer",
  "engineer",
  "marketing",
  "writer",
  "copywriter",
  "editor",
  "virtual assistant",
  "assistant",
  "data",
  "product",
  "project",
  "customer support",
  "qa",
  "tester",
  "accounting",
  "bookkeeping",
  "video editor",
  "social media",
  "seo",
  "wordpress",
  "shopify",
  "webflow",
  "figma",
  "ui",
  "ux",
  "frontend",
  "backend",
  "full stack",
  "mobile",
  "ios",
  "android",
  "sales",
  "lead generation",
  "automation"
];

const INTRO_PHRASES: Array<{ term: string; label: string }> = [
  { term: "front end", label: "Front End" },
  { term: "front-end", label: "Front End" },
  { term: "back end", label: "Back End" },
  { term: "back-end", label: "Back End" },
  { term: "full stack", label: "Full Stack" },
  { term: "full-stack", label: "Full Stack" },
  { term: "machine learning", label: "Machine Learning" },
  { term: "data science", label: "Data Science" },
  { term: "product design", label: "Product Design" },
  { term: "graphic design", label: "Graphic Design" },
  { term: "ui/ux", label: "UI/UX Design" },
  { term: "project management", label: "Project Management" },
  { term: "social media", label: "Social Media" },
  { term: "content writing", label: "Content Writing" },
  { term: "video editing", label: "Video Editing" },
  { term: "virtual assistant", label: "Virtual Assistant" }
];

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "you",
  "your",
  "our",
  "are",
  "is",
  "to",
  "of",
  "in",
  "on",
  "at",
  "as",
  "be",
  "by",
  "from",
  "or",
  "a",
  "an",
  "i",
  "we",
  "us",
  "my",
  "me",
  "it",
  "their",
  "they",
  "them"
]);

function isHiringPost(text: string): boolean {
  const normalized = text.toLowerCase();
  
  // Check if this is a freelancer advertising their services (self-promotion)
  // These posts should be EXCLUDED
  const isSelfPromo = EXCLUDED_PHRASES.some((phrase) => normalized.includes(phrase.toLowerCase()));
  if (isSelfPromo) {
    return false; // Not a hiring post - it's a freelancer advertising
  }
  
  // Check for patterns that indicate a freelancer post (typically at the start of title)
  // Reddit posts often have [For Hire] or similar at the beginning
  const titleStart = normalized.substring(0, 100);
  if (titleStart.match(/^\s*\[?\s*for\s+hire\s*\]?/i)) {
    return false; // Title starts with "[For Hire]" - this is a freelancer advertising
  }
  
  // Now check if it has hiring signals (employer looking for freelancer)
  const hasHiringSignal = HIRING_PHRASES.some((phrase) => normalized.includes(phrase.toLowerCase()));
  
  return hasHiringSignal;
}

function isRemotePost(text: string): boolean {
  const normalized = text.toLowerCase();
  return REMOTE_PHRASES.some((phrase) => normalized.includes(phrase));
}

function isAdvicePost(text: string): boolean {
  const normalized = text.toLowerCase();
  return EXCLUDED_CONTEXTS.some((phrase) => normalized.includes(phrase));
}

function formatKeywordLabel(term: string): string {
  return term
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function extractIntroKeywords(intro: string): string[] {
  const normalized = intro.toLowerCase();
  const keywords: string[] = [];

  for (const phrase of INTRO_PHRASES) {
    if (normalized.includes(phrase.term)) {
      keywords.push(phrase.label);
    }
  }

  const words = normalized
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  for (const word of words) {
    keywords.push(formatKeywordLabel(word));
  }

  return keywords;
}

export function buildProfileKeywords(skills: string[], intro: string): string[] {
  const rawSkills = skills.map((skill) => skill.trim()).filter(Boolean);
  const introKeywords = intro ? extractIntroKeywords(intro).slice(0, 12) : [];
  const combined = [...rawSkills, ...introKeywords];

  if (combined.length < 6) {
    combined.push(...COMMON_JOB_KEYWORDS.map((term) => formatKeywordLabel(term)));
  }

  const deduped: string[] = [];
  for (const term of combined) {
    if (!deduped.some((existing) => existing.toLowerCase() === term.toLowerCase())) {
      deduped.push(term);
    }
  }
  return deduped.slice(0, 14);
}

function normalizeUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith('x.com/') || trimmed.startsWith('twitter.com/') || trimmed.startsWith('reddit.com/') || trimmed.startsWith('www.')) {
    return `https://${trimmed}`;
  }
  return '';
}

function buildSourceUrl(item: ScrapedItem, source: 'x' | 'reddit' | 'facebook'): string {
  const directUrl = normalizeUrl(item.url || item.tweetUrl || item.tweet_url || item.statusUrl || item.status_url);
  if (directUrl) return directUrl;
  if (source === 'x' && item.id) {
    const user = item.user as { screen_name?: string } | undefined;
    const author = item.author as { userName?: string } | undefined;
    const handle = user?.screen_name || (typeof author === 'object' ? author?.userName : undefined);
    if (handle) {
      return `https://x.com/${handle.replace(/^@/, "")}/status/${item.id}`;
    }
  }
  if (source === 'x') {
    const user = item.user as { screen_name?: string } | undefined;
    const author = item.author as { userName?: string; name?: string } | undefined;
    const handle = user?.screen_name || (typeof author === 'object' ? author?.userName || author?.name : undefined);
    const tweetId = item.id_str || item.tweetId || item.tweet_id;
    if (handle && tweetId) {
      return `https://x.com/${handle.replace(/^@/, "")}/status/${tweetId}`;
    }
  }
  if (source === 'reddit' && item.permalink) {
    return item.permalink.startsWith('http') ? item.permalink : `https://reddit.com${item.permalink}`;
  }
  return normalizeUrl(item.link || item.postUrl || item.post_url || item.permalink_url);
}

function processItems(items: any[], source: 'x' | 'reddit', maxResults: number): JobPost[] {
  console.log(`Processing ${items.length} raw items from ${source}`);
  
  const results = items
    .filter((item: ScrapedItem) => {
      const text = (item.text || item.full_text || item.fullText || item.tweetText || item.tweet_text || item.body || item.selftext || item.title || item.postText || item.post_text || item.message || item.content || '');
      const title = item.title || '';
      const fullText = title ? `${title}\n\n${text}` : text;
      
      // Basic text length check
      if (fullText.length < 20) {
        return false;
      }
      
      // For Reddit, specifically check the title for [For Hire] patterns
      if (source === 'reddit' && title) {
        const titleNormalized = title.toLowerCase().trim();
        // Exclude posts where title starts with [For Hire] or similar
        if (titleNormalized.match(/^\s*\[?\s*for\s+hire\s*\]?/i)) {
          return false;
        }
      }
      
      // Must have hiring signals
      if (!isHiringPost(fullText)) {
        return false;
      }
      
      // Skip advice posts
      if (isAdvicePost(fullText)) {
        return false;
      }
      
      // Remote is optional - we prefer remote jobs but don't require it
      return true;
    })
    .map((item: ScrapedItem) => {
      const text = item.text || item.full_text || item.fullText || item.tweetText || item.tweet_text || item.body || item.selftext || item.postText || item.post_text || item.message || item.content || '';
      const title = item.title || '';
      const fullText = title ? `${title}\n\n${text}` : text;
      
      let author = 'Unknown';
      let handle = '';
      
      if (typeof item.author === 'string') {
        author = item.author;
        handle = item.author;
      } else if (typeof item.author === 'object' && item.author) {
        author = item.author.name || item.author.userName || 'Unknown';
        handle = item.author.userName || '';
      } else if (item.user) {
        author = item.user.name || item.user.screen_name || 'Unknown';
        handle = item.user.screen_name || '';
      } else if (item.author_name || item.authorName) {
        author = item.author_name || item.authorName || 'Unknown';
        handle = author;
      }
      
      handle = handle.replace(/^@/, "").replace(/^u\//, "");

      const sourceUrl = buildSourceUrl(item, source);
      const budget = extractBudget(fullText);
      const details = extractCoreDetails(fullText);
      const description = formatDescription(fullText, budget, details);
      
      let postedAt = 'Recently';
      if (item.created_utc !== undefined && item.created_utc !== null) {
        postedAt = formatTimeAgoFromEpoch(item.created_utc);
      } else if (item.created_at || item.createdAt) {
        postedAt = formatTimeAgo(String(item.created_at || item.createdAt || ''));
      }

      return {
        id: randomUUID(),
        title: (title || text).slice(0, 100) + ((title || text).length > 100 ? '...' : ''),
        description,
        source,
        sourceUrl,
        author,
        authorHandle: handle,
        postedAt,
        matchedSkills: extractSkills(fullText),
        budget,
        isRemote: isRemotePost(fullText),
        saved: false,
        applied: false,
        relevanceScore: 0,
      };
    })
    .filter((job) => job.sourceUrl && job.sourceUrl.length > 0)
    .slice(0, maxResults);
    
  console.log(`Processed ${results.length} valid job posts from ${source}`);
  return results;
}

function extractSkills(text: string): string[] {
  const skillKeywords = [
    'react', 'reactjs', 'react.js',
    'node', 'nodejs', 'node.js',
    'python', 'django', 'flask',
    'javascript', 'js', 'typescript', 'ts',
    'ui', 'ux', 'ui/ux', 'figma', 'sketch', 'adobe xd',
    'wordpress', 'shopify', 'woocommerce', 'webflow',
    'seo', 'marketing', 'content',
    'mobile', 'ios', 'android', 'flutter', 'react native',
    'video', 'editing', 'premiere', 'after effects',
    'design', 'graphic design', 'logo',
    'php', 'laravel', 'ruby', 'rails',
    'java', 'kotlin', 'swift',
    'aws', 'azure', 'gcp', 'devops', 'docker', 'kubernetes',
    'sql', 'postgresql', 'mysql', 'mongodb', 'database',
    'api', 'rest', 'graphql',
    'vue', 'vuejs', 'angular', 'svelte',
    'css', 'tailwind', 'sass', 'scss',
    'html', 'html5',
    'golang', 'go', 'rust', 'c++', 'c#', '.net',
    'blockchain', 'solidity', 'web3', 'smart contract',
    'ai', 'machine learning', 'ml', 'data science',
    'copywriting', 'writing', 'technical writing'
  ];
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  
  const skillMap: Record<string, string> = {
    'react': 'React',
    'reactjs': 'React',
    'react.js': 'React',
    'node': 'Node.js',
    'nodejs': 'Node.js',
    'node.js': 'Node.js',
    'python': 'Python',
    'django': 'Django',
    'flask': 'Flask',
    'javascript': 'JavaScript',
    'js': 'JavaScript',
    'typescript': 'TypeScript',
    'ts': 'TypeScript',
    'ui': 'UI Design',
    'ux': 'UX Design',
    'ui/ux': 'UI/UX Design',
    'figma': 'Figma',
    'sketch': 'Sketch',
    'adobe xd': 'Adobe XD',
    'wordpress': 'WordPress',
    'shopify': 'Shopify',
    'woocommerce': 'WooCommerce',
    'webflow': 'Webflow',
    'seo': 'SEO',
    'marketing': 'Marketing',
    'content': 'Content',
    'mobile': 'Mobile Development',
    'ios': 'iOS',
    'android': 'Android',
    'flutter': 'Flutter',
    'react native': 'React Native',
    'video': 'Video Editing',
    'editing': 'Editing',
    'premiere': 'Premiere Pro',
    'after effects': 'After Effects',
    'design': 'Design',
    'graphic design': 'Graphic Design',
    'logo': 'Logo Design',
    'php': 'PHP',
    'laravel': 'Laravel',
    'ruby': 'Ruby',
    'rails': 'Ruby on Rails',
    'java': 'Java',
    'kotlin': 'Kotlin',
    'swift': 'Swift',
    'aws': 'AWS',
    'azure': 'Azure',
    'gcp': 'Google Cloud',
    'devops': 'DevOps',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'sql': 'SQL',
    'postgresql': 'PostgreSQL',
    'mysql': 'MySQL',
    'mongodb': 'MongoDB',
    'database': 'Database',
    'api': 'API',
    'rest': 'REST API',
    'graphql': 'GraphQL',
    'vue': 'Vue.js',
    'vuejs': 'Vue.js',
    'angular': 'Angular',
    'svelte': 'Svelte',
    'css': 'CSS',
    'tailwind': 'Tailwind CSS',
    'sass': 'Sass',
    'scss': 'Sass',
    'html': 'HTML',
    'html5': 'HTML5',
    'golang': 'Go',
    'go': 'Go',
    'rust': 'Rust',
    'c++': 'C++',
    'c#': 'C#',
    '.net': '.NET',
    'blockchain': 'Blockchain',
    'solidity': 'Solidity',
    'web3': 'Web3',
    'smart contract': 'Smart Contracts',
    'ai': 'AI',
    'machine learning': 'Machine Learning',
    'ml': 'Machine Learning',
    'data science': 'Data Science',
    'copywriting': 'Copywriting',
    'writing': 'Writing',
    'technical writing': 'Technical Writing'
  };
  
  for (const skill of skillKeywords) {
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      const formatted = skillMap[skill] || skill.charAt(0).toUpperCase() + skill.slice(1);
      if (!found.includes(formatted)) found.push(formatted);
    }
  }
  return found.slice(0, 8);
}

function extractBudget(text: string): string | undefined {
  const patterns = [
    /\$[\d,]+(?:\s*[-–to]+\s*\$?[\d,]+)?(?:\s*(?:\/|\s+per\s+)?\s*(?:hr|hour|h))?/gi,
    /(\$|USD\s?)[\d,]+(?:\s*[-–]\s*(\$|USD\s?)[\d,]+)?/gi,
    /([\d,]+)\s*(?:USD|dollars?)(?:\s*[-–]\s*([\d,]+)\s*(?:USD|dollars?)?)?/gi,
    /budget[:\s]+\$?[\d,]+(?:\s*[-–]\s*\$?[\d,]+)?/gi,
    /rate[:\s]+\$?[\d,]+(?:\s*[-–]\s*\$?[\d,]+)?(?:\s*\/?\s*(?:hr|hour))?/gi,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let budget = match[0].replace(/budget[:\s]+/i, '').replace(/rate[:\s]+/i, '');
      budget = budget.replace(/usd\s?/gi, '$').trim();
      return budget;
    }
  }
  return undefined;
}

function extractCoreDetails(text: string): string[] {
  const details: string[] = [];
  const normalized = text.toLowerCase();

  if (normalized.includes("remote")) details.push("Remote");
  if (normalized.includes("on-site") || normalized.includes("onsite")) details.push("On-site");
  if (normalized.includes("hybrid")) details.push("Hybrid");
  if (normalized.includes("contract")) details.push("Contract");
  if (normalized.includes("full-time") || normalized.includes("full time")) details.push("Full-time");
  if (normalized.includes("part-time") || normalized.includes("part time")) details.push("Part-time");
  if (normalized.includes("hourly")) details.push("Hourly");
  if (normalized.includes("fixed price") || normalized.includes("fixed-price")) details.push("Fixed-price");
  if (normalized.includes("urgent") || normalized.includes("asap")) details.push("Urgent");
  if (normalized.includes("long-term") || normalized.includes("long term") || normalized.includes("ongoing")) details.push("Long-term");

  const durationMatch = text.match(/(\d+\s?(?:weeks?|months?|days?))/i);
  if (durationMatch) details.push(`Duration: ${durationMatch[1]}`);

  return details.slice(0, 5);
}

function formatDescription(text: string, budget?: string, details: string[] = []): string {
  const cleanText = text.replace(/\n{3,}/g, '\n\n').trim();
  const summaryParts = [...details];
  if (budget) summaryParts.push(`Budget: ${budget}`);
  if (summaryParts.length === 0) return cleanText;
  return `${cleanText}\n\n---\n${summaryParts.join(" • ")}`;
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return 'Recently';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Recently';
    
    const diff = new Date().getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch { return 'Recently'; }
}

function formatTimeAgoFromEpoch(epochSeconds: number | string): string {
  const epoch = Number(epochSeconds);
  if (!Number.isFinite(epoch)) return 'Recently';
  const date = new Date(epoch * 1000);
  if (isNaN(date.getTime())) return 'Recently';
  return formatTimeAgo(date.toISOString());
}

export async function scrapeJobsForSkills(
  skills: string[],
  intro: string,
  onStatus?: (status: ScrapeStatusUpdate) => void
): Promise<JobPost[]> {
  onStatus?.({ step: "defining", label: "Defining Requirements" });
  const profileKeywords = buildProfileKeywords(skills, intro);
  if (!client || profileKeywords.length === 0) {
    console.log('No Apify client or no keywords provided');
    return [];
  }
  
  const query = buildSearchQuery(profileKeywords);
  console.log('Scraping jobs for skills:', skills.join(', '));
  
  onStatus?.({ step: "x", label: "Searching X" });
  const xResults = await scrapeXPosts(query.x, 10);
  onStatus?.({ step: "reddit", label: "Searching Reddit" });
  const redditResults = await scrapeReddit(query.reddit, 10);
  
  console.log(`Scraped: X=${xResults.length}, Reddit=${redditResults.length}`);
  
  const all = [...redditResults, ...xResults];
  
  const unique = all.reduce((acc, job) => {
    if (!acc.find(j => j.sourceUrl === job.sourceUrl)) acc.push(job);
    return acc;
  }, [] as JobPost[]);
  
  // Sort by recency - smaller parseTimeAgo value means more recent
  unique.sort((a, b) => {
    const timeA = parseTimeAgo(a.postedAt);
    const timeB = parseTimeAgo(b.postedAt);
    return timeA - timeB; // Ascending: most recent (smallest time ago) first
  });
  
  console.log(`Total unique jobs: ${unique.length}`);
  return unique.slice(0, 30);
}

function parseTimeAgo(timeStr: string): number {
  // "Just now" is most recent
  if (timeStr === 'Just now') return 0;
  // "Recently" should be treated as fairly recent, not pushed to end
  if (!timeStr || timeStr === 'Recently') return 60; // Treat as 1 hour ago
  
  const match = timeStr.match(/(\d+)([mhdwmo])/);
  if (!match) return 60;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'm': return value; // minutes
    case 'h': return value * 60; // hours in minutes
    case 'd': return value * 60 * 24; // days in minutes
    case 'w': return value * 60 * 24 * 7; // weeks in minutes
    case 'mo': return value * 60 * 24 * 30; // months in minutes
    default: return 60;
  }
}

function buildSearchQuery(skills: string[]): { x: string; reddit: string } {
  const expandedSkills = expandSkillTerms(skills);
  const trimmedSkills = expandedSkills.slice(0, 8);
  const skillQuery = trimmedSkills.length > 0 ? trimmedSkills.join(" OR ") : "";

  return {
    x: `(${skillQuery}) (${HIRING_SEARCH_TERMS.X})`,
    reddit: `${skillQuery} (${HIRING_SEARCH_TERMS.REDDIT})`
  };
}

function expandSkillTerms(skills: string[]): string[] {
  const normalized = skills
    .flatMap((skill) => {
      const trimmed = skill.trim();
      const parts = trimmed
        .split(/[,/&+]| and | with /gi)
        .flatMap((part) => part.split(/\s+/))
        .map((part) => part.trim())
        .filter(Boolean);
      return [trimmed, ...parts];
    })
    .filter(Boolean)
    .map((term) => (term.includes(" ") ? `"${term}"` : term));

  const deduped: string[] = [];
  for (const term of normalized) {
    if (!deduped.includes(term)) {
      deduped.push(term);
    }
  }
  return deduped;
}
