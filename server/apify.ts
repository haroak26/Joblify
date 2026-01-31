import { ApifyClient } from 'apify-client';
import type { JobPost } from '@shared/schema';
import { randomUUID } from 'crypto';

const apifyToken = process.env.APIFY_API_TOKEN || process.env.APIFY_TOKEN;
const client = apifyToken
  ? new ApifyClient({ token: apifyToken })
  : null;

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

// Verified Apify actor IDs (as of 2025)
const ACTORS = {
  X: "apidojo/tweet-scraper",           // Tweet Scraper V2 - most reliable
  REDDIT: "trudax/reddit-scraper",       // Full-featured Reddit scraper
  FACEBOOK: "Lnz4QRVI89bcQAUGQ"          // Facebook search scraper
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

export async function scrapeXPosts(query: string, maxResults: number = 50): Promise<JobPost[]> {
  if (!client) {
    console.log('Apify client not configured');
    return [];
  }
  try {
    // Input schema for apidojo/tweet-scraper (verified from Apify docs)
    // Uses: searchTerms (array), maxItems (not maxTweets), sort, tweetLanguage
    const input = { 
      searchTerms: [query],
      maxItems: maxResults,
      sort: "Latest",
      tweetLanguage: "en",
      proxyConfiguration: getProxyConfiguration()
    };
    console.log('Starting X scraper with query:', query);
    const run = await client.actor(ACTORS.X).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`X scraper returned ${items.length} items`);
    return processItems(items, 'x', maxResults);
  } catch (error) {
    console.error('Error scraping X posts:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function scrapeReddit(query: string, maxResults: number = 20): Promise<JobPost[]> {
  if (!client) {
    console.log('Apify client not configured');
    return [];
  }
  try {
    // Input schema for trudax/reddit-scraper (verified from Apify docs)
    // Uses: startUrls, maxItems, maxPostCount, maxComments, scrollTimeout, proxy
    const startUrls = [
      "https://www.reddit.com/r/forhire/new/",
      "https://www.reddit.com/r/hiring/new/",
      "https://www.reddit.com/r/freelance_forhire/new/",
      "https://www.reddit.com/r/slavelabour/new/",
      "https://www.reddit.com/r/jobbit/new/"
    ];
    
    const input = { 
      startUrls: startUrls.map(url => ({ url })),
      maxItems: maxResults * 2,
      maxPostCount: maxResults * 2,
      maxComments: 0,
      scrollTimeout: 40,
      skipComments: true,
      sort: "new",
      proxy: getProxyConfiguration()
    };
    
    console.log('Starting Reddit scraper');
    const run = await client.actor(ACTORS.REDDIT).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`Reddit scraper returned ${items.length} items`);
    
    // Filter items that match the query keywords
    const queryTerms = query.toLowerCase().split(/\s+or\s+/i).map(t => t.trim().replace(/['"]/g, ''));
    const filteredItems = items.filter((item: any) => {
      const text = (item.title || '') + ' ' + (item.selftext || item.body || '');
      const lowerText = text.toLowerCase();
      return queryTerms.some(term => lowerText.includes(term.toLowerCase()));
    });
    
    console.log(`Reddit filtered to ${filteredItems.length} items matching query`);
    return processItems(filteredItems.length > 0 ? filteredItems : items, 'reddit', maxResults);
  } catch (error) {
    console.error('Error scraping Reddit:', error instanceof Error ? error.message : error);
    return [];
  }
}

export async function scrapeFacebook(query: string, maxResults: number = 20): Promise<JobPost[]> {
  if (!client) {
    console.log('Apify client not configured');
    return [];
  }
  try {
    // Input schema for Lnz4QRVI89bcQAUGQ (facebook_search_scraper)
    // Uses: keyword, results_limit, min/max wait, proxyConfiguration
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
      results_limit: maxResults * 2,
      min_wait_time_in_sec: 1,
      max_wait_time_in_sec: 4,
      proxyConfiguration: getProxyConfiguration()
    };
    
    console.log('Starting Facebook scraper');
    const run = await client.actor(ACTORS.FACEBOOK).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    console.log(`Facebook scraper returned ${items.length} items`);
    
    // Filter by query terms
    const queryTerms = query.toLowerCase().split(/\s+or\s+/i).map(t => t.trim().replace(/['"]/g, ''));
    const filteredItems = items.filter((item: any) => {
      const text = (item.text || item.message || item.postText || item.post_text || item.content || '').toLowerCase();
      return queryTerms.some(term => text.includes(term.toLowerCase()));
    });
    
    console.log(`Facebook filtered to ${filteredItems.length} items`);
    return processItems(filteredItems.length > 0 ? filteredItems : items, 'facebook', maxResults);
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
  "freelancer",
  "gig",
  "paid",
  "budget",
  "rate",
  "[hiring]",
  "[for hire]",
  "contractor",
  "developer needed",
  "designer needed",
  "help wanted",
  "project",
  "job opportunity"
];

const EXCLUDED_PHRASES = ["for hire", "available for work", "open to work", "looking for work", "seeking employment", "looking for job"];

function isHiringPost(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasHiringSignal = HIRING_PHRASES.some((phrase) => normalized.includes(phrase.toLowerCase()));
  const isSelfPromo = EXCLUDED_PHRASES.some((phrase) => {
    const phrasePos = normalized.indexOf(phrase.toLowerCase());
    if (phrasePos === -1) return false;
    const beforePhrase = normalized.substring(Math.max(0, phrasePos - 10), phrasePos);
    return !beforePhrase.includes("looking") && !beforePhrase.includes("need");
  });
  return hasHiringSignal && !isSelfPromo;
}

function buildSourceUrl(item: ScrapedItem, source: 'x' | 'reddit' | 'facebook'): string {
  if (item.url) return item.url;
  if (item.tweetUrl) return item.tweetUrl;
  if (item.tweet_url) return item.tweet_url;
  if (item.statusUrl) return item.statusUrl;
  if (item.status_url) return item.status_url;
  if (source === 'x' && item.id) {
    const user = item.user as { screen_name?: string } | undefined;
    const author = item.author as { userName?: string } | undefined;
    const handle = user?.screen_name || (typeof author === 'object' ? author?.userName : undefined);
    if (handle) {
      return `https://x.com/${handle}/status/${item.id}`;
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
  return item.link || item.postUrl || item.post_url || item.permalink_url || '';
}

function processItems(items: any[], source: 'x' | 'reddit' | 'facebook', maxResults: number): JobPost[] {
  const results = items
    .filter((item: ScrapedItem) => {
      const text = (item.text || item.full_text || item.fullText || item.tweetText || item.tweet_text || item.body || item.selftext || item.title || item.postText || item.post_text || item.message || item.content || '');
      return text.length > 20 && isHiringPost(text);
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
      if (item.created_utc) {
        postedAt = formatTimeAgo(new Date(item.created_utc * 1000).toISOString());
      } else if (item.created_at || item.createdAt) {
        postedAt = formatTimeAgo(item.created_at || item.createdAt || '');
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
        isRemote: fullText.toLowerCase().includes('remote'),
        saved: false,
        applied: false,
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

export async function scrapeJobsForSkills(skills: string[]): Promise<JobPost[]> {
  if (!client || skills.length === 0) {
    console.log('No Apify client or no skills provided');
    return [];
  }
  
  const query = buildSearchQuery(skills);
  console.log('Scraping jobs for skills:', skills.join(', '));
  
  const results = await Promise.allSettled([
    scrapeXPosts(query.x, 10),
    scrapeReddit(query.reddit, 10),
    scrapeFacebook(query.facebook, 10)
  ]);
  
  const xResults = results[0].status === 'fulfilled' ? results[0].value : [];
  const redditResults = results[1].status === 'fulfilled' ? results[1].value : [];
  const fbResults = results[2].status === 'fulfilled' ? results[2].value : [];
  
  console.log(`Scraped: X=${xResults.length}, Reddit=${redditResults.length}, Facebook=${fbResults.length}`);
  
  const all = [...redditResults, ...xResults, ...fbResults];
  
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

function buildSearchQuery(skills: string[]): { x: string; reddit: string; facebook: string } {
  const trimmedSkills = skills.filter(Boolean).slice(0, 5);
  const skillQuery = trimmedSkills.length > 0 ? trimmedSkills.join(' OR ') : "";
  
  return {
    x: `(${skillQuery}) (hiring OR "looking for" OR freelance OR contract OR "need a" OR developer OR designer)`,
    reddit: skillQuery || "developer designer freelance",
    facebook: `${skillQuery} hiring freelance`
  };
}
