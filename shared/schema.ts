import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: text("verification_token"),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  plan: text("plan").notNull().default("free"), // 'free' or 'plus'
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
}));

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  intro: text("intro").notNull().default(""),
  skills: jsonb("skills").notNull().default([]),
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
});

export const jobsRelations = relations(jobs, ({ one }) => ({
  user: one(users, {
    fields: [jobs.userId],
    references: [users.id],
  }),
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
  source: z.enum(["reddit", "x", "facebook"]),
  sourceUrl: z.string().url(),
  author: z.string(),
  authorHandle: z.string().optional(),
  postedAt: z.string(),
  matchedSkills: z.array(z.string()),
  budget: z.string().optional(),
  isRemote: z.boolean().default(true),
  saved: z.boolean().default(false),
  applied: z.boolean().default(false),
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
    maxSkills: 5,
    maxJobsPerMonth: 5,
    hasScheduleAccess: false,
  },
  plus: {
    maxSkills: Infinity,
    maxJobsPerMonth: 300,
    hasScheduleAccess: true,
  },
} as const;

export type PlanType = "free" | "plus";
