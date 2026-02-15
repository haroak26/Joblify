import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, PLAN_LIMITS } from "./storage";
import { z } from "zod";
import { 
  skillSchema, normalizePlan, resumes, users, usage as usageTable, type ResumeData, resumeDataSchema, type Resume, createEmptyResumeData,
  redeemableCodes, perks, userPerks, type PlanType,
  mailingLists, userMailingLists, chatConversations
} from "@shared/schema";
import { requireAuth, requireVerifiedEmail, hashPassword, verifyPassword, isStrongPassword } from "./auth";
import OpenAI from "openai";
import { getUncachableStripeClient } from "./stripeClient";
import { addContactToBrevoList } from './brevo';
import { validateFile, getFileTypeName } from './lib/fileValidation';
import { aiRateLimit } from './middleware/security';
import { csrfTokenEndpoint } from './middleware/csrf';
import { ResumePDFGenerator } from './lib/resumePDFGenerator';
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import PDFDocument from "pdfkit";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import rateLimit from "express-rate-limit";

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
 * Perform real data-driven ATS analysis
 */
async function performATSAnalysis(resumeText: string, jobDescription: string): Promise<any> {
  // Extract keywords from job description if provided
  const jobKeywords = jobDescription 
    ? extractKeywords(jobDescription)
    : [];

  // Extract keywords from resume
  const resumeKeywords = extractKeywords(resumeText);

  // Identify found and missing keywords
  const foundKeywords = jobKeywords.filter(keyword => 
    resumeText.toLowerCase().includes(keyword.toLowerCase())
  );
  
  const missingKeywords = jobKeywords.filter(keyword => 
    !resumeText.toLowerCase().includes(keyword.toLowerCase())
  );

  // Analyze resume structure
  const hasContactInfo = /email|phone|linkedin/i.test(resumeText);
  const hasExperienceSection = /experience|work history|employment/i.test(resumeText);
  const hasEducationSection = /education|academic|degree/i.test(resumeText);
  const hasSkillsSection = /skills|competencies|expertise/i.test(resumeText);
  const hasBulletPoints = /•|·|\*|-\s/.test(resumeText);
  const hasActionVerbs = /(managed|led|developed|created|implemented|designed|achieved|increased|reduced|improved)/i.test(resumeText);
  
  // Calculate scores for each category
  const formatScore = calculateFormatScore(resumeText);
  const keywordScore = jobDescription 
    ? (foundKeywords.length / Math.max(jobKeywords.length, 1)) * 100
    : calculateGeneralKeywordScore(resumeText);
  
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

  // Calculate overall score
  const overallScore = Math.round(
    (formatScore * 0.25 + keywordScore * 0.35 + structureScore * 0.25 + contentScore * 0.15)
  );

  // Generate suggestions
  const suggestions: string[] = [];
  
  if (formatScore < 80) {
    suggestions.push("Use a simple, clean format without tables or complex layouts for better ATS parsing.");
  }
  
  if (!hasContactInfo) {
    suggestions.push("Add clear contact information (email, phone, LinkedIn) at the top of your resume.");
  }
  
  if (!hasSkillsSection) {
    suggestions.push("Add a dedicated Skills section with relevant keywords from your field.");
  }
  
  if (!hasBulletPoints) {
    suggestions.push("Use bullet points to list achievements and responsibilities for better readability.");
  }
  
  if (!hasActionVerbs) {
    suggestions.push("Start bullet points with strong action verbs (e.g., 'Managed', 'Developed', 'Led').");
  }
  
  if (jobDescription && missingKeywords.length > 0) {
    suggestions.push(`Include more keywords from the job description: ${missingKeywords.slice(0, 5).join(', ')}`);
  }
  
  if (resumeText.split(/\s+/).length < 200) {
    suggestions.push("Expand your resume with more detailed descriptions of your experience and achievements.");
  }

  // Build category breakdown
  const categories = [
    {
      name: "Format Compatibility",
      score: formatScore,
      feedback: formatScore >= 80 
        ? "Your resume format is ATS-friendly" 
        : "Consider simplifying your resume format for better ATS compatibility",
    },
    {
      name: "Keyword Optimization",
      score: Math.round(keywordScore),
      feedback: keywordScore >= 80
        ? "Strong keyword alignment with industry standards"
        : jobDescription
        ? "Add more relevant keywords from the job description"
        : "Include more industry-specific keywords",
    },
    {
      name: "Section Structure",
      score: structureScore,
      feedback: structureScore >= 80
        ? "Resume has all essential sections"
        : "Add missing key sections (Experience, Education, Skills)",
    },
    {
      name: "Content Quality",
      score: contentScore,
      feedback: contentScore >= 80
        ? "Content is well-formatted with action verbs and achievements"
        : "Use more bullet points and action verbs to describe achievements",
    },
  ];

  return {
    score: overallScore,
    keywords: foundKeywords.slice(0, 20), // Top 20 found keywords
    missingKeywords: missingKeywords.slice(0, 10), // Top 10 missing keywords
    suggestions,
    categories,
  };
}

/**
 * Extract important keywords from text
 */
function extractKeywords(text: string): string[] {
  // Common technical and professional keywords
  const commonKeywords = new Set<string>();
  
  // Technical skills patterns
  const techPatterns = [
    /\b(JavaScript|TypeScript|Python|Java|C\+\+|Ruby|PHP|Swift|Kotlin|Go|Rust)\b/gi,
    /\b(React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|\.NET)\b/gi,
    /\b(SQL|PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch)\b/gi,
    /\b(AWS|Azure|GCP|Docker|Kubernetes|CI\/CD|DevOps)\b/gi,
    /\b(Git|Agile|Scrum|Jira|REST API|GraphQL)\b/gi,
  ];

  // Soft skills patterns
  const softSkillPatterns = [
    /\b(leadership|management|communication|collaboration|teamwork)\b/gi,
    /\b(analytical|problem-solving|critical thinking|strategic)\b/gi,
  ];

  // Extract technical keywords
  techPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => commonKeywords.add(match));
    }
  });

  // Extract soft skills
  softSkillPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => commonKeywords.add(match.toLowerCase()));
    }
  });

  // Extract action verbs
  const actionVerbs = text.match(/\b(managed|led|developed|created|implemented|designed|achieved|increased|reduced|improved|optimized|built|launched|delivered|coordinated|analyzed|established|drove|executed|facilitated|generated|initiated|mentored|negotiated|organized|planned|resolved|spearheaded|streamlined|supervised|trained)\b/gi);
  if (actionVerbs) {
    actionVerbs.forEach(verb => commonKeywords.add(verb.toLowerCase()));
  }

  return Array.from(commonKeywords);
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
      const { resumeId, jobDescription } = req.body;
      if (!resumeId || !jobDescription) {
        return res.status(400).json({ error: "Resume ID and job description are required" });
      }

      // Check cover letter usage limits
      const usage = await storage.checkAndResetMonthlyUsage(userId);
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const planLimits = PLAN_LIMITS[plan];
      
      if (usage.coverLettersThisMonth >= planLimits.maxCoverLettersPerMonth) {
        return res.status(403).json({
          error: "Cover letter limit reached",
          code: "COVER_LETTER_LIMIT",
          limit: planLimits.maxCoverLettersPerMonth,
          current: usage.coverLettersThisMonth,
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

      const prompt = `Generate a professional cover letter based on this resume and job description. Write like a real person, not a robot. Use natural, conversational language. NEVER use em dashes. Avoid overused phrases like "I am thrilled" or "I believe I would be a great fit". Be genuine and specific.\n\nResume:\n${JSON.stringify(resume.resumeData)}\n\nJob Description:\n${jobDescription}`;
      
      const response = await getPoeClient().chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0].message.content || "";
      const coverLetter = await storage.createCoverLetter({
        userId,
        resumeId,
        content,
        jobDescription,
      });

      // Increment cover letter usage count
      await db
        .update(usageTable)
        .set({ 
          coverLettersThisMonth: sql`${usageTable.coverLettersThisMonth} + 1` 
        })
        .where(eq(usageTable.userId, userId));

      res.json(coverLetter);
    } catch (error) {
      console.error('[API] Error generating cover letter:', error);
      res.status(500).json({ error: "Failed to generate cover letter" });
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

  // Disable 2FA
  app.post("/api/user/2fa/disable", requireAuth, async (req: Request, res) => {
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

      // Disable 2FA and clear secret and backup codes
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
      const maxJobAnalyses = planLimits.maxJobAnalysesPerMonth === Infinity ? -1 : planLimits.maxJobAnalysesPerMonth;
      const maxATSScans = planLimits.maxATSScansPerMonth === Infinity ? -1 : planLimits.maxATSScansPerMonth;
      const maxImportedResumes = planLimits.maxImportedResumesPerMonth === Infinity ? -1 : planLimits.maxImportedResumesPerMonth;
      const maxResumes = planLimits.maxResumes === Infinity ? -1 : planLimits.maxResumes;
      
      // Schedules limits (not implemented, so no access for now)
      const maxSchedules = 0;
      const hasScheduleAccess = false;
      
      // Calculate remaining usage
      const remainingSkills = maxSkills === -1 ? -1 : Math.max(0, maxSkills - skillsCount);
      const remainingAIEdits = maxAIEdits === -1 ? -1 : Math.max(0, maxAIEdits - usage.aiEditsThisMonth);
      const remainingCoverLetters = maxCoverLetters === -1 ? -1 : Math.max(0, maxCoverLetters - usage.coverLettersThisMonth);
      const remainingJobAnalyses = maxJobAnalyses === -1 ? -1 : Math.max(0, maxJobAnalyses - usage.jobAnalysesThisMonth);
      const remainingATSScans = maxATSScans === -1 ? -1 : Math.max(0, maxATSScans - usage.atsScansThisMonth);
      const remainingImportedResumes = maxImportedResumes === -1 ? -1 : Math.max(0, maxImportedResumes - usage.importedResumesThisMonth);
      const remainingSchedules = maxSchedules === 0 ? 0 : Math.max(0, maxSchedules - schedulesCount);
      const remainingResumes = maxResumes === -1 ? -1 : Math.max(0, maxResumes - resumesCount);
      
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
          atsScansThisMonth: usage.atsScansThisMonth,
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
          maxJobAnalyses,
          maxATSScans,
          maxImportedResumes,
          maxResumes,
        },
        remaining: {
          skills: remainingSkills,
          jobsThisMonth: remainingImportedResumes,
          aiEdits: remainingAIEdits,
          schedules: remainingSchedules,
          coverLetters: remainingCoverLetters,
          jobAnalyses: remainingJobAnalyses,
          atsScans: remainingATSScans,
          importedResumes: remainingImportedResumes,
          resumes: remainingResumes,
        },
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

      // Check AI edit usage limits
      const aiUsage = await storage.checkAndResetMonthlyUsage(userId);
      const aiSubscription = await storage.getSubscription(userId);
      const aiPlan = normalizePlan(aiSubscription?.plan);
      const aiPlanLimits = PLAN_LIMITS[aiPlan];

      if (aiUsage.aiEditsThisMonth >= aiPlanLimits.maxAIEditsPerMonth) {
        return res.status(403).json({
          error: "AI edit limit reached",
          code: "AI_EDIT_LIMIT",
          limit: aiPlanLimits.maxAIEditsPerMonth,
          current: aiUsage.aiEditsThisMonth,
          message: aiPlanLimits.maxAIEditsPerMonth === Infinity
            ? "AI edit limit reached."
            : `You've used all ${aiPlanLimits.maxAIEditsPerMonth} AI edits for this month. Upgrade your plan for more AI edits.`
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
        mode: z.enum(["builder", "enhancement"]).optional().default("builder"),
      });

      const { message, currentData: clientData, conversationHistory = [], selectedComponents = [], focusedComponent, mode: chatMode } = chatSchema.parse(req.body);

      // Sanitize inputs by limiting size and truncating if needed
      const sanitizedMessage = message.slice(0, 1000); // Limit message to 1000 chars
      const sanitizedHistory = conversationHistory.slice(-10); // Keep only last 10 messages

      // Build conversation context for AI
      const conversationContext = sanitizedHistory.map(msg => 
        `${msg.role === 'user' ? 'User' : 'AI Assistant'}: ${msg.content.slice(0, 500)}`
      ).join('\n');

      // Get current resume data - prefer client data (most recent) over database
      const currentData = clientData || resumeDataSchema.parse(resume.resumeData);

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

      const systemPrompt = `You are a warm, professional career counselor helping someone build their resume through natural conversation. You are NOT a form. You are a friendly expert who asks thoughtful questions one at a time and drafts polished content from the answers.

**CRITICAL RULES:**
- **NEVER ASK FOR NAME OR EMAIL** (already saved).
- **ONLY ask about these selected sections** (ignore all others): ${activeSections.map(s => COMPONENT_LABELS[s] || s).join(', ')}.
- **Ask ONE question at a time.** Never list multiple questions.
- **Use markdown** for readability (bold, bullet points).
- **ALWAYS include cumulative updatedData** in every response with ALL data collected so far, including personalInfo from the current resume data.
- **NEVER return empty or partial personalInfo**. Always copy existing personalInfo into updatedData.

**WRITING STYLE RULES (apply to ALL generated content):**
- Write like a real person, not a robot. Use natural, conversational language.
- NEVER use em dashes (the long dash character). Use commas, periods, or semicolons instead.
- Avoid overused AI phrases like "I'd be happy to", "Certainly!", "Absolutely!", "dive into", "leverage", "utilize", "in order to", "It's important to note".
- Keep sentences varied in length. Mix short punchy sentences with longer ones.
- Use simple, direct language. Prefer "use" over "utilize", "help" over "facilitate", "start" over "commence".
- Avoid excessive exclamation marks. One per message at most.

${userInfo}

Current resume data (PRESERVE this, especially personalInfo):
${JSON.stringify(currentData, null, 2)}

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

**DATA RULES (CRITICAL):**
- ALWAYS include personalInfo from the current resume data in updatedData (copy it exactly as-is).
- The updatedData must be CUMULATIVE. Include ALL data from ALL sections discussed so far.
- When you synthesize content for a section, include it in updatedData immediately.
- Use strong action verbs and ATS-friendly language in all generated content.

**COMPLETION:**
Set isComplete to true when ALL selected sections (${activeSections.join(', ')}) have meaningful data in updatedData.

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

        // Merge AI-returned updatedData with existing resume data to ensure cumulative updates
        // Deep merge personalInfo to prevent name/email from being lost
        let mergedUpdatedData: Record<string, any> = {};
        if (parsedResponse.updatedData && Object.keys(parsedResponse.updatedData).length > 0) {
          const aiData = parsedResponse.updatedData;
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
            .set({ aiEditsThisMonth: sql`${usageTable.aiEditsThisMonth} + 1` })
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

  // Get saved conversation for a resume (supports mode query param: "builder" or "enhancement")
  app.get("/api/resumes/:id/conversation", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const rawMode = (req.query.mode as string) || "builder";
      const chatMode = ["builder", "enhancement"].includes(rawMode) ? rawMode : "builder";

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
        mode: z.enum(["builder", "enhancement"]).optional().default("builder"),
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
      const resumeData = resumeDataSchema.parse(resume.resumeData);

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

  // ATS Scanner - Upload file and scan
  app.post("/api/ats/scan", requireAuth, requireAIAccess, upload.single('file'), async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file using magic bytes
      const validation = validateFile(req.file.buffer, req.file.mimetype);
      if (!validation.valid) {
        return res.status(400).json({ 
          error: validation.error || "Invalid file format",
          message: `Please upload a valid ${getFileTypeName(req.file.mimetype)} file`
        });
      }

      // Extract text from file with timeout and error handling
      let resumeText = "";
      
      // Helper to wrap parsing with timeout
      const parseWithTimeout = <T>(promise: Promise<T>, timeoutMs = 10000): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error(`File parsing exceeded timeout of ${timeoutMs / 1000} seconds`)), timeoutMs)
          )
        ]);
      };

      try {
        if (req.file.mimetype === 'application/pdf') {
          const pdfData = await parseWithTimeout(pdfParse(req.file.buffer));
          resumeText = pdfData.text || "";
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          const result = await parseWithTimeout(mammoth.extractRawText({ buffer: req.file.buffer }));
          resumeText = result.value || "";
        }
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
      const usage = await storage.getUsage(userId);
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];

      if (usage.atsScansThisMonth >= limits.maxATSScansPerMonth) {
        return res.status(403).json({ 
          error: "ATS scan limit reached for this month",
          limit: limits.maxATSScansPerMonth,
          current: usage.atsScansThisMonth
        });
      }

      // Perform ATS analysis
      const analysis = await performATSAnalysis(resumeText, jobDescription);

      // Update usage counter atomically
      await db
        .update(usageTable)
        .set({ atsScansThisMonth: sql`${usageTable.atsScansThisMonth} + 1` })
        .where(eq(usageTable.userId, userId));

      res.json(analysis);
    } catch (error) {
      console.error('[API] Error scanning resume:', error);
      res.status(500).json({ error: "Failed to scan resume" });
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
      const usage = await storage.getUsage(userId);
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];

      if (usage.atsScansThisMonth >= limits.maxATSScansPerMonth) {
        return res.status(403).json({ 
          error: "ATS scan limit reached for this month",
          limit: limits.maxATSScansPerMonth,
          current: usage.atsScansThisMonth
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
      const resumeText = convertResumeDataToText(resume.resumeData);

      // Get job description from request if provided
      const jobDescription = req.body.jobDescription || "";

      // Perform ATS analysis
      const analysis = await performATSAnalysis(resumeText, jobDescription);

      // Update usage counter atomically
      await db
        .update(usageTable)
        .set({ atsScansThisMonth: sql`${usageTable.atsScansThisMonth} + 1` })
        .where(eq(usageTable.userId, userId));

      res.json(analysis);
    } catch (error) {
      console.error('[API] Error scanning Joblify resume:', error);
      res.status(500).json({ error: "Failed to scan resume" });
    }
  });

  // ============================================
  // Cover Letter Generation Endpoints
  // ============================================

  // Generate cover letter
  app.post("/api/cover-letter/generate", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        resumeId: z.string().min(1, "Resume ID is required"),
        jobDescription: z.string().min(20, "Job description must be at least 20 characters"),
        tone: z.enum(["professional", "enthusiastic", "creative"]).default("professional"),
      });

      const { resumeId, jobDescription, tone } = schema.parse(req.body);

      // Get resume from database
      const [resume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, resumeId))
        .limit(1);

      if (!resume || resume.userId !== userId) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // Get user data
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Convert resume data to text
      const resumeText = convertResumeDataToText(resume.resumeData);

      // Create prompt based on tone
      const toneInstructions = {
        professional: "Write in a formal, business-appropriate tone. Be confident but not overly enthusiastic.",
        enthusiastic: "Write with energy and passion. Show genuine excitement about the opportunity while remaining professional.",
        creative: "Write with personality and creativity. Stand out while maintaining professionalism.",
      };

      const systemPrompt = `You are an expert cover letter writer. Create a compelling, personalized cover letter based on the user's resume and the job description they're applying to.

Guidelines:
- ${toneInstructions[tone]}
- Keep it to 3-4 concise paragraphs
- Start with a strong opening that grabs attention
- Highlight 2-3 key qualifications that match the job requirements
- Show genuine interest in the role and company
- End with a call to action
- Use the candidate's name from their resume
- Be specific about their achievements
- Do NOT use generic phrases or clichés
- Make it authentic and personal
- Write like a real person, not a robot. Use natural, conversational language.
- NEVER use em dashes (the long dash character). Use commas, periods, or semicolons instead.
- Avoid overused phrases like "I am thrilled", "I am excited to apply", "I believe I would be a great fit". Be genuine and specific instead.
- Keep sentences varied in length. Mix short punchy sentences with longer ones.
- Use simple, direct language. Prefer "use" over "utilize", "help" over "facilitate".

Return ONLY the cover letter text, no additional commentary.`;

      const poeClient = getPoeClient();
      const completion = await poeClient.chat.completions.create({
        model: "claude-4.5-haiku", // Cover letter generation uses claude-4.5-haiku
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Job Description:\n${jobDescription}\n\nCandidate's Resume:\n${resumeText}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
      });

      const coverLetter = completion.choices[0]?.message?.content || '';

      res.json({ 
        content: coverLetter,
        tone,
      });
    } catch (error) {
      console.error('[API] Error generating cover letter:', error);
      res.status(500).json({ error: "Failed to generate cover letter" });
    }
  });

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
        const planHierarchy: PlanType[] = ['free', 'plus', 'ultra', 'lifetime'];
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
  // Job Match Endpoint
  // ============================================

  app.post("/api/job-match/analyze", requireAuth, requireAIAccess, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      const schema = z.object({
        resumeId: z.string().min(1, "Resume ID is required"),
        jobDescription: z.string().min(20, "Job description must be at least 20 characters"),
      });

      const { resumeId, jobDescription } = schema.parse(req.body);

      // Get resume from database
      const [resume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, resumeId))
        .limit(1);

      if (!resume || resume.userId !== userId) {
        return res.status(404).json({ error: "Resume not found" });
      }

      // Check usage limits
      const userUsage = await storage.getUsage(userId);
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];

      if (userUsage.jobAnalysesThisMonth >= limits.maxJobAnalysesPerMonth) {
        return res.status(403).json({
          error: "Job analysis limit reached for this month",
          limit: limits.maxJobAnalysesPerMonth,
          current: userUsage.jobAnalysesThisMonth,
        });
      }

      // Convert resume data to text
      const resumeData = resumeDataSchema.parse(resume.resumeData);
      const resumeText = convertResumeDataToText(resumeData);

      // Send to AI for analysis
      const poe = getPoeClient();
      const aiResponse = await poe.chat.completions.create({
        model: "GPT-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert career advisor and recruiter. Analyze the match between a resume and a job description. 
Provide your response in this exact JSON format:
{
  "matchScore": <number 0-100>,
  "summary": "<brief overall assessment>",
  "matchedSkills": ["<skill1>", "<skill2>"],
  "missingSkills": ["<skill1>", "<skill2>"],
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<suggestion1>", "<suggestion2>"],
  "keywordMatches": ["<keyword1>", "<keyword2>"],
  "experienceMatch": "<assessment of experience alignment>",
  "educationMatch": "<assessment of education alignment>"
}
Respond ONLY with valid JSON, no additional text.`
          },
          {
            role: "user",
            content: `RESUME:\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const aiContent = aiResponse.choices[0]?.message?.content || "{}";

      let matchResult;
      try {
        matchResult = JSON.parse(aiContent);
      } catch (parseError) {
        console.error('[API] Failed to parse AI job match response:', parseError, 'Raw content:', aiContent.slice(0, 500));
        // If AI didn't return valid JSON, create a basic response
        matchResult = {
          matchScore: 50,
          summary: aiContent,
          matchedSkills: [],
          missingSkills: [],
          strengths: [],
          improvements: [],
          keywordMatches: [],
          experienceMatch: "Unable to determine",
          educationMatch: "Unable to determine",
        };
      }

      // Increment usage counter
      await db
        .update(usageTable)
        .set({ jobAnalysesThisMonth: sql`${usageTable.jobAnalysesThisMonth} + 1` })
        .where(eq(usageTable.userId, userId));

      res.json(matchResult);
    } catch (error) {
      console.error('[API] Error analyzing job match:', error);
      res.status(500).json({ error: "Failed to analyze job match" });
    }
  });

  // ============================================
  // Resume Upload & Parse Endpoint
  // ============================================

  app.post("/api/resumes/upload", requireAuth, requireAIAccess, upload.single('file'), async (req: Request, res) => {
    try {
      const userId = req.session.userId!;

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
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
      if (req.file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(req.file.buffer);
        extractedText = pdfData.text;
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

      // Create the resume in database
      const [newResume] = await db
        .insert(resumes)
        .values({
          userId,
          title,
          template: "modern",
          resumeData,
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
        message: "Resume uploaded and parsed successfully!",
      });
    } catch (error) {
      console.error('[API] Error uploading resume:', error);
      res.status(500).json({ error: "Failed to upload and parse resume" });
    }
  });

  return httpServer;
}
