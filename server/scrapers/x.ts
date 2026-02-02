import { ApifyClient } from 'apify-client';

interface XScraperParams {
  query: string;
  maxItems?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const SCRAPER_TIMEOUT = 60000; // 60 seconds

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scrapeXJobs(params: XScraperParams) {
  const token = process.env.APIFY_TOKEN;
  
  if (!token) {
    console.error('[X Scraper] APIFY_TOKEN not configured');
    throw new Error('APIFY_TOKEN environment variable is not set');
  }

  // Validate input parameters
  if (!params.query || params.query.trim().length === 0) {
    console.error('[X Scraper] Invalid query - cannot be empty');
    throw new Error('Search query cannot be empty');
  }

  const client = new ApifyClient({ token });

  const input = {
    maxItems: params.maxItems || 5,
    query: params.query.trim(),
    outputFormat: "text", // Valid values: "markdown", "html", "text"
    replies: "",
    retweets: "",
    quotes: "",
    verified: "",
    links: "",
    media: "",
    images: "",
    videos: "",
    nativeVideos: "",
    proVideos: "",
    news: "",
    safe: "",
    near: ""
  };

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[X Scraper] Attempt ${attempt}/${MAX_RETRIES} - Query: "${params.query}"`);
      
      const run = await client.actor("G8hR9sp2nkjI2om8X").call(input, {
        timeout: SCRAPER_TIMEOUT,
      });
      
      if (!run || !run.defaultDatasetId) {
        throw new Error('Scraper run failed - no dataset returned');
      }
      
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      console.log(`[X Scraper] Success - Found ${items.length} items`);
      
      // Handle empty results gracefully
      if (!items || items.length === 0) {
        console.log('[X Scraper] No items found in results');
      }
      
      return items || [];
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[X Scraper] Attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message);
      
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`[X Scraper] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  console.error('[X Scraper] All retry attempts exhausted');
  throw lastError || new Error('X scraping failed after all retries');
}
