import { ApifyClient } from 'apify-client';

interface RedditScraperParams {
  searchQuery: string;
  subreddit?: string;
  maxPosts?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scrapeRedditJobs(params: RedditScraperParams) {
  const token = process.env.APIFY_TOKEN;
  
  if (!token) {
    console.error('[Reddit Scraper] APIFY_TOKEN not configured');
    throw new Error('APIFY_TOKEN environment variable is not set');
  }

  const client = new ApifyClient({ token });

  const input = {
    mode: "search",
    searchQuery: params.searchQuery,
    searchSubreddit: params.subreddit || "forhire+freelance_forhire",
    sort: "new",
    timeFilter: "week",
    maxPosts: params.maxPosts || 5,
    maxComments: 0,
    includeComments: false,
    outputFormat: "json",
    includeImages: false,
    delaySeconds: 1,
    debugMode: false
  };

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Reddit Scraper] Attempt ${attempt}/${MAX_RETRIES} - Query: "${params.searchQuery}"`);
      
      const run = await client.actor("lqOcm2Bgsg4LGNATd").call(input, {
        timeout: 60000, // 60 second timeout
      });
      
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      console.log(`[Reddit Scraper] Success - Found ${items.length} items`);
      
      return items;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Reddit Scraper] Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);
      
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[Reddit Scraper] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  console.error('[Reddit Scraper] All retry attempts exhausted');
  throw lastError || new Error('Reddit scraping failed after all retries');
}
