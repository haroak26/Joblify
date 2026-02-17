import { sql } from "drizzle-orm";
import { pgTable, text, varchar, boolean, jsonb, integer, timestamp, uniqueIndex, index, PgTableWithColumns } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users: PgTableWithColumns<any> = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name"),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull().default(""),
  emailVerified: boolean("email_verified").notNull().default(false),
  // OAuth provider info
  authProvider: text("auth_provider"), // 'google', 'linkedin', 'github', 'apple', or null for email/password
  authProviderId: text("auth_provider_id"), // Provider's unique user ID
  profileSetupComplete: boolean("profile_setup_complete").notNull().default(false),
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
  // Admin features
  isAdmin: boolean("is_admin").notNull().default(false),
  aiAccessBlocked: boolean("ai_access_blocked").notNull().default(false),
  aiAccessBlockedAt: timestamp("ai_access_blocked_at"),
  aiAccessBlockedBy: varchar("ai_access_blocked_by").references(() => users.id),
  aiAccessBlockedReason: text("ai_access_blocked_reason"), // Internal note, not shown to user
  accountBlocked: boolean("account_blocked").notNull().default(false),
  accountBlockedAt: timestamp("account_blocked_at"),
  accountBlockedBy: varchar("account_blocked_by").references(() => users.id),
  accountBlockedReason: text("account_blocked_reason"), // Internal note, not shown to user
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIpHash: text("last_login_ip_hash"),
});

// Session table for express-session with connect-pg-simple
export const session = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, (table) => ({
  expireIdx: index("IDX_session_expire").on(table.expire),
}));

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
  renewalReminderSent: boolean("renewal_reminder_sent").notNull().default(false),
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

// Extended InsertUser type for user creation with optional fields
export type ExtendedInsertUser = {
  id?: string;
  username: string;
  email: string;
  password: string;
  name?: string;
  verificationToken?: string;
  authProvider?: string;
  authProviderId?: string;
  emailVerified?: boolean;
  profileSetupComplete?: boolean;
};

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
    email: z.string().default(""),
    phone: z.string().default(""),
    location: z.string().default(""),
    linkedin: z.string().default(""),
    website: z.string().default(""),
  }).passthrough(),
  summary: z.string().default(""),
  experience: z.array(z.object({
    company: z.string().default(""),
    title: z.string().default(""),
    location: z.string().default(""),
    startDate: z.string().default(""),
    endDate: z.string().nullable().default(null),
    description: z.array(z.string()).default([]),
  }).passthrough()).default([]),
  education: z.array(z.object({
    school: z.string().default(""),
    degree: z.string().default(""),
    field: z.string().default(""),
    graduationDate: z.string().default(""),
    gpa: z.string().optional(),
  }).passthrough()).default([]),
  skills: z.array(z.string()).default([]),
  certifications: z.array(z.object({
    name: z.string().default(""),
    issuer: z.string().default(""),
    date: z.string().default(""),
  }).passthrough()).optional().default([]),
  projects: z.array(z.object({
    name: z.string().default(""),
    description: z.string().default(""),
    technologies: z.array(z.string()).default([]),
    url: z.string().optional().default(""),
  }).passthrough()).optional().default([]),
  awards: z.array(z.object({
    title: z.string().default(""),
    issuer: z.string().default(""),
    date: z.string().default(""),
    description: z.string().optional(),
  }).passthrough()).optional().default([]),
  leadership: z.array(z.object({
    title: z.string().default(""),
    organization: z.string().default(""),
    startDate: z.string().default(""),
    endDate: z.string().nullable().default(null),
    description: z.string().default(""),
  }).passthrough()).optional().default([]),
  research: z.array(z.object({
    title: z.string().default(""),
    institution: z.string().default(""),
    startDate: z.string().default(""),
    endDate: z.string().nullable().default(null),
    description: z.string().default(""),
    url: z.string().optional().default(""),
  }).passthrough()).optional().default([]),
  publications: z.array(z.object({
    title: z.string().default(""),
    authors: z.string().default(""),
    journal: z.string().default(""),
    date: z.string().default(""),
    url: z.string().optional().default(""),
  }).passthrough()).optional().default([]),
}).passthrough();

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
  aiBuilderComponents: jsonb("ai_builder_components").$type<string[]>(), // Components selected in AI Builder
  aiBuilderCompleted: boolean("ai_builder_completed").default(false), // Whether AI Builder session was completed
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
}, (table) => ({
  userIdIdx: index("resumes_user_id_idx").on(table.userId),
  createdAtIdx: index("resumes_created_at_idx").on(table.createdAt),
}));

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
  mode: varchar("mode").notNull().default("builder"), // "builder" or "enhancement"
  messages: jsonb("messages").notNull().default([]),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
}, (table) => ({
  userIdIdx: index("chat_conversations_user_id_idx").on(table.userId),
  resumeIdIdx: index("chat_conversations_resume_id_idx").on(table.resumeId),
}));

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
  writingStyleAnswers: jsonb("writing_style_answers").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`NOW()`),
}, (table) => ({
  userIdIdx: index("cover_letters_user_id_idx").on(table.userId),
  resumeIdIdx: index("cover_letters_resume_id_idx").on(table.resumeId),
  createdAtIdx: index("cover_letters_created_at_idx").on(table.createdAt),
}));

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
  codeId: varchar("code_id").references(() => redeemableCodes.id), // Optional - null for admin-awarded perks that bypass the code system
  awardedBy: varchar("awarded_by").references(() => users.id), // Admin who awarded this perk directly
  awardedAt: timestamp("awarded_at").notNull().default(sql`NOW()`), // When awarded by admin
  redeemedAt: timestamp("redeemed_at"), // When user actually used/redeemed the perk
  expiresAt: timestamp("expires_at"), // For temporary perks
  isActive: boolean("is_active").notNull().default(true),
  status: text("status").notNull().default('pending'), // 'pending', 'redeemed', 'expired'
  remainingValue: integer("remaining_value"), // For credits that can be partially used
}, (table) => ({
  userIdIdx: index("user_perks_user_id_idx").on(table.userId),
  isActiveIdx: index("user_perks_is_active_idx").on(table.isActive),
  statusIdx: index("user_perks_status_idx").on(table.status),
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
  awardedByAdmin: one(users, {
    fields: [userPerks.awardedBy],
    references: [users.id],
  }),
}));

// Type schemas for Redeemable Code system
export const insertPerkSchema = createInsertSchema(perks).omit({ id: true, createdAt: true });
export type InsertPerk = z.infer<typeof insertPerkSchema>;
export type Perk = typeof perks.$inferSelect;

export const insertRedeemableCodeSchema = createInsertSchema(redeemableCodes).omit({ id: true, createdAt: true });
export type InsertRedeemableCode = z.infer<typeof insertRedeemableCodeSchema>;
export type RedeemableCode = typeof redeemableCodes.$inferSelect;

export const insertUserPerkSchema = createInsertSchema(userPerks).omit({ id: true, awardedAt: true });
export type InsertUserPerk = z.infer<typeof insertUserPerkSchema>;
export type UserPerk = typeof userPerks.$inferSelect;

// ============================================
// Mailing Lists System
// ============================================

export const mailingLists = pgTable("mailing_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  defaultSubscribed: boolean("default_subscribed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
});

export const userMailingLists = pgTable("user_mailing_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listId: varchar("list_id").notNull().references(() => mailingLists.id, { onDelete: "cascade" }),
  subscribed: boolean("subscribed").notNull().default(true),
  subscribedAt: timestamp("subscribed_at").notNull().default(sql`NOW()`),
  unsubscribedAt: timestamp("unsubscribed_at"),
}, (table) => ({
  userIdIdx: index("user_mailing_lists_user_id_idx").on(table.userId),
  listIdIdx: index("user_mailing_lists_list_id_idx").on(table.listId),
  subscribedIdx: index("user_mailing_lists_subscribed_idx").on(table.subscribed),
  uniqueUserList: uniqueIndex("user_mailing_lists_user_id_list_id_key").on(table.userId, table.listId),
}));

export const mailingListsRelations = relations(mailingLists, ({ many }) => ({
  subscriptions: many(userMailingLists),
}));

export const userMailingListsRelations = relations(userMailingLists, ({ one }) => ({
  user: one(users, {
    fields: [userMailingLists.userId],
    references: [users.id],
  }),
  list: one(mailingLists, {
    fields: [userMailingLists.listId],
    references: [mailingLists.id],
  }),
}));

export type MailingList = typeof mailingLists.$inferSelect;
export type UserMailingList = typeof userMailingLists.$inferSelect;

// ============================================
// AI Usage Logs (Admin Dashboard)
// ============================================

export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  featureName: text("feature_name").notNull(),
  tokensUsed: integer("tokens_used"),
  success: boolean("success").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  userIdIdx: index("ai_usage_logs_user_id_idx").on(table.userId),
  featureNameIdx: index("ai_usage_logs_feature_name_idx").on(table.featureName),
  createdAtIdx: index("ai_usage_logs_created_at_idx").on(table.createdAt),
}));

export const aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
  user: one(users, {
    fields: [aiUsageLogs.userId],
    references: [users.id],
  }),
}));

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({ id: true, createdAt: true });
export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;

// ============================================
// User Activity Logs (Admin Dashboard)
// ============================================

export const userActivityLogs = pgTable("user_activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(),
  ipAddressHash: text("ip_address_hash"),
  userAgent: text("user_agent"),
  deviceInfo: text("device_info"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  userIdIdx: index("user_activity_logs_user_id_idx").on(table.userId),
  activityTypeIdx: index("user_activity_logs_activity_type_idx").on(table.activityType),
  createdAtIdx: index("user_activity_logs_created_at_idx").on(table.createdAt),
}));

export const userActivityLogsRelations = relations(userActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [userActivityLogs.userId],
    references: [users.id],
  }),
}));

export type UserActivityLog = typeof userActivityLogs.$inferSelect;
const insertUserActivityLogSchema = createInsertSchema(userActivityLogs).omit({ id: true, createdAt: true });
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;

// ============================================
// Trusted Devices (2FA)
// ============================================

export const trustedDevices = pgTable("trusted_devices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deviceFingerprint: text("device_fingerprint").notNull(),
  deviceName: text("device_name"),
  userAgent: text("user_agent"),
  ipAddressHash: text("ip_address_hash"),
  trustedAt: timestamp("trusted_at").notNull().default(sql`NOW()`),
  lastUsedAt: timestamp("last_used_at").notNull().default(sql`NOW()`),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => ({
  userIdIdx: index("trusted_devices_user_id_idx").on(table.userId),
  expiresAtIdx: index("trusted_devices_expires_at_idx").on(table.expiresAt),
  uniqueUserDevice: uniqueIndex("trusted_devices_user_id_device_fingerprint_key").on(table.userId, table.deviceFingerprint),
}));

export const trustedDevicesRelations = relations(trustedDevices, ({ one }) => ({
  user: one(users, {
    fields: [trustedDevices.userId],
    references: [users.id],
  }),
}));

export type TrustedDevice = typeof trustedDevices.$inferSelect;
const insertTrustedDeviceSchema = createInsertSchema(trustedDevices).omit({ id: true, trustedAt: true, lastUsedAt: true });
export type InsertTrustedDevice = z.infer<typeof insertTrustedDeviceSchema>;

// ============================================
// Verification Codes (2FA)
// ============================================

export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  codeType: text("code_type").notNull(), // 'email_2fa', 'system_2fa', etc.
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  userIdIdx: index("verification_codes_user_id_idx").on(table.userId),
  codeIdx: index("verification_codes_code_idx").on(table.code),
  expiresAtIdx: index("verification_codes_expires_at_idx").on(table.expiresAt),
}));

export const verificationCodesRelations = relations(verificationCodes, ({ one }) => ({
  user: one(users, {
    fields: [verificationCodes.userId],
    references: [users.id],
  }),
}));

export type VerificationCode = typeof verificationCodes.$inferSelect;
const insertVerificationCodeSchema = createInsertSchema(verificationCodes).omit({ id: true, createdAt: true });
export type InsertVerificationCode = z.infer<typeof insertVerificationCodeSchema>;

// ============================================
// System Admin Logs (Security Audit)
// ============================================

export const systemAdminLogs = pgTable("system_admin_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminUserId: varchar("admin_user_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  targetUserId: varchar("target_user_id").references(() => users.id, { onDelete: "set null" }),
  details: jsonb("details"),
  ipAddressHash: text("ip_address_hash"),
  createdAt: timestamp("created_at").notNull().default(sql`NOW()`),
}, (table) => ({
  adminUserIdIdx: index("system_admin_logs_admin_user_id_idx").on(table.adminUserId),
  targetUserIdIdx: index("system_admin_logs_target_user_id_idx").on(table.targetUserId),
  createdAtIdx: index("system_admin_logs_created_at_idx").on(table.createdAt),
  actionIdx: index("system_admin_logs_action_idx").on(table.action),
}));

export const systemAdminLogsRelations = relations(systemAdminLogs, ({ one }) => ({
  adminUser: one(users, {
    fields: [systemAdminLogs.adminUserId],
    references: [users.id],
  }),
  targetUser: one(users, {
    fields: [systemAdminLogs.targetUserId],
    references: [users.id],
  }),
}));

export type SystemAdminLog = typeof systemAdminLogs.$inferSelect;
const insertSystemAdminLogSchema = createInsertSchema(systemAdminLogs).omit({ id: true, createdAt: true });
export type InsertSystemAdminLog = z.infer<typeof insertSystemAdminLogSchema>;
