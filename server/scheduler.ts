import { storage } from "./storage";
import { sendScheduleJobsEmail } from "./brevo";

async function runSchedule(scheduleId: string, userId: string, name: string) {
  const scrapeCheck = await storage.canScrapeJobs(userId, 1);
  if (!scrapeCheck.allowed) {
    await storage.updateSchedule(userId, scheduleId, { lastRun: new Date() });
    return;
  }

  const profile = await storage.getProfile(userId);
  if (profile.skills.length === 0 && profile.intro.trim().length === 0) {
    await storage.updateSchedule(userId, scheduleId, { lastRun: new Date() });
    return;
  }

  const jobs = await storage.scrapeAndGenerateJobs(userId, profile.skills, profile.intro);
  const seenUrls = await storage.getSeenJobUrls(userId);
  const newJobs = jobs.filter(job => !seenUrls.includes(job.sourceUrl));

  const remaining = scrapeCheck.remaining === Infinity ? newJobs.length : scrapeCheck.remaining;
  const limitedJobs = newJobs.slice(0, Math.max(0, remaining));

  for (const job of limitedJobs) {
    await storage.markJobAsSeen(userId, job.sourceUrl);
  }

  const actuallyAddedCount = await storage.addJobs(userId, limitedJobs);
  if (actuallyAddedCount > 0) {
    await storage.incrementJobsScraped(userId, actuallyAddedCount);
  }

  await storage.updateSchedule(userId, scheduleId, { lastRun: new Date() });

  if (actuallyAddedCount > 0) {
    const user = await storage.getUser(userId);
    if (user?.email) {
      // Get the actually added jobs
      const allJobs = await storage.getJobs(userId);
      const recentJobs = allJobs.slice(0, actuallyAddedCount);
      await sendScheduleJobsEmail(user.email, name, recentJobs);
    }
  }
}

export function startScheduleRunner(intervalMs = 60_000) {
  const run = async () => {
    try {
      const dueSchedules = await storage.getDueSchedules(new Date());
      for (const schedule of dueSchedules) {
        await runSchedule(schedule.id, schedule.userId, schedule.name);
      }
    } catch (error) {
      console.error("Schedule runner error:", error);
    }
  };

  run();
  setInterval(run, intervalMs);
}
