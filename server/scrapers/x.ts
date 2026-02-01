import { ApifyClient } from 'apify-client';

interface XScraperParams {
  query: string;
  maxItems?: number;
}

export async function scrapeXJobs(params: XScraperParams) {
  const client = new ApifyClient({
    token: process.env.APIFY_TOKEN,
  });

  const input = {
    maxItems: params.maxItems || 5,
    query: params.query,
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

  const run = await client.actor("G8hR9sp2nkjI2om8X").call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  
  return items;
}
