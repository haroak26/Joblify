import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage, PLAN_LIMITS } from "./storage";
import { z } from "zod";
import { 
  skillSchema, normalizePlan, resumes, users, type ResumeData, resumeDataSchema, type Resume, createEmptyResumeData,
  redeemableCodes, perks, userPerks, type PlanType
} from "@shared/schema";
import { requireAuth, requireVerifiedEmail, hashPassword, verifyPassword, isStrongPassword } from "./auth";
import OpenAI from "openai";
import { getUncachableStripeClient } from "./stripeClient";
import { generate2FASecret, generateQRCode, verify2FAToken, generateBackupCodes } from './lib/twoFactor';
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import PDFDocument from "pdfkit";
import multer from "multer";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

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
  
  app.get("/api/profile", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Fetching profile for user:', userId);
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
      console.log('[API] Updating profile for user:', userId);
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
        console.log('[API] Skills limit exceeded for user:', userId, '- limit:', skillCheck.limit, 'attempted:', data.skills.length);
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
      console.log('[API] Profile saved successfully for user:', userId);
      
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
      console.log('[API] Fetching skills for user:', userId);
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
      console.log('[API] Updating skills for user:', userId);
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
        console.log('[API] Skills limit exceeded for user:', userId, '- limit:', skillCheck.limit, 'attempted:', skills.length);
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
      console.log('[API] Skills saved successfully for user:', userId);
      
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

  app.post("/api/suggest-skills", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Suggesting skills for user:', userId);
      const schema = z.object({
        intro: z.string().min(10),
      });
      
      const { intro } = schema.parse(req.body);
      console.log('[API] Intro validated - length:', intro.length);
      
      const response = await getPoeClient().chat.completions.create({
        model: "claude-4.5-haiku",
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
      
      console.log('[API] AI response received for user:', userId);
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
        console.log('[API] Parsed AI skills for user:', userId, '- count:', skills.length);
      } catch (e) {
        console.error('[API] Failed to parse AI skills response for user:', userId, content, e);
        // Simple regex fallback if JSON parsing fails
        const matches = content.match(/"([^"]+)"/g);
        if (matches) {
          skills = matches.map(m => m.replace(/"/g, "")).filter(s => s.length > 2 && s.length < 30);
        }
      }
      
      res.json({ skills: skills.slice(0, 10) });
    } catch (error) {
      console.error('[API] Error suggesting skills for user:', userId, error);
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

  app.post("/api/cover-letter/generate", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      const { resumeId, jobDescription } = req.body;
      if (!resumeId || !jobDescription) {
        return res.status(400).json({ error: "Resume ID and job description are required" });
      }

      const resume = await storage.getResume(resumeId);
      if (!resume || resume.userId !== userId) {
        return res.status(404).json({ error: "Resume not found" });
      }

      const prompt = `Generate a professional cover letter based on this resume and job description.\n\nResume:\n${JSON.stringify(resume.resumeData)}\n\nJob Description:\n${jobDescription}`;
      
      const response = await getPoeClient().chat.completions.create({
        model: "claude-3-5-haiku",
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0].message.content || "";
      const coverLetter = await storage.createCoverLetter({
        userId,
        resumeId,
        content,
        jobDescription,
      });

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
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

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
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        enabled: user.twoFactorEnabled,
        hasBackupCodes: Array.isArray(user.backupCodes) && user.backupCodes.length > 0,
      });
    } catch (error) {
      console.error('[API] Error getting 2FA status:', error);
      res.status(500).json({ error: "Failed to get 2FA status" });
    }
  });

  // Setup 2FA - generate secret and QR code
  app.post("/api/user/2fa/setup", requireAuth, async (req: Request, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate new 2FA secret
      const { encryptedSecret, otpauthUrl } = generate2FASecret(user.email);
      
      // Generate QR code
      const qrCode = await generateQRCode(otpauthUrl);

      // Store encrypted secret temporarily (not enabled yet)
      await storage.updateUser(userId, {
        twoFactorSecret: encryptedSecret,
        twoFactorEnabled: false,
      });

      res.json({
        qrCode,
      });
    } catch (error) {
      console.error('[API] Error setting up 2FA:', error);
      res.status(500).json({ error: "Failed to setup 2FA" });
    }
  });

  // Verify and enable 2FA
  app.post("/api/user/2fa/verify", requireAuth, async (req: Request, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ error: "2FA setup not initiated" });
      }

      // Verify the token
      const isValid = verify2FAToken(user.twoFactorSecret, token);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Generate backup codes
      const { codes, encryptedCodes } = generateBackupCodes(10);

      // Enable 2FA and store backup codes
      await storage.updateUser(userId, {
        twoFactorEnabled: true,
        backupCodes: encryptedCodes,
      });

      res.json({
        success: true,
        backupCodes: codes,
        message: "2FA enabled successfully",
      });
    } catch (error) {
      console.error('[API] Error verifying 2FA:', error);
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });

  // Disable 2FA
  app.post("/api/user/2fa/disable", requireAuth, async (req: Request, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

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
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

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
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

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

  // ============================================
  // Resume Endpoints
  // ============================================

  // Get all resumes for the authenticated user
  app.post("/api/resumes", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Creating resume for user:', userId);
      
      const insertSchema = z.object({
        title: z.string().min(1),
        template: z.string().default("modern"),
        resumeData: resumeDataSchema.optional(),
      });
      
      const data = insertSchema.parse(req.body);
      
      // Check resume limit
      const resumeCheck = await storage.canAddResume(userId);
      if (!resumeCheck.allowed) {
        return res.status(403).json({ 
          error: "Resume limit reached", 
          code: "RESUME_LIMIT",
          limit: resumeCheck.limit,
          current: resumeCheck.current,
          message: `Your plan allows up to ${resumeCheck.limit} resumes. Upgrade to Plus or Ultra for more.`
        });
      }

      const resume = await storage.createResume({
        userId,
        title: data.title,
        template: data.template,
        resumeData: data.resumeData || createEmptyResumeData(),
      });
      
      res.status(201).json(resume);
    } catch (error) {
      console.error('[API] Error creating resume:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid resume data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create resume" });
      }
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
        template: z.enum(['modern', 'professional', 'academic', 'minimal']).optional(),
        resumeData: resumeDataSchema.optional(),
      });

      const data = createSchema.parse(req.body);

      // Create resume with provided data or empty data
      const [newResume] = await db
        .insert(resumes)
        .values({
          userId,
          title: data.title || "Untitled Resume",
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
        template: z.enum(['modern', 'professional', 'academic', 'minimal']).optional(),
        resumeData: resumeDataSchema.optional(),
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
  app.post("/api/resumes/:id/ai-chat", requireAuth, async (req: Request, res) => {
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
      });

      const { message, currentData: clientData, conversationHistory = [], selectedComponents = [], focusedComponent } = chatSchema.parse(req.body);

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
      
      const systemPrompt = `You are a professional resume assistant helping a user build their resume through natural conversation. Your job is to:
1. Ask one question at a time in a friendly, conversational manner
2. Extract structured information from user responses
3. Guide users to provide quantifiable achievements when discussing experience
4. Be encouraging and professional
5. **IMPORTANT**: After collecting one entry in a multi-entry section (experience, education, skills), ALWAYS ask if they want to add more before moving to the next section
6. **DYNAMIC COMPONENTS**: If the user mentions wanting to add a component they didn't initially select (like "I want to add certifications" or "Can I add my projects?"), acknowledge it positively and start collecting that information. Include the component name in the "addedComponents" field of your response.
7. **NEVER ASK FOR NAME OR EMAIL** - These are already known and saved in the user's profile.
8. **PROACTIVE START**: If this is the first conversation (no prior messages) and there's no summary yet, begin with: "We will start with your professional summary. To craft the best summary for you, I'd like to know: What is your current or most recent job title?" Then ask follow-up questions about their key skills, years of experience, and career goals.
9. **AUTO-POPULATE SKILLS**: Whenever the user mentions specific skills, technologies, tools, or competencies during the conversation (e.g., "I use Python", "experienced with AWS", "skilled in project management"), automatically extract and add them to the skills array in updatedData. Do NOT ask them to list skills separately if they've already mentioned them.

${userInfo}

${componentsList}
${focusedMode}

Current resume data: ${JSON.stringify(currentData, null, 2)}

Available components that can be added dynamically:
- experience: Work Experience
- education: Education
- skills: Skills
- certifications: Professional Certifications
- projects: Personal/Professional Projects
- awards: Awards & Honors
- leadership: Leadership Roles
- research: Research Work
- publications: Academic/Professional Publications

Guidelines for extracting data:
- For personal info: SKIP name and email (already known). Only collect: phone, location, LinkedIn, website if user mentions them
- For summary: Help craft a compelling 2-3 sentence professional summary by asking:
  * What is your current or most recent job title?
  * What are your key areas of expertise?
  * How many years of experience do you have?
  * What are you looking for in your next role?
  Then synthesize their answers into a polished summary.
- For experience: collect company, title, location, dates, and bullet points of achievements
  * After each work experience entry, ask: "Great! Is this it, or do you have more work experience to add?"
  * Only proceed to next section if user confirms they're done with experience
  * **AUTO-EXTRACT SKILLS**: If user mentions tools, technologies, or methodologies, add them to the skills array
- For education: collect school, degree, field, graduation date, GPA (optional)
  * After each education entry, ask: "Perfect! Would you like to add another degree or educational qualification?"
  * Only proceed to next section if user confirms they're done with education
- For skills: collect a list of technical and professional skills
  * If skills were already extracted from previous conversations, acknowledge them: "I noticed you mentioned [skills] earlier. I've already added those."
  * Ask: "Are there any other skills you'd like to highlight?"
  * Only proceed to next section if user confirms they're done with skills
- For certifications: collect name, issuer, and date
- For projects: collect name, description, technologies used, and optional URL
  * **AUTO-EXTRACT SKILLS**: Add mentioned technologies to the skills array
- For awards: collect title, issuer, date, and optional description
- For leadership: collect title, organization, dates, and description
- For research: collect title, institution, dates, description, and optional URL
- For publications: collect title, authors, journal/venue, date, and optional URL

**Skill Extraction Rules**:
- Extract and add skills mentioned in ANY context (experience, projects, casual mention)
- Categories of skills to watch for:
  * Programming languages (Python, JavaScript, Java, etc.)
  * Frameworks/Libraries (React, Node.js, Django, etc.)
  * Tools (Git, Docker, Kubernetes, AWS, Azure, etc.)
  * Soft skills (Leadership, Communication, Project Management, etc.)
  * Domain expertise (Data Analysis, Machine Learning, etc.)
- Deduplicate skills - don't add if already in the skills array
- Format skills consistently (e.g., "JavaScript" not "javascript" or "JS")

**Dynamic Component Addition**:
When a user says something like:
- "I want to add my certifications"
- "Can I include my projects?"
- "I'd like to add awards"
- "Let me tell you about my publications"

Respond with:
1. Positive acknowledgment: "Absolutely! I'd love to add your [component] to your resume."
2. Ask for the first entry in that section
3. In your JSON response, include "addedComponents": ["component-id"]

**Multi-Entry Section Flow**:
When user provides information for experience, education, or skills:
1. Acknowledge and extract the data
2. Ask the confirmation question (e.g., "Is this it, or do you have more to add?")
3. Wait for user's response (yes/more/another OR no/that's it/done)
4. If yes → ask for the next entry in the same section
5. If no → move to the next section

When you have collected enough information across all sections, set isComplete to true.

Conversation so far:
${conversationContext}

User's message: ${sanitizedMessage}

Respond with:
1. A friendly reply with your next question or acknowledgment
2. Any extracted data that should be added to their resume (including auto-extracted skills)
3. Any components that were dynamically added (if user requested a new section)
4. Whether the conversation is complete

Format your response as JSON with these fields:
{
  "reply": "Your conversational response",
  "updatedData": { /* Only include fields that changed. Always include 'skills' array if you extracted any skills from the conversation */ },
  "addedComponents": ["component-id"], // Optional: only if user requested a new component
  "isComplete": false
}`;

      try {
        const poeClient = getPoeClient();
        const completion = await poeClient.chat.completions.create({
          model: "gpt-5-nano", // Resume builder uses gpt-5-nano model
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: sanitizedMessage }
          ],
          max_tokens: 1000,
          temperature: 0.7,
        });

        const aiResponse = completion.choices[0]?.message?.content || '';
        
        // Try to parse as JSON, fallback to text-only response
        let parsedResponse;
        try {
          parsedResponse = JSON.parse(aiResponse);
        } catch {
          // If not valid JSON, create a simple response
          parsedResponse = {
            reply: aiResponse || "I understand. Could you tell me more?",
            updatedData: {},
            isComplete: false,
          };
        }

        res.json(parsedResponse);
      } catch (aiError) {
        console.error('[API] AI chat error:', aiError);
        // Fallback response if AI fails
        res.json({
          reply: "I'm having trouble processing that. Could you please rephrase?",
          updatedData: {},
          isComplete: false,
        });
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

      // Create PDF document
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const resumeData = resumeDataSchema.parse(resume.resumeData);

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${resume.title}.pdf"`);

      // Pipe the PDF to response
      doc.pipe(res);

      // Add content to PDF
      // Header with name and contact info
      if (resumeData.personalInfo?.name) {
        doc.fontSize(24).font('Helvetica-Bold').text(resumeData.personalInfo.name, { align: 'center' });
        doc.moveDown(0.5);
      }

      // Contact information
      const contactInfo = resumeData.personalInfo ? [
        resumeData.personalInfo.email,
        resumeData.personalInfo.phone,
        resumeData.personalInfo.location,
        resumeData.personalInfo.linkedin,
        resumeData.personalInfo.website,
      ].filter(Boolean).join(' | ') : '';

      if (contactInfo) {
        doc.fontSize(10).font('Helvetica').text(contactInfo, { align: 'center' });
        doc.moveDown(1);
      }

      // Summary
      if (resumeData.summary) {
        doc.fontSize(14).font('Helvetica-Bold').text('Professional Summary');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').text(resumeData.summary);
        doc.moveDown(1);
      }

      // Experience
      if (resumeData.experience && resumeData.experience.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Experience');
        doc.moveDown(0.5);
        
        resumeData.experience.forEach((exp, index) => {
          doc.fontSize(12).font('Helvetica-Bold').text(exp.title);
          doc.fontSize(10).font('Helvetica-Oblique').text(`${exp.company} | ${exp.location}`);
          const endDateDisplay = exp.endDate || 'Present';
          doc.text(`${exp.startDate} - ${endDateDisplay}`);
          doc.moveDown(0.3);
          
          if (exp.description && exp.description.length > 0) {
            exp.description.forEach((bullet) => {
              doc.font('Helvetica').text(`• ${bullet}`, { indent: 20 });
            });
          }
          
          if (index < resumeData.experience.length - 1) {
            doc.moveDown(0.7);
          }
        });
        doc.moveDown(1);
      }

      // Education
      if (resumeData.education && resumeData.education.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Education');
        doc.moveDown(0.5);
        
        resumeData.education.forEach((edu, index) => {
          doc.fontSize(12).font('Helvetica-Bold').text(edu.degree);
          doc.fontSize(10).font('Helvetica').text(`${edu.school} | ${edu.field}`);
          if (edu.graduationDate) {
            doc.text(edu.graduationDate);
          }
          if (edu.gpa) {
            doc.text(`GPA: ${edu.gpa}`);
          }
          
          if (index < resumeData.education.length - 1) {
            doc.moveDown(0.7);
          }
        });
        doc.moveDown(1);
      }

      // Skills
      if (resumeData.skills && resumeData.skills.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Skills');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica').text(resumeData.skills.join(', '));
        doc.moveDown(1);
      }

      // Certifications
      if (resumeData.certifications && resumeData.certifications.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Certifications');
        doc.moveDown(0.5);
        
        resumeData.certifications.forEach((cert) => {
          doc.fontSize(10).font('Helvetica-Bold').text(cert.name);
          doc.font('Helvetica').text(`${cert.issuer} | ${cert.date}`);
          doc.moveDown(0.5);
        });
        doc.moveDown(0.5);
      }

      // Projects
      if (resumeData.projects && resumeData.projects.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Projects');
        doc.moveDown(0.5);
        
        resumeData.projects.forEach((project) => {
          doc.fontSize(11).font('Helvetica-Bold').text(project.name);
          doc.fontSize(10).font('Helvetica').text(project.description);
          if (project.technologies && project.technologies.length > 0) {
            doc.text(`Technologies: ${project.technologies.join(', ')}`);
          }
          if (project.url) {
            doc.text(`URL: ${project.url}`);
          }
          doc.moveDown(0.5);
        });
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error('[API] Error generating PDF:', error);
      // If headers haven't been sent yet, send error response
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate PDF" });
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
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
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
  app.post("/api/ats/scan", requireAuth, upload.single('file'), async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Check usage limits
      const usage = await storage.getUsage(userId);
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];

      if (usage.atsScansThisMonth >= limits.atsScans) {
        return res.status(403).json({ 
          error: "ATS scan limit reached for this month",
          limit: limits.atsScans,
          current: usage.atsScansThisMonth
        });
      }

      // Extract text from file
      let resumeText = "";
      if (req.file.mimetype === 'application/pdf') {
        const pdfData = await pdfParse(req.file.buffer);
        resumeText = pdfData.text;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        resumeText = result.value;
      }

      if (!resumeText || resumeText.trim().length === 0) {
        return res.status(400).json({ error: "Could not extract text from file" });
      }

      // Get job description from request if provided
      const jobDescription = req.body.jobDescription || "";

      // Perform ATS analysis
      const analysis = await performATSAnalysis(resumeText, jobDescription);

      // Update usage counter
      await storage.incrementUsage(userId, 'atsScansThisMonth');

      res.json(analysis);
    } catch (error) {
      console.error('[API] Error scanning resume:', error);
      res.status(500).json({ error: "Failed to scan resume" });
    }
  });

  // ATS Scanner - Scan existing Joblify resume
  app.post("/api/ats/scan-resume/:id", requireAuth, async (req: Request, res) => {
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

      if (usage.atsScansThisMonth >= limits.atsScans) {
        return res.status(403).json({ 
          error: "ATS scan limit reached for this month",
          limit: limits.atsScans,
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

      // Update usage counter
      await storage.incrementUsage(userId, 'atsScansThisMonth');

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
  app.post("/api/cover-letter/tailor", requireAuth, async (req: Request, res) => {
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
  app.post("/api/contact/ai-response", async (req: Request, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        message: z.string().min(1, "Message is required"),
      });

      const { name, email, message } = schema.parse(req.body);
      console.log('[API] Contact form AI request from:', name, email);

      // Build knowledge base context
      const knowledgeBase = `
You are a helpful customer support AI for Joblify, an AI-powered resume builder platform.

Key information about Joblify:
- We help job seekers create professional, ATS-optimized resumes using AI
- Features: AI Resume Builder, Cover Letter Generator, ATS Scanner, Job Matching, Resume Tailoring
- Plans: Free (limited features), Plus ($9.99/mo), Ultra ($19.99/mo), Lifetime ($99 one-time)
- We use secure Auth0 authentication and encrypt all user data
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
  app.post("/api/contact/send-email", async (req: Request, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        message: z.string().min(1, "Message is required"),
        aiResponse: z.string().optional(),
      });

      const { name, email, message, aiResponse } = schema.parse(req.body);
      console.log('[API] Sending contact form email from:', name, email);

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

      console.log('[API] Contact form emails sent successfully');
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

  return httpServer;
}
