import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { skillSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/skills", async (_req, res) => {
    try {
      const skills = await storage.getSkills();
      res.json({ skills });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch skills" });
    }
  });

  app.post("/api/skills", async (req, res) => {
    try {
      const schema = z.object({
        skills: z.array(skillSchema),
      });
      
      const { skills } = schema.parse(req.body);
      const savedSkills = await storage.setSkills(skills);
      
      if (skills.length > 0) {
        const jobs = (storage as any).generateJobsForSkills(skills);
        await storage.setJobs(jobs);
      } else {
        await storage.setJobs([]);
      }
      
      res.json({ skills: savedSkills });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid skills data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save skills" });
      }
    }
  });

  app.get("/api/jobs", async (_req, res) => {
    try {
      const jobs = await storage.getJobs();
      res.json({ jobs });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.post("/api/jobs/refresh", async (_req, res) => {
    try {
      const skills = await storage.getSkills();
      if (skills.length > 0) {
        const jobs = (storage as any).generateJobsForSkills(skills);
        await storage.setJobs(jobs);
        res.json({ jobs, message: "Jobs refreshed successfully" });
      } else {
        res.json({ jobs: [], message: "No skills set" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh jobs" });
    }
  });

  app.post("/api/jobs/:id/save", async (req, res) => {
    try {
      const { id } = req.params;
      const job = await storage.saveJob(id);
      if (job) {
        res.json({ job });
      } else {
        res.status(404).json({ error: "Job not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to save job" });
    }
  });

  app.post("/api/jobs/:id/apply", async (req, res) => {
    try {
      const { id } = req.params;
      const job = await storage.markJobApplied(id);
      if (job) {
        res.json({ job });
      } else {
        res.status(404).json({ error: "Job not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to mark job as applied" });
    }
  });

  app.post("/api/generate-message", async (req, res) => {
    try {
      const schema = z.object({
        jobTitle: z.string(),
        jobDescription: z.string(),
        skills: z.array(z.string()),
        tone: z.enum(["professional", "friendly", "enthusiastic"]).default("professional"),
      });

      const { jobTitle, jobDescription, skills, tone } = schema.parse(req.body);

      const toneIntros: Record<string, string> = {
        professional: "I hope this message finds you well.",
        friendly: "Hey there! I came across your post and got really excited.",
        enthusiastic: "Wow, this opportunity sounds amazing! I'm thrilled to reach out.",
      };

      const toneClosings: Record<string, string> = {
        professional: "I look forward to the opportunity to discuss how I can contribute to your project. Please feel free to reach out at your convenience.",
        friendly: "Would love to chat more about this! Let me know if you'd like to hop on a quick call.",
        enthusiastic: "I can't wait to hear back from you! I'm ready to dive in and make this project a success!",
      };

      const skillsList = skills.length > 0 
        ? skills.join(", ") 
        : "relevant expertise";

      const message = `Hi,

${toneIntros[tone]} I noticed your post about "${jobTitle}" and I believe I would be a great fit for this project.

With my experience in ${skillsList}, I've worked on similar projects and understand the importance of delivering high-quality work that meets your specific needs.

Based on your requirements, I can help you with:
- Understanding your vision and translating it into actionable deliverables
- Providing regular updates and maintaining clear communication throughout the project
- Ensuring the final result exceeds your expectations

${toneClosings[tone]}

Best regards`;

      res.json({ message });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid request data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to generate message" });
      }
    }
  });

  return httpServer;
}
