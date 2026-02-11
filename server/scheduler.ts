import { storage } from "./storage";
import { sendOnboardingReminderEmail } from "./brevo";
import { db } from "./db";
import { users, resumes, usage } from "@shared/schema";
import { eq, and, lt, sql } from "drizzle-orm";

// Track when we last ran the cleanup
let lastCleanupTime = Date.now();
let lastReminderCheckTime = Date.now();
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const REMINDER_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

export function startScheduleRunner(intervalMs = 60_000) {
  const run = async () => {
    try {
      const now = Date.now();
      
      // Run daily cleanup of expired deleted accounts
      if (now - lastCleanupTime >= CLEANUP_INTERVAL_MS) {
        console.log('[Scheduler] Running daily cleanup tasks');
        
        // Cleanup expired deleted accounts (72 hours after deletion)
        const deletedCount = await storage.cleanupExpiredDeletedAccounts();
        if (deletedCount > 0) {
          console.log(`[Scheduler] Cleaned up ${deletedCount} expired deleted account records`);
        }
        
        lastCleanupTime = now;
      }

      // Check for users needing onboarding reminders (every 12 hours)
      if (now - lastReminderCheckTime >= REMINDER_CHECK_INTERVAL_MS) {
        console.log('[Scheduler] Checking for users needing onboarding reminders');
        
        try {
          // Find users who:
          // 1. Created account more than 2 days ago
          // 2. Haven't received onboarding reminder yet
          // 3. Have marketing emails enabled
          const twoDaysAgo = new Date(now - TWO_DAYS_MS);
          
          const usersNeedingReminder = await db
            .select({
              id: users.id,
              email: users.email,
              name: users.name,
              username: users.username,
              createdAt: users.createdAt,
            })
            .from(users)
            .where(
              and(
                lt(users.createdAt, twoDaysAgo),
                eq(users.onboardingReminderSent, false),
                eq(users.marketingEmails, true)
              )
            )
            .limit(50); // Process 50 users at a time to avoid overwhelming the email service

          for (const user of usersNeedingReminder) {
            try {
              // Check if user has completed onboarding tasks
              const userResumes = await db
                .select()
                .from(resumes)
                .where(eq(resumes.userId, user.id))
                .limit(1);
              
              const userUsage = await storage.getUsage(user.id);
              
              const hasCreatedResume = userResumes.length > 0;
              const hasCreatedCoverLetter = userUsage.coverLettersThisMonth > 0;
              const hasGottenATSScore = userUsage.atsScansThisMonth > 0;
              
              // Only send reminder if user hasn't completed any of the tasks
              if (!hasCreatedResume && !hasCreatedCoverLetter && !hasGottenATSScore) {
                const name = user.name || user.username;
                const emailSent = await sendOnboardingReminderEmail(user.email, name);
                
                if (emailSent) {
                  // Mark reminder as sent
                  await db
                    .update(users)
                    .set({ onboardingReminderSent: true })
                    .where(eq(users.id, user.id));
                  
                  console.log(`[Scheduler] Sent onboarding reminder to ${user.email}`);
                } else {
                  console.error(`[Scheduler] Failed to send onboarding reminder to ${user.email}`);
                }
              } else {
                // User has completed at least one task, mark reminder as sent to not bother them
                await db
                  .update(users)
                  .set({ onboardingReminderSent: true })
                  .where(eq(users.id, user.id));
              }
            } catch (userError) {
              console.error(`[Scheduler] Error processing user ${user.email}:`, userError);
              // Continue with next user
            }
          }
          
          if (usersNeedingReminder.length > 0) {
            console.log(`[Scheduler] Processed ${usersNeedingReminder.length} users for onboarding reminders`);
          }
        } catch (reminderError) {
          console.error('[Scheduler] Error in onboarding reminder check:', reminderError);
        }
        
        lastReminderCheckTime = now;
      }
    } catch (error) {
      console.error("Schedule runner error:", error);
    }
  };

  run();
  setInterval(run, intervalMs);
}
