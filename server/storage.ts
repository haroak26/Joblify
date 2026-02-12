import { 
  type User, type InsertUser, type Skill,
  type Subscription, type Usage, type PlanType, normalizePlan,
  type CoverLetter, type InsertCoverLetter,
  type SecurityEvent, type InsertSecurityEvent,
  type SupportInteraction, type InsertSupportInteraction,
  type SystemAdminLog, type InsertSystemAdminLog,
  type UserPerk, type InsertUserPerk, type Perk,
  type AiUsageLog, type UserActivityLog,
  users, profiles, subscriptions, usage,
  coverLetters, securityEvents, supportInteractions,
  deletedAccountsTracker, resumes, systemAdminLogs,
  userPerks, perks, aiUsageLogs, userActivityLogs
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, lte, isNotNull, gte, or, sql, count, desc, like, ilike } from "drizzle-orm";
import { randomUUID } from "crypto";

// Plan limits configuration
export const PLAN_LIMITS = {
  free: {
    maxResumes: 3,
    maxSkills: 10,
    maxAIEditsPerMonth: 10,
    maxCoverLettersPerMonth: 3,
    maxJobAnalysesPerMonth: 5,
    maxATSScansPerMonth: 5,
    maxImportedResumesPerMonth: 1,
  },
  plus: {
    maxResumes: 10,
    maxSkills: Infinity,
    maxAIEditsPerMonth: 100,
    maxCoverLettersPerMonth: 50,
    maxJobAnalysesPerMonth: 50,
    maxATSScansPerMonth: 50,
    maxImportedResumesPerMonth: 10,
  },
  ultra: {
    maxResumes: Infinity,
    maxSkills: Infinity,
    maxAIEditsPerMonth: Infinity,
    maxCoverLettersPerMonth: Infinity,
    maxJobAnalysesPerMonth: Infinity,
    maxATSScansPerMonth: Infinity,
    maxImportedResumesPerMonth: Infinity,
  },
  lifetime: {
    maxResumes: Infinity,
    maxSkills: Infinity,
    maxAIEditsPerMonth: Infinity,
    maxCoverLettersPerMonth: Infinity,
    maxJobAnalysesPerMonth: Infinity,
    maxATSScansPerMonth: Infinity,
    maxImportedResumesPerMonth: Infinity,
  },
} as const;

/**
 * Represents a user's profile information
 * @property intro - Personal introduction or bio text
 * @property skills - Array of user's professional skills
 * @property isComplete - Whether the profile setup is complete
 */
export interface Profile {
  intro: string;
  skills: Skill[];
  isComplete: boolean;
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser & { verificationToken?: string }): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Profile methods
  getProfile(userId: string): Promise<{ intro: string; skills: Skill[]; isComplete: boolean }>;
  setProfile(userId: string, profile: Partial<{ intro: string; skills: Skill[]; isComplete: boolean }>): Promise<{ intro: string; skills: Skill[]; isComplete: boolean }>;
  
  // Subscription methods
  getSubscription(userId: string): Promise<Subscription | undefined>;
  getSubscriptionByCustomerId(customerId: string): Promise<Subscription | undefined>;
  createSubscription(userId: string, plan?: PlanType): Promise<Subscription>;
  updateSubscription(userId: string, updates: Partial<Subscription>): Promise<Subscription | undefined>;
  updateSubscriptionPlan(userId: string, plan: PlanType, expiresAt: Date): Promise<Subscription | undefined>;
  
  // Usage methods
  getUsage(userId: string): Promise<Usage>;
  resetMonthlyUsage(userId: string): Promise<Usage>;
  checkAndResetMonthlyUsage(userId: string): Promise<Usage>;
  
  // Limit checking methods
  canAddSkills(userId: string, skillCount: number): Promise<{ allowed: boolean; limit: number; current: number }>;
  canAddResume(userId: string): Promise<{ allowed: boolean; limit: number; current: number }>;
  
  // Cover letter methods
  getCoverLetter(id: string): Promise<CoverLetter | undefined>;
  getCoverLetters(userId: string): Promise<CoverLetter[]>;
  getCoverLetterCount(userId: string): Promise<number>;
  createCoverLetter(data: InsertCoverLetter): Promise<CoverLetter>;
  updateCoverLetter(id: string, content: string): Promise<CoverLetter>;
  deleteCoverLetter(id: string): Promise<void>;
  
  // Security events methods
  getSecurityEvents(userId: string, limit?: number): Promise<SecurityEvent[]>;
  createSecurityEvent(data: InsertSecurityEvent): Promise<SecurityEvent>;
  
  // Support interactions methods
  getSupportInteractions(userId: string, limit?: number): Promise<SupportInteraction[]>;
  createSupportInteraction(data: InsertSupportInteraction): Promise<SupportInteraction>;
  
  // GDPR helper methods
  getJobs(userId: string): Promise<any[]>;
  getSchedules(userId: string): Promise<any[]>;
  getJobCount(userId: string): Promise<number>;
  getScheduleCount(userId: string): Promise<number>;
  
  // Deleted accounts tracker methods (abuse prevention)
  checkDeletedAccount(email: string): Promise<{ isBlocked: boolean; expiresAt?: Date }>;
  addDeletedAccount(email: string, reason?: string): Promise<void>;
  cleanupExpiredDeletedAccounts(): Promise<number>;
  
  // Admin methods
  getAllUsers(options?: { page?: number; limit?: number; search?: string }): Promise<{ users: User[]; total: number }>;
  getUserStatistics(userId: string): Promise<any>;
  blockUserAccount(userId: string, blockedBy: string, reason: string): Promise<User | undefined>;
  unblockUserAccount(userId: string): Promise<User | undefined>;
  blockUserAIAccess(userId: string, blockedBy: string, reason: string): Promise<User | undefined>;
  unblockUserAIAccess(userId: string): Promise<User | undefined>;
  
  // Admin logs
  createAdminLog(data: InsertSystemAdminLog): Promise<SystemAdminLog>;
  getAdminLogs(options?: { page?: number; limit?: number; adminUserId?: string; action?: string }): Promise<{ logs: SystemAdminLog[]; total: number }>;
  
  // Perks management
  getAllPerks(): Promise<Perk[]>;
  awardPerkToUser(userId: string, perkId: string, awardedBy: string): Promise<UserPerk>;
  getUserPerks(userId: string): Promise<UserPerk[]>;
  redeemPerk(userPerkId: string): Promise<UserPerk | undefined>;
  
  // User analytics for admin dashboard
  getUserAiUsageLogs(userId: string, limit?: number): Promise<AiUsageLog[]>;
  getUserActivityLogs(userId: string, limit?: number): Promise<UserActivityLog[]>;
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

  async getProfile(userId: string): Promise<Profile> {
    try {
      const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
      if (!profile) {
        return { intro: "", skills: [], isComplete: false };
      }
      const skills = (profile.skills as Skill[]) || [];
      return {
        intro: profile.intro || "",
        skills,
        isComplete: profile.isComplete || false,
      };
    } catch (error) {
      console.error('[Storage] Error fetching profile for user', userId, error);
      throw error;
    }
  }

  async setProfile(userId: string, data: Partial<Profile>): Promise<Profile> {
    try {
      const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
      
      const updatedIntro = data.intro !== undefined ? data.intro : (existing?.intro || "");
      const updatedSkills = data.skills !== undefined ? data.skills : (existing?.skills as Skill[] || []);
      const updatedIsComplete = data.isComplete !== undefined ? data.isComplete : (existing?.isComplete || false);
      
      if (existing) {
        await db
          .update(profiles)
          .set({
            intro: updatedIntro,
            skills: updatedSkills,
            isComplete: updatedIsComplete,
          })
          .where(eq(profiles.userId, userId));
      } else {
        await db.insert(profiles).values({
          userId,
          intro: updatedIntro,
          skills: updatedSkills,
          isComplete: updatedIsComplete,
        });
      }
      
      return {
        intro: updatedIntro,
        skills: updatedSkills,
        isComplete: updatedIsComplete,
      };
    } catch (error) {
      console.error('[Storage] Error setting profile for user', userId, error);
      throw error;
    }
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

  async updateSubscriptionPlan(userId: string, plan: PlanType, expiresAt: Date): Promise<Subscription | undefined> {
    return this.updateSubscription(userId, {
      plan,
      currentPeriodEnd: expiresAt,
    });
  }

  // Usage methods
  async getUsage(userId: string): Promise<Usage> {
    let [userUsage] = await db.select().from(usage).where(eq(usage.userId, userId));
    if (!userUsage) {
      [userUsage] = await db
        .insert(usage)
        .values({
          userId,
          monthResetDate: new Date(),
        })
        .returning();
    }
    return userUsage;
  }

  async resetMonthlyUsage(userId: string): Promise<Usage> {
    const [updated] = await db
      .update(usage)
      .set({ 
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

  // Limit checking methods
  async canAddSkills(userId: string, skillCount: number): Promise<{ allowed: boolean; limit: number; current: number }> {
    const subscription = await this.getSubscription(userId);
    const plan = normalizePlan(subscription?.plan);
    const limits = PLAN_LIMITS[plan];
    
    const allowed = skillCount <= limits.maxSkills;
    return {
      allowed,
      limit: limits.maxSkills,
      current: skillCount,
    };
  }

  async canAddResume(userId: string): Promise<{ allowed: boolean; limit: number; current: number }> {
    const subscription = await this.getSubscription(userId);
    const plan = normalizePlan(subscription?.plan);
    const limits = PLAN_LIMITS[plan];
    
    // Count current resumes
    const result = await db
      .select({ count: count() })
      .from(resumes)
      .where(eq(resumes.userId, userId));
    
    const currentCount = result[0]?.count || 0;
    const allowed = currentCount < limits.maxResumes;
    
    return {
      allowed,
      limit: limits.maxResumes,
      current: currentCount,
    };
  }


  // Cover letter methods
  async getCoverLetter(id: string): Promise<CoverLetter | undefined> {
    const [coverLetter] = await db
      .select()
      .from(coverLetters)
      .where(eq(coverLetters.id, id));
    return coverLetter || undefined;
  }
  
  async getCoverLetters(userId: string): Promise<CoverLetter[]> {
    return await db
      .select()
      .from(coverLetters)
      .where(eq(coverLetters.userId, userId));
  }
  
  async createCoverLetter(data: InsertCoverLetter): Promise<CoverLetter> {
    const [coverLetter] = await db
      .insert(coverLetters)
      .values(data)
      .returning();
    return coverLetter;
  }
  
  async updateCoverLetter(id: string, content: string): Promise<CoverLetter> {
    const [coverLetter] = await db
      .update(coverLetters)
      .set({
        content,
        updatedAt: new Date(),
      })
      .where(eq(coverLetters.id, id))
      .returning();
    return coverLetter;
  }
  
  async deleteCoverLetter(id: string): Promise<void> {
    await db.delete(coverLetters).where(eq(coverLetters.id, id));
  }
  
  // GDPR/CCPA Support Methods
  
  async getUserById(id: string): Promise<User | undefined> {
    // Alias for getUser - for GDPR compliance clarity
    return this.getUser(id);
  }
  
  async getCoverLetterCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(coverLetters)
      .where(eq(coverLetters.userId, userId));
    return result[0]?.count || 0;
  }
  
  
  async getSecurityEvents(userId: string, limit: number = 100): Promise<SecurityEvent[]> {
    return db
      .select()
      .from(securityEvents)
      .where(eq(securityEvents.userId, userId))
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit);
  }
  
  async createSecurityEvent(data: InsertSecurityEvent): Promise<SecurityEvent> {
    const [event] = await db
      .insert(securityEvents)
      .values(data)
      .returning();
    return event;
  }
  
  async getSupportInteractions(userId: string, limit: number = 100): Promise<SupportInteraction[]> {
    return db
      .select()
      .from(supportInteractions)
      .where(eq(supportInteractions.userId, userId))
      .orderBy(desc(supportInteractions.createdAt))
      .limit(limit);
  }
  
  async createSupportInteraction(data: InsertSupportInteraction): Promise<SupportInteraction> {
    const [interaction] = await db
      .insert(supportInteractions)
      .values(data)
      .returning();
    return interaction;
  }

  // GDPR helper methods
  async getJobs(_userId: string): Promise<any[]> {
    // Jobs are not stored in the database - they are fetched from external sources
    // Return empty array for now
    return [];
  }

  async getSchedules(_userId: string): Promise<any[]> {
    // Schedules are not implemented yet
    return [];
  }

  async getJobCount(_userId: string): Promise<number> {
    // Jobs are not stored in the database
    return 0;
  }

  async getScheduleCount(_userId: string): Promise<number> {
    // Schedules are not implemented yet
    return 0;
  }
  
  // Deleted accounts tracker methods (abuse prevention)
  async checkDeletedAccount(email: string): Promise<{ isBlocked: boolean; expiresAt?: Date }> {
    const [record] = await db
      .select()
      .from(deletedAccountsTracker)
      .where(
        and(
          eq(deletedAccountsTracker.email, email),
          gte(deletedAccountsTracker.expiresAt, new Date())
        )
      );
    
    if (record) {
      return { isBlocked: true, expiresAt: record.expiresAt };
    }
    return { isBlocked: false };
  }
  
  async addDeletedAccount(email: string, reason?: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours from now
    
    await db.insert(deletedAccountsTracker).values({
      email,
      expiresAt,
      reason: reason || null,
    });
  }
  
  async cleanupExpiredDeletedAccounts(): Promise<number> {
    const result = await db
      .delete(deletedAccountsTracker)
      .where(lte(deletedAccountsTracker.expiresAt, new Date()));
    
    return result.rowCount || 0;
  }
  
  // ============================================
  // Admin Methods
  // ============================================
  
  async getAllUsers(options?: { page?: number; limit?: number; search?: string }): Promise<{ users: User[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;
    const search = options?.search;
    
    let query = db.select().from(users);
    let countQuery = db.select({ count: count() }).from(users);
    
    if (search) {
      const searchCondition = or(
        ilike(users.email, `%${search}%`),
        ilike(users.username, `%${search}%`),
        ilike(users.name, `%${search}%`)
      );
      query = query.where(searchCondition);
      countQuery = countQuery.where(searchCondition);
    }
    
    const usersList = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [{ count: total }] = await countQuery;
    
    return { users: usersList, total: Number(total) };
  }
  
  async getUserStatistics(userId: string): Promise<any> {
    // Get user basic info
    const user = await this.getUser(userId);
    if (!user) return null;
    
    // Get subscription info
    const subscription = await this.getSubscription(userId);
    
    // Get usage stats
    const usageStats = await this.getUsage(userId);
    
    // Get resume count
    const resumeCount = await db
      .select({ count: count() })
      .from(resumes)
      .where(eq(resumes.userId, userId));
    
    // Get AI usage logs count
    const aiUsageCount = await db
      .select({ count: count() })
      .from(aiUsageLogs)
      .where(eq(aiUsageLogs.userId, userId));
    
    // Get security events count
    const securityEventsCount = await db
      .select({ count: count() })
      .from(securityEvents)
      .where(eq(securityEvents.userId, userId));
    
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        aiAccessBlocked: user.aiAccessBlocked,
        accountBlocked: user.accountBlocked,
        isAdmin: user.isAdmin,
      },
      subscription: {
        plan: subscription?.plan,
        status: subscription?.status,
        currentPeriodEnd: subscription?.currentPeriodEnd,
      },
      usage: usageStats,
      statistics: {
        resumeCount: Number(resumeCount[0]?.count || 0),
        aiUsageCount: Number(aiUsageCount[0]?.count || 0),
        securityEventsCount: Number(securityEventsCount[0]?.count || 0),
      },
    };
  }
  
  async blockUserAccount(userId: string, blockedBy: string, reason: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        accountBlocked: true,
        accountBlockedAt: new Date(),
        accountBlockedBy: blockedBy,
        accountBlockedReason: reason,
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }
  
  async unblockUserAccount(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        accountBlocked: false,
        accountBlockedAt: null,
        accountBlockedBy: null,
        accountBlockedReason: null,
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }
  
  async blockUserAIAccess(userId: string, blockedBy: string, reason: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        aiAccessBlocked: true,
        aiAccessBlockedAt: new Date(),
        aiAccessBlockedBy: blockedBy,
        aiAccessBlockedReason: reason,
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }
  
  async unblockUserAIAccess(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        aiAccessBlocked: false,
        aiAccessBlockedAt: null,
        aiAccessBlockedBy: null,
        aiAccessBlockedReason: null,
      })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }
  
  // Admin logs
  async createAdminLog(data: InsertSystemAdminLog): Promise<SystemAdminLog> {
    const [log] = await db
      .insert(systemAdminLogs)
      .values(data)
      .returning();
    return log;
  }
  
  async getAdminLogs(options?: { page?: number; limit?: number; adminUserId?: string; action?: string }): Promise<{ logs: SystemAdminLog[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const offset = (page - 1) * limit;
    
    let query = db.select().from(systemAdminLogs);
    let countQuery = db.select({ count: count() }).from(systemAdminLogs);
    
    const conditions = [];
    if (options?.adminUserId) {
      conditions.push(eq(systemAdminLogs.adminUserId, options.adminUserId));
    }
    if (options?.action) {
      conditions.push(eq(systemAdminLogs.action, options.action));
    }
    
    if (conditions.length > 0) {
      const whereCondition = and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }
    
    const logs = await query
      .orderBy(desc(systemAdminLogs.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [{ count: total }] = await countQuery;
    
    return { logs, total: Number(total) };
  }
  
  // Perks management
  async getAllPerks(): Promise<Perk[]> {
    return db.select().from(perks).orderBy(perks.name);
  }
  
  async awardPerkToUser(userId: string, perkId: string, awardedBy: string): Promise<UserPerk> {
    const [userPerk] = await db
      .insert(userPerks)
      .values({
        userId,
        perkId,
        awardedBy,
        status: 'pending',
        isActive: true,
      })
      .returning();
    
    return userPerk;
  }
  
  async getUserPerks(userId: string): Promise<UserPerk[]> {
    return db
      .select()
      .from(userPerks)
      .where(eq(userPerks.userId, userId))
      .orderBy(desc(userPerks.awardedAt));
  }
  
  async redeemPerk(userPerkId: string): Promise<UserPerk | undefined> {
    const [perk] = await db
      .update(userPerks)
      .set({
        status: 'redeemed',
        redeemedAt: new Date(),
      })
      .where(eq(userPerks.id, userPerkId))
      .returning();
    
    return perk;
  }
  
  // User analytics for admin dashboard
  async getUserAiUsageLogs(userId: string, limit?: number): Promise<AiUsageLog[]> {
    return db
      .select()
      .from(aiUsageLogs)
      .where(eq(aiUsageLogs.userId, userId))
      .orderBy(desc(aiUsageLogs.createdAt))
      .limit(limit || 100);
  }
  
  async getUserActivityLogs(userId: string, limit?: number): Promise<UserActivityLog[]> {
    return db
      .select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.userId, userId))
      .orderBy(desc(userActivityLogs.createdAt))
      .limit(limit || 100);
  }
}

export const storage = new DatabaseStorage();
