import { ApifyClient } from 'apify-client';

interface RedditScraperParams {
  searchQuery: string;
  subreddit?: string;
  maxPosts?: number;
}

export async function scrapeRedditJobs(params: RedditScraperParams) {
  const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
  });

  const input = {
    mode: "search",
    searchQuery: params.searchQuery,
    searchSubreddit: params.subreddit || "forhire+freelance_forhire+slavelabour",
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

  const run = await client.actor("lqOcm2Bgsg4LGNATd").call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  return items;
}
