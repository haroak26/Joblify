/**
 * GDPR/CCPA Compliance Utilities
 * 
 * Provides functionality for:
 * - Data export (Right to Data Portability - GDPR Article 20)
 * - Data summary (Right to Access - GDPR Article 15)
 * - Consent withdrawal tracking
 */

import { storage } from "../storage";
import type { User } from "@shared/schema";
import PDFDocument from 'pdfkit';

/**
 * Export all user data in a portable JSON format
 * Implements GDPR Article 20 - Right to Data Portability
 * Implements CCPA Section 1798.100 - Right to Know
 */
export async function exportUserData(userId: string) {
  try {
    // Fetch all user data from various tables
    const [
      user,
      profile,
      subscription,
      usage,
      coverLetters,
      jobs,
      schedules,
      securityEvents,
      supportInteractions
    ] = await Promise.all([
      storage.getUserById(userId),
      storage.getProfile(userId),
      storage.getSubscription(userId),
      storage.getUsage(userId),
      storage.getCoverLetters(userId),
      storage.getJobs(userId),
      storage.getSchedules(userId),
      storage.getSecurityEvents(userId),
      storage.getSupportInteractions(userId)
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    // Sanitize sensitive data (remove passwords, tokens, encrypted secrets)
    const sanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt || null,
    };

    // Prepare complete data export
    const dataExport = {
      exportDate: new Date().toISOString(),
      exportVersion: "1.0",
      user: sanitizedUser,
      profile: profile || null,
      subscription: subscription || null,
      usage: usage || null,
      coverLetters: coverLetters || [],
      jobs: jobs || [],
      schedules: schedules || [],
      securityEvents: securityEvents || [],
      supportInteractions: supportInteractions || [],
      dataRetentionPolicy: {
        description: "We retain your data for as long as your account is active. You can request deletion at any time.",
        deletionProcess: "Account deletion permanently removes all associated data within 30 days.",
      },
      privacyRights: {
        rightToAccess: "You can access your data anytime via this export.",
        rightToPortability: "This export is in machine-readable JSON format.",
        rightToErasure: "You can delete your account and all data in Account Settings.",
        rightToRectification: "You can update your data in your account settings.",
        rightToWithdrawConsent: "You can withdraw consent for data processing by deleting your account.",
      }
    };

    return dataExport;
  } catch (error) {
    console.error("[GDPR] Error exporting user data:", error);
    throw new Error("Failed to export user data");
  }
}

/**
 * Get a summary of what data we collect about the user
 * Implements GDPR Article 15 - Right to Access
 * Implements CCPA Section 1798.110 - Right to Know Categories
 */
export async function getUserDataSummary(userId: string) {
  try {
    const [
      user,
      profile,
      coverLetterCount,
      jobCount,
      scheduleCount,
    ] = await Promise.all([
      storage.getUserById(userId),
      storage.getProfile(userId),
      storage.getCoverLetterCount(userId),
      storage.getJobCount(userId),
      storage.getScheduleCount(userId),
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    return {
      dataCategories: {
        personalInformation: {
          description: "Basic account information",
          fields: ["username", "email", "name", "email verification status"],
          dataPresent: !!(user.username || user.email),
          source: "Provided by you during registration",
          purpose: "Account identification and communication",
          retention: "As long as your account exists",
        },
        authenticationData: {
          description: "Security and authentication information",
          fields: ["password (hashed)", "2FA settings", "session data"],
          dataPresent: true,
          source: "Generated during account creation and security setup",
          purpose: "Secure account access and protection",
          retention: "As long as your account exists",
        },
        profileData: {
          description: "Your professional profile information",
          fields: ["intro", "skills", "completion status"],
          dataPresent: !!profile,
          source: "Provided by you in your profile",
          purpose: "Job matching and personalization",
          retention: "As long as your account exists",
        },
        coverLetterData: {
          description: "Cover letter content",
          fields: ["cover letter text", "job information", "customization"],
          dataPresent: coverLetterCount > 0,
          count: coverLetterCount,
          source: "Generated using AI based on job description and user input",
          purpose: "Cover letter creation and storage",
          retention: "As long as your account exists",
        },
        jobData: {
          description: "Saved and applied jobs",
          fields: ["job listings", "application status", "matched skills"],
          dataPresent: jobCount > 0,
          count: jobCount,
          source: "Jobs you searched for or saved",
          purpose: "Job tracking and application management",
          retention: "As long as your account exists",
        },
        scheduleData: {
          description: "Job search automation schedules",
          fields: ["search criteria", "frequency", "status"],
          dataPresent: scheduleCount > 0,
          count: scheduleCount,
          source: "Created by you for automated job searches",
          purpose: "Automated job search functionality",
          retention: "As long as your account exists",
        },
        subscriptionData: {
          description: "Payment and subscription information",
          fields: ["plan type", "subscription status", "Stripe customer ID"],
          dataPresent: true,
          source: "Generated when you subscribe or use free plan",
          purpose: "Billing, access control, and feature limits",
          retention: "As long as your account exists, billing records for 7 years",
        },
        usageData: {
          description: "Usage metrics and limits",
          fields: ["jobs scraped count", "monthly reset date"],
          dataPresent: true,
          source: "Automatically tracked as you use features",
          purpose: "Enforce plan limits and usage tracking",
          retention: "Reset monthly, historical data kept as long as account exists",
        },
        analyticsData: {
          description: "Product usage analytics (if opted in)",
          fields: ["feature usage", "page views", "events"],
          dataPresent: true,
          source: "Tracked via PostHog when you use the application",
          purpose: "Product improvement and feature development",
          retention: "Configurable in PostHog (typically 90 days)",
        },
        securityEvents: {
          description: "Security and audit logs",
          fields: ["login attempts", "2FA changes", "password changes"],
          dataPresent: true,
          source: "Automatically logged for security",
          purpose: "Security monitoring and fraud prevention",
          retention: "90 days",
        },
      },
      thirdPartySharing: {
        stripe: {
          name: "Stripe",
          purpose: "Payment processing",
          dataShared: ["email", "name", "payment information"],
          privacyPolicy: "https://stripe.com/privacy",
        },
        poe: {
          name: "Poe AI (Claude API)",
          purpose: "AI-powered features",
          dataShared: ["chat messages"],
          privacyPolicy: "https://poe.com/privacy",
        },
        posthog: {
          name: "PostHog",
          purpose: "Product analytics",
          dataShared: ["user ID", "feature usage events", "anonymized behavior"],
          privacyPolicy: "https://posthog.com/privacy",
        },
        zendesk: {
          name: "Zendesk",
          purpose: "Customer support",
          dataShared: ["email", "name", "support messages"],
          privacyPolicy: "https://www.zendesk.com/company/agreements-and-terms/privacy-notice/",
        },
      },
      yourRights: {
        access: "You can access all your data via data export",
        rectification: "You can update your data in account settings",
        erasure: "You can delete your account and all data",
        portability: "You can download your data in JSON format",
        restriction: "You can limit data processing by deleting your account",
        objection: "You can object to processing by contacting privacy@joblifyai.com",
        withdrawConsent: "You can withdraw consent by deleting your account",
      },
      contactInformation: {
        privacyEmail: "privacy@joblifyai.com",
        dataProtectionOfficer: "privacy@joblifyai.com",
        responseTime: "We respond to privacy requests within 30 days",
      },
    };
  } catch (error) {
    console.error("[GDPR] Error generating data summary:", error);
    throw new Error("Failed to generate data summary");
  }
}

/**
 * Log consent withdrawal event
 * Note: In this implementation, withdrawal is handled by account deletion
 * This function logs the event for audit purposes
 */
export async function logConsentWithdrawal(userId: string, reason?: string) {
  try {
    await storage.createSecurityEvent({
      userId,
      eventType: "consent_withdrawn",
      ipAddress: null,
      userAgent: null,
      metadata: {
        reason: reason || "User requested consent withdrawal",
        timestamp: new Date().toISOString(),
      },
    });

    return {
      success: true,
      message: "Consent withdrawal logged. To complete the process, please delete your account.",
      nextSteps: [
        "Delete your account to remove all personal data",
        "All data will be permanently deleted within 30 days",
        "You will receive a confirmation email",
      ],
    };
  } catch (error) {
    console.error("[GDPR] Error logging consent withdrawal:", error);
    throw new Error("Failed to log consent withdrawal");
  }
}

/**
 * Export user data as a PDF document
 * Only includes user-entered data, excludes system metadata
 * Implements GDPR Article 20 - Right to Data Portability (PDF format)
 */
export async function exportUserDataPDF(userId: string): Promise<Buffer> {
  try {
    // Fetch user data
    const [
      user,
      profile,
      subscription,
      usage,
      coverLetters,
      jobs,
    ] = await Promise.all([
      storage.getUserById(userId),
      storage.getProfile(userId),
      storage.getSubscription(userId),
      storage.getUsage(userId),
      storage.getCoverLetters(userId),
      storage.getJobs(userId),
    ]);

    if (!user) {
      throw new Error("User not found");
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('JOBLIFY DATA EXPORT', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`User: ${user.username}`, { align: 'center' });
      doc.text(`Email: ${user.email}`, { align: 'center' });
      doc.text(`Export Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });
      doc.moveDown(2);

      // Profile Information
      doc.fontSize(16).font('Helvetica-Bold').text('PROFILE INFORMATION');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      
      if (user.name) {
        doc.text(`Name: ${user.name}`);
        doc.moveDown(0.3);
      }
      
      if (profile?.intro) {
        doc.text('Introduction:', { continued: false });
        doc.moveDown(0.3);
        doc.fontSize(9).text(profile.intro, { indent: 20 });
        doc.fontSize(10);
        doc.moveDown(0.5);
      }
      
      if (profile?.skills && Array.isArray(profile.skills) && profile.skills.length > 0) {
        doc.text('Skills:');
        doc.moveDown(0.3);
        doc.fontSize(9);
        profile.skills.forEach((skill: string | { name: string }) => {
          const skillText = typeof skill === 'string' ? skill : skill.name || 'Unknown';
          doc.text(`• ${skillText}`, { indent: 20 });
        });
        doc.fontSize(10);
        doc.moveDown(1);
      }

      // Saved Jobs
      if (jobs && jobs.length > 0) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('SAVED JOBS');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        jobs.forEach((job: { title?: string; company?: string; location?: string; description?: string; applied?: boolean }, index: number) => {
          doc.fontSize(11).font('Helvetica-Bold').text(`${index + 1}. ${job.title || 'Untitled Job'}`);
          doc.fontSize(9).font('Helvetica');
          
          if (job.company) {
            doc.text(`   Company: ${job.company}`);
          }
          
          if (job.location) {
            doc.text(`   Location: ${job.location}`);
          }
          
          if (job.description) {
            doc.text('   Description:', { continued: false });
            const truncatedDesc = job.description.length > 200 
              ? job.description.substring(0, 200) + '...' 
              : job.description;
            doc.text(`   ${truncatedDesc}`, { indent: 25 });
          }
          
          if (job.applied !== undefined) {
            doc.text(`   Status: ${job.applied ? 'Applied' : 'Saved'}`);
          }
          
          doc.moveDown(0.8);
          
          // Add page break if needed
          if (doc.y > 700 && index < jobs.length - 1) {
            doc.addPage();
          }
        });
      }

      // Cover Letters
      if (coverLetters && coverLetters.length > 0) {
        doc.addPage();
        doc.fontSize(16).font('Helvetica-Bold').text('COVER LETTERS');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        coverLetters.forEach((letter: { jobTitle?: string; companyName?: string }, index: number) => {
          doc.fontSize(11).font('Helvetica-Bold').text(`${index + 1}. ${letter.jobTitle || 'Cover Letter'}`);
          doc.fontSize(9).font('Helvetica');
          
          if (letter.companyName) {
            doc.text(`   Company: ${letter.companyName}`);
          }
          
          doc.text('   [Cover letter content available in your account]');
          doc.moveDown(0.8);
        });
      }

      // Usage Summary
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('USAGE SUMMARY');
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');

      if (usage) {
        doc.text(`Jobs Scraped This Month: ${usage.jobsScrapedThisMonth || 0}`);
        doc.text(`AI Edits This Month: ${usage.aiEditsThisMonth || 0}`);
        doc.text(`Cover Letters This Month: ${usage.coverLettersThisMonth || 0}`);
        doc.text(`ATS Scans This Month: ${usage.atsScansThisMonth || 0}`);
        doc.moveDown(0.5);
      }

      if (subscription) {
        doc.text(`Current Plan: ${subscription.plan || 'free'}`);
        doc.text(`Subscription Status: ${subscription.status || 'active'}`);
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica-Oblique')
        .text('This export contains your personal data as stored in Joblify.', { align: 'center' });
      doc.text('For questions, contact privacy@joblifyai.com', { align: 'center' });

      doc.end();
    });
  } catch (error) {
    console.error("[GDPR] Error generating PDF export:", error);
    throw new Error("Failed to generate PDF export");
  }
}
