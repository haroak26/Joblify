import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { skillSchema, normalizePlan, resumes, type ResumeData, resumeDataSchema, type Resume, createEmptyResumeData } from "@shared/schema";
import { requireAuth, requireVerifiedEmail, hashPassword, comparePasswords, isStrongPassword } from "./auth";
import OpenAI from "openai";
import { getUncachableStripeClient } from "./stripeClient";
import { generate2FASecret, generateQRCode, verify2FAToken, generateBackupCodes } from './lib/twoFactor';
import { db } from "./db";
import { eq } from "drizzle-orm";
import PDFDocument from "pdfkit";

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

  // LinkedIn Import Endpoint
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

  // ============================================
  // Resume Endpoints
  // ============================================

  // Create a new resume
  app.post("/api/resumes", requireAuth, async (req: Request, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Validate request body
      const createSchema = z.object({
        title: z.string().min(1).optional(),
        template: z.enum(['modern', 'professional']).optional(),
      });

      const data = createSchema.parse(req.body);

      // Create resume with empty data
      const [newResume] = await db
        .insert(resumes)
        .values({
          userId,
          title: data.title || "Untitled Resume",
          template: data.template || "modern",
          resumeData: createEmptyResumeData(),
        })
        .returning();

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
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      if (!id) {
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
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      if (!id) {
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
        template: z.enum(['modern', 'professional']).optional(),
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

  // Generate and return PDF for a resume
  app.post("/api/resumes/:id/pdf", requireAuth, async (req: Request, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { id } = req.params;
      if (!id) {
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

  return httpServer;
}
