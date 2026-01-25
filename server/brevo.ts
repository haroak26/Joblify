import type { JobPost } from "@shared/schema";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@joblify.app";
const BREVO_SENDER_NAME = process.env.BREVO_SENDER_NAME || "Joblify";

interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
}

export async function sendEmail({ to, subject, htmlContent }: SendEmailParams): Promise<boolean> {
  if (!BREVO_API_KEY) {
    console.log("Brevo API key not configured, skipping email");
    return false;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: BREVO_SENDER_NAME,
          email: BREVO_SENDER_EMAIL,
        },
        to: [{ email: to }],
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error("Brevo email error:", await response.text());
      return false;
    }

    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Brevo email error:", error);
    return false;
  }
}

export function generateJobsEmailHtml(jobs: JobPost[], scheduleName: string): string {
  const jobsList = jobs.map(job => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
        <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 16px;">${escapeHtml(job.title)}</h3>
        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
          ${escapeHtml(job.description.slice(0, 200))}${job.description.length > 200 ? '...' : ''}
        </p>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
          ${job.matchedSkills.map(skill => `
            <span style="background-color: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
              ${escapeHtml(skill)}
            </span>
          `).join('')}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #9ca3af; font-size: 12px;">
            ${job.source.toUpperCase()} • ${job.postedAt}
          </span>
          <a href="${escapeHtml(job.sourceUrl)}" style="color: #16a34a; text-decoration: none; font-size: 14px;">
            View Post →
          </a>
        </div>
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; margin: 0; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 24px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 24px;">Joblify</h1>
          <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">New job opportunities found!</p>
        </div>
        
        <div style="padding: 24px;">
          <p style="color: #374151; font-size: 14px; margin: 0 0 16px 0;">
            Your scheduled scan "<strong>${escapeHtml(scheduleName)}</strong>" found <strong>${jobs.length} new job${jobs.length === 1 ? '' : 's'}</strong> matching your skills.
          </p>
          
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px;">
            ${jobsList}
          </table>
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="${process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}/dashboard/jobs` : '/dashboard/jobs'}" 
               style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
              View All Jobs
            </a>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">
            You received this email because you have an active schedule on Joblify.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function sendScheduleJobsEmail(
  userEmail: string,
  scheduleName: string,
  jobs: JobPost[]
): Promise<boolean> {
  if (jobs.length === 0) return true;
  
  const subject = `${jobs.length} new job${jobs.length === 1 ? '' : 's'} found - ${scheduleName}`;
  const htmlContent = generateJobsEmailHtml(jobs, scheduleName);
  
  return sendEmail({ to: userEmail, subject, htmlContent });
}
