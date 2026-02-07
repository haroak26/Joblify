import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { skillSchema, PLAN_LIMITS, normalizePlan, resumeDataSchema } from "@shared/schema";
import type { ResumeData } from "@shared/schema";
import { requireAuth, requireVerifiedEmail } from "./auth";
import OpenAI from "openai";
import { getUncachableStripeClient } from "./stripeClient";
import multer from 'multer';
import PDFDocument from 'pdfkit';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

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

/**
 * Merges extracted resume data from AI into existing resume data
 * Appends arrays and replaces other values
 */
function mergeResumeData(
  currentData: ResumeData,
  extractedData: Record<string, unknown>
): ResumeData {
  const merged = { ...currentData };
  
  for (const [key, value] of Object.entries(extractedData)) {
    if (!value) continue;
    
    const typedKey = key as keyof ResumeData;
    const currentValue = currentData[typedKey];
    
    // For array fields, append new items
    if (Array.isArray(value) && Array.isArray(currentValue)) {
      (merged[typedKey] as unknown[]) = [...currentValue, ...value];
    }
    // For other fields, replace with new value
    else if (typedKey in merged) {
      (merged[typedKey] as unknown) = value;
    }
  }
  
  return merged;
}

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

// Convert resume data to text for ATS analysis
function resumeDataToText(resumeData: ResumeData): string {
  const parts: string[] = [];
  
  // Personal Info
  const { personalInfo } = resumeData;
  if (personalInfo.name) parts.push(personalInfo.name);
  if (personalInfo.email) parts.push(personalInfo.email);
  if (personalInfo.phone) parts.push(personalInfo.phone);
  if (personalInfo.location) parts.push(personalInfo.location);
  
  // Summary
  if (resumeData.summary) {
    parts.push('\nSUMMARY\n' + resumeData.summary);
  }
  
  // Experience
  if (resumeData.experience?.length > 0) {
    parts.push('\nEXPERIENCE');
    resumeData.experience.forEach(exp => {
      parts.push(`\n${exp.title} at ${exp.company}`);
      parts.push(`${exp.location} | ${exp.startDate} - ${exp.endDate || 'Present'}`);
      exp.description.forEach(desc => parts.push(`• ${desc}`));
    });
  }
  
  // Education
  if (resumeData.education?.length > 0) {
    parts.push('\nEDUCATION');
    resumeData.education.forEach(edu => {
      parts.push(`\n${edu.degree} in ${edu.field}`);
      parts.push(`${edu.school} | ${edu.graduationDate}`);
      if (edu.gpa) parts.push(`GPA: ${edu.gpa}`);
    });
  }
  
  // Skills
  if (resumeData.skills?.length > 0) {
    parts.push('\nSKILLS\n' + resumeData.skills.join(', '));
  }
  
  // Certifications
  if (resumeData.certifications?.length > 0) {
    parts.push('\nCERTIFICATIONS');
    resumeData.certifications.forEach(cert => {
      parts.push(`\n${cert.name} - ${cert.issuer} (${cert.date})`);
    });
  }
  
  // Projects
  if (resumeData.projects?.length > 0) {
    parts.push('\nPROJECTS');
    resumeData.projects.forEach(proj => {
      parts.push(`\n${proj.name}`);
      parts.push(proj.description);
      parts.push(`Technologies: ${proj.technologies.join(', ')}`);
    });
  }
  
  return parts.join('\n');
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

  // ============================================
  // Resume Management Endpoints
  // ============================================
  
  app.get("/api/resumes", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Fetching resumes for user:', userId);
      const resumes = await storage.getResumes(userId);
      res.json({ resumes });
    } catch (error) {
      console.error('[API] Error fetching resumes for user:', userId, error);
      res.status(500).json({ 
        error: "Failed to fetch resumes",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "RESUMES_FETCH_ERROR"
      });
    }
  });

  app.post("/api/resumes", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Creating resume for user:', userId);
      const schema = z.object({
        title: z.string().min(1, "Title is required"),
        template: z.enum(['modern', 'classic', 'creative']).optional().default('modern'),
        resumeData: resumeDataSchema.optional(),
      });
      
      const data = schema.parse(req.body);
      
      // Check plan limits
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      
      const resumeCount = await storage.countUserResumes(userId);
      
      if (limits.maxResumes !== Infinity && resumeCount >= limits.maxResumes) {
        console.log('[API] Resume limit reached for user:', userId, '- limit:', limits.maxResumes);
        return res.status(403).json({
          error: 'Resume limit reached',
          code: 'RESUME_LIMIT',
          limit: limits.maxResumes,
          current: resumeCount,
          message: `Your ${plan} plan allows up to ${limits.maxResumes} resume(s). Upgrade to create more.`
        });
      }
      
      // Get user data to auto-populate resume
      const user = await storage.getUser(userId);
      
      // Use provided resumeData or create structure with user data
      const resumeData = data.resumeData || {
        personalInfo: {
          name: user?.name || "",
          email: user?.email || "",
          phone: user?.phone || "",
          location: "",
          linkedin: "",
          website: "",
        },
        summary: "",
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        projects: [],
      };
      
      const resume = await storage.createResume(userId, {
        userId,
        title: data.title,
        template: data.template,
        resumeData,
      });
      
      console.log('[API] Resume created:', resume.id, 'user:', userId);
      res.json({ resume });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] Resume validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid resume data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error creating resume for user:', userId, error);
        res.status(500).json({ 
          error: "Failed to create resume",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "RESUME_CREATE_ERROR"
        });
      }
    }
  });

  app.get("/api/resumes/:id", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Fetching resume:', id, 'user:', userId);
      const resume = await storage.getResume(id);
      
      if (!resume) {
        console.log('[API] Resume not found:', id);
        return res.status(404).json({ error: "Resume not found", code: "RESUME_NOT_FOUND" });
      }
      
      if (resume.userId !== userId) {
        console.log('[API] Unauthorized resume access:', id, 'user:', userId);
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }
      
      res.json({ resume });
    } catch (error) {
      console.error('[API] Error fetching resume:', id, 'user:', userId, error);
      res.status(500).json({ 
        error: "Failed to fetch resume",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "RESUME_FETCH_ERROR"
      });
    }
  });

  app.put("/api/resumes/:id", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Updating resume:', id, 'user:', userId);
      const resume = await storage.getResume(id);
      
      if (!resume) {
        console.log('[API] Resume not found:', id);
        return res.status(404).json({ error: "Resume not found", code: "RESUME_NOT_FOUND" });
      }
      
      if (resume.userId !== userId) {
        console.log('[API] Unauthorized resume access:', id, 'user:', userId);
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }
      
      const schema = z.object({
        title: z.string().min(1).optional(),
        template: z.enum(['modern', 'classic', 'creative']).optional(),
        resumeData: resumeDataSchema.optional(),
      });
      
      const updates = schema.parse(req.body);
      const updated = await storage.updateResume(id, updates);
      
      console.log('[API] Resume updated:', id, 'user:', userId);
      res.json({ resume: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] Resume validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid resume data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error updating resume:', id, 'user:', userId, error);
        res.status(500).json({ 
          error: "Failed to update resume",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "RESUME_UPDATE_ERROR"
        });
      }
    }
  });

  app.delete("/api/resumes/:id", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Deleting resume:', id, 'user:', userId);
      const resume = await storage.getResume(id);
      
      if (!resume) {
        console.log('[API] Resume not found:', id);
        return res.status(404).json({ error: "Resume not found", code: "RESUME_NOT_FOUND" });
      }
      
      if (resume.userId !== userId) {
        console.log('[API] Unauthorized resume access:', id, 'user:', userId);
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }
      
      await storage.deleteResume(id);
      console.log('[API] Resume deleted:', id, 'user:', userId);
      res.json({ message: "Resume deleted successfully" });
    } catch (error) {
      console.error('[API] Error deleting resume:', id, 'user:', userId, error);
      res.status(500).json({ 
        error: "Failed to delete resume",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "RESUME_DELETE_ERROR"
      });
    }
  });

  app.post("/api/resumes/:id/duplicate", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Duplicating resume:', id, 'user:', userId);
      const resume = await storage.getResume(id);
      
      if (!resume) {
        console.log('[API] Resume not found:', id);
        return res.status(404).json({ error: "Resume not found", code: "RESUME_NOT_FOUND" });
      }
      
      if (resume.userId !== userId) {
        console.log('[API] Unauthorized resume access:', id, 'user:', userId);
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }
      
      // Check plan limits
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      
      const resumeCount = await storage.countUserResumes(userId);
      
      if (limits.maxResumes !== Infinity && resumeCount >= limits.maxResumes) {
        console.log('[API] Resume limit reached for user:', userId, '- limit:', limits.maxResumes);
        return res.status(403).json({
          error: 'Resume limit reached',
          code: 'RESUME_LIMIT',
          limit: limits.maxResumes,
          current: resumeCount,
          message: `Your ${plan} plan allows up to ${limits.maxResumes} resume(s). Upgrade to create more.`
        });
      }
      
      const newResume = await storage.createResume(userId, {
        userId,
        title: `${resume.title} (Copy)`,
        template: resume.template,
        resumeData: resume.resumeData,
      });
      
      console.log('[API] Resume duplicated:', id, '-> new id:', newResume.id, 'user:', userId);
      res.json({ resume: newResume });
    } catch (error) {
      console.error('[API] Error duplicating resume:', id, 'user:', userId, error);
      res.status(500).json({ 
        error: "Failed to duplicate resume",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "RESUME_DUPLICATE_ERROR"
      });
    }
  });

  // ============================================
  // AI Chat Endpoints
  // ============================================
  
  const RESUME_CHAT_SYSTEM_PROMPT = `You are a friendly, conversational resume builder assistant. Your goal is to help users create great resumes through a natural, human-like conversation - NOT through forms or structured questions.

Key principles:
1. Ask questions naturally, as if you're having a casual conversation with a friend
2. Ask ONE question at a time - never bombard the user with multiple questions
3. Listen to what they say and adapt your questions based on their responses
4. Accept answers in natural language - users can say "I work at Google" instead of filling out company/position fields
5. Be encouraging, warm, and supportive throughout the conversation
6. Extract information from their casual responses and structure it behind the scenes

Conversation flow (but adapt based on what they tell you):
- Start with: "Hi! Let's build your resume together. What's your name?"
- Then: "Great! Do you have an email or phone number you'd like to include?"
- Then: "What kind of work do you do?" or "What's your current or most recent job?"
- Follow up naturally based on their answers
- If they mention a job, ask about their responsibilities or achievements
- Ask about education only if relevant
- Ask about skills in a conversational way: "What are you really good at?"

Important:
- Sound human, not like a bot
- Use contractions (I'm, you're, let's)
- Show personality and enthusiasm
- Acknowledge what they tell you before moving to the next question
- If they give detailed answers, extract everything you can from one response

When you extract information, respond in this format:
{
  "message": "Your natural, conversational response",
  "extracted_data": {
    // Include any resume fields you extracted
    "personalInfo": {"name": "...", "email": "...", "phone": "..."},
    "experience": [{"company": "...", "title": "...", "description": ["..."]}]
  }
}

If the user hasn't provided structured data yet, just respond conversationally without extracted_data.`;


  app.post("/api/chat/resume/:id/message", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const resumeId = req.params.id as string;
    try {
      console.log('[API] Chat message for resume:', resumeId, 'user:', userId);
      const schema = z.object({
        message: z.string().min(1, "Message is required"),
      });
      
      const { message } = schema.parse(req.body);
      
      // Validate user owns the resume
      const resume = await storage.getResume(resumeId);
      if (!resume) {
        console.log('[API] Resume not found:', resumeId);
        return res.status(404).json({ error: "Resume not found", code: "RESUME_NOT_FOUND" });
      }
      
      if (resume.userId !== userId) {
        console.log('[API] Unauthorized resume access:', resumeId, 'user:', userId);
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }
      
      // Get user data for context
      const user = await storage.getUser(userId);
      
      // Get or create chat conversation
      let conversation = await storage.getChatConversation(resumeId);
      if (!conversation) {
        conversation = await storage.createChatConversation(userId, resumeId);
        console.log('[API] Created new chat conversation for resume:', resumeId);
      }
      
      // Build messages array with user context in system prompt
      const messages = conversation.messages as Array<{ role: string; content: string }>;
      const systemPromptWithContext = `${RESUME_CHAT_SYSTEM_PROMPT}

User information available:
- Name: ${resume.resumeData.personalInfo?.name || user?.name || "Not provided"}
- Email: ${resume.resumeData.personalInfo?.email || user?.email || "Not provided"}
- Phone: ${resume.resumeData.personalInfo?.phone || user?.phone || "Not provided"}

Use this information to personalize your responses and avoid asking for data already known.`;
      
      const chatMessages = [
        { role: "system" as const, content: systemPromptWithContext },
        ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: message },
      ];
      
      // Send to AI
      const response = await getPoeClient().chat.completions.create({
        model: "gpt-5-nano",
        messages: chatMessages,
        max_tokens: 1000,
      });
      
      const aiResponse = response.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";
      console.log('[API] AI response received for resume:', resumeId);
      
      // Save messages to conversation
      const updatedMessages = [
        ...messages,
        { role: "user", content: message, timestamp: new Date().toISOString() },
        { role: "assistant", content: aiResponse, timestamp: new Date().toISOString() },
      ];
      
      await storage.updateChatConversation(conversation.id, updatedMessages);
      
      // Try to parse AI response for extracted data
      let extractedData = null;
      try {
        const cleanContent = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleanContent);
        if (parsed.extracted_data) {
          extractedData = parsed.extracted_data;
          
          // Merge extracted data into existing resume data
          const mergedData = mergeResumeData(resume.resumeData, extractedData);
          
          // Validate the merged data
          const validatedData = resumeDataSchema.parse(mergedData);
          await storage.updateResume(resumeId, { resumeData: validatedData });
          console.log('[API] Resume updated with extracted data:', resumeId);
        }
      } catch (parseError) {
        // If parsing fails, just send the response as-is
        console.log('[API] Could not parse AI response for data extraction:', parseError);
      }
      
      res.json({ 
        response: aiResponse,
        extractedData,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] Chat validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid message data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error in chat for resume:', resumeId, 'user:', userId, error);
        res.status(500).json({ 
          error: "Failed to process chat message",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "CHAT_ERROR"
        });
      }
    }
  });

  app.get("/api/chat/resume/:id/history", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const resumeId = req.params.id as string;
    try {
      console.log('[API] Fetching chat history for resume:', resumeId, 'user:', userId);
      
      // Get user data early for potential use
      const user = await storage.getUser(userId);
      
      // Validate user owns the resume
      const resume = await storage.getResume(resumeId);
      if (!resume) {
        console.log('[API] Resume not found:', resumeId);
        return res.status(404).json({ error: "Resume not found", code: "RESUME_NOT_FOUND" });
      }
      
      if (resume.userId !== userId) {
        console.log('[API] Unauthorized resume access:', resumeId, 'user:', userId);
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }
      
      const conversation = await storage.getChatConversation(resumeId);
      let messages = conversation?.messages || [];
      
      // If no messages, add personalized welcome message
      if (messages.length === 0) {
        const userName = resume.resumeData.personalInfo?.name || user?.name || "there";
        const welcomeMessages = [
          {
            role: "assistant",
            content: `Hi, ${userName}!`,
            timestamp: new Date().toISOString()
          },
          {
            role: "assistant",
            content: "I'm your AI resume assistant. Let's build your resume together! Tell me about your most recent work experience - what do you do or what was your last job?",
            timestamp: new Date().toISOString()
          }
        ];
        messages = welcomeMessages;
      }
      
      res.json({ messages });
    } catch (error) {
      console.error('[API] Error fetching chat history for resume:', resumeId, 'user:', userId, error);
      res.status(500).json({ 
        error: "Failed to fetch chat history",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "CHAT_HISTORY_ERROR"
      });
    }
  });

  // ============================================
  // AI Enhancement Endpoints
  // ============================================
  
  app.post("/api/ai/improve-content", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] AI improve content for user:', userId);
      const schema = z.object({
        content: z.string().min(1, "Content is required"),
        section: z.string().min(1, "Section is required"),
      });
      
      const { content, section } = schema.parse(req.body);
      
      // Check AI usage limits
      const canUse = await storage.canUseAiEdit(userId);
      if (!canUse) {
        const subscription = await storage.getSubscription(userId);
        const plan = normalizePlan(subscription?.plan);
        const limits = PLAN_LIMITS[plan];
        console.log('[API] AI edit limit reached for user:', userId);
        return res.status(403).json({
          error: 'AI edit limit reached',
          code: 'AI_EDIT_LIMIT',
          limit: limits.maxAiEditsPerMonth,
          message: `Your ${plan} plan allows ${limits.maxAiEditsPerMonth} AI edits per month. Upgrade for more.`
        });
      }
      
      const response = await getPoeClient().chat.completions.create({
        model: "claude-4.5-haiku",
        messages: [
          {
            role: "system",
            content: `You are a professional resume editor. Improve the following ${section} section to be more professional, impactful, and ATS-friendly. Keep the same information but make it more compelling. Return only the improved content without any explanations.`
          },
          {
            role: "user",
            content,
          }
        ],
        max_tokens: 500,
      });
      
      const improved = response.choices[0]?.message?.content || content;
      
      // Increment usage
      await storage.incrementAiEdits(userId);
      console.log('[API] AI content improved for user:', userId);
      
      res.json({ improved });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] AI improve validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error improving content for user:', userId, error);
        res.status(500).json({ 
          error: "Failed to improve content",
          message: error instanceof Error ? error.message : "AI service unavailable",
          code: "AI_ERROR"
        });
      }
    }
  });

  app.post("/api/ai/suggest-keywords", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] AI suggest keywords for user:', userId);
      const schema = z.object({
        jobTitle: z.string().min(1, "Job title is required"),
        industry: z.string().optional(),
      });
      
      const { jobTitle, industry } = schema.parse(req.body);
      
      // Check AI usage limits
      const canUse = await storage.canUseAiEdit(userId);
      if (!canUse) {
        const subscription = await storage.getSubscription(userId);
        const plan = normalizePlan(subscription?.plan);
        const limits = PLAN_LIMITS[plan];
        console.log('[API] AI edit limit reached for user:', userId);
        return res.status(403).json({
          error: 'AI edit limit reached',
          code: 'AI_EDIT_LIMIT',
          limit: limits.maxAiEditsPerMonth,
          message: `Your ${plan} plan allows ${limits.maxAiEditsPerMonth} AI edits per month. Upgrade for more.`
        });
      }
      
      const industryContext = industry ? ` in the ${industry} industry` : '';
      const response = await getPoeClient().chat.completions.create({
        model: "claude-4.5-haiku",
        messages: [
          {
            role: "system",
            content: `You are a resume keyword expert. Suggest 10-15 relevant keywords and skills for a ${jobTitle}${industryContext} that would help a resume pass ATS systems. Return only a JSON array of keywords, nothing else. Example: ["Python", "Machine Learning", "Data Analysis"]`
          },
          {
            role: "user",
            content: `Job title: ${jobTitle}${industryContext}`
          }
        ],
        max_tokens: 300,
      });
      
      const content = response.choices[0]?.message?.content || '[]';
      let keywords: string[] = [];
      
      try {
        const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleanContent);
        keywords = Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        console.error('[API] Failed to parse AI keywords response:', parseError);
      }
      
      // Increment usage
      await storage.incrementAiEdits(userId);
      console.log('[API] AI keywords suggested for user:', userId);
      
      res.json({ keywords });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] AI keywords validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error suggesting keywords for user:', userId, error);
        res.status(500).json({ 
          error: "Failed to suggest keywords",
          message: error instanceof Error ? error.message : "AI service unavailable",
          code: "AI_ERROR"
        });
      }
    }
  });

  app.post("/api/ai/check-grammar", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] AI check grammar for user:', userId);
      const schema = z.object({
        content: z.string().min(1, "Content is required"),
      });
      
      const { content } = schema.parse(req.body);
      
      // Check AI usage limits
      const canUse = await storage.canUseAiEdit(userId);
      if (!canUse) {
        const subscription = await storage.getSubscription(userId);
        const plan = normalizePlan(subscription?.plan);
        const limits = PLAN_LIMITS[plan];
        console.log('[API] AI edit limit reached for user:', userId);
        return res.status(403).json({
          error: 'AI edit limit reached',
          code: 'AI_EDIT_LIMIT',
          limit: limits.maxAiEditsPerMonth,
          message: `Your ${plan} plan allows ${limits.maxAiEditsPerMonth} AI edits per month. Upgrade for more.`
        });
      }
      
      const response = await getPoeClient().chat.completions.create({
        model: "claude-4.5-haiku",
        messages: [
          {
            role: "system",
            content: `You are a grammar and spelling checker. Check the following text for grammar and spelling errors. Return a JSON object with: { "corrected": "the corrected text", "changes": ["list of changes made"] }. If no changes are needed, return the original text with an empty changes array.`
          },
          {
            role: "user",
            content,
          }
        ],
        max_tokens: 500,
      });
      
      const aiResponse = response.choices[0]?.message?.content || '{}';
      let result = { corrected: content, changes: [] as string[] };
      
      try {
        const cleanContent = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
        const parsed = JSON.parse(cleanContent);
        result = {
          corrected: parsed.corrected || content,
          changes: parsed.changes || [],
        };
      } catch (parseError) {
        console.error('[API] Failed to parse AI grammar response:', parseError);
      }
      
      // Increment usage
      await storage.incrementAiEdits(userId);
      console.log('[API] AI grammar check completed for user:', userId);
      
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] AI grammar validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error checking grammar for user:', userId, error);
        res.status(500).json({ 
          error: "Failed to check grammar",
          message: error instanceof Error ? error.message : "AI service unavailable",
          code: "AI_ERROR"
        });
      }
    }
  });

  app.post("/api/ai/adjust-tone", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] AI adjust tone for user:', userId);
      const schema = z.object({
        content: z.string().min(1, "Content is required"),
        tone: z.enum(['professional', 'creative', 'technical']),
      });
      
      const { content, tone } = schema.parse(req.body);
      
      // Check AI usage limits
      const canUse = await storage.canUseAiEdit(userId);
      if (!canUse) {
        const subscription = await storage.getSubscription(userId);
        const plan = normalizePlan(subscription?.plan);
        const limits = PLAN_LIMITS[plan];
        console.log('[API] AI edit limit reached for user:', userId);
        return res.status(403).json({
          error: 'AI edit limit reached',
          code: 'AI_EDIT_LIMIT',
          limit: limits.maxAiEditsPerMonth,
          message: `Your ${plan} plan allows ${limits.maxAiEditsPerMonth} AI edits per month. Upgrade for more.`
        });
      }
      
      const toneDescriptions = {
        professional: "formal, corporate, and business-appropriate",
        creative: "engaging, unique, and personality-driven",
        technical: "precise, detailed, and industry-specific"
      };
      
      const response = await getPoeClient().chat.completions.create({
        model: "claude-4.5-haiku",
        messages: [
          {
            role: "system",
            content: `You are a professional writer. Rewrite the following text in a ${toneDescriptions[tone]} tone. Keep the same information but adjust the language and style. Return only the rewritten text without any explanations.`
          },
          {
            role: "user",
            content,
          }
        ],
        max_tokens: 500,
      });
      
      const rewritten = response.choices[0]?.message?.content || content;
      
      // Increment usage
      await storage.incrementAiEdits(userId);
      console.log('[API] AI tone adjusted for user:', userId, 'tone:', tone);
      
      res.json({ rewritten });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] AI tone validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error adjusting tone for user:', userId, error);
        res.status(500).json({ 
          error: "Failed to adjust tone",
          message: error instanceof Error ? error.message : "AI service unavailable",
          code: "AI_ERROR"
        });
      }
    }
  });

  // ============================================
  // Contact/Support Endpoint
  // ============================================
  
  app.post("/api/contact/ai-response", async (req: Request, res) => {
    try {
      console.log('[API] Contact AI response request');
      const schema = z.object({
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        subject: z.string().min(1, "Subject is required"),
        message: z.string().min(1, "Message is required"),
      });
      
      const { name, email, subject, message } = schema.parse(req.body);
      
      // Create AI prompt for contact response
      const systemPrompt = `You are Joblify's AI customer support assistant. Your role is to provide helpful, accurate, and friendly responses to customer inquiries about Joblify, an AI-powered resume building platform.

Key information about Joblify:
- Joblify uses conversational AI to help users build professional, ATS-optimized resumes
- We offer multiple plans: Free, Plus, and Ultra/Lifetime
- Main features: AI Chat Resume Builder, ATS Scanner, Cover Letter Generator, Resume Tailoring
- We prioritize user privacy and data security
- Resumes can be exported in PDF and DOCX formats

When responding:
1. Be warm, professional, and helpful
2. Provide specific answers based on the user's question
3. If you don't know something specific about pricing or features, suggest they check the pricing page or email privacy@joblifyai.com
4. Keep responses concise but informative (2-4 paragraphs max)
5. Always end with an offer to help further if needed

The user's question is about: ${subject}`;

      const userPrompt = `Name: ${name}
Email: ${email}
Subject: ${subject}

Question: ${message}`;

      const response = await getPoeClient().chat.completions.create({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
      });
      
      const aiResponse = response.choices[0]?.message?.content || "Thank you for contacting Joblify! We've received your message and will get back to you within 2-3 business days at the email you provided.";
      console.log('[API] Contact AI response generated');
      
      res.json({ 
        response: aiResponse,
        success: true,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] Contact validation error:', error.errors);
        res.status(400).json({ 
          error: "Invalid contact data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error generating contact response:', error);
        res.status(500).json({ 
          error: "Failed to process contact request",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "CONTACT_ERROR"
        });
      }
    }
  });

  // ============================================
  // Job Management Endpoints (Legacy - will be removed)
  // ============================================

  app.get("/api/jobs", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Fetching jobs for user:', userId);
      const jobs = await storage.getJobs(userId);
      console.log('[API] Found', jobs.length, 'jobs for user:', userId);
      res.json({ jobs });
    } catch (error) {
      console.error('[API] Error fetching jobs for user:', userId, error);
      res.status(500).json({ 
        error: "Failed to fetch jobs",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "JOBS_FETCH_ERROR"
      });
    }
  });

  app.post("/api/jobs/refresh", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Refreshing jobs for user:', userId);
      
      // Check plan limits
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      
      const usage = await storage.checkAndResetMonthlyUsage(userId);
      
      if (limits.maxJobsPerMonth !== Infinity && usage.jobsScrapedThisMonth >= limits.maxJobsPerMonth) {
        console.log('[API] Scraping limit reached for user:', userId, '- limit:', limits.maxJobsPerMonth);
        return res.status(403).json({
          error: 'Monthly job scraping limit reached',
          code: 'SCRAPING_LIMIT',
          limit: limits.maxJobsPerMonth,
          current: usage.jobsScrapedThisMonth
        });
      }
      
      const profile = await storage.getProfile(userId);
      
      if (!profile.skills.length) {
        console.log('[API] No skills configured for user:', userId);
        return res.status(400).json({ 
          error: 'Please add skills first',
          code: 'NO_SKILLS'
        });
      }
      
      // Calculate how many jobs user can still receive based on plan limits
      const defaultJobsPerScan = 5;
      let maxJobsToReturn = defaultJobsPerScan;
      
      if (limits.maxJobsPerMonth !== Infinity) {
        const remainingJobs = limits.maxJobsPerMonth - usage.jobsScrapedThisMonth;
        maxJobsToReturn = Math.min(defaultJobsPerScan, remainingJobs);
        console.log('[API] Plan-aware job limit for user:', userId, '- remaining:', remainingJobs, 'returning max:', maxJobsToReturn);
      }
      
      console.log('[API] Starting job scraping for user:', userId, '- skills:', profile.skills.length, 'maxJobs:', maxJobsToReturn);
      const { scrapeJobs } = await import('./scrapers/index');
      const jobs = await scrapeJobs(profile.intro, profile.skills, maxJobsToReturn);
      console.log('[API] Scraping completed for user:', userId, '- jobs found:', jobs.length);
      
      await storage.saveJobs(userId, jobs);
      
      // Increment usage by actual jobs found
      await storage.incrementJobsScraped(userId, jobs.length);
      console.log('[API] Jobs saved and usage updated for user:', userId);
      
      res.json({ jobs, count: jobs.length });
    } catch (error) {
      console.error('[API] Scraping error for user:', userId, error);
      res.status(500).json({ 
        error: 'Failed to scrape jobs',
        message: error instanceof Error ? error.message : "Scraping service unavailable",
        code: "SCRAPING_ERROR"
      });
    }
  });

  app.post("/api/jobs/:id/save", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Toggling save status for job:', id, 'user:', userId);
      const job = await storage.saveJob(userId, id);
      if (job) {
        console.log('[API] Job save status toggled:', id, 'saved:', job.saved);
        res.json({ job });
      } else {
        console.log('[API] Job not found:', id, 'user:', userId);
        res.status(404).json({ error: "Job not found", code: "JOB_NOT_FOUND" });
      }
    } catch (error) {
      console.error('[API] Error saving job:', id, 'user:', userId, error);
      res.status(500).json({ 
        error: "Failed to save job",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "JOB_SAVE_ERROR"
      });
    }
  });

  app.post("/api/jobs/:id/apply", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Marking job as applied:', id, 'user:', userId);
      const job = await storage.markJobApplied(userId, id);
      if (job) {
        console.log('[API] Job marked as applied:', id);
        res.json({ job });
      } else {
        console.log('[API] Job not found:', id, 'user:', userId);
        res.status(404).json({ error: "Job not found", code: "JOB_NOT_FOUND" });
      }
    } catch (error) {
      console.error('[API] Error marking job as applied:', id, 'user:', userId, error);
      res.status(500).json({ 
        error: "Failed to mark job as applied",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "JOB_APPLY_ERROR"
      });
    }
  });

  app.post("/api/generate-message", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Generating message for user:', userId);
      const schema = z.object({
        jobTitle: z.string(),
        jobDescription: z.string(),
        skills: z.array(z.string()),
        tone: z.enum(["professional", "friendly", "enthusiastic"]).default("professional"),
        messageType: z.enum(["comment", "initial"]).default("initial"),
        intro: z.string().optional(),
      });

      const { jobTitle, jobDescription, skills, tone, messageType, intro } = schema.parse(req.body);
      console.log('[API] Message generation params - type:', messageType, 'tone:', tone, 'skills:', skills.length);

      const profile = await storage.getProfile(userId);
      const userIntro = intro || profile.intro || "";
      
      const isComment = messageType === "comment";
      
      const systemPrompt = isComment
        ? `You write short, human-sounding comments on social posts about job opportunities. Sound like a real person: casual, warm, and specific. Keep it to 2-3 sentences, use contractions, and avoid hype or salesy language. Mention one relevant skill or similar work, then end with a simple next step (e.g., "happy to share examples"). Avoid clichés like "I noticed your post" or "great opportunity." Match the vibe of ${jobDescription.includes('reddit') ? 'Reddit' : 'X/Twitter'}.`
        : `You are an expert at writing compelling freelance job application messages. Write a personalized outreach message for a job opportunity. The message should be ${tone} in tone. Keep it concise (150-250 words), highlight relevant skills, and include a clear call to action. Do not use generic phrases like "I noticed your post" - be specific and engaging.`;

      const userPrompt = isComment
        ? `Post: ${jobDescription}
My Skills: ${skills.join(", ")}
${userIntro ? `About Me (for context): ${userIntro}` : ""}

Write a short, natural comment that references something from the post and one relevant skill. Keep it casual and grounded.`
        : `Job Title: ${jobTitle}
Job Description: ${jobDescription}
My Skills: ${skills.join(", ")}
${userIntro ? `About Me: ${userIntro}` : ""}

Write a ${tone} outreach message for this job opportunity.`;

      const poeClient = getPoeClient();
      const response = await poeClient.chat.completions.create({
        model: "claude-4.5-haiku",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: isComment ? 150 : 400,
      });

      const message = response.choices[0]?.message?.content || generateFallbackMessage(jobTitle, skills, tone, userIntro, isComment);
      console.log('[API] Message generated successfully for user:', userId);

      res.json({ message });
    } catch (error) {
      console.error('[API] Error generating message for user:', userId, error);
      const { jobTitle, skills, tone, messageType } = req.body;
      const message = generateFallbackMessage(jobTitle || "this opportunity", skills || [], tone || "professional", "", messageType === "comment");
      console.log('[API] Using fallback message for user:', userId);
      res.json({ message });
    }
  });

  // Subscription endpoints
  app.get("/api/subscription", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Fetching subscription for user:', userId);
      let subscription = await storage.getSubscription(userId);
      
      // Create subscription if not exists (for existing users)
      if (!subscription) {
        console.log('[API] Creating default subscription for user:', userId);
        subscription = await storage.createSubscription(userId, "free");
      }
      
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
      
      res.json({ 
        subscription,
        limits: {
          maxSkills: limits.maxSkills === Infinity ? -1 : limits.maxSkills,
          maxJobsPerMonth: limits.maxJobsPerMonth === Infinity ? -1 : limits.maxJobsPerMonth,
          maxSchedules: limits.maxSchedules === Infinity ? -1 : limits.maxSchedules,
          hasScheduleAccess: limits.hasScheduleAccess,
        }
      });
    } catch (error) {
      console.error('[API] Error fetching subscription for user:', userId, error);
      res.status(500).json({ 
        error: "Failed to fetch subscription",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "SUBSCRIPTION_FETCH_ERROR"
      });
    }
  });

  // Usage endpoints
  app.get("/api/usage", requireAuth, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Fetching usage for user:', userId);
      const userUsage = await storage.checkAndResetMonthlyUsage(userId);
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
      const profile = await storage.getProfile(userId);
      
      res.json({
        usage: {
          skillsCount: profile.skills.length,
          monthResetDate: userUsage.monthResetDate,
        },
        limits: {
          maxSkills: limits.maxSkills === Infinity ? -1 : limits.maxSkills,
          maxSchedules: limits.maxSchedules === Infinity ? -1 : limits.maxSchedules,
          hasScheduleAccess: limits.hasScheduleAccess,
        },
        remaining: {
          skills: limits.maxSkills === Infinity ? -1 : Math.max(0, limits.maxSkills - profile.skills.length),
        }
      });
    } catch (error) {
      console.error('[API] Error fetching usage for user:', userId, error);
      res.status(500).json({ 
        error: "Failed to fetch usage",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "USAGE_FETCH_ERROR"
      });
    }
  });

  // Account deletion endpoint
  app.delete("/api/account", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const subscription = await storage.getSubscription(userId);

      if (subscription?.stripeSubscriptionId) {
        try {
          const stripe = await getUncachableStripeClient();
          await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        } catch (error) {
          console.error("Stripe cancellation error during account deletion:", error);
        }
      }

      // Delete user (cascade will handle related records)
      await storage.deleteUser(userId);
      
      // Add email to deleted accounts tracker (abuse prevention - 72 hour block)
      await storage.addDeletedAccount(user.email, 'User-initiated account deletion');
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
        res.clearCookie("connect.sid");
        res.json({ success: true, message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // GDPR/CCPA Compliance Endpoints
  
  // Data Export - Right to Data Portability (GDPR Article 20)
  app.get("/api/user/data-export", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      
      // Log the data access request for audit trail
      await storage.createSecurityEvent({
        userId,
        eventType: "data_export_requested",
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null,
        metadata: { timestamp: new Date().toISOString() },
      });
      
      const { exportUserData } = await import("./lib/gdpr-compliance");
      const data = await exportUserData(userId);
      
      // Set headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="joblify-data-export-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(data);
    } catch (error) {
      console.error("[GDPR] Data export error:", error);
      res.status(500).json({ 
        error: "Failed to export data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Data Summary - Right to Access (GDPR Article 15)
  app.get("/api/user/data-summary", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      
      // Log the data access request for audit trail
      await storage.createSecurityEvent({
        userId,
        eventType: "data_summary_requested",
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null,
        metadata: { timestamp: new Date().toISOString() },
      });
      
      const { getUserDataSummary } = await import("./lib/gdpr-compliance");
      const summary = await getUserDataSummary(userId);
      
      res.json(summary);
    } catch (error) {
      console.error("[GDPR] Data summary error:", error);
      res.status(500).json({ 
        error: "Failed to get data summary",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Consent Withdrawal - Right to Withdraw Consent (GDPR Article 7)
  app.post("/api/user/consent-withdraw", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const { reason } = req.body;
      
      const { logConsentWithdrawal } = await import("./lib/gdpr-compliance");
      const result = await logConsentWithdrawal(userId, reason);
      
      res.json(result);
    } catch (error) {
      console.error("[GDPR] Consent withdrawal error:", error);
      res.status(500).json({ 
        error: "Failed to process consent withdrawal",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Schedule endpoints
  app.get("/api/schedules", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const userSchedules = await storage.getSchedules(userId);
      res.json({ schedules: userSchedules });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  app.post("/api/schedules", requireVerifiedEmail, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      
      // Check if user has schedule access
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

      if (!limits.hasScheduleAccess) {
        return res.status(403).json({ 
          error: "Schedule access requires Plus, Ultra, or Lifetime plan",
          code: "PLAN_REQUIRED"
        });
      }

      if (limits.maxSchedules !== Infinity) {
        const existingSchedules = await storage.getSchedules(userId);
        if (existingSchedules.length >= limits.maxSchedules) {
          return res.status(403).json({
            error: "Schedule limit reached",
            code: "SCHEDULE_LIMIT",
            limit: limits.maxSchedules,
            message: `Your plan allows up to ${limits.maxSchedules} schedules.`,
          });
        }
      }
      
      const schema = z.object({
        name: z.string().min(1),
        frequency: z.enum(["hourly", "daily", "weekly"]).default("daily"),
        time: z.string().default("09:00"),
        days: z.array(z.string()).default([]),
        platforms: z.array(z.enum(["reddit", "x"])).default(["reddit", "x"]),
        enabled: z.boolean().default(true),
      });
      
      const data = schema.parse(req.body);
      const schedule = await storage.createSchedule(userId, data);
      res.json({ schedule });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid schedule data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create schedule" });
      }
    }
  });

  app.patch("/api/schedules/:id", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const scheduleId = req.params.id as string;
      
      const schema = z.object({
        name: z.string().min(1).optional(),
        frequency: z.enum(["hourly", "daily", "weekly"]).optional(),
        time: z.string().optional(),
        days: z.array(z.string()).optional(),
        platforms: z.array(z.enum(["reddit", "x"])).optional(),
        enabled: z.boolean().optional(),
      });
      
      const updates = schema.parse(req.body);
      const schedule = await storage.updateSchedule(userId, scheduleId, updates);
      
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      res.json({ schedule });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid schedule data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update schedule" });
      }
    }
  });

  app.delete("/api/schedules/:id", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const scheduleId = req.params.id as string;
      
      await storage.deleteSchedule(userId, scheduleId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  });

  app.post("/api/schedules/:id/run", requireVerifiedEmail, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const scheduleId = req.params.id as string;
      
      const schedule = await storage.getSchedule(userId, scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Run the schedule
      const profile = await storage.getProfile(userId);
      if (profile.skills.length === 0) {
        return res.status(400).json({ error: "No skills configured" });
      }
      
      // Since scraping is removed, return empty result
      // Update schedule last run
      await storage.updateSchedule(userId, scheduleId, { lastRun: new Date() });
      
      // Get all jobs (including saved/applied) to return
      const allJobs = await storage.getJobs(userId);
      res.json({ jobs: allJobs, newCount: 0, count: allJobs.length });
    } catch (error) {
      console.error("Schedule run error:", error);
      res.status(500).json({ error: "Failed to run schedule" });
    }
  });

  // ============================================
  // ATS Scanner Endpoints
  // ============================================

  const ATS_ANALYSIS_PROMPT = `You are an expert ATS (Applicant Tracking System) analyzer performing a deep, professional-grade analysis. Analyze the resume thoroughly across multiple dimensions.

Evaluate these categories (score each 0-100):

1. **Content Quality**: Are there strong action verbs, quantified achievements, and relevant industry terminology? Are bullet points impactful and results-oriented?

2. **Keyword Optimization**: Does the resume contain critical industry keywords, job-specific terms, and relevant technical skills? How is the keyword density and natural integration?

3. **Formatting & Structure**: Does it use standard section headers (Experience, Education, Skills, Summary)? Is formatting clean and parseable by ATS software? Are there any tables, images, columns, or graphics that would break ATS parsing?

4. **Section Completeness**: Are all essential sections present? Is contact information complete? Is there a professional summary? Are dates and locations included for experience/education?

5. **ATS Compatibility**: Is the file format ATS-friendly? Are there special characters, headers/footers, or non-standard elements that ATS might skip? Is the content in a machine-readable format?

6. **Impact & Relevance**: Are experiences described with measurable outcomes (numbers, percentages, revenue)? Do achievements demonstrate value? Is content tailored to the target role?

IMPORTANT: If a job description is provided after "TARGET JOB DESCRIPTION:", analyze keyword alignment between the resume and job description, identify exact missing keywords from the job posting, and provide targeted suggestions.

Return ONLY valid JSON in this exact format:
{
  "score": 75,
  "categories": [
    {"name": "Content Quality", "score": 80, "feedback": "Strong action verbs used, but missing quantified results in 3 bullet points."},
    {"name": "Keyword Optimization", "score": 70, "feedback": "Good keyword density for the field, but missing key terms like..."},
    {"name": "Formatting & Structure", "score": 85, "feedback": "Clean formatting with standard headers. Well organized."},
    {"name": "Section Completeness", "score": 75, "feedback": "Missing certifications section and LinkedIn URL."},
    {"name": "ATS Compatibility", "score": 90, "feedback": "Fully parseable format with no problematic elements."},
    {"name": "Impact & Relevance", "score": 65, "feedback": "Only 2 of 8 bullet points include measurable outcomes."}
  ],
  "keywords": ["javascript", "react", "python", "project management"],
  "missingKeywords": ["agile", "scrum", "CI/CD", "cloud computing"],
  "suggestions": [
    "Add quantified achievements (e.g., 'Increased sales by 30%' instead of 'Increased sales')",
    "Include a professional summary section at the top highlighting 3-5 key qualifications",
    "Add missing technical skills: Docker, Kubernetes, AWS based on industry standards",
    "Replace passive language ('responsible for') with action verbs ('led', 'developed', 'optimized')",
    "Include specific metrics and numbers in your experience descriptions"
  ]
}`;

  app.post("/api/ats/scan", requireAuth, requireVerifiedEmail, upload.single('file'), async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] ATS scan file upload for user:', userId);
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded", code: "NO_FILE" });
      }

      // Check plan limits
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      
      if (!limits.hasAtsScanner) {
        console.log('[API] ATS scanner not available for plan:', plan);
        return res.status(403).json({
          error: 'ATS scanner not available',
          code: 'ATS_NOT_AVAILABLE',
          message: `Upgrade to ${plan === 'free' ? 'Plus' : 'a higher'} plan to access ATS scanner.`
        });
      }

      let parsedText = '';
      
      // Parse file based on type
      if (req.file.mimetype === 'application/pdf') {
        const pdfData = await pdf(req.file.buffer);
        parsedText = pdfData.text;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        parsedText = result.value;
      } else {
        return res.status(400).json({ error: "Invalid file type", code: "INVALID_FILE_TYPE" });
      }

      if (!parsedText.trim()) {
        return res.status(400).json({ error: "Could not extract text from file", code: "PARSE_ERROR" });
      }

      // Get optional job description from form data
      const jobDescription = req.body?.jobDescription;

      // Build analysis prompt with optional job description
      let userContent = `Analyze this resume:\n\n${parsedText}`;
      if (jobDescription) {
        userContent += `\n\nTARGET JOB DESCRIPTION:\n${jobDescription}`;
      }

      // Send to AI for analysis
      const response = await getPoeClient().chat.completions.create({
        model: "claude-4.5-haiku",
        messages: [
          {
            role: "system",
            content: ATS_ANALYSIS_PROMPT
          },
          {
            role: "user",
            content: userContent
          }
        ],
        max_tokens: 2000,
      });

      const aiResponse = response.choices[0]?.message?.content || '{}';
      let analysis: any = { score: 0, categories: [], keywords: [], missingKeywords: [], suggestions: [] };

      try {
        const cleanContent = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
        analysis = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('[API] Failed to parse ATS analysis:', parseError);
      }

      console.log('[API] ATS scan completed for user:', userId, 'score:', analysis.score);
      res.json({ 
        score: analysis.score || 0,
        categories: analysis.categories || [],
        keywords: analysis.keywords || [],
        missingKeywords: analysis.missingKeywords || [],
        suggestions: analysis.suggestions || [],
        parsedText 
      });
    } catch (error) {
      console.error('[API] Error in ATS scan for user:', userId, error);
      res.status(500).json({ 
        error: "Failed to scan resume",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "ATS_SCAN_ERROR"
      });
    }
  });

  // Upload and import external resume
  app.post("/api/resumes/upload", requireAuth, requireVerifiedEmail, upload.single('file'), async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Resume upload for user:', userId);
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded", code: "NO_FILE" });
      }

      const title = req.body.title || 'Imported Resume';

      // Check plan limits
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      
      const resumeCount = await storage.countUserResumes(userId);
      
      if (limits.maxResumes !== Infinity && resumeCount >= limits.maxResumes) {
        console.log('[API] Resume limit reached for user:', userId);
        return res.status(403).json({
          error: 'Resume limit reached',
          code: 'RESUME_LIMIT',
          limit: limits.maxResumes,
          current: resumeCount,
        });
      }

      let parsedText = '';
      
      // Parse file based on type
      if (req.file.mimetype === 'application/pdf') {
        const pdfData = await pdf(req.file.buffer);
        parsedText = pdfData.text;
      } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        parsedText = result.value;
      } else {
        return res.status(400).json({ error: "Invalid file type", code: "INVALID_FILE_TYPE" });
      }

      if (!parsedText.trim()) {
        return res.status(400).json({ error: "Could not extract text from file", code: "PARSE_ERROR" });
      }

      // Use AI to parse the resume into structured data
      const parsePrompt = `You are a resume parser. Extract structured data from this resume text and return it as JSON.

Return JSON with this exact structure:
{
  "personalInfo": {
    "name": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string",
    "website": "string"
  },
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "position": "string",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or Present",
      "description": ["bullet point 1", "bullet point 2"]
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string",
      "field": "string",
      "graduationDate": "YYYY-MM"
    }
  ],
  "skills": ["skill1", "skill2"],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "YYYY-MM"
    }
  ],
  "projects": []
}

Extract all information accurately. If a field is not found, use empty string or empty array.`;

      const response = await getPoeClient().chat.completions.create({
        model: "claude-4.5-haiku",
        messages: [
          {
            role: "system",
            content: parsePrompt
          },
          {
            role: "user",
            content: `Parse this resume:\n\n${parsedText}`
          }
        ],
        max_tokens: 2000,
      });

      const aiResponse = response.choices[0]?.message?.content || '{}';
      let resumeData;

      try {
        const cleanContent = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
        resumeData = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('[API] Failed to parse resume data:', parseError);
        // Fallback to basic structure with parsed text as summary
        resumeData = {
          personalInfo: { name: "", email: "", phone: "", location: "", linkedin: "", website: "" },
          summary: parsedText.substring(0, 500),
          experience: [],
          education: [],
          skills: [],
          certifications: [],
          projects: [],
        };
      }

      // Create the resume in Joblify
      const resume = await storage.createResume(userId, {
        userId,
        title,
        template: 'modern',
        resumeData,
      });

      console.log('[API] Resume uploaded and imported:', resume.id, 'user:', userId);
      res.json({ resume, parsedText });
    } catch (error) {
      console.error('[API] Error uploading resume for user:', userId, error);
      res.status(500).json({ 
        error: "Failed to upload resume",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "RESUME_UPLOAD_ERROR"
      });
    }
  });

  app.post("/api/ats/analyze", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] ATS analyze for user:', userId);
      const schema = z.object({
        resumeId: z.string(),
        jobDescription: z.string().optional(),
      });
      
      const { resumeId, jobDescription } = schema.parse(req.body);

      // Check plan limits
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      
      if (!limits.hasAtsScanner) {
        console.log('[API] ATS scanner not available for plan:', plan);
        return res.status(403).json({
          error: 'ATS scanner not available',
          code: 'ATS_NOT_AVAILABLE',
          message: `Upgrade to ${plan === 'free' ? 'Plus' : 'a higher'} plan to access ATS scanner.`
        });
      }

      // Validate user owns the resume
      const resume = await storage.getResume(resumeId);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found", code: "RESUME_NOT_FOUND" });
      }
      
      if (resume.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }

      // Convert resume data to text
      const resumeText = resumeDataToText(resume.resumeData);

      // Build analysis prompt with optional job description
      let userContent = `Analyze this resume:\n\n${resumeText}`;
      if (jobDescription) {
        userContent += `\n\nTARGET JOB DESCRIPTION:\n${jobDescription}`;
      }

      // Send to AI for analysis
      const response = await getPoeClient().chat.completions.create({
        model: "claude-4.5-haiku",
        messages: [
          {
            role: "system",
            content: ATS_ANALYSIS_PROMPT
          },
          {
            role: "user",
            content: userContent
          }
        ],
        max_tokens: 2000,
      });

      const aiResponse = response.choices[0]?.message?.content || '{}';
      let analysis: any = { score: 0, categories: [], keywords: [], missingKeywords: [], suggestions: [] };

      try {
        const cleanContent = aiResponse.replace(/```json\n?|\n?```/g, "").trim();
        analysis = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error('[API] Failed to parse ATS analysis:', parseError);
      }

      console.log('[API] ATS analysis completed for user:', userId, 'resume:', resumeId, 'score:', analysis.score);
      res.json({ 
        score: analysis.score || 0,
        categories: analysis.categories || [],
        keywords: analysis.keywords || [],
        missingKeywords: analysis.missingKeywords || [],
        suggestions: analysis.suggestions || []
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] ATS analyze validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error in ATS analyze for user:', userId, error);
        res.status(500).json({ 
          error: "Failed to analyze resume",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "ATS_ANALYZE_ERROR"
        });
      }
    }
  });

  // ============================================
  // Cover Letter Endpoints
  // ============================================

  const COVER_LETTER_PROMPT = `You are a professional cover letter writer. Generate a compelling cover letter that sounds authentically human-written, not AI-generated.

Resume: {resumeData}
Job Description: {jobDescription}
Tone: {tone}

CRITICAL REQUIREMENTS:
1. DO NOT use em dashes (—) anywhere - use periods, commas, or semicolons instead
2. AVOID AI jargon phrases like:
   - "I am excited to leverage"
   - "I am writing to express my interest"
   - "utilize", "leverage", "facilitate", "optimize"
   - "I would welcome the opportunity"
   - "I am confident that my skills"
3. Write in a natural, conversational {tone} tone
4. Use varied sentence structure and length (mix short and longer sentences)
5. Use active voice, not passive
6. Include specific details from the resume
7. Show genuine, specific interest in the company/role (not generic enthusiasm)
8. Keep paragraphs 3-4 sentences maximum
9. Total length: 250-350 words
10. Include proper greeting and professional closing

Write as if the candidate themselves wrote this letter. Make it feel personal and authentic.

Return ONLY the cover letter text, no JSON or markdown formatting.`;


  app.post("/api/cover-letter/generate", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Generating cover letter for user:', userId);
      const schema = z.object({
        resumeId: z.string(),
        jobDescription: z.string().min(10, "Job description is required"),
        tone: z.enum(['professional', 'enthusiastic', 'creative']).default('professional'),
      });
      
      const { resumeId, jobDescription, tone } = schema.parse(req.body);

      // Check plan limits
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      
      if (!limits.hasCoverLetterGenerator) {
        console.log('[API] Cover letter generator not available for plan:', plan);
        return res.status(403).json({
          error: 'Cover letter generator not available',
          code: 'COVER_LETTER_NOT_AVAILABLE',
          message: `Upgrade to ${plan === 'free' ? 'Plus' : 'a higher'} plan to access cover letter generator.`
        });
      }

      // Validate user owns the resume
      const resume = await storage.getResume(resumeId);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found", code: "RESUME_NOT_FOUND" });
      }
      
      if (resume.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }

      // Convert resume to text
      const resumeText = resumeDataToText(resume.resumeData);

      // Generate cover letter using AI
      const prompt = COVER_LETTER_PROMPT
        .replace('{resumeData}', resumeText)
        .replace('{jobDescription}', jobDescription)
        .replace(/{tone}/g, tone);

      const response = await getPoeClient().chat.completions.create({
        model: "claude-4.5-haiku",
        messages: [
          {
            role: "system",
            content: prompt
          },
          {
            role: "user",
            content: "Generate the cover letter now."
          }
        ],
        max_tokens: 800,
      });

      const content = response.choices[0]?.message?.content || '';
      
      // Post-processing: Remove AI patterns and em dashes
      let processedContent = content;
      
      // Replace em dashes with commas or periods
      processedContent = processedContent.replace(/—/g, ', ');
      
      // Remove common AI patterns (optional, for additional safety)
      // This is conservative - only catches very obvious patterns
      processedContent = processedContent
        .replace(/I am excited to leverage/gi, 'I look forward to applying')
        .replace(/I am writing to express my interest/gi, 'I am interested')
        .replace(/I would welcome the opportunity/gi, 'I would appreciate the chance')
        .replace(/I am confident that my skills/gi, 'My skills');
      
      // Save to database
      const coverLetter = await storage.createCoverLetter({
        userId,
        resumeId,
        content: processedContent,
        jobDescription,
      });

      console.log('[API] Cover letter generated:', coverLetter.id, 'user:', userId);
      res.json({ id: coverLetter.id, content: coverLetter.content });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] Cover letter validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error generating cover letter for user:', userId, error);
        res.status(500).json({ 
          error: "Failed to generate cover letter",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "COVER_LETTER_GENERATE_ERROR"
        });
      }
    }
  });

  app.get("/api/cover-letter/:id", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Fetching cover letter:', id, 'user:', userId);
      const coverLetter = await storage.getCoverLetter(id);
      
      if (!coverLetter) {
        return res.status(404).json({ error: "Cover letter not found", code: "COVER_LETTER_NOT_FOUND" });
      }
      
      if (coverLetter.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }
      
      res.json({ coverLetter });
    } catch (error) {
      console.error('[API] Error fetching cover letter:', id, 'user:', userId, error);
      res.status(500).json({ 
        error: "Failed to fetch cover letter",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "COVER_LETTER_FETCH_ERROR"
      });
    }
  });

  app.put("/api/cover-letter/:id", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Updating cover letter:', id, 'user:', userId);
      const schema = z.object({
        content: z.string().min(1, "Content is required"),
      });
      
      const { content } = schema.parse(req.body);

      const coverLetter = await storage.getCoverLetter(id);
      if (!coverLetter) {
        return res.status(404).json({ error: "Cover letter not found", code: "COVER_LETTER_NOT_FOUND" });
      }
      
      if (coverLetter.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }

      const updated = await storage.updateCoverLetter(id, content);
      console.log('[API] Cover letter updated:', id, 'user:', userId);
      res.json({ coverLetter: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[API] Cover letter validation error for user:', userId, error.errors);
        res.status(400).json({ 
          error: "Invalid request data", 
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      } else {
        console.error('[API] Error updating cover letter:', id, 'user:', userId, error);
        res.status(500).json({ 
          error: "Failed to update cover letter",
          message: error instanceof Error ? error.message : "Unknown error occurred",
          code: "COVER_LETTER_UPDATE_ERROR"
        });
      }
    }
  });

  app.delete("/api/cover-letter/:id", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Deleting cover letter:', id, 'user:', userId);
      const coverLetter = await storage.getCoverLetter(id);
      
      if (!coverLetter) {
        return res.status(404).json({ error: "Cover letter not found", code: "COVER_LETTER_NOT_FOUND" });
      }
      
      if (coverLetter.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }

      await storage.deleteCoverLetter(id);
      console.log('[API] Cover letter deleted:', id, 'user:', userId);
      res.json({ message: "Cover letter deleted successfully" });
    } catch (error) {
      console.error('[API] Error deleting cover letter:', id, 'user:', userId, error);
      res.status(500).json({ 
        error: "Failed to delete cover letter",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "COVER_LETTER_DELETE_ERROR"
      });
    }
  });

  app.get("/api/cover-letters", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    try {
      console.log('[API] Fetching cover letters for user:', userId);
      const coverLetters = await storage.getCoverLetters(userId);
      res.json({ coverLetters });
    } catch (error) {
      console.error('[API] Error fetching cover letters for user:', userId, error);
      res.status(500).json({ 
        error: "Failed to fetch cover letters",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "COVER_LETTERS_FETCH_ERROR"
      });
    }
  });

  // ============================================
  // Export Endpoints
  // ============================================

  app.post("/api/export/pdf/:id", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Exporting resume as PDF:', id, 'user:', userId);
      
      // Validate user owns the resume
      const resume = await storage.getResume(id);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found", code: "RESUME_NOT_FOUND" });
      }
      
      if (resume.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }

      // Check plan limits
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      
      if (!(limits.allowedFormats as readonly string[]).includes('pdf')) {
        console.log('[API] PDF export not available for plan:', plan);
        return res.status(403).json({
          error: 'PDF export not available',
          code: 'PDF_NOT_AVAILABLE',
          message: `Upgrade to access PDF export.`
        });
      }

      // Generate PDF
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${resume.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);
        res.send(pdfBuffer);
        console.log('[API] PDF exported successfully:', id, 'user:', userId);
      });

      const { resumeData } = resume;

      // Title
      doc.fontSize(24).text(resumeData.personalInfo.name || 'Resume', { align: 'center' });
      doc.moveDown(0.5);

      // Contact Info
      doc.fontSize(10);
      const contact = [];
      if (resumeData.personalInfo.email) contact.push(resumeData.personalInfo.email);
      if (resumeData.personalInfo.phone) contact.push(resumeData.personalInfo.phone);
      if (resumeData.personalInfo.location) contact.push(resumeData.personalInfo.location);
      if (contact.length > 0) {
        doc.text(contact.join(' | '), { align: 'center' });
      }
      if (resumeData.personalInfo.linkedin || resumeData.personalInfo.website) {
        const links = [];
        if (resumeData.personalInfo.linkedin) links.push(resumeData.personalInfo.linkedin);
        if (resumeData.personalInfo.website) links.push(resumeData.personalInfo.website);
        doc.text(links.join(' | '), { align: 'center' });
      }
      doc.moveDown();

      // Summary
      if (resumeData.summary) {
        doc.fontSize(14).text('SUMMARY', { underline: true });
        doc.fontSize(10).moveDown(0.3);
        doc.text(resumeData.summary);
        doc.moveDown();
      }

      // Experience
      if (resumeData.experience?.length > 0) {
        doc.fontSize(14).text('EXPERIENCE', { underline: true });
        doc.moveDown(0.3);
        resumeData.experience.forEach((exp) => {
          doc.fontSize(12).text(`${exp.title} at ${exp.company}`);
          doc.fontSize(10).text(`${exp.location} | ${exp.startDate} - ${exp.endDate || 'Present'}`);
          doc.moveDown(0.2);
          exp.description.forEach((desc) => {
            doc.text(`• ${desc}`, { indent: 20 });
          });
          doc.moveDown();
        });
      }

      // Education
      if (resumeData.education?.length > 0) {
        doc.fontSize(14).text('EDUCATION', { underline: true });
        doc.moveDown(0.3);
        resumeData.education.forEach((edu) => {
          doc.fontSize(12).text(`${edu.degree} in ${edu.field}`);
          doc.fontSize(10).text(`${edu.school} | ${edu.graduationDate}`);
          if (edu.gpa) doc.text(`GPA: ${edu.gpa}`);
          doc.moveDown();
        });
      }

      // Skills
      if (resumeData.skills?.length > 0) {
        doc.fontSize(14).text('SKILLS', { underline: true });
        doc.fontSize(10).moveDown(0.3);
        doc.text(resumeData.skills.join(', '));
        doc.moveDown();
      }

      // Certifications
      if (resumeData.certifications?.length > 0) {
        doc.fontSize(14).text('CERTIFICATIONS', { underline: true });
        doc.moveDown(0.3);
        resumeData.certifications.forEach((cert) => {
          doc.fontSize(10).text(`${cert.name} - ${cert.issuer} (${cert.date})`);
        });
        doc.moveDown();
      }

      // Projects
      if (resumeData.projects?.length > 0) {
        doc.fontSize(14).text('PROJECTS', { underline: true });
        doc.moveDown(0.3);
        resumeData.projects.forEach((proj) => {
          doc.fontSize(12).text(proj.name);
          doc.fontSize(10).text(proj.description);
          doc.text(`Technologies: ${proj.technologies.join(', ')}`);
          if (proj.url) doc.text(`URL: ${proj.url}`);
          doc.moveDown();
        });
      }

      doc.end();
    } catch (error) {
      console.error('[API] Error exporting PDF:', id, 'user:', userId, error);
      res.status(500).json({ 
        error: "Failed to export PDF",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "PDF_EXPORT_ERROR"
      });
    }
  });

  app.post("/api/export/docx/:id", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Exporting resume as DOCX:', id, 'user:', userId);
      
      // Validate user owns the resume
      const resume = await storage.getResume(id);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found", code: "RESUME_NOT_FOUND" });
      }
      
      if (resume.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }

      // Check plan limits
      const subscription = await storage.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan];
      
      if (!(limits.allowedFormats as readonly string[]).includes('docx')) {
        console.log('[API] DOCX export not available for plan:', plan);
        return res.status(403).json({
          error: 'DOCX export not available',
          code: 'DOCX_NOT_AVAILABLE',
          message: `Upgrade to access DOCX export.`
        });
      }

      const { resumeData } = resume;
      const sections: Paragraph[] = [];

      // Title
      sections.push(
        new Paragraph({
          text: resumeData.personalInfo.name || 'Resume',
          heading: HeadingLevel.HEADING_1,
          alignment: 'center',
        })
      );

      // Contact Info
      const contact = [];
      if (resumeData.personalInfo.email) contact.push(resumeData.personalInfo.email);
      if (resumeData.personalInfo.phone) contact.push(resumeData.personalInfo.phone);
      if (resumeData.personalInfo.location) contact.push(resumeData.personalInfo.location);
      if (contact.length > 0) {
        sections.push(
          new Paragraph({
            text: contact.join(' | '),
            alignment: 'center',
          })
        );
      }

      if (resumeData.personalInfo.linkedin || resumeData.personalInfo.website) {
        const links = [];
        if (resumeData.personalInfo.linkedin) links.push(resumeData.personalInfo.linkedin);
        if (resumeData.personalInfo.website) links.push(resumeData.personalInfo.website);
        sections.push(
          new Paragraph({
            text: links.join(' | '),
            alignment: 'center',
          })
        );
      }

      sections.push(new Paragraph({ text: '' })); // Empty line

      // Summary
      if (resumeData.summary) {
        sections.push(
          new Paragraph({
            text: 'SUMMARY',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({ text: resumeData.summary }),
          new Paragraph({ text: '' })
        );
      }

      // Experience
      if (resumeData.experience?.length > 0) {
        sections.push(
          new Paragraph({
            text: 'EXPERIENCE',
            heading: HeadingLevel.HEADING_2,
          })
        );
        resumeData.experience.forEach((exp) => {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${exp.title} at ${exp.company}`, bold: true }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `${exp.location} | ${exp.startDate} - ${exp.endDate || 'Present'}`, italics: true }),
              ],
            })
          );
          exp.description.forEach((desc) => {
            sections.push(new Paragraph({ text: `• ${desc}` }));
          });
          sections.push(new Paragraph({ text: '' }));
        });
      }

      // Education
      if (resumeData.education?.length > 0) {
        sections.push(
          new Paragraph({
            text: 'EDUCATION',
            heading: HeadingLevel.HEADING_2,
          })
        );
        resumeData.education.forEach((edu) => {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${edu.degree} in ${edu.field}`, bold: true }),
              ],
            }),
            new Paragraph({ text: `${edu.school} | ${edu.graduationDate}` })
          );
          if (edu.gpa) {
            sections.push(new Paragraph({ text: `GPA: ${edu.gpa}` }));
          }
          sections.push(new Paragraph({ text: '' }));
        });
      }

      // Skills
      if (resumeData.skills?.length > 0) {
        sections.push(
          new Paragraph({
            text: 'SKILLS',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({ text: resumeData.skills.join(', ') }),
          new Paragraph({ text: '' })
        );
      }

      // Certifications
      if (resumeData.certifications?.length > 0) {
        sections.push(
          new Paragraph({
            text: 'CERTIFICATIONS',
            heading: HeadingLevel.HEADING_2,
          })
        );
        resumeData.certifications.forEach((cert) => {
          sections.push(new Paragraph({ text: `${cert.name} - ${cert.issuer} (${cert.date})` }));
        });
        sections.push(new Paragraph({ text: '' }));
      }

      // Projects
      if (resumeData.projects?.length > 0) {
        sections.push(
          new Paragraph({
            text: 'PROJECTS',
            heading: HeadingLevel.HEADING_2,
          })
        );
        resumeData.projects.forEach((proj) => {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: proj.name, bold: true }),
              ],
            }),
            new Paragraph({ text: proj.description }),
            new Paragraph({
              children: [
                new TextRun({ text: `Technologies: ${proj.technologies.join(', ')}`, italics: true }),
              ],
            })
          );
          if (proj.url) {
            sections.push(new Paragraph({ text: `URL: ${proj.url}` }));
          }
          sections.push(new Paragraph({ text: '' }));
        });
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: sections,
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${resume.title.replace(/[^a-z0-9]/gi, '_')}.docx"`);
      res.send(buffer);
      console.log('[API] DOCX exported successfully:', id, 'user:', userId);
    } catch (error) {
      console.error('[API] Error exporting DOCX:', id, 'user:', userId, error);
      res.status(500).json({ 
        error: "Failed to export DOCX",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "DOCX_EXPORT_ERROR"
      });
    }
  });

  app.post("/api/export/cover-letter/pdf/:id", requireAuth, requireVerifiedEmail, async (req: Request, res) => {
    const userId = req.session.userId!;
    const id = req.params.id as string;
    try {
      console.log('[API] Exporting cover letter as PDF:', id, 'user:', userId);
      
      // Validate user owns the cover letter
      const coverLetter = await storage.getCoverLetter(id);
      if (!coverLetter) {
        return res.status(404).json({ error: "Cover letter not found", code: "COVER_LETTER_NOT_FOUND" });
      }
      
      if (coverLetter.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      }

      // Generate PDF
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="cover_letter.pdf"`);
        res.send(pdfBuffer);
        console.log('[API] Cover letter PDF exported successfully:', id, 'user:', userId);
      });

      doc.fontSize(12).text(coverLetter.content, {
        align: 'left',
        lineGap: 5,
      });

      doc.end();
    } catch (error) {
      console.error('[API] Error exporting cover letter PDF:', id, 'user:', userId, error);
      res.status(500).json({ 
        error: "Failed to export cover letter PDF",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        code: "COVER_LETTER_PDF_EXPORT_ERROR"
      });
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
