import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
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

export const messageTemplateSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  message: z.string(),
  tone: z.enum(["professional", "friendly", "enthusiastic"]),
});

export type MessageTemplate = z.infer<typeof messageTemplateSchema>;

export const generateMessageSchema = z.object({
  jobId: z.string(),
  jobTitle: z.string(),
  jobDescription: z.string(),
  skills: z.array(z.string()),
  tone: z.enum(["professional", "friendly", "enthusiastic"]).default("professional"),
});

export type GenerateMessageInput = z.infer<typeof generateMessageSchema>;

export const freelancerProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  title: z.string().min(1, "Professional title is required"),
  bio: z.string().optional(),
  skills: z.array(z.string()),
  hourlyRate: z.number().optional(),
  availability: z.enum(["available", "busy", "not-available"]).default("available"),
});

export type FreelancerProfile = z.infer<typeof freelancerProfileSchema>;
