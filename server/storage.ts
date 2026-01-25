import { type User, type InsertUser, type Skill, type JobPost, type FreelancerProfile, users, profiles, jobs } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
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

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.verificationToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { verificationToken?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: insertUser.username,
        email: insertUser.email,
        password: insertUser.password,
        verificationToken: insertUser.verificationToken || null,
        emailVerified: false,
      })
      .returning();

    await db.insert(profiles).values({
      userId: user.id,
      intro: "",
      skills: [],
    });

    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getProfile(userId: string): Promise<FreelancerProfile> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    if (!profile) {
      return { intro: "", skills: [] };
    }
    return {
      intro: profile.intro,
      skills: (profile.skills as Skill[]) || [],
    };
  }

  async setProfile(userId: string, data: Partial<FreelancerProfile>): Promise<FreelancerProfile> {
    const current = await this.getProfile(userId);
    const updated = { ...current, ...data };
    
    const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    
    if (existing) {
      await db
        .update(profiles)
        .set({
          intro: updated.intro,
          skills: updated.skills,
        })
        .where(eq(profiles.userId, userId));
    } else {
      await db.insert(profiles).values({
        userId,
        intro: updated.intro,
        skills: updated.skills,
      });
    }
    
    return updated;
  }

  async getJobs(userId: string): Promise<JobPost[]> {
    const userJobs = await db.select().from(jobs).where(eq(jobs.userId, userId));
    return userJobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      source: job.source as "reddit" | "x" | "facebook",
      sourceUrl: job.sourceUrl,
      author: job.author,
      authorHandle: job.authorHandle || undefined,
      postedAt: job.postedAt,
      matchedSkills: (job.matchedSkills as string[]) || [],
      budget: job.budget || undefined,
      isRemote: job.isRemote,
      saved: job.saved,
      applied: job.applied,
    }));
  }

  async setJobs(userId: string, newJobs: JobPost[]): Promise<void> {
    await db.delete(jobs).where(eq(jobs.userId, userId));
    
    if (newJobs.length > 0) {
      await db.insert(jobs).values(
        newJobs.map(job => ({
          id: job.id,
          userId,
          title: job.title,
          description: job.description,
          source: job.source,
          sourceUrl: job.sourceUrl,
          author: job.author,
          authorHandle: job.authorHandle || null,
          postedAt: job.postedAt,
          matchedSkills: job.matchedSkills,
          budget: job.budget || null,
          isRemote: job.isRemote,
          saved: job.saved,
          applied: job.applied,
        }))
      );
    }
  }

  async saveJob(userId: string, jobId: string): Promise<JobPost | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (job && job.userId === userId) {
      const [updated] = await db
        .update(jobs)
        .set({ saved: !job.saved })
        .where(eq(jobs.id, jobId))
        .returning();
      
      return {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        source: updated.source as "reddit" | "x" | "facebook",
        sourceUrl: updated.sourceUrl,
        author: updated.author,
        authorHandle: updated.authorHandle || undefined,
        postedAt: updated.postedAt,
        matchedSkills: (updated.matchedSkills as string[]) || [],
        budget: updated.budget || undefined,
        isRemote: updated.isRemote,
        saved: updated.saved,
        applied: updated.applied,
      };
    }
    return undefined;
  }

  async markJobApplied(userId: string, jobId: string): Promise<JobPost | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    if (job && job.userId === userId) {
      const [updated] = await db
        .update(jobs)
        .set({ applied: true })
        .where(eq(jobs.id, jobId))
        .returning();
      
      return {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        source: updated.source as "reddit" | "x" | "facebook",
        sourceUrl: updated.sourceUrl,
        author: updated.author,
        authorHandle: updated.authorHandle || undefined,
        postedAt: updated.postedAt,
        matchedSkills: (updated.matchedSkills as string[]) || [],
        budget: updated.budget || undefined,
        isRemote: updated.isRemote,
        saved: updated.saved,
        applied: updated.applied,
      };
    }
    return undefined;
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

export const storage = new DatabaseStorage();
