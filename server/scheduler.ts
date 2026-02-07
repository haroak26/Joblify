import { storage } from "./storage";

// Track when we last ran the cleanup
let lastCleanupTime = Date.now();
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function startScheduleRunner(intervalMs = 60_000) {
  const run = async () => {
    try {
      // Run daily cleanup of expired deleted accounts
      const now = Date.now();
      if (now - lastCleanupTime >= CLEANUP_INTERVAL_MS) {
        console.log('[Scheduler] Running daily cleanup tasks');
        
        // Cleanup expired deleted accounts (72 hours after deletion)
        const deletedCount = await storage.cleanupExpiredDeletedAccounts();
        if (deletedCount > 0) {
          console.log(`[Scheduler] Cleaned up ${deletedCount} expired deleted account records`);
        }
        
        lastCleanupTime = now;
      }
    } catch (error) {
      console.error("Schedule runner error:", error);
    }
  };

  run();
  setInterval(run, intervalMs);
}
