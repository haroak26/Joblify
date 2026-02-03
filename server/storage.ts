import { 
  type User, type InsertUser, type Skill, type JobPost, type FreelancerProfile, 
  type Subscription, type Usage, type PlanType, PLAN_LIMITS, normalizePlan,
  type Schedule, type InsertSchedule, type SeenJob,
  type JobCache, type InsertJobCache,
  users, profiles, jobs, subscriptions, usage, schedules, seenJobs, jobCache 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, lte, isNotNull, gte, or, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser & { verificationToken?: string }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Profile methods
  getProfile(userId: string): Promise<FreelancerProfile>;
  setProfile(userId: string, profile: Partial<FreelancerProfile>): Promise<FreelancerProfile>;
  
  // Job methods
  getJobs(userId: string): Promise<JobPost[]>;
  setJobs(userId: string, jobs: JobPost[]): Promise<void>;
  addJobs(userId: string, jobs: JobPost[]): Promise<JobPost[]>;
  saveJobs(userId: string, jobs: JobPost[]): Promise<void>;
  clearUnsavedJobs(userId: string): Promise<void>;
  cleanupOldJobs(userId: string): Promise<number>;
  saveJob(userId: string, jobId: string): Promise<JobPost | undefined>;
  markJobApplied(userId: string, jobId: string): Promise<JobPost | undefined>;
  
  // Subscription methods
  getSubscription(userId: string): Promise<Subscription | undefined>;
  getSubscriptionByCustomerId(customerId: string): Promise<Subscription | undefined>;
  createSubscription(userId: string, plan?: PlanType): Promise<Subscription>;
  updateSubscription(userId: string, updates: Partial<Subscription>): Promise<Subscription | undefined>;
  
  // Usage methods
  getUsage(userId: string): Promise<Usage>;
  incrementJobsScraped(userId: string, count: number): Promise<Usage>;
  resetMonthlyUsage(userId: string): Promise<Usage>;
  checkAndResetMonthlyUsage(userId: string): Promise<Usage>;
  
  // Limit checking
  canAddSkills(userId: string, newSkillsCount: number): Promise<{ allowed: boolean; limit: number; current: number }>;
  
  // Schedule methods
  getSchedules(userId: string): Promise<Schedule[]>;
  getDueSchedules(cutoff?: Date): Promise<Schedule[]>;
  getSchedule(userId: string, scheduleId: string): Promise<Schedule | undefined>;
  createSchedule(userId: string, schedule: Omit<InsertSchedule, 'userId'>): Promise<Schedule>;
  updateSchedule(userId: string, scheduleId: string, updates: Partial<Schedule>): Promise<Schedule | undefined>;
  deleteSchedule(userId: string, scheduleId: string): Promise<boolean>;
  
  // Seen jobs methods
  markJobAsSeen(userId: string, sourceUrl: string): Promise<void>;
  getSeenJobUrls(userId: string): Promise<string[]>;
  filterUnseenJobs(userId: string, jobUrls: string[]): Promise<string[]>;
  
  // Job cache methods
  saveToJobCache(jobs: Omit<InsertJobCache, 'expiresAt'>[]): Promise<JobCache[]>;
  searchJobCache(tags: string[], limit?: number): Promise<JobCache[]>;
  cleanupExpiredCachedJobs(): Promise<number>;
  getCachedJobByUrl(sourceUrl: string): Promise<JobCache | undefined>;
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

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser & { verificationToken?: string; name?: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        name: insertUser.name || null,
        username: insertUser.username,
        email: insertUser.email,
        password: insertUser.password,
        verificationToken: insertUser.verificationToken || null,
        emailVerified: false,
      })
      .returning();

    // Create profile
    await db.insert(profiles).values({
      userId: user.id,
      intro: "",
      skills: [],
    });

    // Create free subscription
    await db.insert(subscriptions).values({
      userId: user.id,
      plan: "free",
      status: "active",
    });

    // Create usage tracking
    await db.insert(usage).values({
      userId: user.id,
      jobsScrapedThisMonth: 0,
      monthResetDate: new Date(),
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

  async getProfile(userId: string): Promise<FreelancerProfile & { lastScrapedAt?: Date | null }> {
    try {
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
      if (!profile) {
        return { intro: "", skills: [], isComplete: false, lastScrapedAt: null };
      }
      const skills = (profile.skills as Skill[]) || [];
      return {
        intro: profile.intro || "",
        skills,
        isComplete: profile.isComplete || false,
        lastScrapedAt: profile.lastScrapedAt,
      };
    } catch (error) {
      console.error('[Storage] Error fetching profile for user', userId, error);
      throw error;
    }
  }

  async setProfile(userId: string, data: Partial<FreelancerProfile & { lastScrapedAt?: Date | null }>): Promise<FreelancerProfile & { lastScrapedAt?: Date | null }> {
    try {
      const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
      
      const updatedIntro = data.intro !== undefined ? data.intro : (existing?.intro || "");
      const updatedSkills = data.skills !== undefined ? data.skills : (existing?.skills as Skill[] || []);
      const updatedIsComplete = data.isComplete !== undefined ? data.isComplete : (existing?.isComplete || false);
      const updatedLastScrapedAt = data.lastScrapedAt !== undefined ? data.lastScrapedAt : (existing?.lastScrapedAt || null);
      
      if (existing) {
        await db
          .update(profiles)
          .set({
            intro: updatedIntro,
            skills: updatedSkills,
            isComplete: updatedIsComplete,
            lastScrapedAt: updatedLastScrapedAt,
          })
          .where(eq(profiles.userId, userId));
      } else {
        await db.insert(profiles).values({
          userId,
          intro: updatedIntro,
          skills: updatedSkills,
          isComplete: updatedIsComplete,
          lastScrapedAt: updatedLastScrapedAt,
        });
      }
      
      return {
        intro: updatedIntro,
        skills: updatedSkills,
        isComplete: updatedIsComplete,
        lastScrapedAt: updatedLastScrapedAt,
      };
    } catch (error) {
      console.error('[Storage] Error setting profile for user', userId, error);
      throw error;
    }
  }

  async getJobs(userId: string): Promise<JobPost[]> {
    // Clean up old jobs first (run in background, don't await)
    this.cleanupOldJobs(userId).catch(err => 
      console.error('[Storage] Background cleanup failed:', err)
    );
    
    const userJobs = await db.select().from(jobs).where(eq(jobs.userId, userId));
    return userJobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      source: job.source,
      sourceUrl: job.sourceUrl,
      author: job.author,
      authorHandle: job.authorHandle || undefined,
      postedAt: job.postedAt,
      matchedSkills: (job.matchedSkills as string[]) || [],
      budget: job.budget || undefined,
      isRemote: job.isRemote,
      saved: job.saved,
      applied: job.applied,
      relevanceScore: job.relevanceScore,
      rawData: job.rawData,
      scrapedAt: job.scrapedAt || undefined,
    }));
  }

  async setJobs(userId: string, newJobs: JobPost[]): Promise<void> {
    // Get existing jobs to preserve saved/applied ones
    const existingJobs = await db.select().from(jobs).where(eq(jobs.userId, userId));
    const savedOrAppliedJobs = existingJobs.filter(job => job.saved || job.applied);
    
    // Delete only non-saved and non-applied jobs
    const jobsToDelete = existingJobs.filter(job => !job.saved && !job.applied);
    if (jobsToDelete.length > 0) {
      const idsToDelete = jobsToDelete.map(j => j.id);
      await db.delete(jobs).where(and(eq(jobs.userId, userId), inArray(jobs.id, idsToDelete)));
    }
    
    // Filter out new jobs that already exist - dedupe against ALL remaining jobs (saved/applied)
    const existingUrls = new Set(savedOrAppliedJobs.map(j => j.sourceUrl));
    const trulyNewJobs = newJobs.filter(job => !existingUrls.has(job.sourceUrl));
    
    if (trulyNewJobs.length > 0) {
      const now = new Date();
      await db.insert(jobs).values(
        trulyNewJobs.map(job => ({
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
          relevanceScore: job.relevanceScore || 0,
          rawData: job.rawData || null,
          scrapedAt: now,
        }))
      );
    }
  }
  
  async addJobs(userId: string, newJobs: JobPost[]): Promise<JobPost[]> {
    if (newJobs.length === 0) return [];
    
    // Get ALL existing job URLs to avoid duplicates
    const existingJobs = await db.select({ sourceUrl: jobs.sourceUrl }).from(jobs).where(eq(jobs.userId, userId));
    const existingUrls = new Set(existingJobs.map(j => j.sourceUrl));
    
    // Filter out duplicates against ALL existing jobs
    const trulyNewJobs = newJobs.filter(job => !existingUrls.has(job.sourceUrl));
    
    if (trulyNewJobs.length > 0) {
      const now = new Date();
      await db.insert(jobs).values(
        trulyNewJobs.map(job => ({
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
          relevanceScore: job.relevanceScore || 0,
          rawData: job.rawData || null,
          scrapedAt: now,
        }))
      );
    }
    
    // Return the jobs that were actually added with scrapedAt timestamp
    return trulyNewJobs.map(job => ({ ...job, scrapedAt: new Date() }));
  }
  
  async saveJobs(userId: string, newJobs: JobPost[]): Promise<void> {
    if (newJobs.length === 0) return;
    
    // Get ALL existing job URLs to avoid duplicates
    const existingJobs = await db.select({ sourceUrl: jobs.sourceUrl }).from(jobs).where(eq(jobs.userId, userId));
    const existingUrls = new Set(existingJobs.map(j => j.sourceUrl));
    
    // Filter out duplicates against ALL existing jobs
    const trulyNewJobs = newJobs.filter(job => !existingUrls.has(job.sourceUrl));
    
    if (trulyNewJobs.length > 0) {
      const now = new Date();
      await db.insert(jobs).values(
        trulyNewJobs.map(job => ({
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
          relevanceScore: job.relevanceScore || 0,
          rawData: job.rawData || null,
          scrapedAt: now,
        }))
      );
    }
  }
  
  async clearUnsavedJobs(userId: string): Promise<void> {
    // Only delete jobs that are not saved and not applied
    const existingJobs = await db.select().from(jobs).where(eq(jobs.userId, userId));
    const jobsToDelete = existingJobs.filter(job => !job.saved && !job.applied);
    
    if (jobsToDelete.length > 0) {
      const idsToDelete = jobsToDelete.map(j => j.id);
      await db.delete(jobs).where(and(eq(jobs.userId, userId), inArray(jobs.id, idsToDelete)));
    }
  }

  async cleanupOldJobs(userId: string): Promise<number> {
    // Delete unsaved/unapplied jobs older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Get jobs to delete: older than 7 days, not saved, not applied
    const oldJobs = await db
      .select()
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          lte(jobs.scrapedAt, sevenDaysAgo),
          eq(jobs.saved, false),
          eq(jobs.applied, false)
        )
      );
    
    if (oldJobs.length > 0) {
      const idsToDelete = oldJobs.map(j => j.id);
      await db.delete(jobs).where(and(eq(jobs.userId, userId), inArray(jobs.id, idsToDelete)));
      console.log(`[Storage] Cleaned up ${oldJobs.length} old jobs for user ${userId}`);
    }
    
    return oldJobs.length;
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
        source: updated.source as "reddit" | "x",
        sourceUrl: updated.sourceUrl,
        author: updated.author,
        authorHandle: updated.authorHandle || undefined,
        postedAt: updated.postedAt,
        matchedSkills: (updated.matchedSkills as string[]) || [],
        budget: updated.budget || undefined,
        isRemote: updated.isRemote,
        saved: updated.saved,
        applied: updated.applied,
        relevanceScore: updated.relevanceScore,
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
        source: updated.source as "reddit" | "x",
        sourceUrl: updated.sourceUrl,
        author: updated.author,
        authorHandle: updated.authorHandle || undefined,
        postedAt: updated.postedAt,
        matchedSkills: (updated.matchedSkills as string[]) || [],
        budget: updated.budget || undefined,
        isRemote: updated.isRemote,
        saved: updated.saved,
        applied: updated.applied,
        relevanceScore: updated.relevanceScore,
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
        relevanceScore: 0,
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
        relevanceScore: 0,
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
        relevanceScore: 0,
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

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Subscription methods
  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return sub || undefined;
  }

  async getSubscriptionByCustomerId(customerId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, customerId));
    return sub || undefined;
  }

  async createSubscription(userId: string, plan: PlanType = "free"): Promise<Subscription> {
    const [sub] = await db
      .insert(subscriptions)
      .values({
        userId,
        plan,
        status: "active",
      })
      .returning();
    return sub;
  }

  async updateSubscription(userId: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const [sub] = await db
      .update(subscriptions)
      .set(updates)
      .where(eq(subscriptions.userId, userId))
      .returning();
    return sub || undefined;
  }

  // Usage methods
  async getUsage(userId: string): Promise<Usage> {
    let [userUsage] = await db.select().from(usage).where(eq(usage.userId, userId));
    if (!userUsage) {
      [userUsage] = await db
        .insert(usage)
        .values({
          userId,
          jobsScrapedThisMonth: 0,
          monthResetDate: new Date(),
        })
        .returning();
    }
    return userUsage;
  }

  async incrementJobsScraped(userId: string, count: number): Promise<Usage> {
    const current = await this.getUsage(userId);
    const [updated] = await db
      .update(usage)
      .set({ jobsScrapedThisMonth: current.jobsScrapedThisMonth + count })
      .where(eq(usage.userId, userId))
      .returning();
    return updated;
  }

  async resetMonthlyUsage(userId: string): Promise<Usage> {
    const [updated] = await db
      .update(usage)
      .set({ 
        jobsScrapedThisMonth: 0, 
        monthResetDate: new Date() 
      })
      .where(eq(usage.userId, userId))
      .returning();
    return updated;
  }

  async checkAndResetMonthlyUsage(userId: string): Promise<Usage> {
    const current = await this.getUsage(userId);
    const now = new Date();
    const resetDate = new Date(current.monthResetDate);
    
    // Check if it's been a month since last reset
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    if (resetDate < oneMonthAgo) {
      return this.resetMonthlyUsage(userId);
    }
    
    return current;
  }

  // Limit checking
  async canAddSkills(userId: string, desiredTotalSkills: number): Promise<{ allowed: boolean; limit: number; current: number }> {
    try {
      const subscription = await this.getSubscription(userId);
      const plan = normalizePlan(subscription?.plan);
      const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
      
      const profile = await this.getProfile(userId);
      const currentCount = profile.skills.length;
      
      return {
        allowed: limits.maxSkills === Infinity || desiredTotalSkills <= limits.maxSkills,
        limit: limits.maxSkills === Infinity ? -1 : limits.maxSkills,
        current: currentCount,
      };
    } catch (error) {
      console.error('[Storage] Error checking skill limits for user', userId, error);
      throw error;
    }
  }

  // Schedule methods
  async getSchedules(userId: string): Promise<Schedule[]> {
    return await db.select().from(schedules).where(eq(schedules.userId, userId));
  }

  async getDueSchedules(cutoff: Date = new Date()): Promise<Schedule[]> {
    return await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.enabled, true), isNotNull(schedules.nextRun), lte(schedules.nextRun, cutoff)));
  }

  async getSchedule(userId: string, scheduleId: string): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules)
      .where(and(eq(schedules.id, scheduleId), eq(schedules.userId, userId)));
    return schedule || undefined;
  }

  async createSchedule(userId: string, scheduleData: Omit<InsertSchedule, 'userId'>): Promise<Schedule> {
    const days = (scheduleData.days || []) as string[];
    const nextRun = this.calculateNextRun(
      scheduleData.frequency || 'daily',
      scheduleData.time || '09:00',
      days
    );
    const [schedule] = await db.insert(schedules)
      .values({
        userId,
        name: scheduleData.name,
        frequency: scheduleData.frequency || 'daily',
        time: scheduleData.time || '09:00',
        days: days,
        platforms: scheduleData.platforms || ['reddit', 'x'],
        enabled: scheduleData.enabled ?? true,
        nextRun,
      })
      .returning();
    return schedule;
  }

  async updateSchedule(userId: string, scheduleId: string, updates: Partial<Schedule>): Promise<Schedule | undefined> {
    const existing = await this.getSchedule(userId, scheduleId);
    if (!existing) return undefined;
    
    const shouldRecalculate = updates.frequency || updates.time || updates.lastRun || updates.days;
    const days = ((updates.days || existing.days || []) as string[]);
    const nextRun = shouldRecalculate
      ? this.calculateNextRun(
          updates.frequency || existing.frequency,
          updates.time || existing.time,
          days
        )
      : existing.nextRun;
    
    const [updated] = await db.update(schedules)
      .set({ ...updates, nextRun })
      .where(and(eq(schedules.id, scheduleId), eq(schedules.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteSchedule(userId: string, scheduleId: string): Promise<boolean> {
    await db.delete(schedules).where(and(eq(schedules.id, scheduleId), eq(schedules.userId, userId)));
    return true;
  }

  private calculateNextRun(frequency: string, time: string, days: string[] = []): Date {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    if (frequency === 'hourly') {
      nextRun.setHours(now.getHours() + 1);
      nextRun.setMinutes(now.getMinutes(), 0, 0);
      return nextRun;
    }

    if (frequency === 'weekly' && days.length > 0) {
      const dayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      const targetDays = days
        .map((day) => dayMap[day.toLowerCase()])
        .filter((day) => day !== undefined) as number[];
      const currentDay = now.getDay();

      for (let offset = 0; offset <= 7; offset += 1) {
        const candidateDay = (currentDay + offset) % 7;
        if (targetDays.includes(candidateDay)) {
          const candidate = new Date(now);
          candidate.setDate(candidate.getDate() + offset);
          candidate.setHours(hours, minutes, 0, 0);
          if (candidate > now) {
            return candidate;
          }
        }
      }
    }

    if (nextRun <= now) {
      switch (frequency) {
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        default:
          nextRun.setDate(nextRun.getDate() + 1);
      }
    }

    return nextRun;
  }

  // Seen jobs methods
  async markJobAsSeen(userId: string, sourceUrl: string): Promise<void> {
    await db.insert(seenJobs).values({ userId, sourceUrl }).onConflictDoNothing();
  }

  async getSeenJobUrls(userId: string): Promise<string[]> {
    const seen = await db.select({ sourceUrl: seenJobs.sourceUrl })
      .from(seenJobs)
      .where(eq(seenJobs.userId, userId));
    return seen.map(s => s.sourceUrl);
  }

  async filterUnseenJobs(userId: string, jobUrls: string[]): Promise<string[]> {
    if (jobUrls.length === 0) return [];
    const seen = await db.select({ sourceUrl: seenJobs.sourceUrl })
      .from(seenJobs)
      .where(and(eq(seenJobs.userId, userId), inArray(seenJobs.sourceUrl, jobUrls)));
    const seenSet = new Set(seen.map(s => s.sourceUrl));
    return jobUrls.filter(url => !seenSet.has(url));
  }

  // Job cache methods
  async saveToJobCache(jobs: Omit<InsertJobCache, 'expiresAt'>[]): Promise<JobCache[]> {
    if (jobs.length === 0) return [];
    
    const savedJobs: JobCache[] = [];
    
    for (const job of jobs) {
      try {
        // Calculate expiration: 7 days after the post was originally published
        const postedDate = new Date(job.postedAt);
        const expiresAt = new Date(postedDate);
        expiresAt.setDate(expiresAt.getDate() + 7);
        
        // Insert or update on conflict (sourceUrl is unique)
        const [saved] = await db
          .insert(jobCache)
          .values({
            ...job,
            expiresAt,
          })
          .onConflictDoUpdate({
            target: jobCache.sourceUrl,
            set: {
              title: job.title,
              description: job.description,
              tags: job.tags,
              budget: job.budget,
              scrapedAt: new Date(), // Update when we last saw it
            },
          })
          .returning();
        
        if (saved) {
          savedJobs.push(saved);
        }
      } catch (error) {
        console.error('[Storage] Error saving job to cache:', job.sourceUrl, error);
        // Continue with other jobs even if one fails
      }
    }
    
    return savedJobs;
  }

  async searchJobCache(tags: string[], limit: number = 20): Promise<JobCache[]> {
    if (tags.length === 0) return [];
    
    const now = new Date();
    
    // Search for jobs that:
    // 1. Haven't expired yet (expiresAt > now)
    // 2. Have at least one matching tag
    // We use PostgreSQL's JSONB operators for efficient tag matching
    const tagConditions = tags.map(tag => 
      sql`${jobCache.tags}::jsonb @> ${JSON.stringify([tag.toLowerCase()])}`
    );
    
    const results = await db
      .select()
      .from(jobCache)
      .where(
        and(
          gte(jobCache.expiresAt, now),
          or(...tagConditions)
        )
      )
      .orderBy(sql`${jobCache.scrapedAt} DESC`)
      .limit(limit);
    
    return results;
  }

  async cleanupExpiredCachedJobs(): Promise<number> {
    const now = new Date();
    
    const result = await db
      .delete(jobCache)
      .where(lte(jobCache.expiresAt, now))
      .returning({ id: jobCache.id });
    
    const deletedCount = result.length;
    console.log(`[Storage] Cleaned up ${deletedCount} expired cached jobs`);
    
    return deletedCount;
  }

  async getCachedJobByUrl(sourceUrl: string): Promise<JobCache | undefined> {
    const [cached] = await db
      .select()
      .from(jobCache)
      .where(eq(jobCache.sourceUrl, sourceUrl));
    
    return cached || undefined;
  }
}

function buildSkillMatchers(skills: Skill[]): { name: string; matcher: RegExp }[] {
  return skills.map((skill) => {
    const skillName = skill.name.trim();
    const parts = skillName
      .split(/[,/&+]| and | with /gi)
      .flatMap((part) => part.split(/\s+/))
      .map((part) => part.trim())
      .filter(Boolean);
    const uniqueParts = Array.from(new Set([skillName, ...parts]));
    const pattern = uniqueParts
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");
    return {
      name: skillName,
      matcher: new RegExp(`\\b(${pattern})\\b`, "i"),
    };
  });
}

function buildKeywordMatchers(keywords: string[]): { label: string; matcher: RegExp }[] {
  return keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .map((keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matcher = /[^\w\s]/.test(keyword)
        ? new RegExp(escaped, "i")
        : new RegExp(`\\b${escaped}\\b`, "i");
      return { label: keyword, matcher };
    });
}

export const storage = new DatabaseStorage();
