import { 
  type User, type InsertUser, type Skill,
  type Subscription, type Usage, type PlanType, normalizePlan,
  type CoverLetter, type InsertCoverLetter,
  type SecurityEvent, type InsertSecurityEvent,
  type SupportInteraction, type InsertSupportInteraction,
  users, profiles, subscriptions, usage,
  coverLetters, securityEvents, supportInteractions,
  deletedAccountsTracker
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, lte, isNotNull, gte, or, sql, count, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

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
  
  // Usage methods
  getUsage(userId: string): Promise<Usage>;
  resetMonthlyUsage(userId: string): Promise<Usage>;
  checkAndResetMonthlyUsage(userId: string): Promise<Usage>;
  
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
  
  // Deleted accounts tracker methods (abuse prevention)
  checkDeletedAccount(email: string): Promise<{ isBlocked: boolean; expiresAt?: Date }>;
  addDeletedAccount(email: string, reason?: string): Promise<void>;
  cleanupExpiredDeletedAccounts(): Promise<number>;
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
        auth0Id: (insertUser as any).auth0Id || null,
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
}

export const storage = new DatabaseStorage();
