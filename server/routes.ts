import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { skillSchema } from "@shared/schema";
import { requireAuth } from "./auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
      const profile = await storage.setProfile(userId, data);
      
      if (data.skills.length > 0) {
        const jobs = await storage.scrapeAndGenerateJobs(userId, data.skills);
        await storage.setJobs(userId, jobs);
      } else {
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
      const profile = await storage.getProfile(userId);
      const updated = await storage.setProfile(userId, { ...profile, skills });
      
      if (skills.length > 0) {
        const jobs = await storage.scrapeAndGenerateJobs(userId, skills);
        await storage.setJobs(userId, jobs);
      } else {
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
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
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
        response_format: { type: "json_object" },
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

  app.post("/api/jobs/refresh", requireAuth, async (req: Request, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getProfile(userId);
      if (profile.skills.length > 0) {
        const jobs = await storage.scrapeAndGenerateJobs(userId, profile.skills);
        await storage.setJobs(userId, jobs);
        res.json({ jobs, message: "Jobs refreshed successfully" });
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
      const { id } = req.params;
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
      const { id } = req.params;
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
        intro: z.string().optional(),
      });

      const { jobTitle, jobDescription, skills, tone, intro } = schema.parse(req.body);

      const profile = await storage.getProfile(userId);
      const userIntro = intro || profile.intro || "";
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert at writing compelling freelance job application messages. Write a personalized message for a job opportunity. The message should be ${tone} in tone. Keep it concise (150-250 words), highlight relevant skills, and include a clear call to action. Do not use generic phrases like "I noticed your post" - be specific and engaging.`
          },
          {
            role: "user",
            content: `
Job Title: ${jobTitle}
Job Description: ${jobDescription}
My Skills: ${skills.join(", ")}
${userIntro ? `About Me: ${userIntro}` : ""}

Write a ${tone} follow-up message for this job opportunity.`
          }
        ],
        max_tokens: 400,
      });

      const message = response.choices[0]?.message?.content || generateFallbackMessage(jobTitle, skills, tone, userIntro);

      res.json({ message });
    } catch (error) {
      console.error("Error generating message:", error);
      const { jobTitle, skills, tone } = req.body;
      const message = generateFallbackMessage(jobTitle || "this opportunity", skills || [], tone || "professional", "");
      res.json({ message });
    }
  });

  return httpServer;
}

function generateFallbackMessage(jobTitle: string, skills: string[], tone: string, intro: string): string {
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

  const skillsList = skills.length > 0 ? skills.join(", ") : "relevant expertise";

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
