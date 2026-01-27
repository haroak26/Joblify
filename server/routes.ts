import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { skillSchema, PLAN_LIMITS, type PlanType } from "@shared/schema";
import { requireAuth, requireVerifiedEmail } from "./auth";
import OpenAI from "openai";

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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/profile", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getProfile(userId);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/profile", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        intro: z.string(),
        skills: z.array(skillSchema),
      });
      
      const data = schema.parse(req.body);
      
      const subscription = await storage.getSubscription(userId);
      const plan = (subscription?.plan as PlanType) || "free";
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
            : `Your plan allows up to ${skillCheck.limit} skills. Upgrade to Plus or Ultra for unlimited skills.`
        });
      }
      
      const profile = await storage.setProfile(userId, data);
      
      if (data.skills.length === 0) {
        await storage.setJobs(userId, []);
      }
      
      res.json(profile);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid profile data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save profile" });
      }
    }
  });

  app.get("/api/skills", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getProfile(userId);
      res.json({ skills: profile.skills });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch skills" });
    }
  });

  app.post("/api/skills", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        skills: z.array(skillSchema),
      });
      
      const { skills } = schema.parse(req.body);
      
      const subscription = await storage.getSubscription(userId);
      const plan = (subscription?.plan as PlanType) || "free";
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
            : `Your plan allows up to ${skillCheck.limit} skills. Upgrade to Plus or Ultra for unlimited skills.`
        });
      }
      
      const profile = await storage.getProfile(userId);
      const updated = await storage.setProfile(userId, { ...profile, skills });
      
      if (skills.length === 0) {
        await storage.setJobs(userId, []);
      }
      
      res.json({ skills: updated.skills });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid skills data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save skills" });
      }
    }
  });

  app.post("/api/suggest-skills", requireAuth, async (req: Request, res) => {
    try {
      const schema = z.object({
        intro: z.string().min(10),
      });
      
      const { intro } = schema.parse(req.body);
      
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
      
      const content = response.choices[0]?.message?.content || '{"skills":[]}';
      let skills: string[] = [];
      
      try {
        const parsed = JSON.parse(content);
        skills = Array.isArray(parsed) ? parsed : (parsed.skills || []);
      } catch {
        skills = [];
      }
      
      res.json({ skills });
    } catch (error) {
      console.error("Error suggesting skills:", error);
      res.status(500).json({ error: "Failed to suggest skills" });
    }
  });

  app.get("/api/jobs", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const jobs = await storage.getJobs(userId);
      res.json({ jobs });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs/refresh", requireVerifiedEmail, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      
      // Check job scraping limit
      const scrapeCheck = await storage.canScrapeJobs(userId, 1);
      if (!scrapeCheck.allowed) {
        return res.status(403).json({ 
          error: "Job scraping limit reached", 
          code: "SCRAPE_LIMIT",
          remaining: scrapeCheck.remaining,
          limit: scrapeCheck.limit,
          message: `You've reached your monthly job scraping limit of ${scrapeCheck.limit}. Upgrade to Plus or Ultra for more.`
        });
      }
      
      const profile = await storage.getProfile(userId);
      if (profile.skills.length > 0) {
        const jobs = await storage.scrapeAndGenerateJobs(userId, profile.skills);
        const remaining = scrapeCheck.remaining === Infinity ? jobs.length : scrapeCheck.remaining;
        const limitedJobs = jobs.slice(0, Math.max(0, remaining));
        await storage.setJobs(userId, limitedJobs);
        if (limitedJobs.length > 0) {
          await storage.incrementJobsScraped(userId, limitedJobs.length);
        }
        res.json({ jobs: limitedJobs, message: "Jobs refreshed successfully" });
      } else {
        res.json({ jobs: [], message: "No skills set" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh jobs" });
    }
  });

  app.post("/api/jobs/:id/save", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const id = req.params.id as string;
      const job = await storage.saveJob(userId, id);
      if (job) {
        res.json({ job });
      } else {
        res.status(404).json({ error: "Job not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to save job" });
    }
  });

  app.post("/api/jobs/:id/apply", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const id = req.params.id as string;
      const job = await storage.markJobApplied(userId, id);
      if (job) {
        res.json({ job });
      } else {
        res.status(404).json({ error: "Job not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to mark job as applied" });
    }
  });

  app.post("/api/generate-message", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z.object({
        jobTitle: z.string(),
        jobDescription: z.string(),
        skills: z.array(z.string()),
        tone: z.enum(["professional", "friendly", "enthusiastic"]).default("professional"),
        messageType: z.enum(["comment", "initial"]).default("initial"),
        intro: z.string().optional(),
      });

      const { jobTitle, jobDescription, skills, tone, messageType, intro } = schema.parse(req.body);

      const profile = await storage.getProfile(userId);
      const userIntro = intro || profile.intro || "";
      
      const isComment = messageType === "comment";
      
      const systemPrompt = isComment
        ? `You are an expert at writing natural, human-like comments on social media posts about job opportunities. Write a SHORT comment (2-4 sentences max) that sounds genuine and casual - like a real person would write. Be conversational, not salesy. Show interest in the opportunity and briefly mention relevant experience. Never use generic phrases, corporate speak, or sound like a bot. The comment should feel authentic and match how real people engage on ${jobDescription.includes('reddit') ? 'Reddit' : jobDescription.includes('twitter') || jobDescription.includes('x.com') ? 'X/Twitter' : 'Facebook'}.`
        : `You are an expert at writing compelling freelance job application messages. Write a personalized outreach message for a job opportunity. The message should be ${tone} in tone. Keep it concise (150-250 words), highlight relevant skills, and include a clear call to action. Do not use generic phrases like "I noticed your post" - be specific and engaging.`;

      const userPrompt = isComment
        ? `Post: ${jobDescription}
My Skills: ${skills.join(", ")}
${userIntro ? `About Me (for context): ${userIntro}` : ""}

Write a short, human-sounding comment expressing interest. Be casual and genuine.`
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

      res.json({ message });
    } catch (error) {
      console.error("Error generating message:", error);
      const { jobTitle, skills, tone, messageType } = req.body;
      const message = generateFallbackMessage(jobTitle || "this opportunity", skills || [], tone || "professional", "", messageType === "comment");
      res.json({ message });
    }
  });

  // Subscription endpoints
  app.get("/api/subscription", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      let subscription = await storage.getSubscription(userId);
      
      // Create subscription if not exists (for existing users)
      if (!subscription) {
        subscription = await storage.createSubscription(userId, "free");
      }
      
      const limits = PLAN_LIMITS[subscription.plan as PlanType] || PLAN_LIMITS.free;
      
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
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  // Usage endpoints
  app.get("/api/usage", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const userUsage = await storage.checkAndResetMonthlyUsage(userId);
      const subscription = await storage.getSubscription(userId);
      const plan = (subscription?.plan as PlanType) || "free";
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
      const profile = await storage.getProfile(userId);
      
      res.json({
        usage: {
          skillsCount: profile.skills.length,
          jobsScrapedThisMonth: userUsage.jobsScrapedThisMonth,
          monthResetDate: userUsage.monthResetDate,
        },
        limits: {
          maxSkills: limits.maxSkills === Infinity ? -1 : limits.maxSkills,
          maxJobsPerMonth: limits.maxJobsPerMonth === Infinity ? -1 : limits.maxJobsPerMonth,
          maxSchedules: limits.maxSchedules === Infinity ? -1 : limits.maxSchedules,
          hasScheduleAccess: limits.hasScheduleAccess,
        },
        remaining: {
          skills: limits.maxSkills === Infinity ? -1 : Math.max(0, limits.maxSkills - profile.skills.length),
          jobsThisMonth: limits.maxJobsPerMonth === Infinity ? -1 : Math.max(0, limits.maxJobsPerMonth - userUsage.jobsScrapedThisMonth),
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch usage" });
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
      const plan = (subscription?.plan as PlanType) || "free";
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

      if (!limits.hasScheduleAccess) {
        return res.status(403).json({ 
          error: "Schedule access requires Plus or Ultra plan",
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
        platforms: z.array(z.enum(["reddit", "x", "facebook"])).default(["reddit", "x", "facebook"]),
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
      const scheduleId = req.params.id;
      
      const schema = z.object({
        name: z.string().min(1).optional(),
        frequency: z.enum(["hourly", "daily", "weekly"]).optional(),
        time: z.string().optional(),
        days: z.array(z.string()).optional(),
        platforms: z.array(z.enum(["reddit", "x", "facebook"])).optional(),
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
      const scheduleId = req.params.id;
      
      await storage.deleteSchedule(userId, scheduleId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  });

  app.post("/api/schedules/:id/run", requireVerifiedEmail, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const scheduleId = req.params.id;
      
      const schedule = await storage.getSchedule(userId, scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Check scraping limit
      const scrapeCheck = await storage.canScrapeJobs(userId, 1);
      if (!scrapeCheck.allowed) {
        return res.status(403).json({ 
          error: "Job scraping limit reached",
          code: "SCRAPE_LIMIT",
          remaining: scrapeCheck.remaining,
        });
      }
      
      // Run the schedule
      const profile = await storage.getProfile(userId);
      if (profile.skills.length === 0) {
        return res.status(400).json({ error: "No skills configured" });
      }
      
      const jobs = await storage.scrapeAndGenerateJobs(userId, profile.skills);
      
      // Filter out seen jobs
      const seenUrls = await storage.getSeenJobUrls(userId);
      const newJobs = jobs.filter(job => !seenUrls.includes(job.sourceUrl));

      const remaining = scrapeCheck.remaining === Infinity ? newJobs.length : scrapeCheck.remaining;
      const limitedJobs = newJobs.slice(0, Math.max(0, remaining));
      
      // Mark new jobs as seen
      for (const job of limitedJobs) {
        await storage.markJobAsSeen(userId, job.sourceUrl);
      }
      
      // Update jobs and usage
      await storage.setJobs(userId, limitedJobs);
      if (limitedJobs.length > 0) {
        await storage.incrementJobsScraped(userId, limitedJobs.length);
      }
      
      // Update schedule last run
      await storage.updateSchedule(userId, scheduleId, { lastRun: new Date() });
      
      // Send email notification if there are new jobs
      if (limitedJobs.length > 0) {
        const user = await storage.getUser(userId);
        if (user?.email) {
          const { sendScheduleJobsEmail } = await import("./brevo");
          await sendScheduleJobsEmail(user.email, schedule.name, limitedJobs);
        }
      }
      
      res.json({ jobs: limitedJobs, count: limitedJobs.length });
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
      `This sounds like a great opportunity! I have experience with ${skillsList} and would love to help out. DM me if you're still looking!`,
      `Hey, I'd be interested in this! Been working with ${skillsList} for a while now. Happy to chat if you need someone.`,
      `Really cool project! I've got ${skillsList} experience and this seems like a good fit. Let me know if you want to connect.`,
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
