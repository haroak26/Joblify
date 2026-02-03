import { ApifyClient } from 'apify-client';

interface RedditScraperParams {
  searchQuery: string;
  subreddit?: string;
  maxPosts?: number;
}

interface RedditScraperOptions {
  perSubreddit?: boolean; // If true, search each subreddit individually
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const SCRAPER_TIMEOUT = 60000; // 60 seconds
const CIRCUIT_BREAKER_THRESHOLD = 3; // Number of failures before circuit opens
const CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes before trying again

// Circuit breaker state
let circuitBreakerFailures = 0;
let circuitBreakerOpenUntil = 0;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function scrapeRedditJobs(params: RedditScraperParams, options: RedditScraperOptions = {}) {
  const token = process.env.APIFY_TOKEN;
  
  if (!token) {
    console.error('[Reddit Scraper] APIFY_TOKEN not configured');
    throw new Error('APIFY_TOKEN environment variable is not set');
  }

  // Check circuit breaker
  const now = Date.now();
  if (circuitBreakerOpenUntil > now) {
    const waitTime = Math.round((circuitBreakerOpenUntil - now) / 1000);
    console.warn(`[Reddit Scraper] Circuit breaker is open. Waiting ${waitTime}s before retry.`);
    throw new Error(`Circuit breaker open. Try again in ${waitTime} seconds.`);
  }

  const client = new ApifyClient({ token });

  // Validate input parameters
  if (!params.searchQuery || params.searchQuery.trim().length === 0) {
    console.error('[Reddit Scraper] Invalid searchQuery - cannot be empty');
    throw new Error('Search query cannot be empty');
  }

  // Split subreddits and search individually if requested
  if (options.perSubreddit && params.subreddit) {
    const subreddits = params.subreddit.split(/[,+]/);
    if (subreddits.length > 1) {
      console.log(`[Reddit Scraper] Searching ${subreddits.length} subreddits individually`);
      const postsPerSubreddit = Math.ceil((params.maxPosts || 5) / subreddits.length);
      
      const results = await Promise.allSettled(
        subreddits.map(sub => 
          scrapeRedditJobsSingle({
            searchQuery: params.searchQuery,
            subreddit: sub.trim(),
            maxPosts: postsPerSubreddit
          })
        )
      );
      
      // Combine all successful results
      const allPosts = results
        .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);
      
      console.log(`[Reddit Scraper] Combined results from individual searches: ${allPosts.length} items`);
      return allPosts;
    }
  }

  // Single subreddit search (or combined)
  return scrapeRedditJobsSingle(params);
}

async function scrapeRedditJobsSingle(params: RedditScraperParams) {
  const token = process.env.APIFY_TOKEN;
  if (!token) {
    throw new Error('APIFY_TOKEN environment variable is not set');
  }

  const client = new ApifyClient({ token });

  const input = {
    mode: "search",
    searchQuery: params.searchQuery,
    searchSubreddit: (params.subreddit || "forhire+freelance_forhire").replace(/,/g, '+'),
    sort: "new",
    timeFilter: "week",
    maxPosts: params.maxPosts || 5,
    maxComments: 0,
    includeComments: false,
    outputFormat: "text", // Valid values: "markdown", "html", "text"
    includeImages: false,
    delaySeconds: 1,
    debugMode: false
  };

  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[Reddit Scraper] Attempt ${attempt}/${MAX_RETRIES} - Query: "${params.searchQuery}" in r/${input.searchSubreddit}`);
      
      const run = await client.actor("lqOcm2Bgsg4LGNATd").call(input, {
        timeout: SCRAPER_TIMEOUT,
      });
      
      if (!run || !run.defaultDatasetId) {
        throw new Error('Scraper run failed - no dataset returned');
      }
      
      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      console.log(`[Reddit Scraper] Success - Found ${items.length} items`);
      
      // Reset circuit breaker on success
      circuitBreakerFailures = 0;
      
      // Handle empty results gracefully
      if (!items || items.length === 0) {
        console.log('[Reddit Scraper] No items found in results');
      }
      
      return items || [];
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
  
  // Increment circuit breaker failures
  circuitBreakerFailures++;
  if (circuitBreakerFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerOpenUntil = Date.now() + CIRCUIT_BREAKER_TIMEOUT;
    console.error(`[Reddit Scraper] Circuit breaker opened until ${new Date(circuitBreakerOpenUntil).toISOString()}`);
  }
  
  console.error('[Reddit Scraper] All retry attempts exhausted');
  throw lastError || new Error('Reddit scraping failed after all retries');
}
