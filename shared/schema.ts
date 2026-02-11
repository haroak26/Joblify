import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, jsonb, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  // User Preferences
  emailNotifications: boolean("email_notifications").notNull().default(true),
  marketingEmails: boolean("marketing_emails").notNull().default(true),
  weeklySummaryEmails: boolean("weekly_summary_emails").notNull().default(true),
  inAppNotifications: boolean("in_app_notifications").notNull().default(true),
  // Onboarding tracking
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  onboardingReminderSent: boolean("onboarding_reminder_sent").notNull().default(false),
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
  subscription: one(subscriptions),
  usage: one(usage),
  resumes: many(resumes),
  chatConversations: many(chatConversations),
  coverLetters: many(coverLetters),
  featureUsage: many(userFeatureUsage),
  scheduledEmails: many(scheduledEmails),
  interviewSessions: many(interviewSessions),
  interviewResponses: many(interviewResponses),
  userPerks: many(userPerks),
}));

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  intro: text("intro").notNull().default(""),
  skills: jsonb("skills").notNull().default([]),
  isComplete: boolean("is_complete").notNull().default(false),
});

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
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

// Subscription types
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true });
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Usage types
export const insertUsageSchema = createInsertSchema(usage).omit({ id: true });
export type InsertUsage = z.infer<typeof insertUsageSchema>;
export type Usage = typeof usage.$inferSelect;

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
    linkedin: z.string().default(""),
    website: z.string().default(""),
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
  awards: z.array(z.object({
    title: z.string(),
    issuer: z.string(),
    date: z.string(),
    description: z.string().optional(),
  })).optional().default([]),
  leadership: z.array(z.object({
    title: z.string(),
    organization: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    description: z.string(),
  })).optional().default([]),
  research: z.array(z.object({
    title: z.string(),
    institution: z.string(),
    startDate: z.string(),
    endDate: z.string().nullable(),
    description: z.string(),
    url: z.string().url().optional().or(z.literal("")),
  })).optional().default([]),
  publications: z.array(z.object({
    title: z.string(),
    authors: z.string(),
    journal: z.string(),
    date: z.string(),
    url: z.string().url().optional().or(z.literal("")),
  })).optional().default([]),
});

export type ResumeData = z.infer<typeof resumeDataSchema>;

// Helper function to create empty resume data
export const createEmptyResumeData = (): ResumeData => ({
  personalInfo: {
    name: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    website: "",
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  awards: [],
  leadership: [],
  research: [],
  publications: [],
});


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
// Feature Tracking & Email Engagement System
// ============================================

// Track which features users have tried
export const userFeatureUsage = pgTable("user_feature_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Valid feature names: 'resume_builder', 'ats_scanner', 'cover_letter', 'job_match', 'tailor'
  // Note: Consider adding CHECK constraint in future migration for stricter validation
  featureName: text("feature_name").notNull(),
  firstUsedAt: timestamp("first_used_at").notNull().default(sql`NOW()`),
  lastUsedAt: timestamp("last_used_at").notNull().default(sql`NOW()`),
  usageCount: integer("usage_count").notNull().default(1),
}, (table) => ({
  userIdIdx: index("user_feature_usage_user_id_idx").on(table.userId),
  featureNameIdx: index("user_feature_usage_feature_name_idx").on(table.featureName),
  uniqueUserFeature: uniqueIndex("unique_user_feature").on(table.userId, table.featureName),
}));

// Track scheduled emails for progressive engagement
export const scheduledEmails = pgTable("scheduled_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Valid email types: 'welcome', 'feature_engagement_24h', 'feature_engagement_48h', 'feature_engagement_72h'
  // Note: Consider adding CHECK constraint in future migration for stricter validation
  emailType: text("email_type").notNull(),
  featureName: text("feature_name"), // For feature engagement emails
  scheduledFor: timestamp("scheduled_for").notNull(),
  sentAt: timestamp("sent_at"),
  // Valid status values: 'pending', 'sent', 'failed', 'cancelled'
  // Note: Consider adding CHECK constraint in future migration for stricter validation
  status: text("status").notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  userIdIdx: index("scheduled_emails_user_id_idx").on(table.userId),
  statusIdx: index("scheduled_emails_status_idx").on(table.status),
  scheduledForIdx: index("scheduled_emails_scheduled_for_idx").on(table.scheduledFor),
}));

export const userFeatureUsageRelations = relations(userFeatureUsage, ({ one }) => ({
  user: one(users, {
    fields: [userFeatureUsage.userId],
    references: [users.id],
  }),
}));

export const scheduledEmailsRelations = relations(scheduledEmails, ({ one }) => ({
  user: one(users, {
    fields: [scheduledEmails.userId],
    references: [users.id],
  }),
}));

export const insertUserFeatureUsageSchema = createInsertSchema(userFeatureUsage).omit({ id: true, firstUsedAt: true, lastUsedAt: true });
export type InsertUserFeatureUsage = z.infer<typeof insertUserFeatureUsageSchema>;
export type UserFeatureUsage = typeof userFeatureUsage.$inferSelect;

export const insertScheduledEmailSchema = createInsertSchema(scheduledEmails).omit({ id: true, createdAt: true });
export type InsertScheduledEmail = z.infer<typeof insertScheduledEmailSchema>;
export type ScheduledEmail = typeof scheduledEmails.$inferSelect;

// ============================================
// AI Interviewer Tables
// ============================================

export const interviewSessions = pgTable("interview_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobDescription: text("job_description").notNull(),
  skills: jsonb("skills").notNull().default([]).$type<string[]>(),
  customQuestions: text("custom_questions"), // Optional custom questions provided by user
  companyType: text("company_type"), // e.g., "startup", "enterprise", "agency"
  industry: text("industry"), // e.g., "tech", "finance", "healthcare"
  mode: text("mode").notNull().default("overall"), // 'overall' | 'question-by-question'
  status: text("status").notNull().default("in_progress"), // 'in_progress' | 'completed'
  overallFeedback: text("overall_feedback"), // AI feedback for the entire interview
  overallScore: integer("overall_score"), // 0-100 score
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  userIdIdx: index("interview_sessions_user_id_idx").on(table.userId),
  statusIdx: index("interview_sessions_status_idx").on(table.status),
}));

export const interviewQuestions = pgTable("interview_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => interviewSessions.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(), // 'behavioral', 'technical', 'situational', 'custom'
  order: integer("order").notNull(), // Question order in the interview
  difficulty: text("difficulty"), // 'easy', 'medium', 'hard'
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  sessionIdIdx: index("interview_questions_session_id_idx").on(table.sessionId),
}));

export const interviewResponses = pgTable("interview_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  questionId: varchar("question_id").notNull().references(() => interviewQuestions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  answerText: text("answer_text").notNull(),
  feedback: text("feedback"), // AI feedback for this specific answer (Pro/Ultra only)
  score: integer("score"), // 0-100 score for this answer (Pro/Ultra only)
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  questionIdIdx: index("interview_responses_question_id_idx").on(table.questionId),
  userIdIdx: index("interview_responses_user_id_idx").on(table.userId),
}));

// Relations for Interview tables
export const interviewSessionsRelations = relations(interviewSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [interviewSessions.userId],
    references: [users.id],
  }),
  questions: many(interviewQuestions),
}));

export const interviewQuestionsRelations = relations(interviewQuestions, ({ one, many }) => ({
  session: one(interviewSessions, {
    fields: [interviewQuestions.sessionId],
    references: [interviewSessions.id],
  }),
  responses: many(interviewResponses),
}));

export const interviewResponsesRelations = relations(interviewResponses, ({ one }) => ({
  question: one(interviewQuestions, {
    fields: [interviewResponses.questionId],
    references: [interviewQuestions.id],
  }),
  user: one(users, {
    fields: [interviewResponses.userId],
    references: [users.id],
  }),
}));

// Type schemas for Interview system
export const insertInterviewSessionSchema = createInsertSchema(interviewSessions).omit({ id: true, createdAt: true, completedAt: true });
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InterviewSession = typeof interviewSessions.$inferSelect;

export const insertInterviewQuestionSchema = createInsertSchema(interviewQuestions).omit({ id: true, createdAt: true });
export type InsertInterviewQuestion = z.infer<typeof insertInterviewQuestionSchema>;
export type InterviewQuestion = typeof interviewQuestions.$inferSelect;

export const insertInterviewResponseSchema = createInsertSchema(interviewResponses).omit({ id: true, createdAt: true });
export type InsertInterviewResponse = z.infer<typeof insertInterviewResponseSchema>;
export type InterviewResponse = typeof interviewResponses.$inferSelect;

// ============================================
// Redeemable Code System Tables
// ============================================

export const perks = pgTable("perks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // e.g., "Free Practice Interview", "1 Month Pro Access"
  perkType: text("perk_type").notNull(), // 'interview_credit', 'ats_scan_credit', 'temp_pro_access', 'temp_ultra_access'
  value: integer("value"), // Numeric value (e.g., number of credits, days of access)
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const redeemableCodes = pgTable("redeemable_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  perkId: varchar("perk_id").notNull().references(() => perks.id),
  isActive: boolean("is_active").notNull().default(true),
  maxRedemptions: integer("max_redemptions").default(1), // null = unlimited
  currentRedemptions: integer("current_redemptions").notNull().default(0),
  expiresAt: timestamp("expires_at"), // Optional expiration date
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  createdBy: varchar("created_by"), // Admin user ID who created the code
}, (table) => ({
  codeIdx: uniqueIndex("redeemable_codes_code_idx").on(table.code),
}));

export const userPerks = pgTable("user_perks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  perkId: varchar("perk_id").notNull().references(() => perks.id),
  codeId: varchar("code_id").notNull().references(() => redeemableCodes.id),
  redeemedAt: timestamp("redeemed_at").notNull().default(sql`NOW()`),
  expiresAt: timestamp("expires_at"), // For temporary perks
  isActive: boolean("is_active").notNull().default(true),
  remainingValue: integer("remaining_value"), // For credits that can be partially used
}, (table) => ({
  userIdIdx: index("user_perks_user_id_idx").on(table.userId),
  isActiveIdx: index("user_perks_is_active_idx").on(table.isActive),
}));

// Relations for Redeemable Code system
export const perksRelations = relations(perks, ({ many }) => ({
  codes: many(redeemableCodes),
  userPerks: many(userPerks),
}));

export const redeemableCodesRelations = relations(redeemableCodes, ({ one, many }) => ({
  perk: one(perks, {
    fields: [redeemableCodes.perkId],
    references: [perks.id],
  }),
  userPerks: many(userPerks),
}));

export const userPerksRelations = relations(userPerks, ({ one }) => ({
  user: one(users, {
    fields: [userPerks.userId],
    references: [users.id],
  }),
  perk: one(perks, {
    fields: [userPerks.perkId],
    references: [perks.id],
  }),
  code: one(redeemableCodes, {
    fields: [userPerks.codeId],
    references: [redeemableCodes.id],
  }),
}));

// Type schemas for Redeemable Code system
export const insertPerkSchema = createInsertSchema(perks).omit({ id: true, createdAt: true });
export type InsertPerk = z.infer<typeof insertPerkSchema>;
export type Perk = typeof perks.$inferSelect;

export const insertRedeemableCodeSchema = createInsertSchema(redeemableCodes).omit({ id: true, createdAt: true });
export type InsertRedeemableCode = z.infer<typeof insertRedeemableCodeSchema>;
export type RedeemableCode = typeof redeemableCodes.$inferSelect;

export const insertUserPerkSchema = createInsertSchema(userPerks).omit({ id: true, redeemedAt: true });
export type InsertUserPerk = z.infer<typeof insertUserPerkSchema>;
export type UserPerk = typeof userPerks.$inferSelect;
