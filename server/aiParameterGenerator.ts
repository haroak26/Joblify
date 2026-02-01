import OpenAI from "openai";
import type { ScraperParameters } from "@shared/schema";
import { z } from "zod";

let poeClient: OpenAI | null = null;

function getPoeClient(): OpenAI {
  if (poeClient) {
    return poeClient;
  }

  const apiKey = process.env.POE_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Poe API credentials. Set POE_API_KEY (preferred) or OPENAI_API_KEY."
    );
  }

  poeClient = new OpenAI({
    apiKey,
    baseURL: process.env.POE_API_BASE_URL ?? "https://api.poe.com/v1",
  });

  return poeClient;
}

// Freelance-specific subreddits to target
const FREELANCE_SUBREDDITS = [
  "forhire",
  "freelance",
  "freelance_forhire",
  "hiring",
  "jobbit",
  "slavelabour",
  "designjobs",
  "programmingjobs",
];

// Skill-specific subreddit mapping
const SKILL_SUBREDDIT_MAP: Record<string, string[]> = {
  "react": ["reactjs", "webdev"],
  "javascript": ["javascript", "webdev"],
  "typescript": ["typescript", "webdev"],
  "python": ["python", "learnpython"],
  "design": ["design_critiques", "graphic_design"],
  "ui/ux": ["userexperience", "ui_design"],
  "wordpress": ["wordpress", "Wordpress"],
  "writing": ["freelanceWriters", "HireaWriter"],
  "video": ["VideoEditing", "editors"],
};

/**
 * Generate optimal scraper parameters using AI based on user profile
 */
export async function generateScraperParameters(
  skills: string[],
  intro: string,
  experienceLevel?: "beginner" | "mid-level" | "senior",
  location?: string,
  preferences?: string
): Promise<ScraperParameters> {
  try {
    const poeClient = getPoeClient();

    const prompt = `Given a freelancer profile, generate optimal job scraper parameters for Reddit and X/Twitter.

User Profile:
- Skills: ${skills.join(", ")}
- Introduction: ${intro}
${experienceLevel ? `- Experience Level: ${experienceLevel}` : ""}
${location ? `- Location: ${location}` : ""}
${preferences ? `- Preferences: ${preferences}` : ""}

Generate search parameters that will find relevant freelance job postings. Return ONLY a valid JSON object with this exact structure:

{
  "reddit": {
    "subreddits": ["forhire", "freelance", ...],
    "searchKeywords": ["hiring react developer", "need freelance designer", ...],
    "sort": "new",
    "timeFilter": "week"
  },
  "x": {
    "queries": [
      "(hiring OR looking for) (react developer OR frontend engineer) -retweet",
      "freelance (web developer OR webdev) (remote OR anywhere) -retweet",
      ...
    ],
    "filters": {
      "links": "only",
      "verified": "",
      "safe": "on"
    }
  }
}

Guidelines:
1. For Reddit:
   - Include general freelance subreddits: forhire, freelance, freelance_forhire, hiring, jobbit
   - Add skill-specific subreddits (e.g., reactjs, python, webdev for tech skills)
   - Create 3-5 search keywords combining skills with hiring terms
   - Always use sort: "new" and timeFilter: "week" for fresh jobs

2. For X/Twitter:
   - Create 3-5 boolean search queries
   - Combine skills with hiring keywords: "hiring", "looking for", "freelance", "need", "seeking"
   - Use OR operators for skill variations (e.g., "react developer OR frontend engineer")
   - Always include "-retweet" to exclude retweets
   - Use parentheses for proper grouping
   - Keep filters.links as "only", filters.verified as "", filters.safe as "on"

Return only the JSON, no explanation.`;

    const response = await poeClient.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "system",
          content: "You are a job search expert that generates optimal scraper parameters for finding freelance jobs on Reddit and X/Twitter. Always return valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";
    
    // Clean up markdown code blocks if present
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleanContent);

    // Validate and sanitize the response
    const parameters: ScraperParameters = {
      reddit: {
        subreddits: Array.isArray(parsed.reddit?.subreddits) 
          ? parsed.reddit.subreddits.slice(0, 10) 
          : FREELANCE_SUBREDDITS.slice(0, 6),
        searchKeywords: Array.isArray(parsed.reddit?.searchKeywords)
          ? parsed.reddit.searchKeywords.slice(0, 8)
          : generateDefaultKeywords(skills),
        sort: parsed.reddit?.sort === "new" ? "new" : "new",
        timeFilter: parsed.reddit?.timeFilter || "week",
      },
      x: {
        queries: Array.isArray(parsed.x?.queries)
          ? parsed.x.queries.slice(0, 8)
          : generateDefaultXQueries(skills),
        filters: {
          links: parsed.x?.filters?.links || "only",
          verified: parsed.x?.filters?.verified || "",
          safe: parsed.x?.filters?.safe || "on",
        },
      },
      generatedAt: new Date(),
    };

    return parameters;
  } catch (error) {
    console.error("Error generating scraper parameters:", error);
    
    // Fallback to rule-based parameter generation
    return generateFallbackParameters(skills, intro);
  }
}

/**
 * Generate fallback parameters when AI generation fails
 */
function generateFallbackParameters(skills: string[], intro: string): ScraperParameters {
  const subreddits = [...FREELANCE_SUBREDDITS];
  
  // Add skill-specific subreddits
  skills.forEach(skill => {
    const skillLower = skill.toLowerCase();
    Object.entries(SKILL_SUBREDDIT_MAP).forEach(([key, subs]) => {
      if (skillLower.includes(key)) {
        subreddits.push(...subs);
      }
    });
  });

  // Deduplicate
  const uniqueSubreddits = [...new Set(subreddits)].slice(0, 10);

  return {
    reddit: {
      subreddits: uniqueSubreddits,
      searchKeywords: generateDefaultKeywords(skills),
      sort: "new",
      timeFilter: "week",
    },
    x: {
      queries: generateDefaultXQueries(skills),
      filters: {
        links: "only",
        verified: "",
        safe: "on",
      },
    },
    generatedAt: new Date(),
  };
}

/**
 * Generate default search keywords for Reddit
 */
function generateDefaultKeywords(skills: string[]): string[] {
  const keywords: string[] = [];
  const hiringTerms = ["hiring", "looking for", "need", "seeking"];
  
  skills.slice(0, 5).forEach(skill => {
    hiringTerms.slice(0, 2).forEach(term => {
      keywords.push(`${term} ${skill}`);
    });
  });

  return keywords.slice(0, 8);
}

/**
 * Generate default X/Twitter queries
 */
function generateDefaultXQueries(skills: string[]): string[] {
  const queries: string[] = [];
  
  // Create skill variations
  skills.slice(0, 3).forEach(skill => {
    queries.push(`(hiring OR "looking for") (${skill}) (freelance OR contract OR remote) -retweet`);
  });

  // Add a general freelance query
  const topSkills = skills.slice(0, 3).join(" OR ");
  if (topSkills) {
    queries.push(`(freelance OR contract) (${topSkills}) (hiring OR needed OR wanted) -retweet`);
  }

  return queries.slice(0, 5);
}

/**
 * Update scraper parameters based on user profile changes
 */
export async function shouldRegenerateParameters(
  lastGeneratedAt: Date | null,
  skillsChanged: boolean,
  introChanged: boolean
): Promise<boolean> {
  // Regenerate if parameters were never generated
  if (!lastGeneratedAt) {
    return true;
  }

  // Regenerate if skills changed
  if (skillsChanged) {
    return true;
  }

  // Regenerate if intro changed significantly and parameters are old
  const daysSinceGeneration = (Date.now() - lastGeneratedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (introChanged && daysSinceGeneration > 7) {
    return true;
  }

  return false;
}
