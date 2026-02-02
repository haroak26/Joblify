import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { skillSchema, PLAN_LIMITS, normalizePlan } from "@shared/schema";
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
        model: "gpt-5-nano",
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

  app.get("/api/jobs", requireAuth, async (req: Request, res) => {
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
      
      console.log('[API] Starting job scraping for user:', userId, '- skills:', profile.skills.length);
      const { scrapeJobs } = await import('./scrapers/index');
      const jobs = await scrapeJobs(profile.intro, profile.skills);
      console.log('[API] Scraping completed for user:', userId, '- jobs found:', jobs.length);
      
      await storage.saveJobs(userId, jobs);
      
      // Increment usage (5 jobs max per scrape)
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

  app.post("/api/generate-message", requireAuth, async (req: Request, res) => {
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
        model: "gpt-5-nano",
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
  app.get("/api/schedules", requireAuth, async (req: Request, res) => {
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

  app.patch("/api/schedules/:id", requireAuth, async (req: Request, res) => {
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

  app.delete("/api/schedules/:id", requireAuth, async (req: Request, res) => {
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
