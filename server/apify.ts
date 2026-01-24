import { ApifyClient } from 'apify-client';
import type { JobPost } from '@shared/schema';
import { randomUUID } from 'crypto';

const client = process.env.APIFY_API_TOKEN 
  ? new ApifyClient({ token: process.env.APIFY_API_TOKEN })
  : null;

interface XPost {
  id?: string;
  text?: string;
  full_text?: string;
  author?: {
    userName?: string;
    name?: string;
  };
  user?: {
    screen_name?: string;
    name?: string;
  };
  created_at?: string;
  createdAt?: string;
}

export async function scrapeXPosts(query: string, maxResults: number = 50): Promise<JobPost[]> {
  if (!client) {
    console.log('APIFY_API_TOKEN not configured, using sample data');
    return [];
  }

  try {
    const input = {
      mode: "Search",
      query: query,
      query_type: "Top",
      max_results: maxResults,
    };

    const run = await client.actor("pzMmk1t7AZ8OKJhfU").call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    const jobs: JobPost[] = items
      .filter((item: XPost) => {
        const text = (item.text || item.full_text || '').toLowerCase();
        return text.includes('hire') || 
               text.includes('hiring') || 
               text.includes('looking for') || 
               text.includes('need a') ||
               text.includes('freelance') ||
               text.includes('contractor') ||
               text.includes('remote') ||
               text.includes('developer') ||
               text.includes('designer');
      })
      .map((item: XPost) => {
        const text = item.text || item.full_text || '';
        const author = item.author?.name || item.user?.name || 'Unknown';
        const handle = item.author?.userName || item.user?.screen_name || '';
        const tweetId = item.id || '';
        
        return {
          id: randomUUID(),
          title: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
          description: text,
          source: 'x' as const,
          sourceUrl: `https://x.com/${handle}/status/${tweetId}`,
          author: author,
          authorHandle: handle,
          postedAt: formatTimeAgo(item.created_at || item.createdAt || ''),
          matchedSkills: extractSkills(text),
          budget: extractBudget(text),
          isRemote: text.toLowerCase().includes('remote'),
          saved: false,
          applied: false,
        };
      });

    return jobs;
  } catch (error) {
    console.error('Error scraping X posts:', error);
    return [];
  }
}

function extractSkills(text: string): string[] {
  const skillKeywords = [
    'react', 'node', 'nodejs', 'python', 'javascript', 'typescript',
    'ui', 'ux', 'design', 'figma', 'wordpress', 'shopify', 'seo',
    'mobile', 'ios', 'android', 'flutter', 'react native',
    'aws', 'cloud', 'devops', 'docker', 'kubernetes',
    'data', 'analytics', 'machine learning', 'ai',
    'content', 'writing', 'copywriting', 'marketing',
    'video', 'editing', 'animation', 'graphic design'
  ];

  const lowerText = text.toLowerCase();
  const found: string[] = [];

  for (const skill of skillKeywords) {
    if (lowerText.includes(skill)) {
      const formatted = skill.split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      if (!found.includes(formatted)) {
        found.push(formatted);
      }
    }
  }

  return found.slice(0, 5);
}

function extractBudget(text: string): string | undefined {
  const budgetPatterns = [
    /\$[\d,]+\s*[-–]\s*\$[\d,]+/,
    /\$[\d,]+\+?/,
    /[\d,]+\s*(?:usd|dollars)/i,
    /budget[:\s]+[\$]?[\d,]+/i,
  ];

  for (const pattern of budgetPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return undefined;
}

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return 'Recently';
  
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} weeks ago`;
  } catch {
    return 'Recently';
  }
}

export async function scrapeJobsForSkills(skills: string[]): Promise<JobPost[]> {
  if (!client || skills.length === 0) {
    return [];
  }

  const queries = skills.slice(0, 3).map(skill => 
    `hiring ${skill} OR "looking for ${skill}" OR "need ${skill} developer"`
  );

  const allJobs: JobPost[] = [];

  for (const query of queries) {
    const jobs = await scrapeXPosts(query, 20);
    allJobs.push(...jobs);
  }

  const uniqueJobs = allJobs.reduce((acc, job) => {
    if (!acc.find(j => j.sourceUrl === job.sourceUrl)) {
      acc.push(job);
    }
    return acc;
  }, [] as JobPost[]);

  return uniqueJobs.slice(0, 50);
}
