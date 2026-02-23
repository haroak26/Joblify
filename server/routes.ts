import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, PLAN_LIMITS } from "./storage";
import { z } from "zod";
import { 
  skillSchema, normalizePlan, resumes, users, usage as usageTable, type ResumeData, resumeDataSchema, type Resume, createEmptyResumeData,
  redeemableCodes, perks, userPerks, subscriptions, type PlanType, aiUsageLogs,
  mailingLists, userMailingLists, chatConversations, resumeReviewHistory
} from "@shared/schema";
import { buildUsageThresholdState, type UsageFeatureKey } from "@shared/usage-thresholds";
import { requireAuth, requireVerifiedEmail, hashPassword, verifyPassword, isStrongPassword } from "./auth";
import OpenAI from "openai";
import { addContactToBrevoList } from './brevo';
import { validateFile, getFileTypeName } from './lib/fileValidation';
import { aiRateLimit } from './middleware/security';
import { csrfTokenEndpoint } from './middleware/csrf';
import { ResumePDFGenerator } from './lib/resumePDFGenerator';
import { resumeArtifactStorage } from "./lib/resumeArtifactStorage";
import { db } from "./db";
import { eq, desc, and, sql, count, gte } from "drizzle-orm";
import PDFDocument from "pdfkit";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import rateLimit from "express-rate-limit";
import { mkdtemp, readdir, readFile, rm, writeFile } from "fs/promises";
import crypto from "crypto";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";
import { execFile } from "child_process";
import {
  isStripeConfigured,
  getOrCreateCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  findPromotionCodeId,
  retrieveCheckoutSession,
  verifyWebhookSignature,
  retrieveSubscription,
  getPlanByPriceId,
  listActiveSubscriptions,
  cancelSubscription,
  deleteCustomer,
} from "./lib/stripe";

// Rate limiter for public contact/newsletter endpoints to prevent spam
const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes per IP
  message: "Too many requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Validation schemas
 */
const jobDescriptionSchema = z.object({
  jobDescription: z.string().max(10000, "Job description is too long (max 10,000 characters)").optional()
});

const newsletterRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 subscription attempts per hour per IP
  message: "Too many subscription attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

let poeClient: OpenAI | null = null;
const execFileAsync = promisify(execFile);

async function trackUsageThresholdEvent(userId: string, feature: UsageFeatureKey, stage: "notice_70" | "cta_90" | "blocked_100") {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const eventName = `usage_${stage}_${feature}`;

  const [existing] = await db
    .select({ id: aiUsageLogs.id })
    .from(aiUsageLogs)
    .where(and(
      eq(aiUsageLogs.userId, userId),
      eq(aiUsageLogs.featureName, eventName),
      gte(aiUsageLogs.createdAt, monthStart),
    ))
    .limit(1);

  if (!existing) {
    await db.insert(aiUsageLogs).values({
      userId,
      featureName: eventName,
      success: true,
      tokensUsed: null,
    });
  }
}

async function getUsageThresholdForFeature(userId: string, feature: UsageFeatureKey, currentUsage: number) {
  const subscription = await storage.getSubscription(userId);
  const plan = normalizePlan(subscription?.plan);
  const limits = PLAN_LIMITS[plan];

  const currentLimit =
    feature === "ai_edits"
      ? limits.maxAIEditsPerMonth
      : feature === "cover_letters"
        ? limits.maxCoverLettersPerMonth
        : limits.maxATSScansPerMonth;

  const threshold = buildUsageThresholdState({
    feature,
    plan,
    currentUsage,
    currentLimit,
  });

  if (threshold.stage === "notice_70" || threshold.stage === "cta_90" || threshold.stage === "blocked_100") {
    await trackUsageThresholdEvent(userId, feature, threshold.stage);
  }

  return { threshold, plan, limits };
}

function isStudentEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith(".edu") || normalized.endsWith(".sch.uk");
}

function getPoeClient(): OpenAI {
  if (poeClient) {
    return poeClient;
  }

  const apiKey = process.env.POE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Poe API credentials. Set POE_API_KEY."
    );
  }

  poeClient = new OpenAI({
    apiKey,
    baseURL: process.env.POE_API_BASE_URL ?? "https://api.poe.com/v1",
  });

  return poeClient;
}


// Middleware to check if user has AI access
async function requireAIAccess(req: Request, res: Response, next: NextFunction) {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    
    if (user.aiAccessBlocked) {
      return res.status(403).json({ 
        error: "AI access has been restricted on your account. Please contact support for more information." 
      });
    }
    
    next();
  } catch (error) {
    console.error("Error checking AI access:", error);
    return res.status(500).json({ error: "Failed to verify AI access" });
  }
}

// ============================================
// ATS Scanner Helper Functions
// ============================================

/**
 * Convert resume data to plain text for ATS analysis
 */

async function extractTextFromUpload(file: Express.Multer.File): Promise<string> {
  const validation = validateFile(file.buffer, file.mimetype);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid file format");
  }

  if (file.mimetype === "application/pdf") {
    const pdfData = await pdfParse(file.buffer);
    return (pdfData.text || "").trim();
  }

  if (file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return (result.value || "").trim();
  }

  throw new Error("Unsupported file format");
}

type ResumeDesignReview = {
  summary: string;
  overallVisualScore: number;
  hierarchy: { score: number; notes: string[] };
  readability: { score: number; notes: string[] };
  spacingAndDensity: { score: number; notes: string[] };
  sectionBalance: { score: number; notes: string[] };
  consistency: { score: number; notes: string[] };
  scannability: { score: number; notes: string[] };
  atsRiskLayoutPatterns: string[];
  pageComments: Array<{ page: number; strengths: string[]; issues: string[]; recommendations: string[] }>;
};

async function renderPdfToPageImages(fileBuffer: Buffer, maxPages = 4): Promise<Array<{ page: number; dataUrl: string }>> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "resume-review-"));
  const pdfPath = path.join(tempDir, "resume.pdf");
  const outPrefix = path.join(tempDir, "page");

  try {
    await writeFile(pdfPath, fileBuffer);

    let pages = maxPages;
    try {
      const info = await execFileAsync("pdfinfo", [pdfPath]);
      const match = info.stdout.match(/Pages:\s+(\d+)/i);
      if (match) {
        pages = Math.min(maxPages, Math.max(1, Number(match[1])));
      }
    } catch {
      // Best effort only; we'll default to maxPages.
    }

    await execFileAsync("pdftoppm", ["-png", "-f", "1", "-l", String(pages), pdfPath, outPrefix]);

    const files = (await readdir(tempDir))
      .filter((name) => name.startsWith("page-") && name.endsWith(".png"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const pageImages = await Promise.all(
      files.map(async (name, index) => {
        const fullPath = path.join(tempDir, name);
        const image = await readFile(fullPath);
        return {
          page: index + 1,
          dataUrl: `data:image/png;base64,${image.toString("base64")}`,
        };
      })
    );

    return pageImages;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function performVisualResumeReview(file: Express.Multer.File, idealJob: string, concerns?: string): Promise<ResumeDesignReview | null> {
  if (file.mimetype !== "application/pdf") {
    return null;
  }

  const pageImages = await renderPdfToPageImages(file.buffer);
  if (!pageImages.length) {
    return null;
  }

  const poe = getPoeClient();
  const aiResponse = await poe.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      {
        role: "system",
        content: `You are an expert in resume visual design and ATS-safe layout auditing.
Review page images and return strict JSON only:
{
  "summary": "",
  "overallVisualScore": <0-100>,
  "hierarchy": {"score": <0-100>, "notes": [""]},
  "readability": {"score": <0-100>, "notes": [""]},
  "spacingAndDensity": {"score": <0-100>, "notes": [""]},
  "sectionBalance": {"score": <0-100>, "notes": [""]},
  "consistency": {"score": <0-100>, "notes": [""]},
  "scannability": {"score": <0-100>, "notes": [""]},
  "atsRiskLayoutPatterns": [""],
  "pageComments": [{"page": <number>, "strengths": [""], "issues": [""], "recommendations": [""]}]
}`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `IDEAL JOB: ${idealJob}\n\nUSER CONCERNS: ${concerns?.trim() || "None provided"}\n\nEvaluate visual hierarchy, readability, spacing, section balance, consistency, scannability, and ATS-risk layout patterns. Include specific page-level feedback tied to page numbers.`,
          },
          ...pageImages.map((pageImage) => ({
            type: "image_url" as const,
            image_url: {
              url: pageImage.dataUrl,
            },
          })),
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 2200,
  });

  const content = aiResponse.choices[0]?.message?.content || "{}";
  // Clean content of control characters that might break JSON.parse
  const cleanedContent = content.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
  return JSON.parse(cleanedContent) as ResumeDesignReview;
}


function getNormalizedResumeData(rawData: unknown): ResumeData {
  const parsed = resumeDataSchema.safeParse(rawData);
  if (parsed.success) {
    return parsed.data;
  }

  return createEmptyResumeData();
}

function convertResumeDataToText(resumeData: ResumeData): string {
  const sections: string[] = [];

  // Personal Info
  if (resumeData.personalInfo) {
    const pi = resumeData.personalInfo;
    sections.push([pi.name, pi.email, pi.phone, pi.location].filter(Boolean).join(' | '));
  }

  // Summary
  if (resumeData.summary) {
    sections.push(`PROFESSIONAL SUMMARY\n${resumeData.summary}`);
  }

  // Experience
  if (resumeData.experience?.length > 0) {
    sections.push('EXPERIENCE');
    resumeData.experience.forEach(exp => {
      sections.push(`${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})`);
      exp.description?.forEach(desc => sections.push(`• ${desc}`));
    });
  }

  // Education
  if (resumeData.education?.length > 0) {
    sections.push('EDUCATION');
    resumeData.education.forEach(edu => {
      sections.push(`${edu.degree} in ${edu.field}, ${edu.school} (${edu.graduationDate})`);
    });
  }

  // Skills
  if (resumeData.skills?.length > 0) {
    sections.push(`SKILLS\n${resumeData.skills.join(', ')}`);
  }

  // Certifications
  if (resumeData.certifications?.length > 0) {
    sections.push('CERTIFICATIONS');
    resumeData.certifications.forEach(cert => {
      sections.push(`${cert.name} - ${cert.issuer} (${cert.date})`);
    });
  }

  // Projects
  if (resumeData.projects?.length > 0) {
    sections.push('PROJECTS');
    resumeData.projects.forEach(proj => {
      sections.push(`${proj.name}: ${proj.description}`);
      if (proj.technologies?.length > 0) {
        sections.push(`Technologies: ${proj.technologies.join(', ')}`);
      }
    });
  }

  return sections.join('\n\n');
}

/**
 * Extract important keywords from text
 */
function extractKeywords(text: string): string[] {
  const commonKeywords = new Set<string>();
  const normalizedText = text.toLowerCase();
  
  // Technical skills patterns
  const techPatterns = [
    /\b(JavaScript|TypeScript|Python|Java|C\+\+|Ruby|PHP|Swift|Kotlin|Go|Rust|SQL|NoSQL)\b/gi,
    /\b(React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|\.NET|ASP\.NET|Laravel|Symfony|Rails|FastAPI)\b/gi,
    /\b(PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|Cassandra|DynamoDB|Oracle|MariaDB)\b/gi,
    /\b(AWS|Azure|GCP|Docker|Kubernetes|CI\/CD|DevOps|Terraform|Ansible|Jenkins|CircleCI)\b/gi,
    /\b(Git|Agile|Scrum|Jira|REST API|GraphQL|Microservices|Serverless|TDD|BDD)\b/gi,
    /\b(HTML5?|CSS3?|Sass|Less|Tailwind|Bootstrap|Material UI|Chakra UI)\b/gi,
    /\b(Redux|MobX|Zustand|Recoil|React Query|SWR)\b/gi,
    /\b(Jest|Cypress|Selenium|Puppeteer|Mocha|Chai|Vitest)\b/gi,
    /\b(Webpack|Vite|Rollup|Parcel|Babel|ESLint|Prettier)\b/gi,
    /\b(Linux|Unix|Windows|macOS|Android|iOS)\b/gi,
  ];

  // Soft skills and professional concepts
  const professionalPatterns = [
    /\b(leadership|management|communication|collaboration|teamwork|mentoring|coaching)\b/gi,
    /\b(analytical|problem-solving|critical thinking|strategic|innovation|creativity)\b/gi,
    /\b(project management|product management|agile methodology|scrum master|kanban)\b/gi,
    /\b(customer service|client relations|stakeholder management|sales|marketing)\b/gi,
    /\b(data analysis|machine learning|artificial intelligence|deep learning|data science)\b/gi,
    /\b(security|cybersecurity|compliance|risk management|quality assurance)\b/gi,
  ];

  // Extract technical keywords
  techPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Only add if not already present (case-insensitive check)
        const exists = Array.from(commonKeywords).some(k => k.toLowerCase() === match.toLowerCase());
        if (!exists) commonKeywords.add(match);
      });
    }
  });

  // Extract professional concepts
  professionalPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const exists = Array.from(commonKeywords).some(k => k.toLowerCase() === match.toLowerCase());
        if (!exists) commonKeywords.add(match);
      });
    }
  });

  // Extract action verbs
  const actionVerbs = text.match(/\b(managed|led|developed|created|implemented|designed|achieved|increased|reduced|improved|optimized|built|launched|delivered|coordinated|analyzed|established|drove|executed|facilitated|generated|initiated|mentored|negotiated|organized|planned|resolved|spearheaded|streamlined|supervised|trained|pioneered|transformed|accelerated|maximized|minimized|revitalized)\b/gi);
  if (actionVerbs) {
    actionVerbs.forEach(verb => {
      const exists = Array.from(commonKeywords).some(k => k.toLowerCase() === verb.toLowerCase());
      if (!exists) commonKeywords.add(verb.toLowerCase());
    });
  }

  return Array.from(commonKeywords);
}

/**
 * Perform real data-driven ATS analysis
 */
type ATSStructuredSignals = {
  hasContactInfo?: boolean;
  hasExperienceSection?: boolean;
  hasEducationSection?: boolean;
  hasSkillsSection?: boolean;
  hasBulletPoints?: boolean;
};

async function performATSAnalysis(resumeText: string, jobDescription: string, structuredSignals?: ATSStructuredSignals): Promise<any> {
  const normalizedResume = resumeText.toLowerCase().replace(/[\s\n\r]+/g, ' ');
  
  // Extract keywords from job description if provided
  const jobKeywords = jobDescription 
    ? extractKeywords(jobDescription)
    : [];

  // Identify found and missing keywords with improved matching
  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];

  jobKeywords.forEach(keyword => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match whole words or common variations (e.g., "React" matches "React.js")
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
    
    if (regex.test(normalizedResume) || normalizedResume.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    } else {
      missingKeywords.push(keyword);
    }
  });

  // Analyze resume structure with improved detection
  const hasContactInfo = structuredSignals?.hasContactInfo ?? /email|phone|linkedin|github|address|location|@/i.test(normalizedResume);
  const hasExperienceSection = structuredSignals?.hasExperienceSection ?? /experience|work history|employment|professional background|career/i.test(normalizedResume);
  const hasEducationSection = structuredSignals?.hasEducationSection ?? /education|academic|degree|university|college|school/i.test(normalizedResume);
  const hasSkillsSection = structuredSignals?.hasSkillsSection ?? /skills|competencies|expertise|technologies|technical proficiencies/i.test(normalizedResume);
  const hasBulletPoints = structuredSignals?.hasBulletPoints ?? /[•·\*■\-\u2022\u2023\u25E6\u2043\u2219]/.test(resumeText);
  const hasActionVerbs = /(managed|led|developed|created|implemented|designed|achieved|increased|reduced|improved|pioneered|transformed|accelerated|maximized|minimized|revitalized)/i.test(normalizedResume);
  
  // Calculate scores for each category
  const formatScore = calculateFormatScore(resumeText);
  
  let keywordScore = 0;
  if (jobDescription && jobKeywords.length > 0) {
    // Weighted keyword score: focus on technical skills if they are present
    keywordScore = (foundKeywords.length / jobKeywords.length) * 100;
  } else {
    keywordScore = calculateGeneralKeywordScore(resumeText);
  }
  
  const structureScore = calculateStructureScore({
    hasContactInfo,
    hasExperienceSection,
    hasEducationSection,
    hasSkillsSection,
  });

  const contentScore = calculateContentScore({
    hasBulletPoints,
    hasActionVerbs,
    wordCount: resumeText.split(/\s+/).length,
  });

  // Calculate overall score with adjusted weights
  const overallScore = Math.round(
    (formatScore * 0.20 + keywordScore * 0.40 + structureScore * 0.20 + contentScore * 0.20)
  );

  // Generate intelligent suggestions
  const suggestions: string[] = [];
  
  if (formatScore < 80) {
    suggestions.push("Simplify your resume format. Avoid complex layouts, tables, or excessive graphics which can confuse ATS parsers.");
  }
  
  if (!hasContactInfo) {
    suggestions.push("Add clear contact information (email, phone, LinkedIn) at the top. Ensure your email is professional.");
  }
  
  if (!hasExperienceSection) {
    suggestions.push("Clearly label your professional experience section using standard headers like 'Work Experience' or 'Professional Experience'.");
  }
  
  if (!hasSkillsSection) {
    suggestions.push("Create a dedicated Skills section. This helps both recruiters and ATS systems quickly identify your core proficiencies.");
  }
  
  if (!hasBulletPoints) {
    suggestions.push("Use standard bullet points to describe your achievements. This significantly improves readability for both humans and machines.");
  }
  
  if (!hasActionVerbs) {
    suggestions.push("Start your bullet points with strong action verbs (e.g., 'Spearheaded', 'Optimized', 'Delivered') rather than passive language.");
  }
  
  if (jobDescription && missingKeywords.length > 0) {
    const topMissing = missingKeywords.slice(0, 5);
    suggestions.push(`Tailor your content by naturally incorporating these key terms from the job description: ${topMissing.join(', ')}.`);
  }
  
  const wordCount = resumeText.split(/\s+/).length;
  if (wordCount < 300) {
    suggestions.push("Your resume is quite short. Expand on your accomplishments using the STAR method (Situation, Task, Action, Result) to provide more context.");
  } else if (wordCount > 1000) {
    suggestions.push("Your resume is very long. Consider condensing your content to focus on your most relevant and recent achievements.");
  }

  // Build category breakdown
  const categories = [
    {
      name: "Format Compatibility",
      score: formatScore,
      feedback: formatScore >= 80 
        ? "Excellent! Your resume uses a clean, ATS-friendly layout." 
        : "Warning: Your formatting might be difficult for some ATS systems to parse correctly.",
    },
    {
      name: "Keyword Optimization",
      score: Math.round(keywordScore),
      feedback: keywordScore >= 75
        ? "Great job! Your resume contains a strong set of industry-relevant keywords."
        : jobDescription
        ? "Moderate alignment. Try to incorporate more specific terminology from the job posting."
        : "Improvement needed. Add more industry-specific technical and soft skills.",
    },
    {
      name: "Section Structure",
      score: structureScore,
      feedback: structureScore >= 80
        ? "Your resume is well-organized with all essential sections present."
        : "Missing sections. Ensure you have clear headers for Experience, Education, and Skills.",
    },
    {
      name: "Content Quality",
      score: contentScore,
      feedback: contentScore >= 80
        ? "High quality! You use strong action verbs and clear bullet points to highlight achievements."
        : "Focus on impact. Use more action-oriented language and quantifiable results in your bullet points.",
    },
  ];

  return {
    score: overallScore,
    keywords: foundKeywords.slice(0, 20),
    missingKeywords: missingKeywords.slice(0, 15),
    suggestions,
    categories,
  };
}

/**
 * Calculate format compatibility score
 */
function calculateFormatScore(text: string): number {
  let score = 100;
  
  // Penalize complex formatting indicators
  if (/<[^>]+>/g.test(text)) score -= 20; // HTML tags
  if (/\t{2,}/g.test(text)) score -= 10; // Multiple tabs
  if (/\|{3,}/g.test(text)) score -= 15; // Table indicators
  
  return Math.max(0, score);
}

/**
 * Calculate general keyword score (when no job description)
 */
function calculateGeneralKeywordScore(text: string): number {
  const keywords = extractKeywords(text);
  // Base score on number of relevant keywords found
  // 0-5 keywords = low, 6-15 = medium, 16+ = high
  if (keywords.length >= 16) return 90;
  if (keywords.length >= 10) return 75;
  if (keywords.length >= 6) return 60;
  return 40;
}

/**
 * Calculate structure score based on essential sections
 */
function calculateStructureScore(sections: {
  hasContactInfo: boolean;
  hasExperienceSection: boolean;
  hasEducationSection: boolean;
  hasSkillsSection: boolean;
}): number {
  let score = 0;
  if (sections.hasContactInfo) score += 30;
  if (sections.hasExperienceSection) score += 30;
  if (sections.hasEducationSection) score += 20;
  if (sections.hasSkillsSection) score += 20;
  return score;
}

/**
 * Calculate content quality score
 */
function calculateContentScore(content: {
  hasBulletPoints: boolean;
  hasActionVerbs: boolean;
  wordCount: number;
}): number {
  let score = 0;
  if (content.hasBulletPoints) score += 40;
  if (content.hasActionVerbs) score += 40;
  if (content.wordCount >= 300 && content.wordCount <= 800) score += 20;
  else if (content.wordCount >= 200) score += 10;
  return score;
}


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // CSRF token endpoint - allows client to get/refresh token
  app.get("/api/csrf-token", csrfTokenEndpoint);
  
  app.get("/api/profile", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      const profile = await storage.getProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error('[API] Error fetching profile for user:', userId, error);
      res.status(500).json({ 
        error: "Failed to fetch profile",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "PROFILE_FETCH_ERROR"
      });
    }
  });

  app.post("/api/profile", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      const schema = z.object({
        intro: z.string(),
        skills: z.array(skillSchema),
        isComplete: z.boolean().optional(),
      });
      
      const data = schema.parse(req.body);
      console.log('[API] Profile data validated - skills:', data.skills.length, 'intro length:', data.intro.length);
      
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const planLimits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

      // Check skills limit
      const skillCheck = await storage.canAddSkills(userId, data.skills.length);
      if (!skillCheck.allowed) {
        return res.status(403).json({ 
          error: "Skills limit reached", 
          code: "SKILLS_LIMIT",
          limit: skillCheck.limit,
          current: data.skills.length,
          message: planLimits.maxSkills === Infinity
            ? "Skills limit reached."
            : `Your plan allows up to ${skillCheck.limit} skills. Upgrade to Plus, Ultra, or Lifetime for unlimited skills.`
        });
      }
      
      // Get old profile to check if skills changed
      const oldProfile = await storage.getProfile(userId);
      const profile = await storage.setProfile(userId, data);
      
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] Profile validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid profile data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error saving profile for user:', userId, error);
        res.status(500).json({ 
          error: "Failed to save profile",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "PROFILE_SAVE_ERROR"
        });
      }
    }
  });

  app.get("/api/skills", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      const profile = await storage.getProfile(userId);
      res.json({ skills: profile.skills });
    } catch (error) {
      console.error('[API] Error fetching skills for user:', userId, error);
      res.status(500).json({ 
        error: "Failed to fetch skills",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "SKILLS_FETCH_ERROR"
      });
    }
  });

  app.post("/api/skills", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      const schema = z.object({
        skills: z.array(skillSchema),
      });
      
      const { skills } = schema.parse(req.body);
      console.log('[API] Skills validated - count:', skills.length);
      
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const planLimits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

      // Check skills limit
      const skillCheck = await storage.canAddSkills(userId, skills.length);
      if (!skillCheck.allowed) {
        return res.status(403).json({ 
          error: "Skills limit reached", 
          code: "SKILLS_LIMIT",
          limit: skillCheck.limit,
          current: skills.length,
          message: planLimits.maxSkills === Infinity
            ? "Skills limit reached."
            : `Your plan allows up to ${skillCheck.limit} skills. Upgrade to Plus, Ultra, or Lifetime for unlimited skills.`
        });
      }
      
      const profile = await storage.getProfile(userId);
      const updated = await storage.setProfile(userId, { ...profile, skills });
      
      res.json({ skills: updated.skills });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] Skills validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid skills data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error saving skills for user:', userId, error);
        res.status(500).json({ 
          error: "Failed to save skills",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "SKILLS_SAVE_ERROR"
        });
      }
    }
  });

  app.post("/api/suggest-skills", aiRateLimit, requireAuth, requireAIAccess, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      const schema = z.object({
        intro: z.string().min(10),
      });
      
      const { intro } = schema.parse(req.body);
      console.log('[API] Intro validated - length:', intro.length);
      
      const response = await getPoeClient().chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are a career advisor that suggests relevant professional skills based on someone's background and experience. Analyze the user's introduction and suggest 5-8 specific, marketable skills that would be valuable in their career. Focus on skills that are in-demand in the job market and would strengthen their resume. Return only a JSON array of skill names, nothing else. Example: ["React", "UI/UX Design", "Node.js", "TypeScript"]`
          },
          {
            role: "user",
            content: intro
          }
        ],
        max_tokens: 200,
      });
      
      const content = response.choices[0]?.message?.content || '{"skills":[]}';
      let skills: string[] = [];
      
      try {
        // AI models sometimes wrap JSON in markdown blocks or return slightly different structures
        const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleanContent);
        
        // Handle both ["skill1", "skill2"] and {"skills": ["skill1", "skill2"]} formats
        if (Array.isArray(parsed)) {
          skills = parsed;
        } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.skills)) {
          skills = parsed.skills;
        } else if (parsed && typeof parsed === 'object') {
          // Fallback for other object structures
          skills = Object.values(parsed).find(val => Array.isArray(val)) || [];
        }
      } catch (e) {
        console.error('[API] Failed to parse AI skills response:', e instanceof Error ? e.message : 'Parse error');
        // Simple regex fallback if JSON parsing fails
        const matches = content.match(/"([^"]+)"/g);
        if (matches) {
          skills = matches.map(m => m.replace(/"/g, "")).filter(s => s.length > 2 && s.length < 30);
        }
      }
      
      res.json({ skills: skills.slice(0, 10) });
    } catch (error) {
      console.error('[API] Error suggesting skills:', error instanceof Error ? error.message : 'Unknown error');
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: "Invalid input", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        res.status(500).json({ 
          error: "Failed to suggest skills",
          message: error instanceof Error ? error.message : "AI service unavailable",
          code: "AI_ERROR"
        });
      }
    }
  });

  app.post("/api/cover-letter/generate", aiRateLimit, requireAuth, requireAIAccess, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      const schema = z.object({
        resumeId: z.string().min(1, "Resume ID is required"),
        jobDescription: z.string().min(20, "Job description must be at least 20 characters"),
        tone: z.enum(["professional", "enthusiastic", "creative"]).default("professional"),
        writingStyleAnswers: z.array(z.string().trim().min(10).max(500)).length(3),
      });

      const { resumeId, jobDescription, tone, writingStyleAnswers } = schema.parse(req.body);

      // Check cover letter usage limits
      const usage = await storage.checkAndResetMonthlyUsage(userId);
      const { threshold: coverLetterThreshold, plan, limits: planLimits } = await getUsageThresholdForFeature(
        userId,
        "cover_letters",
        usage.coverLettersThisMonth,
      );

      if (usage.coverLettersThisMonth >= planLimits.maxCoverLettersPerMonth) {
        return res.status(403).json({
          error: "Cover letter limit reached",
          code: "COVER_LETTER_LIMIT",
          limit: planLimits.maxCoverLettersPerMonth,
          current: usage.coverLettersThisMonth,
          threshold: coverLetterThreshold,
          upgradeModal: {
            feature: "cover_letters",
            recommendedPlan: coverLetterThreshold.recommendedPlan,
            unlockedAmount: coverLetterThreshold.unlockedAmount,
            currentLimit: coverLetterThreshold.currentLimit,
            recommendedLimit: coverLetterThreshold.recommendedLimit,
          },
          message: planLimits.maxCoverLettersPerMonth === Infinity
            ? "Cover letter limit reached."
            : `Your plan allows up to ${planLimits.maxCoverLettersPerMonth} cover letters per month. Upgrade to ${plan === 'free' ? 'Plus' : 'Ultra'} for more.`
        });
      }

      const [resume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, resumeId));
      
      if (!resume || resume.userId !== userId) {
        return res.status(404).json({ error: "Resume not found" });
      }

      const normalizedResumeData = getNormalizedResumeData(resume.resumeData);
      const resumeText = convertResumeDataToText(normalizedResumeData);

      const toneInstructions = {
        professional: "Write in a formal, business-appropriate tone. Be confident but not overly enthusiastic.",
        enthusiastic: "Write with energy and passion. Show genuine excitement about the opportunity while remaining professional.",
        creative: "Write with personality and creativity. Stand out while maintaining professionalism.",
      };

      const selectedToneInstruction = toneInstructions[tone];
      const writingStyleContext = writingStyleAnswers
        .map((answer, index) => `Question ${index + 1} answer: ${answer}`)
        .join("\n");

      const systemPrompt = [
        "You are an expert cover letter writer. Create a compelling, personalized cover letter based on the user's resume and the job description they're applying to.",
        "",
        "Guidelines:",
        `- ${selectedToneInstruction}`,
        "- Keep it to 3-4 concise paragraphs",
        "- Keep the final result professional and business-appropriate for hiring managers",
        "- Start with a strong opening that grabs attention",
        "- Highlight 2-3 key qualifications that match the job requirements",
        "- Show genuine interest in the role and company",
        "- End with a call to action",
        "- Use the candidate's name from their resume",
        "- Be specific about their achievements",
        "- Do NOT use generic phrases or clichés",
        "- Make it authentic and personal",
        "- Write like a real person, not a robot. Use natural, conversational language.",
        "- Match the candidate writing style notes below so the letter sounds like them.",
        "- Keep the voice human, specific, and believable. Avoid sounding scripted.",
        "- NEVER use em dashes (the long dash character). Use commas, periods, or semicolons instead.",
        "- Avoid overused phrases like \"I am thrilled\", \"I am excited to apply\", \"I believe I would be a great fit\". Be genuine and specific instead.",
        "- Keep sentences varied in length. Mix short punchy sentences with longer ones.",
        "- Use simple, direct language. Prefer \"use\" over \"utilize\", \"help\" over \"facilitate\".",
        "",
        "Return ONLY the cover letter text, no additional commentary.",
      ].join("\n");

      const response = await getPoeClient().chat.completions.create({
        model: "claude-4.5-haiku",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Job Description:\n${jobDescription}\n\nCandidate's Resume:\n${resumeText}\n\nCandidate writing style notes:\n${writingStyleContext}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "";
      const coverLetter = await storage.createCoverLetter({
        userId,
        resumeId,
        content,
        jobDescription,
        writingStyleAnswers,
      });

      // Increment cover letter usage count
      await db
        .update(usageTable)
        .set({ 
          coverLettersThisMonth: sql`${usageTable.coverLettersThisMonth} + 1` 
        })
        .where(eq(usageTable.userId, userId));

      const postActionThreshold = buildUsageThresholdState({
        feature: "cover_letters",
        plan,
        currentUsage: usage.coverLettersThisMonth + 1,
        currentLimit: planLimits.maxCoverLettersPerMonth,
      });

      res.json({
        id: coverLetter.id,
        content,
        tone,
        createdAt: coverLetter.createdAt,
        threshold: postActionThreshold,
      });
    } catch (error) {
      console.error('[API] Error generating cover letter:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid input",
          details: error.errors,
          code: "VALIDATION_ERROR",
        });
      }
      res.status(500).json({ error: "Failed to generate cover letter" });
    }
  });

  app.get("/api/cover-letters", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const letters = await storage.getCoverLetters(userId);
      res.json(letters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error("[API] Error fetching cover letters:", error);
      res.status(500).json({ error: "Failed to fetch cover letters" });
    }
  });
  // ============================================
  // Password Change Endpoint
  // ============================================
  app.post("/api/user/change-password", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      // Validate new password strength
      const passwordCheck = isStrongPassword(newPassword);
      if (!passwordCheck.valid) {
        return res.status(400).json({ error: passwordCheck.message });
      }

      // Get user from database
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isValid = await verifyPassword(user.password, currentPassword);
      if (!isValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash and update new password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedPassword });

      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error('[API] Error changing password:', error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // ============================================
  // 2FA Endpoints
  // ============================================
  
  // Get 2FA status
  app.get("/api/user/2fa/status", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        enabled: user.twoFactorEnabled,
      });
    } catch (error) {
      console.error('[API] Error getting 2FA status:', error);
      res.status(500).json({ error: "Failed to get 2FA status" });
    }
  });

  // Enable 2FA - email-based verification
  app.post("/api/user/2fa/enable", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (user.twoFactorEnabled) {
        return res.status(400).json({ error: "2FA is already enabled" });
      }

      // Enable 2FA (email-based)
      await storage.updateUser(userId, {
        twoFactorEnabled: true,
        twoFactorSecret: null, // Not needed for email-based 2FA
        backupCodes: [], // Not needed for email-based 2FA
      });

      res.json({
        success: true,
        message: "2FA enabled successfully. You will receive a verification code via email when you log in.",
      });
    } catch (error) {
      console.error('[API] Error enabling 2FA:', error);
      res.status(500).json({ error: "Failed to enable 2FA" });
    }
  });

  // Start disable 2FA flow - password + verification email
  app.post("/api/user/2fa/disable/request", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Password is required to disable 2FA" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify password
      const isValid = await verifyPassword(user.password, password);
      if (!isValid) {
        return res.status(400).json({ error: "Incorrect password" });
      }

      const { generate2FACode, get2FACodeExpiry } = await import("./lib/email2fa");
      const { send2FAEmail } = await import("./email");

      const code = generate2FACode();
      const expiresAt = get2FACodeExpiry();

      await storage.createVerificationCode({
        userId,
        code,
        codeType: "disable_2fa",
        expiresAt,
      });

      const emailSent = await send2FAEmail(user.email, user.username, code);
      if (!emailSent) {
        return res.status(500).json({ error: "Failed to send verification code" });
      }

      res.json({ success: true, message: "Verification code sent to your email" });
    } catch (error) {
      console.error('[API] Error requesting 2FA disable:', error);
      res.status(500).json({ error: "Failed to request 2FA disable" });
    }
  });

  app.post("/api/user/2fa/disable/confirm", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Verification code is required" });
      }

      const verificationCode = await storage.getLatestVerificationCode(userId, "disable_2fa");
      if (!verificationCode) {
        return res.status(400).json({ error: "No verification code found. Request a new code." });
      }

      if (verificationCode.expiresAt < new Date()) {
        return res.status(400).json({ error: "Verification code has expired" });
      }

      if (verificationCode.code !== code) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      await storage.markVerificationCodeAsUsed(verificationCode.id);

      await storage.updateUser(userId, {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        backupCodes: [],
      });

      res.json({ success: true, message: "2FA disabled successfully" });
    } catch (error) {
      console.error('[API] Error disabling 2FA:', error);
      res.status(500).json({ error: "Failed to disable 2FA" });
    }
  });

  // ============================================
  // User Preferences Endpoints
  // ============================================
  
  // Get user preferences
  app.get("/api/user/preferences", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        emailNotifications: user.emailNotifications ?? true,
        marketingEmails: user.marketingEmails ?? true,
        weeklySummaryEmails: user.weeklySummaryEmails ?? true,
        inAppNotifications: user.inAppNotifications ?? true,
      });
    } catch (error) {
      console.error('[API] Error getting preferences:', error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  // Save user preferences
  app.post("/api/user/preferences", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const {
        emailNotifications,
        marketingEmails,
        weeklySummaryEmails,
        inAppNotifications,
      } = req.body;

      // Update preferences
      await storage.updateUser(userId, {
        emailNotifications: emailNotifications ?? undefined,
        marketingEmails: marketingEmails ?? undefined,
        weeklySummaryEmails: weeklySummaryEmails ?? undefined,
        inAppNotifications: inAppNotifications ?? undefined,
      });

      res.json({ success: true, message: "Preferences updated successfully" });
    } catch (error) {
      console.error('[API] Error saving preferences:', error);
      res.status(500).json({ error: "Failed to save preferences" });
    }
  });

  // Get onboarding status
  app.get("/api/user/onboarding-status", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      
      // Check if user has created a resume
      const userResumes = await db
        .select()
        .from(resumes)
        .where(eq(resumes.userId, userId))
        .limit(1);
      const hasCreatedResume = userResumes.length > 0;
      
      // Check if user has created a cover letter
      const usage = await storage.getUsage(userId);
      const hasCreatedCoverLetter = usage.coverLettersThisMonth > 0;
      
      // Check if user has gotten ATS score
      const hasGottenATSScore = usage.atsScansThisMonth > 0;
      
      res.json({
        hasCreatedResume,
        hasCreatedCoverLetter,
        hasGottenATSScore,
      });
    } catch (error) {
      console.error('[API] Error getting onboarding status:', error);
      res.status(500).json({ error: "Failed to get onboarding status" });
    }
  });

  // Get subscription details
  app.get("/api/subscription", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      console.log('[API] Fetching subscription for user:', userId);
      let subscription = await storage.getSubscription(userId);
      
      if (!subscription) {
        console.log('[API] No subscription found, creating free one for user:', userId);
        subscription = await storage.createSubscription(userId, "free");
      }
      
      const plan = normalizePlan(subscription.plan);
      const planLimits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
      
      const maxSkills = planLimits.maxSkills === Infinity ? -1 : planLimits.maxSkills;
      const maxJobsPerMonth = planLimits.maxImportedResumesPerMonth === Infinity ? -1 : planLimits.maxImportedResumesPerMonth;
      
      res.json({
        subscription,
        limits: {
          maxSkills,
          maxJobsPerMonth,
          maxSchedules: 0,
          hasScheduleAccess: false,
        },
      });
    } catch (error) {
      console.error('[API] Error getting subscription:', error);
      res.status(500).json({ error: "Failed to get subscription data" });
    }
  });

  const billingSchema = z.object({
    plan: z.enum(["student", "plus", "ultra"]),
    couponCode: z.string().trim().min(1).max(64).optional(),
  });

  app.post("/api/billing/checkout", requireAuth, async (req: Request, res) => {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Billing is not configured" });
    }

    try {
      const userId = req.session.userId!;
      const { plan, couponCode } = billingSchema.parse(req.body);

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (plan === "student" && !isStudentEmail(user.email)) {
        return res.status(403).json({
          error: "Student plan requires a valid school email ending in .edu or .sch.uk",
          code: "STUDENT_EMAIL_REQUIRED",
        });
      }

      let subscription = await storage.getSubscription(userId);
      if (!subscription) {
        subscription = await storage.createSubscription(userId, "free");
      }

      const customer = await getOrCreateCustomer({
        email: user.email,
        name: user.name,
        userId,
        existingCustomerId: subscription.stripeCustomerId,
      });

      let promotionCodeId: string | null = null;
      if (couponCode) {
        promotionCodeId = await findPromotionCodeId(couponCode);
        if (!promotionCodeId) {
          return res.status(400).json({ error: "Invalid or expired coupon code" });
        }
      }

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const session = await createCheckoutSession({
        customerId: customer.id,
        userId,
        email: user.email,
        plan,
        promotionCodeId,
        successUrl: `${baseUrl}/dashboard/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${baseUrl}/dashboard/account?checkout=cancelled`,
      });

      await storage.updateSubscription(userId, {
        stripeCustomerId: customer.id,
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid billing request", details: error.errors });
      }
      console.error("[Billing] Failed to create checkout session", error);
      res.status(500).json({ error: "Failed to start checkout" });
    }
  });

  app.post("/api/billing/checkout/confirm", requireAuth, async (req: Request, res) => {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Billing is not configured" });
    }

    try {
      const userId = req.session.userId!;
      const body = z.object({ sessionId: z.string().min(1) }).parse(req.body);
      const session = await retrieveCheckoutSession(body.sessionId);

      if (session.metadata?.userId !== userId) {
        return res.status(403).json({ error: "Checkout session does not belong to this account" });
      }

      const stripeSubscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

      if (!stripeSubscriptionId) {
        return res.status(400).json({ error: "Checkout session has no subscription" });
      }

      const stripeSub = typeof session.subscription === "string"
        ? await retrieveSubscription(stripeSubscriptionId)
        : session.subscription;

      const priceId = stripeSub.items?.data?.[0]?.price?.id;
      const plan = getPlanByPriceId(priceId);

      await storage.updateSubscription(userId, {
        plan,
        status: stripeSub.cancel_at_period_end ? "cancelled" : (stripeSub.status === "past_due" ? "past_due" : "active"),
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
        stripeSubscriptionId: stripeSub.id,
        currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
        renewalReminderSent: false,
      });

      // Ensure only one active Stripe subscription remains for this customer
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (customerId) {
        const activeSubs = await listActiveSubscriptions(customerId);
        await Promise.all(activeSubs
          .filter((sub: any) => sub.id !== stripeSub.id)
          .map((sub: any) => cancelSubscription(sub.id, true)));
      }

      return res.json({ success: true, plan });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid confirmation request", details: error.errors });
      }
      console.error("[Billing] Failed to confirm checkout", error);
      return res.status(500).json({ error: "Failed to confirm checkout" });
    }
  });

  app.post("/api/billing/portal", requireAuth, async (req: Request, res) => {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Billing is not configured" });
    }

    try {
      const userId = req.session.userId!;
      const sub = await storage.getSubscription(userId);
      if (!sub?.stripeCustomerId) {
        return res.status(400).json({ error: "No billing profile found for this user" });
      }

      const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
      const portal = await createBillingPortalSession(sub.stripeCustomerId, `${baseUrl}/dashboard/account`);
      return res.json({ url: portal.url });
    } catch (error) {
      console.error("[Billing] Failed to create portal session", error);
      return res.status(500).json({ error: "Failed to open billing portal" });
    }
  });

  app.post("/api/billing/cancel", requireAuth, async (req: Request, res) => {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Billing is not configured" });
    }

    try {
      const userId = req.session.userId!;
      const sub = await storage.getSubscription(userId);

      if (!sub?.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active Stripe subscription found" });
      }

      const cancelled = await cancelSubscription(sub.stripeSubscriptionId, false);
      await storage.updateSubscription(userId, {
        status: "cancelled",
        currentPeriodEnd: cancelled.current_period_end ? new Date(cancelled.current_period_end * 1000) : sub.currentPeriodEnd,
      });

      return res.json({ success: true, message: "Subscription will cancel at period end" });
    } catch (error) {
      console.error("[Billing] Failed to cancel subscription", error);
      return res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  app.post("/api/webhooks/stripe", async (req: Request, res) => {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).json({ error: "Stripe webhook is not configured" });
    }

    const sig = req.headers["stripe-signature"] as string | undefined;
    if (!req.rawBody || !verifyWebhookSignature(req.rawBody, sig)) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body;

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (userId) {
          const stripeSub = await retrieveSubscription(session.subscription);
          const plan = getPlanByPriceId(stripeSub.items?.data?.[0]?.price?.id);

          await storage.updateSubscription(userId, {
            plan,
            status: stripeSub.cancel_at_period_end ? "cancelled" : (stripeSub.status === "past_due" ? "past_due" : "active"),
            stripeCustomerId: session.customer || null,
            stripeSubscriptionId: stripeSub.id,
            currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
            renewalReminderSent: false,
          });

          const activeSubs = await listActiveSubscriptions(session.customer);
          await Promise.all(activeSubs
            .filter((sub: any) => sub.id !== stripeSub.id)
            .map((sub: any) => cancelSubscription(sub.id, true)));
        }
      }

      if (["customer.subscription.updated", "customer.subscription.deleted", "customer.subscription.created"].includes(event.type)) {
        const stripeSub = event.data.object;
        const customerId = stripeSub.customer;

        const [localSub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeCustomerId, customerId))
          .limit(1);

        const plan = stripeSub.status === "canceled"
          ? "free"
          : getPlanByPriceId(stripeSub.items?.data?.[0]?.price?.id);

        if (localSub) {
          await storage.updateSubscription(localSub.userId, {
            plan,
            status: stripeSub.status === "canceled" ? "cancelled" : (stripeSub.status === "past_due" ? "past_due" : "active"),
            stripeCustomerId: customerId || null,
            stripeSubscriptionId: stripeSub.status === "canceled" ? null : stripeSub.id,
            currentPeriodEnd: stripeSub.current_period_end ? new Date(stripeSub.current_period_end * 1000) : null,
          });
        }
      }

      return res.json({ received: true });
    } catch (error) {
      console.error("[Billing] Webhook handling failed", error);
      return res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  app.delete("/api/account", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const sub = await storage.getSubscription(userId);
      if (sub?.stripeCustomerId && isStripeConfigured()) {
        const activeSubs = await listActiveSubscriptions(sub.stripeCustomerId);
        await Promise.all(activeSubs.map((stripeSub: any) => cancelSubscription(stripeSub.id, true)));
        await deleteCustomer(sub.stripeCustomerId);
      }

      await storage.addDeletedAccount(user.email, "User requested account deletion");
      await storage.deleteUser(userId);

      req.session.destroy(() => undefined);
      res.clearCookie("connect.sid");

      return res.json({ success: true });
    } catch (error) {
      console.error("[Account] Failed to delete account", error);
      return res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Get usage statistics
  app.get("/api/usage", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      console.log('[API] Fetching usage for user:', userId);
      
      // Get usage data
      const usage = await storage.checkAndResetMonthlyUsage(userId);
      
      // Get user's profile to count skills
      const profile = await storage.getProfile(userId);
      const skillsCount = profile.skills.length;
      
      // Get user's subscription to determine limits
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const planLimits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
      
      // Get resume count
      const resumeResult = await db
        .select({ count: count() })
        .from(resumes)
        .where(eq(resumes.userId, userId));
      const resumesCount = Number(resumeResult[0]?.count || 0);
      
      // Schedules are not implemented yet, so we use 0
      const schedulesCount = 0;
      
      // Calculate limits (convert Infinity to -1 for frontend)
      const maxSkills = planLimits.maxSkills === Infinity ? -1 : planLimits.maxSkills;
      const maxAIEdits = planLimits.maxAIEditsPerMonth === Infinity ? -1 : planLimits.maxAIEditsPerMonth;
      const maxCoverLetters = planLimits.maxCoverLettersPerMonth === Infinity ? -1 : planLimits.maxCoverLettersPerMonth;
      const maxAIBuilderActions = planLimits.maxAIBuilderActionsPerMonth === Infinity ? -1 : planLimits.maxAIBuilderActionsPerMonth;
      const maxJobAnalyses = planLimits.maxJobAnalysesPerMonth === Infinity ? -1 : planLimits.maxJobAnalysesPerMonth;
      const maxATSScans = planLimits.maxATSScansPerMonth === Infinity ? -1 : planLimits.maxATSScansPerMonth;
      const maxImportedResumes = planLimits.maxImportedResumesPerMonth === Infinity ? -1 : planLimits.maxImportedResumesPerMonth;
      const maxResumes = planLimits.maxResumes === Infinity ? -1 : planLimits.maxResumes;
      const maxJobsPerJobMatchScan = planLimits.maxJobsPerJobMatchScan === Infinity ? -1 : (planLimits.maxJobsPerJobMatchScan ?? 5);
      const maxResumeReviews = planLimits.maxResumeReviewsPerMonth === Infinity ? -1 : (planLimits.maxResumeReviewsPerMonth ?? 1);
      
      // Schedules limits (not implemented, so no access for now)
      const maxSchedules = 0;
      const hasScheduleAccess = false;
      
      // Calculate remaining usage
      const remainingSkills = maxSkills === -1 ? -1 : Math.max(0, maxSkills - skillsCount);
      const remainingAIEdits = maxAIEdits === -1 ? -1 : Math.max(0, maxAIEdits - usage.aiEditsThisMonth);
      const remainingCoverLetters = maxCoverLetters === -1 ? -1 : Math.max(0, maxCoverLetters - usage.coverLettersThisMonth);
      const remainingAIBuilderActions = maxAIBuilderActions === -1 ? -1 : Math.max(0, maxAIBuilderActions - usage.aiBuilderActionsThisMonth);
      const remainingJobAnalyses = maxJobAnalyses === -1 ? -1 : Math.max(0, maxJobAnalyses - usage.jobAnalysesThisMonth);
      const remainingATSScans = maxATSScans === -1 ? -1 : Math.max(0, maxATSScans - usage.atsScansThisMonth);
      const remainingImportedResumes = maxImportedResumes === -1 ? -1 : Math.max(0, maxImportedResumes - usage.importedResumesThisMonth);
      const remainingResumeReviews = maxResumeReviews === -1 ? -1 : Math.max(0, maxResumeReviews - usage.resumeReviewsThisMonth);
      const remainingSchedules = maxSchedules === 0 ? 0 : Math.max(0, maxSchedules - schedulesCount);
      const remainingResumes = maxResumes === -1 ? -1 : Math.max(0, maxResumes - resumesCount);

      const featureThresholds = {
        aiEdits: buildUsageThresholdState({
          feature: "ai_edits",
          plan,
          currentUsage: usage.aiEditsThisMonth,
          currentLimit: planLimits.maxAIEditsPerMonth,
        }),
        coverLetters: buildUsageThresholdState({
          feature: "cover_letters",
          plan,
          currentUsage: usage.coverLettersThisMonth,
          currentLimit: planLimits.maxCoverLettersPerMonth,
        }),
        atsScans: buildUsageThresholdState({
          feature: "ats_scans",
          plan,
          currentUsage: usage.atsScansThisMonth,
          currentLimit: planLimits.maxATSScansPerMonth,
        }),
      };

      await Promise.all(
        Object.values(featureThresholds)
          .filter((item) => item.stage === "notice_70" || item.stage === "cta_90" || item.stage === "blocked_100")
          .map((item) => trackUsageThresholdEvent(userId, item.feature, item.stage as "notice_70" | "cta_90" | "blocked_100"))
      );
      
      res.json({
        plan,
        usage: {
          skillsCount,
          resumesCount,
          jobsScrapedThisMonth: usage.importedResumesThisMonth,
          aiEditsThisMonth: usage.aiEditsThisMonth,
          importedResumesThisMonth: usage.importedResumesThisMonth,
          jobAnalysesThisMonth: usage.jobAnalysesThisMonth,
          coverLettersThisMonth: usage.coverLettersThisMonth,
          aiBuilderActionsThisMonth: usage.aiBuilderActionsThisMonth,
          atsScansThisMonth: usage.atsScansThisMonth,
          jobMatchJobsThisMonth: usage.jobMatchJobsThisMonth,
          resumeReviewsThisMonth: usage.resumeReviewsThisMonth,
          schedulesCount,
          monthResetDate: usage.monthResetDate.toISOString(),
        },
        limits: {
          maxSkills,
          maxJobsPerMonth: maxImportedResumes,
          maxSchedules,
          hasScheduleAccess,
          maxAIEdits,
          maxCoverLetters,
          maxAIBuilderActions,
          maxJobAnalyses,
          maxATSScans,
          maxImportedResumes,
          maxResumes,
          maxJobsPerJobMatchScan,
          maxResumeReviews,
        },
        remaining: {
          skills: remainingSkills,
          jobsThisMonth: remainingImportedResumes,
          aiEdits: remainingAIEdits,
          schedules: remainingSchedules,
          coverLetters: remainingCoverLetters,
          aiBuilderActions: remainingAIBuilderActions,
          jobAnalyses: remainingJobAnalyses,
          atsScans: remainingATSScans,
          importedResumes: remainingImportedResumes,
          resumeReviews: remainingResumeReviews,
          resumes: remainingResumes,
        },
        thresholds: featureThresholds,
      });
    } catch (error) {
      console.error('[API] Error getting usage data:', error);
      res.status(500).json({ error: "Failed to get usage data" });
    }
  });

  // ============================================
  // Resume Endpoints
  // ============================================

  // Get resume limits for current user
  app.get("/api/resumes/limits", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check resume limits
      const resumeCheck = await storage.canAddResume(userId);
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      
      res.json({
        canCreate: resumeCheck.allowed,
        limit: resumeCheck.limit,
        current: resumeCheck.current,
        plan,
        aiAccessBlocked: user.aiAccessBlocked || false,
      });
    } catch (error) {
      console.error('[API] Error fetching resume limits:', error);
      res.status(500).json({ error: "Failed to fetch resume limits" });
    }
  });

  app.get("/api/resumes", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      // Get all resumes for this user
      const userResumes = await db
        .select()
        .from(resumes)
        .where(eq(resumes.userId, userId))
        .orderBy(desc(resumes.updatedAt));

      res.json(userResumes);
    } catch (error) {
      console.error('[API] Error fetching resumes:', error);
      res.status(500).json({ error: "Failed to fetch resumes" });
    }
  });

  // Create a new resume
  app.post("/api/resumes", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      // Check resume limit
      const resumeCheck = await storage.canAddResume(userId);
      if (!resumeCheck.allowed) {
        const subscription = await storage.getSubscription(userId);
        const plan = normalizePlan(subscription?.plan);
        const planLimits = PLAN_LIMITS[plan];
        
        return res.status(403).json({ 
          error: "Resume limit reached", 
          code: "RESUME_LIMIT",
          limit: resumeCheck.limit,
          current: resumeCheck.current,
          message: planLimits.maxResumes === Infinity
            ? "Resume limit reached."
            : `Your plan allows up to ${resumeCheck.limit} resumes. Upgrade to Ultra or Lifetime for unlimited resumes.`
        });
      }

      // Validate request body
      const createSchema = z.object({
        title: z.string().min(1).optional(),
        template: z.string().optional(),
        resumeData: resumeDataSchema.optional(),
      });

      const data = createSchema.parse(req.body);

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      // Create resume with provided data or empty data
      const [newResume] = await db
        .insert(resumes)
        .values({
          userId,
          title: data.title || (user?.name ? `${user.name}'s Resume` : "Untitled Resume"),
          template: data.template || "modern",
          resumeData: data.resumeData || createEmptyResumeData(),
        })
        .returning();

      // Track feature usage
      // Note: Tracking is non-critical and failures won't affect resume creation
      // Errors are logged for monitoring but don't block the user's workflow
      const { trackFeatureUsage, FEATURES } = await import("./email-engagement");
      trackFeatureUsage(userId, FEATURES.RESUME_BUILDER).catch(err => {
        console.error("Failed to track resume builder usage:", err);
      });

      res.status(201).json(newResume);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] Resume creation validation error:', error.errors);
        return res.status(400).json({ 
          error: "Invalid resume data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      console.error('[API] Error creating resume:', error);
      res.status(500).json({ error: "Failed to create resume" });
    }
  });

  // Get a single resume by ID
  app.get("/api/resumes/:id", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Resume ID is required" });
      }

      // Get resume from database
      const [resume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, id));

      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // Check if user owns this resume
      if (resume.userId !== userId) {
        return res.status(403).json({ error: "You do not have permission to access this resume" });
      }

      res.json(resume);
    } catch (error) {
      console.error('[API] Error fetching resume:', error);
      res.status(500).json({ error: "Failed to fetch resume" });
    }
  });

  // Update a resume
  app.patch("/api/resumes/:id", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Resume ID is required" });
      }

      // Get resume from database
      const [resume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, id));

      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // Check if user owns this resume
      if (resume.userId !== userId) {
        return res.status(403).json({ error: "You do not have permission to update this resume" });
      }

      // Validate and update resume
      const updateSchema = z.object({
        title: z.string().min(1).optional(),
        template: z.string().optional(),
        resumeData: resumeDataSchema.optional(),
        aiBuilderComponents: z.array(z.string()).optional(),
        aiBuilderCompleted: z.boolean().optional(),
      });

      const updates = updateSchema.parse(req.body);

      const [updatedResume] = await db
        .update(resumes)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(resumes.id, id))
        .returning();

      res.json(updatedResume);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] Resume validation error:', error.errors);
        return res.status(400).json({ 
          error: "Invalid resume data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      console.error('[API] Error updating resume:', error);
      res.status(500).json({ error: "Failed to update resume" });
    }
  });

  // Tailor an existing resume for a provided job description
  app.post("/api/resumes/:id/tailor", aiRateLimit, requireAuth, requireAIAccess, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Resume ID is required", message: "Resume ID is required" });
      }

      const schema = z.object({
        jobDescription: z.string().min(40, "Please provide a fuller job description (at least 40 characters)").max(12000),
      });
      const { jobDescription } = schema.parse(req.body);

      const [resume] = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
      if (!resume || resume.userId !== userId) {
        return res.status(404).json({ error: "Resume not found", message: "Resume not found" });
      }

      const baseData = getNormalizedResumeData(resume.resumeData);
      const baseResumeText = convertResumeDataToText(baseData).slice(0, 18000);
      const poe = getPoeClient();

      const aiResponse = await poe.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `You are an expert resume editor.
Given a JSON resume and job description, return strict JSON only:
{
  "resumeData": <valid resume JSON with same shape>,
  "enhancements": ["specific improvement 1", "specific improvement 2", "specific improvement 3"],
  "titleSuffix": "Tailored"
}
Rules:
- Preserve factual integrity; do not invent employers, dates, credentials, or outcomes.
- Keep edits ATS-friendly and keyword-relevant.
- Prioritize summary, skills, and bullet phrasing to match role requirements.
- Keep writing natural and human, professional but not stiff.
- Avoid AI-sounding phrases, empty buzzwords, and repetitive wording.
- Keep structure valid for our resume schema.`,
          },
          {
            role: "user",
            content: `JOB DESCRIPTION:\n${jobDescription.slice(0, 12000)}\n\nCURRENT RESUME TEXT:\n${baseResumeText}`,
          },
          {
            role: "user",
            content: JSON.stringify(baseData),
          },
        ],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(aiResponse.choices[0]?.message?.content || "{}");
      const tailoredResumeData = resumeDataSchema.parse(parsed.resumeData || baseData);
      const enhancements = Array.isArray(parsed.enhancements)
        ? parsed.enhancements.filter((item: unknown) => typeof item === "string").slice(0, 8)
        : [];

      const titleSuffix = typeof parsed.titleSuffix === "string" && parsed.titleSuffix.trim()
        ? parsed.titleSuffix.trim().slice(0, 40)
        : "Tailored";

      const [updatedResume] = await db
        .update(resumes)
        .set({
          resumeData: tailoredResumeData,
          title: resume.title.includes("Tailored") ? resume.title : `${resume.title} (${titleSuffix})`,
          updatedAt: new Date(),
        })
        .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
        .returning();

      res.json({
        success: true,
        resume: updatedResume,
        enhancements,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", message: error.errors[0]?.message || "Invalid request" });
      }
      console.error("[API] Error tailoring resume:", error);
      res.status(500).json({ error: "Failed to tailor resume", message: "Failed to tailor resume" });
    }
  });

  // Delete a resume
  app.delete("/api/resumes/:id", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Resume ID is required" });
      }

      // Get resume from database
      const [resume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, id));

      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // Check if user owns this resume
      if (resume.userId !== userId) {
        return res.status(403).json({ error: "You do not have permission to delete this resume" });
      }

      // Delete the resume
      await db
        .delete(resumes)
        .where(eq(resumes.id, id));

      res.status(200).json({ message: "Resume deleted successfully" });
    } catch (error) {
      console.error('[API] Error deleting resume:', error);
      res.status(500).json({ error: "Failed to delete resume" });
    }
  });

  // AI Chat endpoint for resume building
  app.post("/api/resumes/:id/ai-chat", aiRateLimit, requireAuth, requireAIAccess, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Resume ID is required" });
      }

      // Get resume from database
      const [resume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, id));

      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // Check if user owns this resume
      if (resume.userId !== userId) {
        return res.status(403).json({ error: "You do not have permission to access this resume" });
      }

      const rawMode = typeof req.body?.mode === "string" ? req.body.mode : "builder";
      const requestedMode = ["builder", "enhancement", "tailor"].includes(rawMode) ? rawMode as "builder" | "enhancement" | "tailor" : "builder";

      // Check AI edit usage limits
      const aiUsage = await storage.checkAndResetMonthlyUsage(userId);
      const { threshold: aiEditThreshold, plan: aiPlan, limits: aiPlanLimits } = await getUsageThresholdForFeature(
        userId,
        "ai_edits",
        aiUsage.aiEditsThisMonth,
      );

      if (aiUsage.aiEditsThisMonth >= aiPlanLimits.maxAIEditsPerMonth) {
        return res.status(403).json({
          error: "AI edit limit reached",
          code: "AI_EDIT_LIMIT",
          limit: aiPlanLimits.maxAIEditsPerMonth,
          current: aiUsage.aiEditsThisMonth,
          threshold: aiEditThreshold,
          upgradeModal: {
            feature: "ai_edits",
            recommendedPlan: aiEditThreshold.recommendedPlan,
            unlockedAmount: aiEditThreshold.unlockedAmount,
            currentLimit: aiEditThreshold.currentLimit,
            recommendedLimit: aiEditThreshold.recommendedLimit,
          },
          message: aiPlanLimits.maxAIEditsPerMonth === Infinity
            ? "AI edit limit reached."
            : `You've used all ${aiPlanLimits.maxAIEditsPerMonth} AI edits for this month. Upgrade your plan for more AI edits.`
        });
      }

      if (requestedMode === "builder" && aiUsage.aiBuilderActionsThisMonth >= aiPlanLimits.maxAIBuilderActionsPerMonth) {
        return res.status(403).json({
          error: "AI builder limit reached",
          code: "AI_BUILDER_LIMIT",
          limit: aiPlanLimits.maxAIBuilderActionsPerMonth,
          current: aiUsage.aiBuilderActionsThisMonth,
          message: aiPlanLimits.maxAIBuilderActionsPerMonth === Infinity
            ? "AI builder action limit reached."
            : `You've used all ${aiPlanLimits.maxAIBuilderActionsPerMonth} AI builder actions this month. Upgrade your plan for more builder usage.`,
        });
      }

      // Get user data
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate request body
      const chatSchema = z.object({
        message: z.string().min(1),
        currentData: resumeDataSchema.optional(),
        conversationHistory: z.array(z.object({
          role: z.enum(["user", "ai"]),
          content: z.string(),
        })).optional(),
        selectedComponents: z.array(z.string()).optional(),
        focusedComponent: z.string().optional(),
        mode: z.enum(["builder", "enhancement", "tailor"]).optional().default("builder"),
        tailoringJobDescription: z.string().max(12000).optional(),
      });

      const { message, currentData: clientData, conversationHistory = [], selectedComponents = [], focusedComponent, mode: chatMode, tailoringJobDescription } = chatSchema.parse({ ...req.body, mode: requestedMode });

      // Sanitize inputs by limiting size and truncating if needed
      const sanitizedMessage = message.slice(0, 1000); // Limit message to 1000 chars
      const sanitizedHistory = conversationHistory.slice(-10); // Keep only last 10 messages

      // Build conversation context for AI
      const conversationContext = sanitizedHistory.map(msg => 
        `${msg.role === 'user' ? 'User' : 'AI Assistant'}: ${msg.content.slice(0, 500)}`
      ).join('\n');

      // Get current resume data - prefer client data (most recent) over database
      const currentData = clientData || getNormalizedResumeData(resume.resumeData);

      // Create AI prompt
      const COMPONENT_LABELS: Record<string, string> = {
        summary: "Professional Summary",
        experience: "Work Experience",
        education: "Education",
        skills: "Skills",
        certifications: "Professional Certifications",
        projects: "Personal/Professional Projects",
        awards: "Awards & Honors",
        leadership: "Leadership Roles",
        research: "Research Work",
        publications: "Academic/Professional Publications",
      };
      
      const componentsList = selectedComponents.length > 0 
        ? `User selected these components to work on: ${selectedComponents.map(id => COMPONENT_LABELS[id] || id).join(', ')}. ONLY ask about and help with these selected components.` 
        : 'User has not selected specific components, so help with all resume sections as needed.';
      
      const focusedMode = focusedComponent 
        ? `\n\n**FOCUSED EDITING MODE**: The user is specifically editing the "${COMPONENT_LABELS[focusedComponent] || focusedComponent}" section. Focus your questions and data extraction on this component only. Be concise and help them make quick, targeted edits.`
        : '';
      
      const userInfo = `**USER INFORMATION** (Already known - DO NOT ask for this):
- Name: ${user.name || '[Name not yet provided in profile]'}
- Email: ${user.email}
- These are already saved in the resume's personal info section.`;
      
      // Build ordered section list based on user selection
      const sectionOrder = ['summary', 'experience', 'education', 'skills', 'certifications', 'projects', 'awards', 'leadership', 'research', 'publications'];
      const activeSections = selectedComponents.length > 0
        ? sectionOrder.filter(s => selectedComponents.includes(s))
        : sectionOrder.filter(s => ['summary', 'experience', 'education', 'skills'].includes(s));
      const numberedSections = activeSections.map((s, i) => `${i + 1}. **${COMPONENT_LABELS[s] || s}**`).join('\n');

      const baseStyleRules = `
**WRITING STYLE RULES (apply to ALL generated content):**
- Write like a real person, not a robot. Use natural, professional human voice. Avoid "AI-speak", buzzword stuffing, or overly flowery language.
- BE CONCISE: For the Professional Summary, stay between 30-50 words (2-3 sentences max).
- Use active verbs and concrete achievements.
- NEVER use em dashes (the long dash character). Use commas, periods, or semicolons instead.
- Avoid overused AI phrases like "I'd be happy to", "Certainly!", "Absolutely!", "dive into", "leverage", "utilize", "in order to", "It's important to note".
- Keep sentences varied in length. Mix short punchy sentences with longer ones.
- Use simple, direct language. Prefer "use" over "utilize", "help" over "facilitate", "start" over "commence".
- Avoid excessive exclamation marks. One per message at most.`;

      const enhancementInstructions = `
You are helping with **AI Resume Enhancement** for an existing resume.

**CRITICAL ENHANCEMENT RULES:**
- Preserve all existing resume content unless the user explicitly asks to remove something.
- Never delete or blank out previously written content.
- If the user asks for a rewrite (for example, "make this sound more human"), ask 1-2 clarifying questions first, then provide an improved draft.
- If you say you will ask questions, ask them immediately in the same reply.
- Only update the section currently being edited when focusedComponent is provided.
- Keep updatedData cumulative and include unchanged existing sections as-is.
`;

      const tailorInstructions = `
You are helping with **AI Resume Tailor** mode for an existing Joblify resume.

TARGET JOB DESCRIPTION:
${(tailoringJobDescription || "").slice(0, 12000) || "Not provided"}

**CRITICAL TAILOR RULES:**
- Tailor each section so it aligns to the target job description and remains truthful.
- Preserve factual integrity; do not invent companies, titles, dates, credentials, or metrics.
- Rewrite to sound polished, confident, and human, never generic or robotic.
- Keep wording professional but conversational: avoid stiff corporate jargon and AI-sounding cliches.
- Prioritize role alignment in summary, experience bullets, and skills keywords.
- When the user asks for section edits, return concrete rewritten lines or bullets in that section immediately.
- Keep updatedData cumulative and include unchanged existing sections as-is.
`;

      const builderInstructions = `
You are a warm, professional career counselor helping someone build their resume through natural conversation. You are NOT a form. You are a friendly expert who asks thoughtful questions one at a time and drafts polished content from the answers.

**CRITICAL RULES:**
- **NEVER ASK FOR NAME OR EMAIL** (already saved).
- **ONLY ask about these selected sections** (ignore all others): ${activeSections.map(s => COMPONENT_LABELS[s] || s).join(', ')}.
- **Ask ONE question at a time.** Never list multiple questions.
- **Use markdown** for readability (bold, bullet points).
- **ALWAYS include cumulative updatedData** in every response with ALL data collected so far, including personalInfo from the current resume data.
- **NEVER return empty or partial personalInfo**. Always copy existing personalInfo into updatedData.

**SECTION ORDER (follow strictly):**
${numberedSections}

**═══════════════════════════════════════**
**CONVERSATIONAL FLOW FOR EACH SECTION**
Each section must follow this 5-step structure:
1. **Warm context question**: low-effort, conversational opener
2. **Clarifying question(s)**: adds detail and specificity (1-2 questions max)
3. **AI synthesis**: draft the content and show it to the user
4. **User confirmation**: ask if they want changes (more formal? more confident? more friendly?)
5. **Move on**: save to updatedData and proceed to next section
**═══════════════════════════════════════**

**SECTION-SPECIFIC CONVERSATION FLOWS:**

${activeSections.includes('summary') ? `**✨ Professional Summary Flow:**
Step 1 (Warm): "What kind of roles are you aiming for right now?"
Step 2 (Value): "What would you say you're best at professionally? Think about your skills, strengths, or things people rely on you for."
Step 3 (Motivation): "What type of work excites you the most?"
→ Then SYNTHESIZE a 2-3 sentence professional summary and show it to the user.
→ Ask: "Want it more formal, more confident, or more friendly?"
→ Save to updatedData summary field and move to next section.
` : ''}

${activeSections.includes('experience') ? `**💼 Work Experience Flow:**
Step 1 (Anchor): "Tell me about a job, internship, or major responsibility you've had."
Step 2 (Impact): "What were your main responsibilities there?"
Step 3 (Achievement): "Did you improve anything, solve a problem, or achieve results you're proud of?"
Optional: "Any numbers or results you remember? Even rough estimates help."
→ Then SYNTHESIZE bullet points with action verbs + impact and show them.
→ Ask: "Want these to sound more results-focused or leadership-focused?"
→ Save to updatedData experience array, then ask: "Do you have another role to add, or shall we move on?"
` : ''}

${activeSections.includes('education') ? `**🎓 Education Flow:**
Step 1: "Where did you study or train?"
Step 2: "What did you focus on or enjoy most during that time?"
Step 3: "Any achievements, projects, or activities worth mentioning?"
→ SYNTHESIZE a formatted education entry and show it.
→ Save to updatedData education array, ask if there's another or move on.
` : ''}

${activeSections.includes('skills') ? `**🛠 Skills Flow:**
Step 1: "What tasks or tools do people usually come to you for help with?"
Step 2: "What software, technologies, or methods have you used recently?"
Step 3: "Which skills do you feel most confident in?"
→ SYNTHESIZE and categorise into: Technical, Professional, Tools, Soft Skills.
→ Ask: "Want me to tailor these to your target job?"
→ Save to updatedData skills array and move on.
` : ''}

${activeSections.includes('projects') ? `**🚀 Projects Flow:**
Step 1: "Have you worked on any projects, whether personal, academic, or professional, that you're proud of?"
Step 2: "What was the goal of the project?"
Step 3: "What did you personally contribute?"
Optional: "What was the outcome or result?"
→ SYNTHESIZE project description with impact language.
→ Save to updatedData projects array and move on.
` : ''}

${activeSections.includes('awards') ? `**🏆 Awards / Accomplishments Flow:**
Step 1: "What's something you've done that you're really proud of?"
Step 2: "Why was it important or difficult?"
Step 3: "Did anyone recognize it? Awards, praise, results?"
→ SYNTHESIZE and save to updatedData awards array.
` : ''}

${activeSections.includes('certifications') ? `**📜 Certifications Flow:**
Step 1: "Have you completed any courses, certifications, or training programs?"
Step 2: "Which ones are most relevant to your career goals?"
→ Save to updatedData certifications array and move on.
` : ''}

${activeSections.includes('leadership') ? `**👥 Leadership Flow:**
Step 1: "Have you held any leadership roles? This could be at work, in organizations, or in your community."
Step 2: "What were you responsible for and what was the impact?"
→ SYNTHESIZE and save to updatedData leadership array.
` : ''}

${activeSections.includes('research') ? `**🔬 Research Flow:**
Step 1: "Have you been involved in any research work?"
Step 2: "What was the topic and what did you contribute?"
→ SYNTHESIZE and save to updatedData research array.
` : ''}

${activeSections.includes('publications') ? `**📖 Publications Flow:**
Step 1: "Have you published any papers, articles, or other written work?"
Step 2: "What were they about and where were they published?"
→ SYNTHESIZE and save to updatedData publications array.
` : ''}

**ANTI-LOOPING RULES:**
- Once the user answers a question, IMMEDIATELY move to the next step. Never re-ask.
- After synthesizing content, ask ONE refinement question (tone/style), then SAVE and MOVE ON.
- Maximum 3-4 exchanges per section. If you have enough info, draft the content.
- If user says "that's it", "no more", "next", "move on", IMMEDIATELY proceed to the next section.
- NEVER ask the user to confirm data they just gave you. Draft it, show it, ask about tone, save, move on.

**COMPLETION:**
Set isComplete to true when ALL selected sections (${activeSections.join(', ')}) have meaningful data in updatedData.
`;

      const selectedModeInstructions = chatMode === "tailor"
        ? tailorInstructions
        : chatMode === "enhancement"
        ? enhancementInstructions
        : builderInstructions;

      const systemPrompt = `${selectedModeInstructions}

${baseStyleRules}

${userInfo}

Current resume data (PRESERVE this, especially personalInfo):
${JSON.stringify(currentData, null, 2)}

**DATA RULES (CRITICAL):**
- ALWAYS include personalInfo from the current resume data in updatedData (copy it exactly as-is).
- The updatedData must be CUMULATIVE. Include all unchanged content plus any new or improved content.
- When you synthesize content for a section, include it in updatedData immediately.
- Use strong action verbs and ATS-friendly language in all generated content.

${componentsList}
${focusedMode}

Conversation so far:
${conversationContext}

User's message: ${sanitizedMessage}

Respond ONLY with valid JSON (no text before or after):
{
  "reply": "Your warm, conversational response with the next question or synthesized content",
  "updatedData": {
    "personalInfo": { ...ALWAYS copy existing personalInfo here... },
    "summary": "...",
    "experience": [...],
    "education": [...],
    "skills": [...],
    ...ALL data collected so far...
  },
  "addedComponents": [],
  "isComplete": false
}`;

      try {
        const poeClient = getPoeClient();
        
        // Set SSE headers for streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        // Collect the full AI response first without streaming raw JSON tokens to client
        // The AI returns structured JSON, which should not be shown directly to the user
        const stream = await poeClient.chat.completions.create({
          model: "gpt-5-nano",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: sanitizedMessage }
          ],
          max_tokens: 3000,
          temperature: 0.4,
          stream: true,
        });

        let fullResponse = '';
        
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
          }
        }

        // Try to parse the full response as JSON
        let parsedResponse;
        try {
          // Strip markdown code fences if present (e.g., ```json ... ```)
          let cleanedResponse = fullResponse.trim();
          if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
          }
          // Try to extract JSON object even if there's extra text around it
          const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            cleanedResponse = jsonMatch[0];
          }
          parsedResponse = JSON.parse(cleanedResponse);
        } catch {
          // If JSON parsing fails, try to extract the reply text from the raw response
          // and use current data as fallback for updatedData
          let extractedReply = fullResponse || "I understand. Could you tell me more?";
          // If it looks like it contains a reply field, try to extract it
          const replyMatch = fullResponse.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
          if (replyMatch && replyMatch[1].length > 0) {
            try {
              extractedReply = replyMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            } catch {
              // If replacement fails, use the raw response
            }
          }
          parsedResponse = {
            reply: extractedReply,
            updatedData: {},
            isComplete: false,
          };
        }

        // Stream the reply text to the client for a nice typing effect
        const replyText = parsedResponse.reply || "I understand. Could you tell me more?";
        // Send reply in batches of words to reduce write overhead while maintaining streaming feel
        const words = replyText.split(/(\s+)/);
        const BATCH_SIZE = 8;
        for (let i = 0; i < words.length; i += BATCH_SIZE) {
          const batch = words.slice(i, i + BATCH_SIZE).join('');
          if (batch) {
            res.write(`data: ${JSON.stringify({ type: "token", content: batch })}\n\n`);
          }
        }

        const hasMeaningfulValue = (value: unknown): boolean => {
          if (value === null || value === undefined) return false;
          if (typeof value === "string") return value.trim().length > 0;
          if (Array.isArray(value)) return value.length > 0;
          if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length > 0;
          return true;
        };

        // Merge AI-returned updatedData with existing resume data to ensure cumulative updates
        // and prevent destructive clears, especially in enhancement mode.
        let mergedUpdatedData: Record<string, any> = {};
        if (parsedResponse.updatedData && Object.keys(parsedResponse.updatedData).length > 0) {
          let aiData = { ...parsedResponse.updatedData };

          if (chatMode === "enhancement") {
            const allowedKeys = new Set<string>(["personalInfo"]);
            if (focusedComponent) {
              allowedKeys.add(focusedComponent);
            }

            aiData = Object.fromEntries(
              Object.entries(aiData).filter(([key, value]) => {
                if (allowedKeys.has(key)) {
                  return true;
                }
                const existingValue = (currentData as Record<string, unknown>)[key];
                if (hasMeaningfulValue(existingValue) && !hasMeaningfulValue(value)) {
                  return false;
                }
                return hasMeaningfulValue(value);
              })
            );
          }

          mergedUpdatedData = { ...currentData, ...aiData };
          // Deep merge personalInfo: preserve existing name/email if AI omits them
          if (currentData.personalInfo) {
            const mergedPersonalInfo = {
              ...currentData.personalInfo,
              ...(aiData.personalInfo || {}),
            };
            // Never allow name or email to become empty if they were previously set
            if (currentData.personalInfo.name && (!mergedPersonalInfo.name || mergedPersonalInfo.name.trim() === "")) {
              mergedPersonalInfo.name = currentData.personalInfo.name;
            }
            if (currentData.personalInfo.email && (!mergedPersonalInfo.email || mergedPersonalInfo.email.trim() === "")) {
              mergedPersonalInfo.email = currentData.personalInfo.email;
            }
            mergedUpdatedData.personalInfo = mergedPersonalInfo;
          }
        }

        // Send the final structured data
        res.write(`data: ${JSON.stringify({ 
          type: "done", 
          reply: parsedResponse.reply,
          updatedData: mergedUpdatedData,
          isComplete: parsedResponse.isComplete || false,
          addedComponents: parsedResponse.addedComponents || []
        })}\n\n`);

        // Auto-save resume data to database when AI extracts information
        if (mergedUpdatedData && Object.keys(mergedUpdatedData).length > 0) {
          try {
            const newResumeData = { ...currentData, ...mergedUpdatedData };
            await db
              .update(resumes)
              .set({
                resumeData: newResumeData,
                updatedAt: new Date(),
              })
              .where(eq(resumes.id, id));
          } catch (saveError) {
            console.error('[API] Failed to auto-save resume data:', saveError);
          }
        }

        // Save conversation to database (mode-specific)
        try {
          const [existingConversation] = await db
            .select()
            .from(chatConversations)
            .where(and(
              eq(chatConversations.userId, userId),
              eq(chatConversations.resumeId, id),
              eq(chatConversations.mode, chatMode)
            ))
            .limit(1);

          const newMessages = [
            ...sanitizedHistory,
            { role: "user" as const, content: sanitizedMessage },
            { role: "ai" as const, content: parsedResponse.reply }
          ];

          if (existingConversation) {
            await db
              .update(chatConversations)
              .set({
                messages: newMessages,
                updatedAt: new Date(),
              })
              .where(eq(chatConversations.id, existingConversation.id));
          } else {
            await db.insert(chatConversations).values({
              userId,
              resumeId: id,
              mode: chatMode,
              messages: newMessages,
            });
          }
        } catch (dbError) {
          console.error('[API] Failed to save conversation:', dbError);
        }

        // Increment AI edit usage counter
        try {
          await db
            .update(usageTable)
            .set({
              aiEditsThisMonth: sql`${usageTable.aiEditsThisMonth} + 1`,
              aiBuilderActionsThisMonth: chatMode === "builder"
                ? sql`${usageTable.aiBuilderActionsThisMonth} + 1`
                : usageTable.aiBuilderActionsThisMonth,
            })
            .where(eq(usageTable.userId, userId));
        } catch (usageError) {
          console.error('[API] Failed to increment AI edit usage:', usageError);
        }

        res.write(`data: ${JSON.stringify({ type: "end" })}\n\n`);
        res.end();
      } catch (aiError) {
        console.error('[API] AI chat error:', aiError);
        // If headers haven't been sent yet, send JSON error
        if (!res.headersSent) {
          res.json({
            reply: "I'm having trouble processing that. Could you please rephrase?",
            updatedData: {},
            isComplete: false,
          });
        } else {
          // If streaming already started, send error event
          res.write(`data: ${JSON.stringify({ type: "error", message: "An error occurred while processing your request." })}\n\n`);
          res.end();
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] AI chat validation error:', error.errors);
        return res.status(400).json({ 
          error: "Invalid chat data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      console.error('[API] Error in AI chat:', error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Get saved conversation for a resume (supports mode query param: "builder", "enhancement", or "tailor")
  app.get("/api/resumes/:id/conversation", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const rawMode = (req.query.mode as string) || "builder";
      const chatMode = ["builder", "enhancement", "tailor"].includes(rawMode) ? rawMode : "builder";

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Resume ID is required" });
      }

      // Get conversation from database filtered by mode
      const [conversation] = await db
        .select()
        .from(chatConversations)
        .where(and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.resumeId, id),
          eq(chatConversations.mode, chatMode)
        ))
        .limit(1);

      if (!conversation) {
        return res.json({ messages: [] });
      }

      res.json({ messages: conversation.messages || [] });
    } catch (error) {
      console.error('[API] Error loading conversation:', error);
      res.status(500).json({ error: "Failed to load conversation" });
    }
  });

  // Save a single message live to conversation
  app.post("/api/resumes/:id/conversation/message", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Resume ID is required" });
      }

      const messageSchema = z.object({
        role: z.enum(["user", "ai"]),
        content: z.string().min(1),
        mode: z.enum(["builder", "enhancement", "tailor"]).optional().default("builder"),
        tailoringJobDescription: z.string().max(12000).optional(),
      });

      const { role, content, mode: chatMode } = messageSchema.parse(req.body);

      // Get or create conversation filtered by mode
      const [existingConversation] = await db
        .select()
        .from(chatConversations)
        .where(and(
          eq(chatConversations.userId, userId),
          eq(chatConversations.resumeId, id),
          eq(chatConversations.mode, chatMode)
        ))
        .limit(1);

      if (existingConversation) {
        const currentMessages = (existingConversation.messages as any[]) || [];
        await db
          .update(chatConversations)
          .set({
            messages: [...currentMessages, { role, content }],
            updatedAt: new Date(),
          })
          .where(eq(chatConversations.id, existingConversation.id));
      } else {
        await db.insert(chatConversations).values({
          userId,
          resumeId: id,
          mode: chatMode,
          messages: [{ role, content }],
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error saving message:', error);
      res.status(500).json({ error: "Failed to save message" });
    }
  });

  // Generate and return PDF for a resume
  app.post("/api/resumes/:id/pdf", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const { id } = req.params;
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Resume ID is required" });
      }

      // Get resume from database
      const [resume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, id));

      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // Check if user owns this resume
      if (resume.userId !== userId) {
        return res.status(403).json({ error: "You do not have permission to access this resume" });
      }

      // Parse resume data
      const resumeData = getNormalizedResumeData(resume.resumeData);

      // Create professional PDF generator with selected template
      const pdfGenerator = new ResumePDFGenerator({
        template: resume.template as 'modern' | 'professional' | 'academic' | 'minimal',
        pageSize: 'A4',
      });

      // Get the PDF document
      const doc = pdfGenerator.getDocument();

      // Set response headers for PDF download
      // Sanitize filename and provide fallback
      let sanitizedTitle = resume.title.replace(/[^a-z0-9\s-]/gi, '_').trim();
      if (!sanitizedTitle || sanitizedTitle.length === 0) {
        sanitizedTitle = 'resume';
      }
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}.pdf"`);

      // Pipe the PDF to response and handle errors
      doc.pipe(res);
      
      // Handle stream errors
      doc.on('error', (streamError) => {
        console.error('[API] PDF document stream error:', streamError);
        doc.end(); // End the document stream properly
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to generate PDF" });
        } else {
          res.end();
        }
      });

      // Generate the PDF content
      pdfGenerator.generate(resumeData, resume.title);

    } catch (error) {
      console.error('[API] Error generating PDF:', error);
      // If headers haven't been sent yet, send error response
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate PDF" });
      } else {
        res.end();
      }
    }
  });

  // ============================================
  // ATS Scanner Endpoints
  // ============================================

  // Configure multer for file uploads
  const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
    },
    fileFilter: (req, file, cb) => {
      // Only accept PDF and DOCX files
      const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
      }
    },
  });

  app.post("/api/resumes/import", requireAuth, requireVerifiedEmail, upload.single('file'), async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Check usage limits
      const resumeCheck = await storage.canAddResume(userId);
      if (!resumeCheck.allowed) {
        const usageStats = await storage.getUsage(userId);
        const subscription = await storage.getSubscription(userId);
        const plan = normalizePlan(subscription?.plan);
        const limits = PLAN_LIMITS[plan];
        const threshold = buildUsageThresholdState({
          feature: "resumes" as any,
          plan,
          currentUsage: resumeCheck.current,
          currentLimit: limits.maxResumes,
        });

        return res.status(403).json({ 
          error: "Resume limit reached",
          code: "RESUME_LIMIT",
          limit: resumeCheck.limit,
          current: resumeCheck.current,
          upgradeModal: {
            feature: "resumes",
            recommendedPlan: threshold.recommendedPlan,
            unlockedAmount: threshold.unlockedAmount,
            currentLimit: threshold.currentLimit,
            recommendedLimit: threshold.recommendedLimit,
          },
          message: `Your plan allows up to ${resumeCheck.limit} resumes. Upgrade for more.`
        });
      }

      // Extract text
      let resumeText = "";
      try {
        if (req.file.mimetype === 'application/pdf') {
          const pdfData = await pdfParse(req.file.buffer);
          resumeText = pdfData.text || "";
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await mammoth.extractRawText({ buffer: req.file.buffer });
          resumeText = result.value || "";
        }
      } catch (parseError) {
        return res.status(400).json({ error: "Could not parse file" });
      }

      // Use AI to extract structured data and also identify best template/style
      const poe = getPoeClient();
      const aiResponse = await poe.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `Extract structured resume data from the text. Also, based on the content and tone, recommend one of these templates: 'modern', 'professional', 'creative', 'executive', 'technical'.
            Return valid JSON only:
            {
              "resumeData": { ... },
              "recommendedTemplate": "modern",
              "suggestedTitle": "Software Engineer Resume"
            }`
          },
          { role: "user", content: resumeText }
        ],
        response_format: { type: "json_object" }
      });

      const extracted = JSON.parse(aiResponse.choices[0]?.message?.content || "{}");
      
      const [newResume] = await db.insert(resumes).values({
        userId,
        title: extracted.suggestedTitle || req.file.originalname.replace(/\.[^/.]+$/, ""),
        template: extracted.recommendedTemplate || "modern",
        resumeData: extracted.resumeData || createEmptyResumeData(),
        originalFilename: req.file.originalname,
        originalMimeType: req.file.mimetype,
        importedAt: new Date(),
      }).returning();

      // Increment imported usage
      await db.update(usageTable)
        .set({ importedResumesThisMonth: sql`${usageTable.importedResumesThisMonth} + 1` })
        .where(eq(usageTable.userId, userId));

      res.json(newResume);
    } catch (error) {
      console.error('[API] Error importing resume:', error);
      res.status(500).json({ error: "Failed to import resume" });
    }
  });

  // Feature tracking endpoint
  app.post("/api/track-feature", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        featureName: z.string(),
      });
      
      const { featureName } = schema.parse(req.body);
      
      const { trackFeatureUsage } = await import("./email-engagement");
      await trackFeatureUsage(userId, featureName);
      
      res.json({ success: true });
    } catch (error) {
      console.error('[API] Error tracking feature usage:', error);
      // Don't fail the request if tracking fails
      res.json({ success: false });
    }
  });

  // ATS Scanner - Upload file and scan
  app.post("/api/ats/scan", requireAuth, requireAIAccess, upload.single('file'), async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      let resumeText = "";
      try {
        resumeText = await extractTextFromUpload(req.file);
      } catch (parseError) {
        console.error('[API] File parsing error:', parseError);
        return res.status(400).json({ 
          error: "Could not parse file",
          message: "The file may be corrupted or in an unsupported format"
        });
      }

      if (!resumeText || resumeText.trim().length === 0) {
        return res.status(400).json({ error: "Could not extract text from file" });
      }

      // Validate job description length
      const { jobDescription = "" } = jobDescriptionSchema.parse(req.body);

      // Check usage limits before performing operation
      const usageStats = await storage.getUsage(userId);
      const { threshold: atsThreshold, plan, limits } = await getUsageThresholdForFeature(
        userId,
        "ats_scans",
        usageStats.atsScansThisMonth,
      );

      if (usageStats.atsScansThisMonth >= limits.maxATSScansPerMonth) {
        return res.status(403).json({ 
          error: "ATS scan limit reached for this month",
          code: "ATS_SCAN_LIMIT",
          limit: limits.maxATSScansPerMonth,
          current: usageStats.atsScansThisMonth,
          threshold: atsThreshold,
          upgradeModal: {
            feature: "ats_scans",
            recommendedPlan: atsThreshold.recommendedPlan,
            unlockedAmount: atsThreshold.unlockedAmount,
            currentLimit: atsThreshold.currentLimit,
            recommendedLimit: atsThreshold.recommendedLimit,
          },
          message: limits.maxATSScansPerMonth === Infinity
            ? "ATS scan limit reached for this month"
            : `Your plan allows up to ${limits.maxATSScansPerMonth} ATS scans per month. Upgrade to ${plan === 'free' ? 'Plus' : 'Ultra'} for more.`
        });
      }

      // Perform ATS analysis
      const analysis = await performATSAnalysis(resumeText, jobDescription);

      // Update usage counter atomically
      await db
        .update(usageTable)
        .set({ atsScansThisMonth: sql`${usageTable.atsScansThisMonth} + 1` })
        .where(eq(usageTable.userId, userId));

      const postActionThreshold = buildUsageThresholdState({
        feature: "ats_scans",
        plan,
        currentUsage: usageStats.atsScansThisMonth + 1,
        currentLimit: limits.maxATSScansPerMonth,
      });

      res.json({ ...analysis, threshold: postActionThreshold });
    } catch (error) {
      console.error('[API] Error scanning resume:', error);
      res.status(500).json({ error: "Failed to scan resume", message: "Failed to scan resume" });
    }
  });

  // ATS Scanner - Scan existing Joblify resume
  app.post("/api/ats/scan-resume/:id", requireAuth, requireAIAccess, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ error: "Resume ID is required" });
      }

      // Check usage limits
      const usageStats = await storage.getUsage(userId);
      const { threshold: atsThreshold, plan, limits } = await getUsageThresholdForFeature(
        userId,
        "ats_scans",
        usageStats.atsScansThisMonth,
      );

      if (usageStats.atsScansThisMonth >= limits.maxATSScansPerMonth) {
        return res.status(403).json({ 
          error: "ATS scan limit reached for this month",
          code: "ATS_SCAN_LIMIT",
          limit: limits.maxATSScansPerMonth,
          current: usageStats.atsScansThisMonth,
          threshold: atsThreshold,
          upgradeModal: {
            feature: "ats_scans",
            recommendedPlan: atsThreshold.recommendedPlan,
            unlockedAmount: atsThreshold.unlockedAmount,
            currentLimit: atsThreshold.currentLimit,
            recommendedLimit: atsThreshold.recommendedLimit,
          },
          message: limits.maxATSScansPerMonth === Infinity
            ? "ATS scan limit reached for this month"
            : `Your plan allows up to ${limits.maxATSScansPerMonth} ATS scans per month. Upgrade to ${plan === 'free' ? 'Plus' : 'Ultra'} for more.`
        });
      }

      // Get resume from database
      const [resume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, id))
        .limit(1);

      if (!resume || resume.userId !== userId) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // Convert resume data to text
      const normalizedResumeData = getNormalizedResumeData(resume.resumeData);
      const resumeText = convertResumeDataToText(normalizedResumeData);

      // Get job description from request if provided
      const { jobDescription = "" } = jobDescriptionSchema.parse(req.body || {});

      // Perform ATS analysis
      const structuredSignals: ATSStructuredSignals = {
        hasContactInfo: Boolean(
          normalizedResumeData.personalInfo?.email ||
          normalizedResumeData.personalInfo?.phone ||
          normalizedResumeData.personalInfo?.location ||
          normalizedResumeData.personalInfo?.linkedIn ||
          normalizedResumeData.personalInfo?.github
        ),
        hasExperienceSection: Boolean(normalizedResumeData.experience?.length),
        hasEducationSection: Boolean(normalizedResumeData.education?.length),
        hasSkillsSection: Boolean(normalizedResumeData.skills?.length),
        hasBulletPoints: (normalizedResumeData.experience || []).some((exp) => Array.isArray(exp.description) && exp.description.some((line) => typeof line === "string" && line.trim().length > 0)),
      };

      const analysis = await performATSAnalysis(resumeText, jobDescription, structuredSignals);

      // Update usage counter atomically
      await db
        .update(usageTable)
        .set({ atsScansThisMonth: sql`${usageTable.atsScansThisMonth} + 1` })
        .where(eq(usageTable.userId, userId));

      const postActionThreshold = buildUsageThresholdState({
        feature: "ats_scans",
        plan,
        currentUsage: usageStats.atsScansThisMonth + 1,
        currentLimit: limits.maxATSScansPerMonth,
      });

      res.json({ ...analysis, threshold: postActionThreshold });
    } catch (error) {
      console.error('[API] Error scanning Joblify resume:', error);
      res.status(500).json({ error: "Failed to scan resume", message: "Failed to scan resume" });
    }
  });

  // ============================================
  // Cover Letter Generation Endpoints
  // ============================================

  // Tailor cover letter for specific job
  app.post("/api/cover-letter/tailor", aiRateLimit, requireAuth, requireAIAccess, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        resumeId: z.string().min(1, "Resume ID is required"),
        jobId: z.string().min(1, "Job ID is required"),
      });

      const { resumeId, jobId } = schema.parse(req.body);

      // Get resume from database
      const [resume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, resumeId))
        .limit(1);

      if (!resume || resume.userId !== userId) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // For now, return a placeholder since job management is not fully implemented
      // This endpoint would integrate with job tracking when available
      res.json({ 
        content: "Cover letter tailoring for saved jobs coming soon!",
        message: "This feature will be available when job management is fully integrated.",
      });
    } catch (error) {
      console.error('[API] Error tailoring cover letter:', error);
      res.status(500).json({ error: "Failed to tailor cover letter" });
    }
  });

  // ============================================
  // Redeemable Code System Endpoints
  // ============================================

  // Redeem a code
  app.post("/api/codes/redeem", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        code: z.string().min(1, "Code is required"),
      });

      const { code } = schema.parse(req.body);

      // Find the code in the database
      const [redeemableCode] = await db
        .select()
        .from(redeemableCodes)
        .where(eq(redeemableCodes.code, code.toUpperCase().trim()))
        .limit(1);

      if (!redeemableCode) {
        return res.status(404).json({ error: "Invalid code" });
      }

      // Check if code is active
      if (!redeemableCode.isActive) {
        return res.status(400).json({ error: "This code is no longer active" });
      }

      // Check if code has expired
      if (redeemableCode.expiresAt && new Date(redeemableCode.expiresAt) < new Date()) {
        return res.status(400).json({ error: "This code has expired" });
      }

      // Check if code has reached max redemptions
      if (
        redeemableCode.maxRedemptions !== null &&
        redeemableCode.currentRedemptions >= redeemableCode.maxRedemptions
      ) {
        return res.status(400).json({ error: "This code has already been fully redeemed" });
      }

      // Check if user has already redeemed this code
      const [existingRedemption] = await db
        .select()
        .from(userPerks)
        .where(
          and(
            eq(userPerks.userId, userId),
            eq(userPerks.codeId, redeemableCode.id)
          )
        )
        .limit(1);

      if (existingRedemption) {
        return res.status(400).json({ error: "You have already redeemed this code" });
      }

      // Get the perk details
      const [perk] = await db
        .select()
        .from(perks)
        .where(eq(perks.id, redeemableCode.perkId))
        .limit(1);

      if (!perk) {
        return res.status(500).json({ error: "Perk not found" });
      }

      // Calculate expiration date for temporary perks
      let expiresAt: Date | null = null;
      if (perk.perkType === 'temp_pro_access' || perk.perkType === 'temp_ultra_access') {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (perk.value || 0));
      }

      // Create user perk record
      await db.insert(userPerks).values({
        userId,
        perkId: perk.id,
        codeId: redeemableCode.id,
        expiresAt: expiresAt ?? undefined,
        isActive: true,
        remainingValue: perk.value,
      });

      // Update code redemption count
      await db
        .update(redeemableCodes)
        .set({
          currentRedemptions: redeemableCode.currentRedemptions + 1,
        })
        .where(eq(redeemableCodes.id, redeemableCode.id));

      // Apply the perk immediately if it's a temporary plan upgrade
      if (perk.perkType === 'temp_pro_access' || perk.perkType === 'temp_ultra_access') {
        const subscription = await storage.getSubscription(userId);
        const currentPlan = normalizePlan(subscription?.plan);
        
        // Only upgrade if current plan is lower
        const planHierarchy: PlanType[] = ['free', 'student', 'plus', 'ultra', 'lifetime'];
        const newPlan: PlanType = perk.perkType === 'temp_pro_access' ? 'plus' : 'ultra';
        const currentPlanIndex = planHierarchy.indexOf(currentPlan);
        const newPlanIndex = planHierarchy.indexOf(newPlan);
        
        if (newPlanIndex > currentPlanIndex) {
          await storage.updateSubscriptionPlan(userId, newPlan, expiresAt!);
        }
      }

      res.json({
        success: true,
        message: `Successfully redeemed: ${perk.name}`,
        perk: {
          name: perk.name,
          description: perk.description,
          perkType: perk.perkType,
          value: perk.value,
          expiresAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid input",
          details: error.errors,
        });
      }
      console.error('[API] Error redeeming code:', error);
      res.status(500).json({ error: "Failed to redeem code" });
    }
  });

  // Get user's perks
  app.get("/api/codes/user-perks", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      // Get all active perks for the user
      const userPerksList = await db
        .select({
          id: userPerks.id,
          perkName: perks.name,
          perkDescription: perks.description,
          perkType: perks.perkType,
          redeemedAt: userPerks.redeemedAt,
          expiresAt: userPerks.expiresAt,
          isActive: userPerks.isActive,
          remainingValue: userPerks.remainingValue,
          code: redeemableCodes.code,
        })
        .from(userPerks)
        .innerJoin(perks, eq(userPerks.perkId, perks.id))
        .innerJoin(redeemableCodes, eq(userPerks.codeId, redeemableCodes.id))
        .where(eq(userPerks.userId, userId))
        .orderBy(desc(userPerks.redeemedAt));

      res.json({
        perks: userPerksList,
      });
    } catch (error) {
      console.error('[API] Error fetching user perks:', error);
      res.status(500).json({ error: "Failed to fetch perks" });
    }
  });

  // Contact form AI response endpoint
  app.post("/api/contact/ai-response", contactRateLimit, async (req: Request, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        message: z.string().min(1, "Message is required"),
      });

      const { name, email, message } = schema.parse(req.body);

      // Build knowledge base context
      const knowledgeBase = `
You are a helpful customer support AI for Joblify, an AI-powered resume builder platform.

Key information about Joblify:
- We help job seekers create professional, ATS-optimized resumes using AI
- Features: AI Resume Builder, Cover Letter Generator, ATS Scanner, Job Matching, Resume Tailoring
- Plans: Free (limited features), Plus ($9.99/mo), Ultra ($19.99/mo), Lifetime ($99 one-time)
- We use secure authentication and encrypt all user data
- Export formats: PDF and DOCX
- Contact email: support@joblifyai.com for technical issues, privacy@joblifyai.com for privacy concerns

Common questions:
- How to build a resume: Use our AI chat interface in the dashboard
- ATS optimization: Our AI automatically optimizes content for Applicant Tracking Systems
- Data security: All data is encrypted, we're GDPR compliant
- Pricing: Free plan available, paid plans unlock unlimited features
- Export: Download as PDF or DOCX from the resume builder

Guidelines:
- Be friendly, professional, and concise
- If you can answer the question with the knowledge base, provide a helpful response
- If the question requires account-specific help or is complex, recommend contacting support
- Keep responses under 200 words
- Don't make up information not in the knowledge base
      `.trim();

      // Call POE API with fast, efficient model for customer support
      const poe = getPoeClient();
      const completion = await poe.chat.completions.create({
        model: "claude-4.5-haiku", // Fast model optimized for customer support responses
        messages: [
          {
            role: "system",
            content: knowledgeBase,
          },
          {
            role: "user",
            content: `User question from ${name} (${email}):\n\n${message}`,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0]?.message?.content || "I apologize, but I'm unable to process your request at the moment. Please contact our support team at support@joblifyai.com for assistance.";

      console.log('[API] AI response generated successfully');
      res.json({ 
        success: true,
        response: aiResponse,
        canAnswer: true, // Indicate AI attempted to answer
      });
    } catch (error) {
      console.error('[API] Error generating AI response:', error);
      
      // If AI fails, return a graceful fallback
      res.json({
        success: false,
        response: "I apologize, but I'm experiencing technical difficulties. Please contact our support team directly at support@joblifyai.com, and we'll respond within 24 hours.",
        canAnswer: false,
      });
    }
  });

  // Contact form send email endpoint (for when user wants to contact support anyway)
  app.post("/api/contact/send-email", contactRateLimit, async (req: Request, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        message: z.string().min(1, "Message is required"),
        aiResponse: z.string().optional(),
      });

      const { name, email, message, aiResponse } = schema.parse(req.body);

      // Import email function
      const { sendContactFormEmail, sendContactConfirmationEmail } = await import("./email");

      // Send email to support
      const supportEmailSent = await sendContactFormEmail({
        fromName: name,
        fromEmail: email,
        message,
        aiResponse,
      });

      // Send confirmation email to user
      const userEmailSent = await sendContactConfirmationEmail({
        toEmail: email,
        name,
        message,
      });

      if (!supportEmailSent) {
        throw new Error("Failed to send email to support");
      }

      res.json({ 
        success: true,
        message: "Your message has been sent successfully. We'll respond within 24-48 hours.",
      });
    } catch (error) {
      console.error('[API] Error sending contact form email:', error);
      res.status(500).json({ 
        success: false,
        error: "Failed to send message. Please try emailing us directly at support@joblifyai.com",
      });
    }
  });

  // ============================================
  // Newsletter Subscribe Endpoint
  // ============================================

  // Newsletter endpoint - intentionally not protected by requireAuth to allow anonymous subscriptions
  app.post("/api/newsletter/subscribe", newsletterRateLimit, async (req: Request, res) => {
    try {
      const schema = z.object({
        email: z.string().email("Valid email is required"),
      });

      const { email } = schema.parse(req.body);

      // Get or create the newsletter and marketing mailing lists
      let [newsletterList] = await db
        .select()
        .from(mailingLists)
        .where(eq(mailingLists.name, "newsletter"))
        .limit(1);

      if (!newsletterList) {
        [newsletterList] = await db
          .insert(mailingLists)
          .values({
            name: "newsletter",
            description: "General newsletter with career tips and updates",
            defaultSubscribed: true,
          })
          .returning();
      }

      let [marketingList] = await db
        .select()
        .from(mailingLists)
        .where(eq(mailingLists.name, "marketing"))
        .limit(1);

      if (!marketingList) {
        [marketingList] = await db
          .insert(mailingLists)
          .values({
            name: "marketing",
            description: "Marketing emails with new features and promotions",
            defaultSubscribed: true,
          })
          .returning();
      }

      // Check if user is logged in and link to their account
      const userId = req.session.userId;

      if (userId) {
        // Subscribe to newsletter list
        const [existingNewsletter] = await db
          .select()
          .from(userMailingLists)
          .where(
            and(
              eq(userMailingLists.userId, userId),
              eq(userMailingLists.listId, newsletterList.id)
            )
          )
          .limit(1);

        if (existingNewsletter) {
          if (!existingNewsletter.subscribed) {
            // Re-subscribe to newsletter
            await db
              .update(userMailingLists)
              .set({ subscribed: true, subscribedAt: new Date(), unsubscribedAt: null })
              .where(eq(userMailingLists.id, existingNewsletter.id));
          }
        } else {
          await db.insert(userMailingLists).values({
            userId,
            listId: newsletterList.id,
            subscribed: true,
          });
        }

        // Subscribe to marketing list
        const [existingMarketing] = await db
          .select()
          .from(userMailingLists)
          .where(
            and(
              eq(userMailingLists.userId, userId),
              eq(userMailingLists.listId, marketingList.id)
            )
          )
          .limit(1);

        if (existingMarketing) {
          if (!existingMarketing.subscribed) {
            // Re-subscribe to marketing
            await db
              .update(userMailingLists)
              .set({ subscribed: true, subscribedAt: new Date(), unsubscribedAt: null })
              .where(eq(userMailingLists.id, existingMarketing.id));
          }
        } else {
          await db.insert(userMailingLists).values({
            userId,
            listId: marketingList.id,
            subscribed: true,
          });
        }
      }

      // Add to Brevo newsletter list (list #1) if configured
      const brevoNewsletterListId = process.env.BREVO_NEWSLETTER_LIST_ID;
      if (brevoNewsletterListId) {
        const parsedNewsletterListId = parseInt(brevoNewsletterListId, 10);
        if (!isNaN(parsedNewsletterListId)) {
          await addContactToBrevoList(email, parsedNewsletterListId);
        } else {
          console.error('[API] Invalid BREVO_NEWSLETTER_LIST_ID:', brevoNewsletterListId);
        }
      }

      // Add to Brevo marketing list (list #2) if configured
      const brevoMarketingListId = process.env.BREVO_MARKETING_LIST_ID;
      if (brevoMarketingListId) {
        const parsedMarketingListId = parseInt(brevoMarketingListId, 10);
        if (!isNaN(parsedMarketingListId)) {
          await addContactToBrevoList(email, parsedMarketingListId);
        } else {
          console.error('[API] Invalid BREVO_MARKETING_LIST_ID:', brevoMarketingListId);
        }
      }

      res.json({ success: true, message: "Successfully subscribed to newsletter!" });
    } catch (error) {
      console.error('[API] Error subscribing to newsletter:', error);
      res.status(500).json({ error: "Failed to subscribe. Please try again." });
    }
  });

  // ============================================
  // Job Match Endpoints
  // ============================================

  app.post("/api/job-match/analyze", requireAuth, requireAIAccess, upload.array('files', 20), async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const schema = z.object({
        resumeId: z.string().min(1, "Resume ID is required"),
        jobDescriptions: z.array(z.string().min(20)).min(1).max(50),
      });

      const rawJobDescriptions = typeof req.body.jobDescriptions === "string"
        ? JSON.parse(req.body.jobDescriptions)
        : req.body.jobDescriptions;

      const { resumeId, jobDescriptions } = schema.parse({
        resumeId: req.body.resumeId,
        jobDescriptions: rawJobDescriptions,
      });

      const files = Array.isArray(req.files) ? req.files : [];
      const parsedFromFiles = await Promise.all(files.map(async (file) => {
        const text = await extractTextFromUpload(file);
        if (!text || text.length < 20) {
          throw new Error(`Uploaded file ${file.originalname} does not contain enough readable job content`);
        }
        return text.slice(0, 10000);
      }));

      const allJobDescriptions = [...jobDescriptions, ...parsedFromFiles].slice(0, 50);

      const [resume] = await db.select().from(resumes).where(eq(resumes.id, resumeId)).limit(1);
      if (!resume || resume.userId !== userId) {
        return res.status(404).json({ error: "Resume not found" });
      }

      const userUsage = await storage.getUsage(userId);
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];

      if (userUsage.jobAnalysesThisMonth >= limits.maxJobAnalysesPerMonth) {
        return res.status(403).json({
          error: "Job match scan limit reached for this month",
          limit: limits.maxJobAnalysesPerMonth,
          current: userUsage.jobAnalysesThisMonth,
        });
      }

      const maxJobsPerScan = limits.maxJobsPerJobMatchScan ?? 5;
      if (allJobDescriptions.length > maxJobsPerScan) {
        return res.status(403).json({
          error: `Your plan allows up to ${maxJobsPerScan} jobs per scan`,
          limit: maxJobsPerScan,
          current: allJobDescriptions.length,
        });
      }

      const normalizedResumeData = getNormalizedResumeData(resume.resumeData);
      const resumeText = convertResumeDataToText(normalizedResumeData);
      const poe = getPoeClient();

      const analysis = await Promise.all(allJobDescriptions.map(async (jobDescription) => {
        const aiResponse = await poe.chat.completions.create({
          model: "GPT-4o",
          messages: [
            {
              role: "system",
              content: `You are a senior recruiter and career strategist. Analyze the match between one resume and one job description with tactical depth.
Return strict JSON only with this shape:
{
  "matchScore": <number 0-100>,
  "summary": "<clear executive summary>",
  "matchedSkills": ["<skill>"],
  "missingSkills": ["<skill>"],
  "strengths": ["<strength>"],
  "improvements": ["<improvement>"],
  "keywordMatches": ["<keyword>"],
  "experienceMatch": "<assessment>",
  "educationMatch": "<assessment>",
  "quickTweaks": [{"change":"<small tweak>","impact":"<what improves>","roles":["<role>"]}],
  "recommendedRoles": ["<role>"]
}`
            },
            {
              role: "user",
              content: `RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}`,
            }
          ],
          temperature: 0.2,
          max_tokens: 2200,
        });

        const aiContent = aiResponse.choices[0]?.message?.content || "{}";
        try {
          return JSON.parse(aiContent);
        } catch {
          return {
            matchScore: 50,
            summary: aiContent,
            matchedSkills: [],
            missingSkills: [],
            strengths: [],
            improvements: [],
            keywordMatches: [],
            experienceMatch: "Unable to determine",
            educationMatch: "Unable to determine",
            quickTweaks: [],
            recommendedRoles: [],
          };
        }
      }));

      await db.update(usageTable).set({
        jobAnalysesThisMonth: sql`${usageTable.jobAnalysesThisMonth} + 1`,
        jobMatchJobsThisMonth: sql`${usageTable.jobMatchJobsThisMonth} + ${allJobDescriptions.length}`,
      }).where(eq(usageTable.userId, userId));

      res.json({
        jobsAnalyzed: allJobDescriptions.length,
        results: analysis,
      });
    } catch (error) {
      console.error('[API] Error analyzing job match:', error);
      res.status(500).json({ error: "Failed to analyze job match" });
    }
  });

  app.post("/api/resume-review", requireAuth, requireAIAccess, upload.single('file'), async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        idealJob: z.string().min(10).max(300),
        concerns: z.string().max(500).optional(),
        resumeId: z.string().optional(),
      });
      const { idealJob, concerns, resumeId } = schema.parse(req.body);

      const usage = await storage.getUsage(userId);
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      if (usage.resumeReviewsThisMonth >= (limits.maxResumeReviewsPerMonth ?? 1)) {
        return res.status(403).json({ error: "Resume review limit reached for this month" });
      }

      let resumeText = "";
      let designReview: ResumeDesignReview | null = null;
      if (resumeId) {
        const [resume] = await db.select().from(resumes).where(eq(resumes.id, resumeId)).limit(1);
        if (!resume || resume.userId !== userId) {
          return res.status(404).json({ error: "Resume not found" });
        }
        resumeText = convertResumeDataToText(getNormalizedResumeData(resume.resumeData)).slice(0, 20000);
      } else if (req.file) {
        resumeText = (await extractTextFromUpload(req.file)).slice(0, 20000);

        try {
          designReview = await performVisualResumeReview(req.file, idealJob, concerns);
        } catch (designReviewError) {
          console.warn("[API] Visual resume review failed, falling back to text-only review:", designReviewError);
          designReview = null;
        }
      } else {
        return res.status(400).json({ error: "Resume file or Joblify resume is required" });
      }

      if (!resumeText || resumeText.length < 40) {
        return res.status(400).json({ error: "Could not read enough resume text" });
      }

      const poe = getPoeClient();
      const aiResponse = await poe.chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `You are an expert resume reviewer. Produce a deep, practical review with real data points from the resume text.
Return strict JSON:
{
  "overallScore": <0-100>,
  "summary": "",
  "strengths": [""],
  "gaps": [""],
  "bulletQuality": {"score": <0-100>, "evidence": [""]},
  "keywordCoverage": {"score": <0-100>, "matched": [""], "missing": [""]},
  "impactMetrics": {"score": <0-100>, "foundCount": <number>, "advice": ""},
  "recommendedEdits": [{"section":"", "change":"", "why":"", "priority":"high|medium|low"}],
  "fitOutlook": {"currentFit":"", "ifTweaked":"", "bestFitRoles":[""]}
}`
          },
          {
            role: "user",
            content: `IDEAL JOB: ${idealJob}

USER CONCERNS: ${concerns?.trim() || "None provided"}

RESUME:
${resumeText}`,
          },
        ],
        temperature: 0.2,
        max_tokens: 2500,
      });

      const content = aiResponse.choices[0]?.message?.content || "{}";
      const contentReview = JSON.parse(content);
      const combinedResponse = {
        contentReview,
        designReview,
      };

      await db.insert(resumeReviewHistory).values({
        userId,
        resumeId: resumeId ?? null,
        idealJob,
        concerns: concerns?.trim() || null,
        reviewResult: combinedResponse,
      });

      await db.update(usageTable).set({
        resumeReviewsThisMonth: sql`${usageTable.resumeReviewsThisMonth} + 1`,
      }).where(eq(usageTable.userId, userId));

      res.json(combinedResponse);
    } catch (error) {
      console.error('[API] Error creating resume review:', error);
      res.status(500).json({ error: "Failed to create resume review" });
    }
  });

  app.get("/api/resume-review/history", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const history = await db
        .select({
          id: resumeReviewHistory.id,
          resumeId: resumeReviewHistory.resumeId,
          idealJob: resumeReviewHistory.idealJob,
          concerns: resumeReviewHistory.concerns,
          reviewResult: resumeReviewHistory.reviewResult,
          createdAt: resumeReviewHistory.createdAt,
        })
        .from(resumeReviewHistory)
        .where(eq(resumeReviewHistory.userId, userId))
        .orderBy(desc(resumeReviewHistory.createdAt))
        .limit(20);

      res.json(history);
    } catch (error) {
      console.error('[API] Error loading resume review history:', error);
      res.status(500).json({ error: "Failed to load resume review history" });
    }
  });

// ============================================
  // Resume Upload & Parse Endpoint
  // ============================================

  app.get("/api/resume-artifacts/:key", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const rawKey = req.params.key;
      const key = decodeURIComponent(Array.isArray(rawKey) ? rawKey.join("/") : (rawKey || "")).trim();

      if (!key) {
        return res.status(400).json({ error: "Missing artifact key" });
      }

      const [resumeRecord] = await db
        .select({
          id: resumes.id,
          originalStorageKey: resumes.originalStorageKey,
          originalFilename: resumes.originalFilename,
          originalMimeType: resumes.originalMimeType,
        })
        .from(resumes)
        .where(and(eq(resumes.userId, userId), eq(resumes.originalStorageKey, key)))
        .limit(1);

      if (!resumeRecord?.originalStorageKey) {
        return res.status(404).json({ error: "Artifact not found" });
      }

      const bytes = await resumeArtifactStorage.read(resumeRecord.originalStorageKey);
      const filename = (resumeRecord.originalFilename || "resume").replace(/[\r\n"]/g, "");

      res.setHeader("Content-Type", resumeRecord.originalMimeType || "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.setHeader("Cache-Control", "private, max-age=300");
      res.send(bytes);
    } catch (error) {
      console.error("[API] Error serving resume artifact:", error);
      res.status(404).json({ error: "Artifact not found" });
    }
  });

  app.post("/api/resumes/upload", requireAuth, requireAIAccess, upload.single('file'), async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const validation = validateFile(req.file.buffer, req.file.mimetype);
      if (!validation.valid) {
        return res.status(400).json({
          error: validation.error || "Invalid file format",
          fileType: getFileTypeName(req.file.mimetype),
          message: validation.error || `Please upload a valid ${getFileTypeName(req.file.mimetype)} file`
        });
      }

      // Check resume limit first and get subscription/plan info
      const resumeCheck = await storage.canAddResume(userId);
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      
      if (!resumeCheck.allowed) {
        return res.status(403).json({ 
          error: "Resume limit reached", 
          code: "RESUME_LIMIT",
          limit: resumeCheck.limit,
          current: resumeCheck.current,
          message: limits.maxResumes === Infinity
            ? "Resume limit reached."
            : `Your plan allows up to ${resumeCheck.limit} resumes. Upgrade to ${plan === 'free' ? 'Plus' : 'Ultra'} for more.`
        });
      }

      // Check usage limits
      const userUsage = await storage.getUsage(userId);

      if (userUsage.importedResumesThisMonth >= limits.maxImportedResumesPerMonth) {
        return res.status(403).json({
          error: "Resume import limit reached for this month",
          code: "RESUME_IMPORT_LIMIT",
          limit: limits.maxImportedResumesPerMonth,
          current: userUsage.importedResumesThisMonth,
          message: limits.maxImportedResumesPerMonth === Infinity
            ? "Resume import limit reached."
            : `Your plan allows up to ${limits.maxImportedResumesPerMonth} resume imports per month. Upgrade to ${plan === 'free' ? 'Plus' : 'Ultra'} for more.`
        });
      }

      // Extract text from uploaded file
      let extractedText = "";
      let pageCount: number | null = null;
      if (req.file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(req.file.buffer);
        extractedText = pdfData.text;
        pageCount = Number.isFinite(pdfData.numpages) ? pdfData.numpages : null;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = result.value;
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ error: "Could not extract text from file. Please ensure the file is not empty or image-based." });
      }

      // Limit extracted text size to prevent DoS via oversized content
      const MAX_EXTRACTED_TEXT_LENGTH = 50000; // 50,000 characters
      if (extractedText.length > MAX_EXTRACTED_TEXT_LENGTH) {
        extractedText = extractedText.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
      }

      // Send to AI for structured parsing
      const poe = getPoeClient();
      const aiResponse = await poe.chat.completions.create({
        model: "GPT-4o",
        messages: [
          {
            role: "system",
            content: `You are a resume parser. Extract structured data from the raw resume text and return it in this exact JSON format:
{
  "personalInfo": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "website": ""
  },
  "summary": "",
  "experience": [
    {
      "company": "",
      "title": "",
      "location": "",
      "startDate": "",
      "endDate": null,
      "description": ["bullet point 1", "bullet point 2"]
    }
  ],
  "education": [
    {
      "school": "",
      "degree": "",
      "field": "",
      "graduationDate": "",
      "gpa": ""
    }
  ],
  "skills": ["skill1", "skill2"],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "date": ""
    }
  ],
  "projects": [
    {
      "name": "",
      "description": "",
      "technologies": [],
      "url": ""
    }
  ],
  "awards": [
    {
      "title": "",
      "issuer": "",
      "date": "",
      "description": ""
    }
  ],
  "leadership": [],
  "research": [],
  "publications": []
}
Extract ALL information you can find. For dates, use formats like "Jan 2023" or "2023". If a section has no data, use an empty array. Respond ONLY with valid JSON, no additional text.`
          },
          {
            role: "user",
            content: `Parse this resume text:\n\n${extractedText}`
          }
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });

      const aiContent = aiResponse.choices[0]?.message?.content || "{}";

      let parsedData;
      try {
        parsedData = JSON.parse(aiContent);
      } catch (parseError) {
        console.error('[API] Failed to parse AI resume response:', parseError, 'Raw content:', aiContent.slice(0, 500));
        return res.status(500).json({ error: "Failed to parse resume content. The AI returned an invalid response. Please try again." });
      }

      // Validate and merge with empty resume data structure
      const emptyData = createEmptyResumeData();
      const resumeData: ResumeData = {
        personalInfo: {
          name: parsedData.personalInfo?.name || emptyData.personalInfo.name,
          email: parsedData.personalInfo?.email || emptyData.personalInfo.email,
          phone: parsedData.personalInfo?.phone || emptyData.personalInfo.phone,
          location: parsedData.personalInfo?.location || emptyData.personalInfo.location,
          linkedin: parsedData.personalInfo?.linkedin || emptyData.personalInfo.linkedin,
          website: parsedData.personalInfo?.website || emptyData.personalInfo.website,
        },
        summary: parsedData.summary || emptyData.summary,
        experience: Array.isArray(parsedData.experience)
          ? parsedData.experience.map((exp: any) => ({
              company: exp.company || "",
              title: exp.title || "",
              location: exp.location || "",
              startDate: exp.startDate || "",
              endDate: exp.endDate || null,
              description: Array.isArray(exp.description) ? exp.description : [],
            }))
          : emptyData.experience,
        education: Array.isArray(parsedData.education)
          ? parsedData.education.map((edu: any) => ({
              school: edu.school || "",
              degree: edu.degree || "",
              field: edu.field || "",
              graduationDate: edu.graduationDate || "",
              gpa: edu.gpa || "",
            }))
          : emptyData.education,
        skills: Array.isArray(parsedData.skills) ? parsedData.skills : emptyData.skills,
        certifications: Array.isArray(parsedData.certifications)
          ? parsedData.certifications.map((cert: any) => ({
              name: cert.name || "",
              issuer: cert.issuer || "",
              date: cert.date || "",
            }))
          : emptyData.certifications,
        projects: Array.isArray(parsedData.projects)
          ? parsedData.projects.map((proj: any) => ({
              name: proj.name || "",
              description: proj.description || "",
              technologies: Array.isArray(proj.technologies) ? proj.technologies : [],
              url: proj.url || "",
            }))
          : emptyData.projects,
        awards: Array.isArray(parsedData.awards)
          ? parsedData.awards.map((award: any) => ({
              title: award.title || "",
              issuer: award.issuer || "",
              date: award.date || "",
              description: award.description || "",
            }))
          : emptyData.awards,
        leadership: Array.isArray(parsedData.leadership)
          ? parsedData.leadership.map((lead: any) => ({
              title: lead.title || "",
              organization: lead.organization || "",
              startDate: lead.startDate || "",
              endDate: lead.endDate || null,
              description: lead.description || "",
            }))
          : emptyData.leadership,
        research: Array.isArray(parsedData.research)
          ? parsedData.research.map((res: any) => ({
              title: res.title || "",
              institution: res.institution || "",
              startDate: res.startDate || "",
              endDate: res.endDate || null,
              description: res.description || "",
              url: res.url || "",
            }))
          : emptyData.research,
        publications: Array.isArray(parsedData.publications)
          ? parsedData.publications.map((pub: any) => ({
              title: pub.title || "",
              authors: pub.authors || "",
              journal: pub.journal || "",
              date: pub.date || "",
              url: pub.url || "",
            }))
          : emptyData.publications,
      };

      // Determine title from parsed data - sanitize filename for safety
      const sanitizedFilename = req.file.originalname
        ?.replace(/\.(pdf|docx)$/i, '')
        .replace(/[<>"'`;\\]/g, '')
        .slice(0, 100) || "Imported Resume";
      const title = resumeData.personalInfo.name
        ? `${resumeData.personalInfo.name.replace(/[<>"'`;\\]/g, '').slice(0, 100)}'s Resume`
        : sanitizedFilename;

      // Save uploaded artifact bytes to durable storage and create resume metadata
      const resumeId = crypto.randomUUID();
      const storedArtifact = await resumeArtifactStorage.save({
        userId,
        resumeId,
        originalFilename: req.file.originalname || `${resumeId}.pdf`,
        bytes: req.file.buffer,
      });

      // Create the resume in database
      const [newResume] = await db
        .insert(resumes)
        .values({
          id: resumeId,
          userId,
          title,
          template: "modern",
          resumeData,
          originalFilename: req.file.originalname,
          originalMimeType: req.file.mimetype,
          originalStorageKey: storedArtifact.key,
          originalStorageUrl: storedArtifact.url,
          originalPageCount: pageCount,
          importedAt: new Date(),
        })
        .returning();

      // Increment imported resumes usage counter
      await db
        .update(usageTable)
        .set({ importedResumesThisMonth: sql`${usageTable.importedResumesThisMonth} + 1` })
        .where(eq(usageTable.userId, userId));

      res.json({
        success: true,
        resume: newResume,
        artifact: {
          originalFilename: newResume.originalFilename,
          mimeType: newResume.originalMimeType,
          storageKey: newResume.originalStorageKey,
          url: newResume.originalStorageUrl,
          pageCount: newResume.originalPageCount,
          importedAt: newResume.importedAt,
        },
        message: "Resume uploaded and parsed successfully!",
      });
    } catch (error) {
      console.error('[API] Error uploading resume:', error);
      res.status(500).json({ error: "Failed to upload and parse resume" });
    }
  });

  return httpServer;
}
