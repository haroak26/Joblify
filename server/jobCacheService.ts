import OpenAI from 'openai';
import type { JobPost, Skill, JobCache, InsertJobCache } from '@shared/schema';
import { storage } from './storage';
import { randomUUID } from 'crypto';

// Validate API key is available
const apiKey = process.env.POE_API_KEY;
if (!apiKey) {
  console.warn('WARNING: No POE API key found. Job cache AI features will not work.');
}

const openai = new OpenAI({ 
  apiKey: apiKey || 'dummy-key-for-graceful-degradation',
  baseURL: process.env.POE_API_BASE_URL ?? "https://api.poe.com/v1"
});

/**
 * Generate AI-powered tags for a job post
 * Tags include: skills, categories, job types, etc.
 */
async function generateJobTags(title: string, description: string): Promise<string[]> {
  if (!apiKey) {
    console.warn('[JobCache] No API key, returning basic tags');
    return extractBasicTags(title, description);
  }

  try {
    const prompt = `Analyze this job post and extract relevant tags/categories for matching with freelancers.

Job Title: ${title}
Job Description: ${description.substring(0, 500)}

Extract 5-10 tags that describe:
1. Required skills (e.g., "react", "python", "ui/ux design")
2. Job categories (e.g., "web development", "mobile development", "writing")
3. Job type (e.g., "freelance", "contract", "remote")
4. Industry/domain if mentioned (e.g., "healthcare", "finance", "education")

Return ONLY a JSON array of lowercase tags, nothing else.
Example: ["web development", "react", "frontend", "remote", "freelance"]`;

    const response = await openai.chat.completions.create({
      model: 'claude-3.5-haiku',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content || '{"tags": []}';
    const parsed = JSON.parse(content);
    
    // Handle different response formats
    let tags: string[] = [];
    if (Array.isArray(parsed)) {
      tags = parsed;
    } else if (parsed.tags && Array.isArray(parsed.tags)) {
      tags = parsed.tags;
    } else {
      // Fallback to any array in the object
      const values = Object.values(parsed);
      tags = values.find(v => Array.isArray(v)) as string[] || [];
    }
    
    // Normalize tags: lowercase, trim, dedupe
    const normalizedTags = Array.from(new Set(
      tags
        .map(t => String(t).toLowerCase().trim())
        .filter(t => t.length > 2 && t.length < 50)
    )).slice(0, 15); // Max 15 tags
    
    console.log('[JobCache] AI generated tags:', normalizedTags.length);
    return normalizedTags;
    
  } catch (error) {
    console.error('[JobCache] Error generating AI tags:', error);
    return extractBasicTags(title, description);
  }
}

/**
 * Fallback: Extract basic tags using keyword matching
 */
function extractBasicTags(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase();
  const tags = new Set<string>();
  
  // Common skill keywords
  const skillKeywords = [
    'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java', 'go', 'rust',
    'node', 'nodejs', 'express', 'django', 'flask', 'spring', 'laravel',
    'html', 'css', 'tailwind', 'bootstrap',
    'ui/ux', 'design', 'figma', 'photoshop', 'illustrator',
    'writing', 'content', 'copywriting', 'technical writing',
    'seo', 'marketing', 'social media',
    'data', 'analytics', 'machine learning', 'ai',
    'mobile', 'ios', 'android', 'flutter', 'react native',
    'web development', 'frontend', 'backend', 'fullstack', 'full stack'
  ];
  
  for (const keyword of skillKeywords) {
    if (text.includes(keyword)) {
      tags.add(keyword);
    }
  }
  
  // Job type keywords
  if (text.match(/\b(freelance|freelancer)\b/)) tags.add('freelance');
  if (text.match(/\b(remote)\b/)) tags.add('remote');
  if (text.match(/\b(contract|contractor)\b/)) tags.add('contract');
  if (text.match(/\b(part[- ]?time)\b/)) tags.add('part-time');
  if (text.match(/\b(full[- ]?time)\b/)) tags.add('full-time');
  
  return Array.from(tags).slice(0, 10);
}

/**
 * Save scraped jobs to the global cache with AI-generated tags
 */
export async function saveJobsToCache(jobs: JobPost[]): Promise<JobCache[]> {
  if (jobs.length === 0) return [];
  
  console.log(`[JobCache] Processing ${jobs.length} jobs for cache`);
  
  const jobsToCache: Omit<InsertJobCache, 'expiresAt'>[] = [];
  
  for (const job of jobs) {
    try {
      // Generate tags using AI
      const tags = await generateJobTags(job.title, job.description);
      
      // Convert postedAt to Date if it's a string
      const postedDate = typeof job.postedAt === 'string' 
        ? new Date(job.postedAt) 
        : job.postedAt;
      
      jobsToCache.push({
        title: job.title,
        description: job.description,
        source: job.source,
        sourceUrl: job.sourceUrl,
        author: job.author,
        authorHandle: job.authorHandle || null,
        postedAt: postedDate,
        budget: job.budget || null,
        isRemote: job.isRemote,
        tags,
        rawData: job.rawData || null,
      });
    } catch (error) {
      console.error('[JobCache] Error processing job for cache:', job.sourceUrl, error);
      // Continue with other jobs
    }
  }
  
  // Save to database
  const savedJobs = await storage.saveToJobCache(jobsToCache);
  console.log(`[JobCache] Saved ${savedJobs.length} jobs to cache`);
  
  return savedJobs;
}

/**
 * Search the job cache for relevant jobs based on user skills and intro
 * Returns cached jobs that match, avoiding the need to call Apify
 */
export async function searchCachedJobs(
  intro: string, 
  skills: Skill[], 
  limit: number = 10
): Promise<{ jobs: JobPost[], fromCache: boolean }> {
  
  if (skills.length === 0) {
    return { jobs: [], fromCache: false };
  }
  
  console.log(`[JobCache] Searching cache for ${skills.length} skills, limit: ${limit}`);
  
  // Extract search tags from user skills
  const searchTags = skills.map(s => s.name.toLowerCase().trim());
  
  // Also extract potential tags from intro using AI
  try {
    const introTags = await extractIntroTags(intro);
    searchTags.push(...introTags);
  } catch (error) {
    console.log('[JobCache] Could not extract intro tags, continuing with skill tags only');
  }
  
  // Remove duplicates
  const uniqueTags = Array.from(new Set(searchTags));
  console.log('[JobCache] Search tags:', uniqueTags.slice(0, 10).join(', '));
  
  // Search cache
  const cachedJobs = await storage.searchJobCache(uniqueTags, limit);
  console.log(`[JobCache] Found ${cachedJobs.length} cached jobs`);
  
  if (cachedJobs.length === 0) {
    return { jobs: [], fromCache: false };
  }
  
  // Convert JobCache to JobPost format and score by relevance
  const jobPosts: JobPost[] = cachedJobs.map(cached => {
    // Calculate relevance based on tag matches
    const jobTags = (cached.tags as string[]) || [];
    const matchedTags = jobTags.filter(tag => 
      uniqueTags.some(userTag => 
        tag.includes(userTag) || userTag.includes(tag)
      )
    );
    
    const relevanceScore = matchedTags.length;
    
    return {
      id: randomUUID(),
      title: cached.title,
      description: cached.description,
      source: cached.source,
      sourceUrl: cached.sourceUrl,
      author: cached.author,
      authorHandle: cached.authorHandle || undefined,
      postedAt: cached.postedAt.toISOString(),
      matchedSkills: matchedTags,
      budget: cached.budget || undefined,
      isRemote: cached.isRemote,
      saved: false,
      applied: false,
      relevanceScore,
      rawData: cached.rawData,
      scrapedAt: cached.scrapedAt,
    };
  });
  
  // Sort by relevance
  const sortedJobs = jobPosts.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  return { jobs: sortedJobs, fromCache: true };
}

/**
 * Extract potential search tags from user's intro
 */
async function extractIntroTags(intro: string): Promise<string[]> {
  if (!intro || intro.length < 10 || !apiKey) {
    return [];
  }
  
  try {
    const prompt = `Based on this freelancer's introduction, extract 3-5 relevant skill/category tags that would help match them with job posts.

Introduction: ${intro.substring(0, 300)}

Return ONLY a JSON array of lowercase tags.
Example: ["web development", "design", "marketing"]`;

    const response = await openai.chat.completions.create({
      model: 'claude-3.5-haiku',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 100,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content || '{"tags": []}';
    const parsed = JSON.parse(content);
    
    let tags: string[] = [];
    if (Array.isArray(parsed)) {
      tags = parsed;
    } else if (parsed.tags && Array.isArray(parsed.tags)) {
      tags = parsed.tags;
    }
    
    return tags.map(t => String(t).toLowerCase().trim()).slice(0, 5);
  } catch (error) {
    console.error('[JobCache] Error extracting intro tags:', error);
    return [];
  }
}

/**
 * Cleanup expired jobs from cache
 * Should be called periodically (e.g., daily via scheduler)
 */
export async function cleanupExpiredJobs(): Promise<number> {
  console.log('[JobCache] Starting cleanup of expired jobs');
  const deletedCount = await storage.cleanupExpiredCachedJobs();
  console.log(`[JobCache] Cleanup complete: removed ${deletedCount} expired jobs`);
  return deletedCount;
}
