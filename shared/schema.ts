import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, jsonb, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
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
  // Two-Factor Authentication
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"), // Encrypted TOTP secret
  backupCodes: jsonb("backup_codes").default([]), // Array of encrypted backup codes
});

// Deleted accounts tracker for abuse prevention
export const deletedAccountsTracker = pgTable("deleted_accounts_tracker", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  deletedAt: timestamp("deleted_at").notNull().default(sql`NOW()`),
  expiresAt: timestamp("expires_at").notNull(), // deletedAt + 72 hours
  reason: text("reason"), // Optional: why user deleted account
}, (table) => ({
  emailIdx: index("deleted_accounts_email_idx").on(table.email),
  expiresAtIdx: index("deleted_accounts_expires_at_idx").on(table.expiresAt),
}));

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
  aiEditsThisMonth: integer("ai_edits_this_month").notNull().default(0),
  importedResumesThisMonth: integer("imported_resumes_this_month").notNull().default(0),
  jobAnalysesThisMonth: integer("job_analyses_this_month").notNull().default(0),
  coverLettersThisMonth: integer("cover_letters_this_month").notNull().default(0),
  atsScansThisMonth: integer("ats_scans_this_month").notNull().default(0),
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
  resumes: many(resumes),
  chatConversations: many(chatConversations),
  coverLetters: many(coverLetters),
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
  linkedinUrl: text("linkedin_url"), // LinkedIn job URL if imported from LinkedIn
  importedFrom: text("imported_from"), // 'linkedin', 'reddit', 'x', etc.
  company: text("company"), // Company name from LinkedIn
  location: text("location"), // Job location
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
  expiresAtIdx: index("job_cache_expires_at_idx").on(table.expiresAt), // Regular index for efficient cleanup queries
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
    maxJobsPerMonth: 5, // Reduced to encourage upgrades
    maxSchedules: 0,
    hasScheduleAccess: false,
    // Resume builder limits
    maxResumes: 1,
    maxAiEditsPerMonth: 3, // Reduced to encourage upgrades
    hasAtsScanner: false,
    hasCoverLetterGenerator: false,
    allowedFormats: ['pdf'] as const,
  },
  plus: {
    maxJobsPerMonth: 100, // Reduced from 300 to encourage ultra
    maxSchedules: 2,
    hasScheduleAccess: true,
    // Resume builder limits
    maxResumes: 5,
    maxAiEditsPerMonth: 50, // Reduced from 100 to encourage ultra
    hasAtsScanner: true,
    hasCoverLetterGenerator: true,
    allowedFormats: ['pdf', 'docx'] as const,
  },
  ultra: {
    maxJobsPerMonth: Infinity,
    maxSchedules: Infinity,
    hasScheduleAccess: true,
    // Resume builder limits
    maxResumes: Infinity,
    maxAiEditsPerMonth: Infinity,
    hasAtsScanner: true,
    hasCoverLetterGenerator: true,
    allowedFormats: ['pdf', 'docx'] as const,
  },
  lifetime: {
    maxJobsPerMonth: Infinity,
    maxSchedules: Infinity,
    hasScheduleAccess: true,
    // Resume builder limits
    maxResumes: Infinity,
    maxAiEditsPerMonth: Infinity,
    hasAtsScanner: true,
    hasCoverLetterGenerator: true,
    allowedFormats: ['pdf', 'docx'] as const,
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

// ============================================
// Resume Builder Tables
// ============================================

// Resume types and schemas (defined before tables to use in type annotations)
export const resumeDataSchema = z.object({
  personalInfo: z.object({
    name: z.string().default(""),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().default(""),
    location: z.string().default(""),
    linkedin: z.string().url().optional().or(z.literal("")),
    website: z.string().url().optional().or(z.literal("")),
  }),
  summary: z.string().default(""),
  experience: z.array(z.object({
    company: z.string(),
    title: z.string(),
    location: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    description: z.array(z.string()),
  })).default([]),
  education: z.array(z.object({
    school: z.string(),
    degree: z.string(),
    field: z.string(),
    graduationDate: z.string(),
    gpa: z.string().optional(),
  })).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z.array(z.object({
    name: z.string(),
    issuer: z.string(),
    date: z.string(),
  })).optional().default([]),
  projects: z.array(z.object({
    name: z.string(),
    description: z.string(),
    technologies: z.array(z.string()),
    url: z.string().url().optional().or(z.literal("")),
  })).optional().default([]),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;

export const resumes = pgTable("resumes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  template: varchar("template").notNull().default("modern"), // 'modern', 'professional', 'creative', 'executive', 'technical'
  resumeData: jsonb("resume_data").notNull().$type<ResumeData>(),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const resumesRelations = relations(resumes, ({ one, many }) => ({
  user: one(users, {
    fields: [resumes.userId],
    references: [users.id],
  }),
  chatConversations: many(chatConversations),
  coverLetters: many(coverLetters),
}));

export const chatConversations = pgTable("chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  resumeId: varchar("resume_id").references(() => resumes.id, { onDelete: "cascade" }),
  messages: jsonb("messages").notNull().default([]),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const chatConversationsRelations = relations(chatConversations, ({ one }) => ({
  user: one(users, {
    fields: [chatConversations.userId],
    references: [users.id],
  }),
  resume: one(resumes, {
    fields: [chatConversations.resumeId],
    references: [resumes.id],
  }),
}));

export const coverLetters = pgTable("cover_letters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  resumeId: varchar("resume_id").references(() => resumes.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  jobDescription: text("job_description"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
});

export const coverLettersRelations = relations(coverLetters, ({ one }) => ({
  user: one(users, {
    fields: [coverLetters.userId],
    references: [users.id],
  }),
  resume: one(resumes, {
    fields: [coverLetters.resumeId],
    references: [resumes.id],
  }),
}));

export const insertResumeSchema = createInsertSchema(resumes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumes.$inferSelect;

export const insertChatConversationSchema = createInsertSchema(chatConversations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type ChatConversation = typeof chatConversations.$inferSelect;

export const insertCoverLetterSchema = createInsertSchema(coverLetters).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCoverLetter = z.infer<typeof insertCoverLetterSchema>;
export type CoverLetter = typeof coverLetters.$inferSelect;

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// Resume Template Types
export const RESUME_TEMPLATES = {
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, minimalist design with a two-column layout. Perfect for tech and creative professionals.',
    features: ['Two-column layout', 'Accent colors', 'Modern typography', 'ATS-friendly']
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Classic single-column format with a corporate feel. Ideal for traditional industries.',
    features: ['Single-column', 'Traditional format', 'Conservative design', 'ATS-optimized']
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    description: 'Bold design with color accents and modern typography. Stand out in creative fields.',
    features: ['Color accents', 'Modern fonts', 'Visual hierarchy', 'Creative layout']
  },
  executive: {
    id: 'executive',
    name: 'Executive',
    description: 'Premium design with bold headers and elegant spacing. Perfect for senior positions.',
    features: ['Bold headers', 'Premium feel', 'Elegant spacing', 'Leadership focused']
  },
  technical: {
    id: 'technical',
    name: 'Technical',
    description: 'Skills-focused compact layout optimized for technical roles and engineering positions.',
    features: ['Skills-first layout', 'Compact design', 'Technical focus', 'Project showcase']
  }
} as const;

export type ResumeTemplateId = keyof typeof RESUME_TEMPLATES;

// ============================================
// Security & Audit Tables
// ============================================

export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // 'login_attempt', 'login_success', 'login_failure', '2fa_enabled', '2fa_disabled', 'password_change', etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  userIdIdx: index("security_events_user_id_idx").on(table.userId),
  createdAtIdx: index("security_events_created_at_idx").on(table.createdAt),
}));

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
  user: one(users, {
    fields: [securityEvents.userId],
    references: [users.id],
  }),
}));

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({ id: true, createdAt: true });
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
export type SecurityEvent = typeof securityEvents.$inferSelect;

// ============================================
// Support & Customer Service Tables
// ============================================

export const supportInteractions = pgTable("support_interactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  aiResponse: text("ai_response"),
  userAcceptedAi: boolean("user_accepted_ai").notNull().default(false),
  zendeskTicketId: text("zendesk_ticket_id"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  userIdIdx: index("support_interactions_user_id_idx").on(table.userId),
}));

export const supportInteractionsRelations = relations(supportInteractions, ({ one }) => ({
  user: one(users, {
    fields: [supportInteractions.userId],
    references: [users.id],
  }),
}));

export const insertSupportInteractionSchema = createInsertSchema(supportInteractions).omit({ id: true, createdAt: true });
export type InsertSupportInteraction = z.infer<typeof insertSupportInteractionSchema>;
export type SupportInteraction = typeof supportInteractions.$inferSelect;

// ============================================
// Enhanced Job Application Tracking
// ============================================

export const jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId: varchar("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("saved"), // 'saved', 'applied', 'interview_scheduled', 'offer_received', 'rejected', 'withdrawn'
  notes: text("notes"),
  followUpDate: timestamp("follow_up_date"),
  appliedAt: timestamp("applied_at"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
}, (table) => ({
  userIdIdx: index("job_applications_user_id_idx").on(table.userId),
  jobIdIdx: index("job_applications_job_id_idx").on(table.jobId),
}));

export const jobApplicationsRelations = relations(jobApplications, ({ one }) => ({
  user: one(users, {
    fields: [jobApplications.userId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [jobApplications.jobId],
    references: [jobs.id],
  }),
}));

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;

export const jobApplicationStatusSchema = z.enum([
  "saved",
  "applied",
  "interview_scheduled",
  "offer_received",
  "rejected",
  "withdrawn"
]);
export type JobApplicationStatus = z.infer<typeof jobApplicationStatusSchema>;
