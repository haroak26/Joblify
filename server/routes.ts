import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { skillSchema, PLAN_LIMITS, normalizePlan, resumeDataSchema } from "@shared/schema";
import { requireAuth, requireVerifiedEmail } from "./auth";
import OpenAI from "openai";
import { getUncachableStripeClient } from "./stripeClient";

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
        model: "claude-3.5-haiku",
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
      
      // Create empty resume data structure
      const emptyResumeData = {
        personalInfo: {
          name: "",
          email: "",
          phone: "",
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
        resumeData: emptyResumeData,
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
        resumeData: z.any().optional(),
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
  
  const RESUME_CHAT_SYSTEM_PROMPT = `You are a professional resume builder assistant. Help users create great resumes through natural conversation.

Your goals:
1. Ask about their experience, education, and skills one section at a time
2. Extract structured information from their responses
3. Provide helpful suggestions to improve their resume content
4. Be encouraging and professional

When the user provides information, respond in this format:
{
  "message": "Your conversational response to the user",
  "extracted_data": {
    // Include any resume fields you can extract from their response
    // e.g., "experience": [{"company": "Google", "title": "Engineer", ...}]
  }
}

Start by asking about their current or target job title.`;

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
      
      // Get or create chat conversation
      let conversation = await storage.getChatConversation(resumeId);
      if (!conversation) {
        conversation = await storage.createChatConversation(userId, resumeId);
        console.log('[API] Created new chat conversation for resume:', resumeId);
      }
      
      // Build messages array
      const messages = conversation.messages as Array<{ role: string; content: string }>;
      const chatMessages = [
        { role: "system" as const, content: RESUME_CHAT_SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: message },
      ];
      
      // Send to AI
      const response = await getPoeClient().chat.completions.create({
        model: "claude-3.5-haiku",
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
          
          // Update resume with extracted data
          const currentData = resume.resumeData;
          const updatedResumeData = { ...currentData };
          
          // Merge extracted data into resume
          for (const [key, value] of Object.entries(extractedData)) {
            if (Array.isArray(value) && Array.isArray(currentData[key as keyof typeof currentData])) {
              updatedResumeData[key as keyof typeof currentData] = [...(currentData[key as keyof typeof currentData] as unknown[]), ...value] as never;
            } else if (value) {
              updatedResumeData[key as keyof typeof currentData] = value as never;
            }
          }
          
          // Validate the updated data
          const validatedData = resumeDataSchema.parse(updatedResumeData);
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
      const messages = conversation?.messages || [];
      
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
        model: "claude-3.5-haiku",
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
        model: "claude-3.5-haiku",
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
        model: "claude-3.5-haiku",
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
        model: "claude-3.5-haiku",
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
        model: "claude-3.5-haiku",
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
