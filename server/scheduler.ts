import { storage } from "./storage";
import { sendScheduleJobsEmail } from "./brevo";
import { cleanupExpiredJobs } from "./jobCacheService";

async function runSchedule(scheduleId: string, userId: string, name: string) {
  const profile = await storage.getProfile(userId);
  if (profile.skills.length === 0 && profile.intro.trim().length === 0) {
    await storage.updateSchedule(userId, scheduleId, { lastRun: new Date() });
    return;
  }

  // Since scraping is removed, just update the last run time
  await storage.updateSchedule(userId, scheduleId, { lastRun: new Date() });
}

// Track when we last ran the cleanup
let lastCleanupTime = Date.now();
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function startScheduleRunner(intervalMs = 60_000) {
  const run = async () => {
    try {
      const dueSchedules = await storage.getDueSchedules(new Date());
      for (const schedule of dueSchedules) {
        await runSchedule(schedule.id, schedule.userId, schedule.name);
      }
      
      // Run daily cleanup of expired cached jobs
      const now = Date.now();
      if (now - lastCleanupTime >= CLEANUP_INTERVAL_MS) {
        console.log('[Scheduler] Running daily job cache cleanup');
        await cleanupExpiredJobs();
        lastCleanupTime = now;
      }
    } catch (error) {
      console.error("Schedule runner error:", error);
    }
  };

  run();
  setInterval(run, intervalMs);
}
