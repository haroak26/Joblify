import { processPendingEmails } from "./email-engagement";

/**
 * Email scheduler that runs periodically to send pending emails
 * This should be called by a cron job or scheduled task
 */
export async function runEmailScheduler(): Promise<void> {
  console.log("[Email Scheduler] Starting email processing...");
  
  try {
    await processPendingEmails();
    console.log("[Email Scheduler] Email processing completed successfully");
  } catch (error) {
    console.error("[Email Scheduler] Error processing emails:", error);
  }
}

/**
 * Start the email scheduler with a specified interval
 * @param intervalMinutes - How often to run the scheduler (in minutes)
 */
export function startEmailScheduler(intervalMinutes: number = 5): NodeJS.Timeout {
  console.log(`[Email Scheduler] Starting with ${intervalMinutes} minute interval`);
  
  // Run immediately
  runEmailScheduler();
  
  // Then run on interval
  return setInterval(() => {
    runEmailScheduler();
  }, intervalMinutes * 60 * 1000);
}

/**
 * Stop the email scheduler
 */
export function stopEmailScheduler(timer: NodeJS.Timeout): void {
  clearInterval(timer);
  console.log("[Email Scheduler] Stopped");
}
