import { type User, type InsertUser, type Skill, type JobPost, type FreelancerProfile } from "@shared/schema";
import { randomUUID } from "crypto";
import { scrapeJobsForSkills } from "./apify";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser & { verificationToken?: string }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getProfile(userId: string): Promise<FreelancerProfile>;
  setProfile(userId: string, profile: Partial<FreelancerProfile>): Promise<FreelancerProfile>;
  getJobs(userId: string): Promise<JobPost[]>;
  setJobs(userId: string, jobs: JobPost[]): Promise<void>;
  saveJob(userId: string, jobId: string): Promise<JobPost | undefined>;
  markJobApplied(userId: string, jobId: string): Promise<JobPost | undefined>;
  scrapeAndGenerateJobs(userId: string, skills: Skill[]): Promise<JobPost[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private profiles: Map<string, FreelancerProfile>;
  private jobs: Map<string, JobPost[]>;

  constructor() {
    this.users = new Map();
    this.profiles = new Map();
    this.jobs = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.verificationToken === token,
    );
  }

  async createUser(insertUser: InsertUser & { verificationToken?: string }): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      emailVerified: false,
      verificationToken: insertUser.verificationToken || null,
    };
    this.users.set(id, user);
    this.profiles.set(id, { intro: "", skills: [] });
    this.jobs.set(id, []);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getProfile(userId: string): Promise<FreelancerProfile> {
    return this.profiles.get(userId) || { intro: "", skills: [] };
  }

  async setProfile(userId: string, data: Partial<FreelancerProfile>): Promise<FreelancerProfile> {
    const current = await this.getProfile(userId);
    const updated = { ...current, ...data };
    this.profiles.set(userId, updated);
    return updated;
  }

  async getJobs(userId: string): Promise<JobPost[]> {
    return this.jobs.get(userId) || [];
  }

  async setJobs(userId: string, jobs: JobPost[]): Promise<void> {
    this.jobs.set(userId, jobs);
  }

  async saveJob(userId: string, jobId: string): Promise<JobPost | undefined> {
    const userJobs = await this.getJobs(userId);
    const job = userJobs.find((j) => j.id === jobId);
    if (job) {
      job.saved = !job.saved;
      this.jobs.set(userId, userJobs);
    }
    return job;
  }

  async markJobApplied(userId: string, jobId: string): Promise<JobPost | undefined> {
    const userJobs = await this.getJobs(userId);
    const job = userJobs.find((j) => j.id === jobId);
    if (job) {
      job.applied = true;
      this.jobs.set(userId, userJobs);
    }
    return job;
  }

  generateJobsForSkills(skills: Skill[]): JobPost[] {
    const skillNames = skills.map((s) => s.name.toLowerCase());
    const sampleJobs: JobPost[] = [
      {
        id: randomUUID(),
        title: "Looking for a UI/UX Designer for SaaS Dashboard",
        description: "We need an experienced UI/UX designer to help us redesign our SaaS dashboard.",
        source: "reddit",
        sourceUrl: "https://reddit.com/r/forhire/example1",
        author: "techfounder_mike",
        postedAt: "2 hours ago",
        matchedSkills: ["UI/UX Design", "Figma"],
        budget: "$2,000 - $5,000",
        isRemote: true,
        saved: false,
        applied: false,
      },
      {
        id: randomUUID(),
        title: "React Developer Needed for E-commerce Platform",
        description: "Hiring a React developer for our e-commerce startup.",
        source: "x",
        sourceUrl: "https://x.com/user/status/example2",
        author: "Sarah Chen",
        authorHandle: "sarahbuilds",
        postedAt: "4 hours ago",
        matchedSkills: ["React", "Web Development", "Node.js"],
        budget: "$50 - $80/hr",
        isRemote: true,
        saved: false,
        applied: false,
      },
      {
        id: randomUUID(),
        title: "Need a Python Developer for Data Automation",
        description: "Looking for someone to build automation scripts for our data pipeline.",
        source: "reddit",
        sourceUrl: "https://reddit.com/r/slavelabour/example3",
        author: "data_enthusiast",
        postedAt: "6 hours ago",
        matchedSkills: ["Python", "Data Analysis"],
        budget: "$500 - $1,000",
        isRemote: true,
        saved: false,
        applied: false,
      },
    ];

    const relevantJobs = sampleJobs.filter((job) => {
      return job.matchedSkills.some((ms) =>
        skillNames.some(
          (sn) =>
            ms.toLowerCase().includes(sn) ||
            sn.includes(ms.toLowerCase())
        )
      );
    });

    return relevantJobs.map((job) => ({
      ...job,
      id: randomUUID(),
      matchedSkills: job.matchedSkills.filter((ms) =>
        skillNames.some(
          (sn) =>
            ms.toLowerCase().includes(sn) ||
            sn.includes(ms.toLowerCase())
        )
      ),
    }));
  }

  async scrapeAndGenerateJobs(userId: string, skills: Skill[]): Promise<JobPost[]> {
    const skillNames = skills.map((s) => s.name);
    
    try {
      const scrapedJobs = await scrapeJobsForSkills(skillNames);
      if (scrapedJobs.length > 0) {
        const matchedJobs = scrapedJobs.map(job => ({
          ...job,
          matchedSkills: job.matchedSkills.filter(ms =>
            skillNames.some(sn => 
              ms.toLowerCase().includes(sn.toLowerCase()) ||
              sn.toLowerCase().includes(ms.toLowerCase())
            )
          )
        })).filter(job => job.matchedSkills.length > 0 || job.description.toLowerCase().includes(skillNames[0]?.toLowerCase() || ''));
        
        if (matchedJobs.length > 0) {
          return matchedJobs;
        }
      }
    } catch (error) {
      console.error('Apify scraping failed, using sample data:', error);
    }
    
    return this.generateJobsForSkills(skills);
  }
}

export const storage = new MemStorage();
