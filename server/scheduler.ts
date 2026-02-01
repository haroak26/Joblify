import { storage } from "./storage";
import { sendScheduleJobsEmail } from "./brevo";

async function runSchedule(scheduleId: string, userId: string, name: string) {
  const profile = await storage.getProfile(userId);
  if (profile.skills.length === 0 && profile.intro.trim().length === 0) {
    await storage.updateSchedule(userId, scheduleId, { lastRun: new Date() });
    return;
  }

  // Since scraping is removed, just update the last run time
  await storage.updateSchedule(userId, scheduleId, { lastRun: new Date() });
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
