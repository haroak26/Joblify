import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { skillSchema, PLAN_LIMITS, normalizePlan } from "@shared/schema";
import { requireAuth, requireVerifiedEmail, hashPassword, comparePasswords, isStrongPassword } from "./auth";
import OpenAI from "openai";
import { getUncachableStripeClient } from "./stripeClient";
import { generate2FASecret, generateQRCode, verify2FAToken, generateBackupCodes } from './lib/twoFactor';

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
      
      if (data.skills.length === 0) {
        // Only clear unsaved jobs when skills are empty, preserve saved/applied
        await storage.clearUnsavedJobs(userId);
        console.log('[API] Cleared unsaved jobs for user:', userId);
      }
      
      // Trigger scraping asynchronously if profile is complete and has skills
      if (data.isComplete && data.skills.length > 0) {
        console.log('[API] Triggering background scraping for user:', userId);
        const { scrapeJobs } = await import('./scrapers/index');
        scrapeJobs(data.intro, data.skills)
          .then(async (jobs) => {
            console.log('[API] Background scraping completed for user:', userId, '- jobs found:', jobs.length);
            await storage.saveJobs(userId, jobs);
            await storage.setProfile(userId, { lastScrapedAt: new Date() });
          })
          .catch(err => {
            console.error('[API] Background scraping error for user:', userId, err);
            // Could add error tracking service here (e.g., Sentry)
          });
      }
      
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
      
      if (skills.length === 0) {
        // Only clear unsaved jobs when skills are empty, preserve saved/applied
        await storage.clearUnsavedJobs(userId);
        console.log('[API] Cleared unsaved jobs for user:', userId);
      }
      
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
            content: `You are a career advisor that suggests relevant professional skills based on someone's background and experience. Analyze the user's introduction and suggest 5-8 specific, marketable skills that would be relevant for freelance work. Focus on skills that are commonly sought by clients on freelance platforms like Upwork and Fiverr. Return only a JSON array of skill names, nothing else. Example: ["React", "UI/UX Design", "Node.js", "TypeScript"]`
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

  // LinkedIn Import Endpoint
  app.post("/api/jobs/import-linkedin", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      const schema = z.object({
        urls: z.array(z.string().url()).min(1, "At least one URL required"),
      });
      
      const { urls } = schema.parse(req.body);

      // Check plan limits
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      
      if (!limits.hasLinkedInImport) {
        return res.status(403).json({
          error: 'LinkedIn import not available',
          code: 'LINKEDIN_IMPORT_NOT_AVAILABLE',
          message: `Upgrade to Plus or higher to access LinkedIn import.`
        });
      }

      // Import jobs from LinkedIn using Apify (mock implementation for now)
      const importedJobs = [];
      
      for (const url of urls) {
        try {
          // TODO: Implement actual Apify scraping
          // For now, create a placeholder job
          const job = await storage.createJob({
            userId,
            title: "Imported LinkedIn Job",
            description: "Job imported from LinkedIn",
            source: "linkedin",
            sourceUrl: url,
            author: "LinkedIn Company",
            authorHandle: "",
            postedAt: new Date().toISOString(),
            matchedSkills: [],
            budget: null,
            isRemote: true,
            saved: true,
            applied: false,
            relevanceScore: 0,
            rawData: null,
            linkedinUrl: url,
            importedFrom: "linkedin",
            company: "Company Name",
            location: "Location",
          });
          
          importedJobs.push(job);
        } catch (error) {
          console.error('[API] Error importing LinkedIn job:', url, error);
        }
      }

      res.json({ 
        success: true, 
        count: importedJobs.length,
        jobs: importedJobs
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error importing LinkedIn jobs:', error);
        res.status(500).json({ 
          error: "Failed to import LinkedIn jobs",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "LINKEDIN_IMPORT_ERROR"
        });
      }
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
      const isValid = await comparePasswords(currentPassword, user.password);
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
      const isValid = await comparePasswords(password, user.password);
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

  return httpServer;
}

function generateFallbackMessage(jobTitle: string, skills: string[], tone: string, intro: string, isComment: boolean = false): string {
  const skillsList = skills.length > 0 ? skills.join(", ") : "relevant expertise";

  if (isComment) {
    const comments = [
      `Hi! I’ve been working with ${skillsList} recently and this feels right up my alley. Happy to share a couple examples if that helps.`,
      `Hey there — I work a lot with ${skillsList} and can jump in quickly. Want me to send a quick overview of similar work?`,
      `I’ve got experience with ${skillsList} and can help keep this moving. If you’re open, I can DM a few relevant samples.`,
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }

  const toneIntros: Record<string, string> = {
    professional: "I hope this message finds you well.",
    friendly: "Hey there! I came across your post and got really excited.",
    enthusiastic: "Wow, this opportunity sounds amazing!",
  };

  const toneClosings: Record<string, string> = {
    professional: "I look forward to discussing how I can contribute to your project.",
    friendly: "Would love to chat more about this! Let me know if you'd like to hop on a quick call.",
    enthusiastic: "I can't wait to hear back from you!",
  };

  return `Hi,

${toneIntros[tone] || toneIntros.professional}

I'm reaching out about "${jobTitle}" and believe I'd be a great fit for this project.

${intro ? `${intro}\n\n` : ""}With my experience in ${skillsList}, I've worked on similar projects and understand the importance of delivering high-quality work that meets your specific needs.

I can help you with:
- Understanding your vision and translating it into actionable deliverables
- Providing regular updates and maintaining clear communication
- Ensuring the final result exceeds your expectations

${toneClosings[tone] || toneClosings.professional}

Best regards`;
}
