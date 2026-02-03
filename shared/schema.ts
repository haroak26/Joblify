import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, jsonb, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/chat";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at"),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("free"), // 'free', 'plus', 'ultra', or 'lifetime'
  status: text("status").notNull().default("active"), // 'active', 'cancelled', 'past_due'
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end"),
});

export const usage = pgTable("usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  jobsScrapedThisMonth: integer("jobs_scraped_this_month").notNull().default(0),
  monthResetDate: timestamp("month_reset_date").notNull().default(sql`NOW()`),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const usageRelations = relations(usage, ({ one }) => ({
  user: one(users, {
    fields: [usage.userId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles),
  jobs: many(jobs),
  subscription: one(subscriptions),
  usage: one(usage),
  schedules: many(schedules),
  seenJobs: many(seenJobs),
}));

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  intro: text("intro").notNull().default(""),
  skills: jsonb("skills").notNull().default([]),
  isComplete: boolean("is_complete").notNull().default(false),
  lastScrapedAt: timestamp("last_scraped_at"),
});

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(),
  source: text("source").notNull(),
  sourceUrl: text("source_url").notNull(),
  author: text("author").notNull(),
  authorHandle: text("author_handle"),
  postedAt: text("posted_at").notNull(),
  matchedSkills: jsonb("matched_skills").notNull().default([]),
  budget: text("budget"),
  isRemote: boolean("is_remote").notNull().default(true),
  saved: boolean("saved").notNull().default(false),
  applied: boolean("applied").notNull().default(false),
  relevanceScore: integer("relevance_score").notNull().default(0),
  rawData: jsonb("raw_data"),
  scrapedAt: timestamp("scraped_at").notNull().default(sql`NOW()`),
});

export const jobsRelations = relations(jobs, ({ one }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
}));

export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  frequency: text("frequency").notNull().default("daily"), // 'hourly', 'daily', 'weekly'
  time: text("time").notNull().default("09:00"),
  days: jsonb("days").default([]), // For weekly: ['monday', 'wednesday']
  platforms: jsonb("platforms").notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run"),
});

export const schedulesRelations = relations(schedules, ({ one }) => ({
  user: one(users, {
    fields: [schedules.userId],
    references: [users.id],
  }),
}));

export const seenJobs = pgTable("seen_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceUrl: text("source_url").notNull(),
  seenAt: timestamp("seen_at").notNull().default(sql`NOW()`),
}, (table) => ({
  userSourceUnique: uniqueIndex("seen_jobs_user_source_idx").on(table.userId, table.sourceUrl),
}));

export const seenJobsRelations = relations(seenJobs, ({ one }) => ({
  user: one(users, {
    fields: [seenJobs.userId],
    references: [users.id],
  }),
}));

// Global job cache - stores all scraped jobs with tags for reuse across users
export const jobCache = pgTable("job_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  source: text("source").notNull(), // 'reddit', 'x'
  sourceUrl: text("source_url").notNull().unique(), // Unique constraint - one job per URL
  author: text("author").notNull(),
  authorHandle: text("author_handle"),
  postedAt: timestamp("posted_at").notNull(), // Original post date from platform
  budget: text("budget"),
  isRemote: boolean("is_remote").notNull().default(true),
  tags: jsonb("tags").notNull().default([]), // AI-generated tags/categories ["web development", "react", "frontend"]
  rawData: jsonb("raw_data"),
  scrapedAt: timestamp("scraped_at").notNull().default(sql`NOW()`), // When we first scraped it
  expiresAt: timestamp("expires_at").notNull(), // postedAt + 7 days
}, (table) => ({
  sourceUrlIdx: uniqueIndex("job_cache_source_url_idx").on(table.sourceUrl),
  expiresAtIdx: uniqueIndex("job_cache_expires_at_idx").on(table.expiresAt),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const skillSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  category: z.string().optional(),
});

export const insertSkillSchema = skillSchema.omit({ id: true });

export type Skill = z.infer<typeof skillSchema>;
export type InsertSkill = z.infer<typeof insertSkillSchema>;

export const jobPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  source: z.string(),
  sourceUrl: z.string().url(),
  author: z.string(),
  authorHandle: z.string().optional(),
  postedAt: z.string(),
  matchedSkills: z.array(z.string()),
  budget: z.string().optional(),
  isRemote: z.boolean().default(true),
  saved: z.boolean().default(false),
  applied: z.boolean().default(false),
  relevanceScore: z.number().default(0),
  rawData: z.any().optional(),
  scrapedAt: z.date().optional(),
});

export type JobPost = z.infer<typeof jobPostSchema>;

export const generateMessageSchema = z.object({
  jobTitle: z.string(),
  jobDescription: z.string(),
  skills: z.array(z.string()),
  tone: z.enum(["professional", "friendly", "enthusiastic"]).default("professional"),
  intro: z.string().optional(),
});

export type GenerateMessageInput = z.infer<typeof generateMessageSchema>;

export const freelancerProfileSchema = z.object({
  name: z.string().optional(),
  intro: z.string().default(""),
  skills: z.array(skillSchema).default([]),
  isComplete: z.boolean().default(false),
});

export type FreelancerProfile = z.infer<typeof freelancerProfileSchema>;

export const suggestSkillsSchema = z.object({
  intro: z.string().min(10, "Please write at least 10 characters"),
});

export type SuggestSkillsInput = z.infer<typeof suggestSkillsSchema>;



// Subscription types
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Usage types
export const insertUsageSchema = createInsertSchema(usage).omit({ id: true });
export type InsertUsage = z.infer<typeof insertUsageSchema>;
export type Usage = typeof usage.$inferSelect;

// Plan limits
export const PLAN_LIMITS = {
  free: {
    maxSkills: 10,
    maxJobsPerMonth: 10,
    maxSchedules: 0,
    hasScheduleAccess: false,
  },
  plus: {
    maxSkills: Infinity,
    maxJobsPerMonth: 300,
    maxSchedules: 2,
    hasScheduleAccess: true,
  },
  ultra: {
    maxSkills: Infinity,
    maxJobsPerMonth: Infinity,
    maxSchedules: Infinity,
    hasScheduleAccess: true,
  },
  lifetime: {
    maxSkills: Infinity,
    maxJobsPerMonth: Infinity,
    maxSchedules: Infinity,
    hasScheduleAccess: true,
  },
} as const;

export type PlanType = "free" | "plus" | "ultra" | "lifetime";
export type LegacyPlanType = PlanType | "pro";

export function normalizePlan(plan?: string | null): PlanType {
  switch (plan) {
    case "plus":
    case "ultra":
    case "lifetime":
    case "free":
      return plan;
    case "pro":
      return "plus";
    default:
      return "free";
  }
}

// Schedule types
export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true, lastRun: true, nextRun: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

export const scheduleSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  frequency: z.enum(["hourly", "daily", "weekly"]),
  time: z.string(),
  days: z.array(z.string()).default([]),
  platforms: z.array(z.enum(["reddit", "x", "facebook"])),
  enabled: z.boolean(),
  lastRun: z.date().nullable().optional(),
  nextRun: z.date().nullable().optional(),
});

// Seen jobs types
export const insertSeenJobSchema = createInsertSchema(seenJobs).omit({ id: true, seenAt: true });
export type InsertSeenJob = z.infer<typeof insertSeenJobSchema>;
export type SeenJob = typeof seenJobs.$inferSelect;

// Job cache types
export const insertJobCacheSchema = createInsertSchema(jobCache).omit({ id: true, scrapedAt: true, expiresAt: true });
export type InsertJobCache = z.infer<typeof insertJobCacheSchema>;
export type JobCache = typeof jobCache.$inferSelect;

export const cachedJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  source: z.string(),
  sourceUrl: z.string().url(),
  author: z.string(),
  authorHandle: z.string().optional(),
  postedAt: z.date(),
  budget: z.string().optional(),
  isRemote: z.boolean().default(true),
  tags: z.array(z.string()),
  rawData: z.any().optional(),
  scrapedAt: z.date(),
  expiresAt: z.date(),
});

export type CachedJob = z.infer<typeof cachedJobSchema>;
