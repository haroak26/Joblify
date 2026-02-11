import { db } from "./db";
import { users, userFeatureUsage, scheduledEmails } from "@shared/schema";
import { eq, and, isNull, lte, ne } from "drizzle-orm";
import { sendWelcomeEmail } from "./email";

// Feature names as constants
export const FEATURES = {
  RESUME_BUILDER: "resume_builder",
  ATS_SCANNER: "ats_scanner",
  COVER_LETTER: "cover_letter",
  JOB_MATCH: "job_match",
  TAILOR: "tailor",
} as const;

// Email types as constants
export const EMAIL_TYPES = {
  WELCOME: "welcome",
  FEATURE_ENGAGEMENT_24H: "feature_engagement_24h",
  FEATURE_ENGAGEMENT_48H: "feature_engagement_48h",
  FEATURE_ENGAGEMENT_72H: "feature_engagement_72h",
} as const;

/**
 * Track that a user has used a feature
 */
export async function trackFeatureUsage(userId: string, featureName: string): Promise<void> {
  try {
    // Check if this feature has already been tracked for this user
    const existing = await db
      .select()
      .from(userFeatureUsage)
      .where(and(
        eq(userFeatureUsage.userId, userId),
        eq(userFeatureUsage.featureName, featureName)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing record
      await db
        .update(userFeatureUsage)
        .set({
          lastUsedAt: new Date(),
          usageCount: existing[0].usageCount + 1,
        })
        .where(eq(userFeatureUsage.id, existing[0].id));
    } else {
      // Create new record
      await db.insert(userFeatureUsage).values({
        userId,
        featureName,
        usageCount: 1,
      });
    }
  } catch (error) {
    console.error("Error tracking feature usage:", error);
  }
}

/**
 * Get list of features a user has tried
 */
export async function getUserFeatures(userId: string): Promise<string[]> {
  try {
    const features = await db
      .select({ featureName: userFeatureUsage.featureName })
      .from(userFeatureUsage)
      .where(eq(userFeatureUsage.userId, userId));
    
    return features.map(f => f.featureName);
  } catch (error) {
    console.error("Error getting user features:", error);
    return [];
  }
}

/**
 * Get list of features a user has NOT tried
 */
export async function getUnusedFeatures(userId: string): Promise<string[]> {
  const usedFeatures = await getUserFeatures(userId);
  const allFeatures = Object.values(FEATURES);
  return allFeatures.filter(feature => !usedFeatures.includes(feature));
}

/**
 * Schedule a welcome email (5 minutes after signup)
 */
export async function scheduleWelcomeEmail(userId: string): Promise<void> {
  try {
    const scheduledFor = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    await db.insert(scheduledEmails).values({
      userId,
      emailType: EMAIL_TYPES.WELCOME,
      scheduledFor,
      status: "pending",
    });
  } catch (error) {
    console.error("Error scheduling welcome email:", error);
  }
}

/**
 * Schedule feature engagement emails (24h, 48h, 72h)
 */
export async function scheduleFeatureEngagementEmails(userId: string): Promise<void> {
  try {
    const now = Date.now();
    
    // Schedule 24-hour check
    await db.insert(scheduledEmails).values({
      userId,
      emailType: EMAIL_TYPES.FEATURE_ENGAGEMENT_24H,
      scheduledFor: new Date(now + 24 * 60 * 60 * 1000),
      status: "pending",
    });
    
    // Schedule 48-hour check
    await db.insert(scheduledEmails).values({
      userId,
      emailType: EMAIL_TYPES.FEATURE_ENGAGEMENT_48H,
      scheduledFor: new Date(now + 48 * 60 * 60 * 1000),
      status: "pending",
    });
    
    // Schedule 72-hour check
    await db.insert(scheduledEmails).values({
      userId,
      emailType: EMAIL_TYPES.FEATURE_ENGAGEMENT_72H,
      scheduledFor: new Date(now + 72 * 60 * 60 * 1000),
      status: "pending",
    });
  } catch (error) {
    console.error("Error scheduling feature engagement emails:", error);
  }
}

/**
 * Process pending emails that are due to be sent
 */
export async function processPendingEmails(): Promise<void> {
  try {
    // Get all pending emails that are due
    const dueEmails = await db
      .select()
      .from(scheduledEmails)
      .where(and(
        eq(scheduledEmails.status, "pending"),
        lte(scheduledEmails.scheduledFor, new Date())
      ))
      .limit(50); // Process in batches

    for (const email of dueEmails) {
      try {
        await processEmail(email);
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        // Mark as failed
        await db
          .update(scheduledEmails)
          .set({
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          })
          .where(eq(scheduledEmails.id, email.id));
      }
    }
  } catch (error) {
    console.error("Error processing pending emails:", error);
  }
}

/**
 * Process a single email
 */
async function processEmail(email: typeof scheduledEmails.$inferSelect): Promise<void> {
  // Get user data
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, email.userId))
    .limit(1);

  if (!user.length) {
    throw new Error("User not found");
  }

  const userData = user[0];

  // Check if user has email notifications enabled
  if (!userData.emailNotifications && !userData.marketingEmails) {
    // Mark as cancelled
    await db
      .update(scheduledEmails)
      .set({ status: "cancelled" })
      .where(eq(scheduledEmails.id, email.id));
    return;
  }

  let success = false;

  switch (email.emailType) {
    case EMAIL_TYPES.WELCOME:
      success = await sendWelcomeEmail(userData.email, userData.username);
      break;

    case EMAIL_TYPES.FEATURE_ENGAGEMENT_24H:
    case EMAIL_TYPES.FEATURE_ENGAGEMENT_48H:
    case EMAIL_TYPES.FEATURE_ENGAGEMENT_72H:
      success = await sendFeatureEngagementEmail(userData, email.emailType);
      break;

    default:
      throw new Error(`Unknown email type: ${email.emailType}`);
  }

  if (success) {
    await db
      .update(scheduledEmails)
      .set({
        status: "sent",
        sentAt: new Date(),
      })
      .where(eq(scheduledEmails.id, email.id));
  } else {
    throw new Error("Failed to send email");
  }
}

/**
 * Send feature engagement email
 */
async function sendFeatureEngagementEmail(
  user: typeof users.$inferSelect,
  emailType: string
): Promise<boolean> {
  // Get unused features
  const unusedFeatures = await getUnusedFeatures(user.id);

  // If user has tried all features, cancel this email
  if (unusedFeatures.length === 0) {
    return true; // Mark as "sent" to avoid retrying
  }

  // Check which features we've already sent emails about
  const previousEmails = await db
    .select()
    .from(scheduledEmails)
    .where(and(
      eq(scheduledEmails.userId, user.id),
      eq(scheduledEmails.status, "sent")
    ));

  const featuresAlreadyEmailed = previousEmails
    .filter(e => e.featureName !== null)
    .map(e => e.featureName as string);

  // Get features we haven't emailed about yet
  const availableFeatures = unusedFeatures.filter(
    f => !featuresAlreadyEmailed.includes(f)
  );

  if (availableFeatures.length === 0) {
    return true; // All features already covered
  }

  // Pick a random feature to highlight
  const featureToHighlight = availableFeatures[
    Math.floor(Math.random() * availableFeatures.length)
  ];

  // Send the email (we'll create this function next)
  const success = await sendFeatureReminderEmail(user, featureToHighlight, emailType);

  // Update the scheduled email with the feature name
  if (success) {
    await db
      .update(scheduledEmails)
      .set({ featureName: featureToHighlight })
      .where(and(
        eq(scheduledEmails.userId, user.id),
        eq(scheduledEmails.emailType, emailType),
        isNull(scheduledEmails.sentAt)
      ));
  }

  return success;
}

/**
 * Send feature reminder email with instructions
 */
async function sendFeatureReminderEmail(
  user: typeof users.$inferSelect,
  featureName: string,
  emailType: string
): Promise<boolean> {
  // This will be implemented in the email.ts file
  // For now, we'll return true to indicate it would be sent
  const { sendFeatureEngagementEmailTemplate } = await import("./email");
  return sendFeatureEngagementEmailTemplate(user.email, user.username, featureName, emailType);
}

/**
 * Initialize email engagement system for a new user
 */
export async function initializeEmailEngagement(userId: string): Promise<void> {
  try {
    await scheduleWelcomeEmail(userId);
    await scheduleFeatureEngagementEmails(userId);
  } catch (error) {
    console.error("Error initializing email engagement:", error);
  }
}
