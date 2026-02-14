const brevoApiKey = process.env.BREVO_API_KEY;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!brevoApiKey) {
    console.error("BREVO_API_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": brevoApiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Joblify", email: "noreply@joblifyai.com" },
        to: [{ email: options.to }],
        subject: options.subject,
        htmlContent: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Brevo email error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

function getEmailTemplate(content: string, previewText: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Joblify</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
  <span style="display:none; max-height:0; max-width:0; opacity:0; overflow:hidden; mso-hide:all;">
    ${previewText}
  </span>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px;">
          <tr>
            <td style="padding-bottom: 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-right: 12px;">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="7" width="18" height="13" rx="2" stroke="#22C35D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" stroke="#22C35D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <line x1="3" y1="11" x2="21" y2="11" stroke="#22C35D" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                  </td>
                  <td style="font-size: 18px; font-weight: 700; color: #0f172a;">
                    Joblify
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0 0 6px 0;">
                This email was sent by Joblify. If you didn’t request this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getAppUrl(): string {
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
  }
  return process.env.APP_URL || "https://JoblifyAI.com";
}

export async function sendVerificationEmail(email: string, username: string, token: string): Promise<boolean> {
  const verifyUrl = `${getAppUrl()}/verify-email?token=${token}`;
  
  const content = `
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">
      Verify your email
    </h1>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Hi ${username},
    </p>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 24px 0;">
      Thanks for joining Joblify. Please confirm this email address to activate your account.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
      <tr>
        <td style="background-color: #22C35D; border-radius: 10px;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
            Verify email
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 0 0 16px 0;">
      Or paste this link in your browser:<br>
      <a href="${verifyUrl}" style="color: #22C35D; word-break: break-all;">${verifyUrl}</a>
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "Verify your Joblify email",
    html: getEmailTemplate(content, "Confirm your Joblify email address to activate your account."),
  });
}

export async function sendPasswordResetEmail(email: string, username: string, token: string): Promise<boolean> {
  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;

  const content = `
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">
      Reset your password
    </h1>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Hi ${username},
    </p>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 24px 0;">
      We received a request to reset your Joblify password. Click the button below to choose a new one.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
      <tr>
        <td style="background-color: #22C35D; border-radius: 10px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
            Reset password
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 0 0 16px 0;">
      Or paste this link in your browser:<br>
      <a href="${resetUrl}" style="color: #22C35D; word-break: break-all;">${resetUrl}</a>
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      If you didn’t request this, you can safely ignore this email.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "Reset your Joblify password",
    html: getEmailTemplate(content, "Reset your Joblify password with this secure link."),
  });
}

export async function sendWelcomeEmail(email: string, username: string): Promise<boolean> {
  const dashboardUrl = `${getAppUrl()}/dashboard`;
  
  const content = `
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">
      Welcome to Joblify!
    </h1>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Hi ${username},
    </p>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Your email is verified and your workspace is ready. Here’s a quick checklist to get you started:
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <span style="color: #0f172a; font-weight: 600;">1. Build your resume</span>
          <div style="font-size: 14px; color: #64748b; margin-top: 4px;">Create a professional, ATS-optimized resume with AI assistance.</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <span style="color: #0f172a; font-weight: 600;">2. Scan with ATS</span>
          <div style="font-size: 14px; color: #64748b; margin-top: 4px;">See how your resume performs against applicant tracking systems.</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0;">
          <span style="color: #0f172a; font-weight: 600;">3. Generate cover letters</span>
          <div style="font-size: 14px; color: #64748b; margin-top: 4px;">Create tailored cover letters for any job in seconds.</div>
        </td>
      </tr>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #22C35D; border-radius: 10px;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
            Open your dashboard
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 0;">
      Need help? Reply to this email and we’ll take care of you.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "Welcome to Joblify - Let's build your resume!",
    html: getEmailTemplate(content, "Your Joblify account is ready. Start building your professional resume."),
  });
}

/**
 * Feature engagement email template
 */
export async function sendFeatureEngagementEmailTemplate(
  email: string,
  username: string,
  featureName: string,
  emailType: string
): Promise<boolean> {
  const dashboardUrl = `${getAppUrl()}/dashboard`;
  const featureInfo = getFeatureInfo(featureName);
  
  const content = `
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">
      ${featureInfo.title}
    </h1>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Hi ${username},
    </p>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      We noticed you haven't tried our ${featureInfo.name} feature yet. ${featureInfo.description}
    </p>
    
    <div style="background-color: #f8fafc; border-left: 4px solid #22C35D; padding: 16px 20px; margin: 24px 0; border-radius: 8px;">
      <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #0f172a;">
        How to use ${featureInfo.name}:
      </h3>
      ${featureInfo.instructions}
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
      <tr>
        <td style="background-color: #22C35D; border-radius: 10px;">
          <a href="${featureInfo.url}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
            Try ${featureInfo.name} now
          </a>
        </td>
      </tr>
    </table>
    
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      ${featureInfo.benefits}
    </p>
    
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      Need help? Reply to this email and we'll take care of you.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: `Try Joblify's ${featureInfo.name} - ${featureInfo.tagline}`,
    html: getEmailTemplate(content, featureInfo.previewText),
  });
}

/**
 * Get feature information for email templates
 */
function getFeatureInfo(featureName: string): {
  name: string;
  title: string;
  tagline: string;
  description: string;
  instructions: string;
  url: string;
  benefits: string;
  previewText: string;
} {
  const baseUrl = getAppUrl();
  
  switch (featureName) {
    case "resume_builder":
      return {
        name: "AI Resume Builder",
        title: "Build Your Professional Resume with AI",
        tagline: "Create a standout resume in minutes",
        description: "Our AI-powered resume builder helps you create a professional, ATS-optimized resume that gets noticed by employers.",
        instructions: `
          <ol style="margin: 0; padding-left: 20px; color: #334155;">
            <li style="margin-bottom: 8px;">Go to Dashboard → My Resumes</li>
            <li style="margin-bottom: 8px;">Click "Create New Resume"</li>
            <li style="margin-bottom: 8px;">Chat with our AI assistant to build your resume</li>
            <li style="margin-bottom: 8px;">Review and customize your content</li>
            <li>Download your resume as PDF or DOCX</li>
          </ol>
        `,
        url: `${baseUrl}/dashboard/resumes/create`,
        benefits: "💡 Pro tip: The AI analyzes job market trends to suggest the best keywords and formatting for your industry.",
        previewText: "Create a professional, ATS-optimized resume with AI assistance",
      };

    case "ats_scanner":
      return {
        name: "ATS Scanner",
        title: "Check How Your Resume Performs",
        tagline: "See your ATS score instantly",
        description: "Most companies use ATS (Applicant Tracking Systems) to filter resumes. Our scanner shows you exactly how your resume will perform.",
        instructions: `
          <ol style="margin: 0; padding-left: 20px; color: #334155;">
            <li style="margin-bottom: 8px;">Go to Dashboard → ATS Scanner</li>
            <li style="margin-bottom: 8px;">Upload your resume (PDF or DOCX)</li>
            <li style="margin-bottom: 8px;">Get your ATS compatibility score</li>
            <li>Review detailed improvement suggestions</li>
          </ol>
        `,
        url: `${baseUrl}/dashboard/ats-scanner`,
        benefits: "📊 Did you know? 75% of resumes are rejected by ATS before a human ever sees them. Don't let that happen to you!",
        previewText: "See how your resume performs against ATS systems",
      };

    case "cover_letter":
      return {
        name: "Cover Letter Generator",
        title: "Create Tailored Cover Letters Instantly",
        tagline: "Personalized cover letters in seconds",
        description: "Generate compelling, job-specific cover letters that complement your resume and highlight your relevant experience.",
        instructions: `
          <ol style="margin: 0; padding-left: 20px; color: #334155;">
            <li style="margin-bottom: 8px;">Go to Dashboard → Cover Letter Generator</li>
            <li style="margin-bottom: 8px;">Select which resume to use</li>
            <li style="margin-bottom: 8px;">Paste the job description</li>
            <li style="margin-bottom: 8px;">Choose your tone (professional, enthusiastic, etc.)</li>
            <li>Get a customized cover letter instantly</li>
          </ol>
        `,
        url: `${baseUrl}/dashboard/cover-letter`,
        benefits: "✍️ Save time: What takes hours to write manually takes seconds with our AI. Each letter is uniquely tailored to the specific job.",
        previewText: "Generate compelling, job-specific cover letters instantly",
      };

    case "job_match":
      return {
        name: "Job Match",
        title: "Find Jobs That Match Your Skills",
        tagline: "Discover your perfect job opportunities",
        description: "Our Job Match feature helps you track job applications and find opportunities that align with your skills and experience.",
        instructions: `
          <ol style="margin: 0; padding-left: 20px; color: #334155;">
            <li style="margin-bottom: 8px;">Go to Dashboard → Job Match</li>
            <li style="margin-bottom: 8px;">Add jobs you're interested in</li>
            <li style="margin-bottom: 8px;">Track your application status</li>
            <li>Get reminders for follow-ups</li>
          </ol>
        `,
        url: `${baseUrl}/dashboard/job-match`,
        benefits: "🎯 Stay organized: Keep all your job applications in one place and never miss a follow-up opportunity.",
        previewText: "Track job applications and find opportunities that match your skills",
      };

    case "tailor":
      return {
        name: "Job Tailor",
        title: "Tailor Your Resume for Specific Jobs",
        tagline: "Customize for each application",
        description: "Ultra subscribers can automatically tailor their resume and cover letter to match specific job requirements, increasing their chances of getting an interview.",
        instructions: `
          <ol style="margin: 0; padding-left: 20px; color: #334155;">
            <li style="margin-bottom: 8px;">Go to Dashboard → Tailor</li>
            <li style="margin-bottom: 8px;">Select a job from your tracker</li>
            <li style="margin-bottom: 8px;">Choose your resume and cover letter</li>
            <li>AI automatically optimizes them for that specific job</li>
          </ol>
        `,
        url: `${baseUrl}/dashboard/tailor`,
        benefits: "🚀 Ultra feature: Tailored applications get 3x more interviews. Upgrade to Ultra to unlock this powerful feature.",
        previewText: "Automatically tailor your resume and cover letter for each job",
      };

    default:
      return {
        name: "Joblify Features",
        title: "Discover More Joblify Features",
        tagline: "Get the most out of Joblify",
        description: "Joblify has many powerful features to help you land your dream job faster.",
        instructions: `
          <p style="margin: 0; color: #334155;">
            Explore your dashboard to discover all the tools available to help you succeed in your job search.
          </p>
        `,
        url: `${baseUrl}/dashboard`,
        benefits: "💼 Your success is our mission: We're constantly adding new features to help you stand out from the competition.",
        previewText: "Discover powerful features to accelerate your job search",
      };
  }
}

// Contact form email to support
export async function sendContactFormEmail(options: {
  fromName: string;
  fromEmail: string;
  message: string;
  aiResponse?: string;
}): Promise<boolean> {
  const { fromName, fromEmail, message, aiResponse } = options;

  const content = `
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">
      New Contact Form Submission
    </h1>
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="font-size: 14px; color: #64748b; margin: 0 0 8px 0; font-weight: 600;">From:</p>
      <p style="font-size: 16px; color: #0f172a; margin: 0 0 12px 0;">${fromName} (${fromEmail})</p>
      
      <p style="font-size: 14px; color: #64748b; margin: 0 0 8px 0; font-weight: 600;">Message:</p>
      <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0; white-space: pre-wrap;">${message}</p>
    </div>
    ${
      aiResponse
        ? `
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <p style="font-size: 14px; color: #92400e; margin: 0 0 8px 0; font-weight: 600;">⚠️ Note: AI Response Was Provided But Not Sufficient</p>
      <p style="font-size: 14px; color: #78350f; margin: 0; white-space: pre-wrap;">${aiResponse}</p>
      <p style="font-size: 13px; color: #92400e; margin: 12px 0 0 0; font-style: italic;">The user reviewed this AI response but requested human support. Please prioritize this inquiry.</p>
    </div>
    `
        : ""
    }
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      Reply to this inquiry by emailing <a href="mailto:${fromEmail}" style="color: #22C35D;">${fromEmail}</a>
    </p>
  `;

  return sendEmail({
    to: "support@joblifyai.com",
    subject: `Contact Form: Message from ${fromName}`,
    html: getEmailTemplate(
      content,
      `New contact form message from ${fromName}`
    ),
  });
}

// Confirmation email to user
export async function sendContactConfirmationEmail(options: {
  toEmail: string;
  name: string;
  message: string;
}): Promise<boolean> {
  const { toEmail, name, message } = options;

  const content = `
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">
      We've Received Your Message
    </h1>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Hi ${name},
    </p>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Thank you for contacting Joblify! We've received your message and our support team will review it shortly.
    </p>
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="font-size: 14px; color: #64748b; margin: 0 0 8px 0; font-weight: 600;">Your Message:</p>
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0; white-space: pre-wrap;">${message}</p>
    </div>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      We typically respond within 24-48 hours during business days. For urgent matters, please mention "urgent" in your message.
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      Best regards,<br>
      <span style="font-weight: 600;">The Joblify Team</span>
    </p>
  `;

  return sendEmail({
    to: toEmail,
    subject: "We've received your message - Joblify Support",
    html: getEmailTemplate(
      content,
      "Thank you for contacting Joblify support"
    ),
  });
}

// Email when admin awards a perk to a user
export async function sendPerkAwardedEmail(
  email: string,
  username: string,
  perkName: string,
  perkDescription: string
): Promise<boolean> {
  const content = `
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">
      🎉 You've Received a Perk!
    </h1>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Hi ${username},
    </p>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Great news! You've been awarded a special perk on Joblify.
    </p>
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; margin: 24px 0; color: white;">
      <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 12px 0; color: white;">
        ${perkName}
      </h2>
      <p style="font-size: 15px; line-height: 1.6; margin: 0; color: rgba(255,255,255,0.95);">
        ${perkDescription}
      </p>
    </div>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      To use your perk, simply log in to your Joblify account and navigate to your dashboard. Your new perk will be available and ready to use.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${process.env.APP_URL || 'https://joblifyai.com'}/dashboard" 
         style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View My Perks
      </a>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      Happy job hunting!<br>
      <span style="font-weight: 600;">The Joblify Team</span>
    </p>
  `;

  return sendEmail({
    to: email,
    subject: `🎉 You've received a perk: ${perkName}`,
    html: getEmailTemplate(content, "You've been awarded a special perk!"),
  });
}

// Email when admin blocks a user's account
export async function sendAccountBlockedEmail(
  email: string,
  username: string
): Promise<boolean> {
  const content = `
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">
      Account Access Update
    </h1>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Hi ${username},
    </p>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      We're writing to inform you that your Joblify account has been temporarily blocked.
    </p>
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="font-size: 15px; line-height: 1.6; color: #991b1b; margin: 0;">
        <strong>What this means:</strong><br>
        You will not be able to access your account or use Joblify services during this time.
      </p>
    </div>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      If you believe this is a mistake or would like to discuss this decision, please contact our appeals team:
    </p>
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
      <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">
        📧 Email: <a href="mailto:appeals@joblifyai.com" style="color: #667eea; text-decoration: none;">appeals@joblifyai.com</a>
      </p>
      <p style="font-size: 14px; color: #64748b; margin: 0;">
        We review all appeals within 2-3 business days
      </p>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      Best regards,<br>
      <span style="font-weight: 600;">The Joblify Team</span>
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "Important: Account Access Update - Joblify",
    html: getEmailTemplate(content, "Account access update notification"),
  });
}

// Email when admin blocks a user's AI access
export async function sendAiAccessBlockedEmail(
  email: string,
  username: string
): Promise<boolean> {
  const content = `
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">
      AI Features Access Update
    </h1>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Hi ${username},
    </p>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      We're writing to inform you that your access to AI-powered features on Joblify has been temporarily restricted.
    </p>
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="font-size: 15px; line-height: 1.6; color: #991b1b; margin: 0;">
        <strong>Affected features:</strong><br>
        • AI Resume Builder and Enhancement<br>
        • AI Cover Letter Generator<br>
        • ATS Scanner with AI Suggestions<br>
        • Job Matching with AI Analysis<br>
        • Resume Tailoring
      </p>
    </div>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      You can still access your account and use non-AI features like viewing your resumes, managing your profile, and tracking job applications.
    </p>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      If you believe this is a mistake or would like to discuss this decision, please contact our support team:
    </p>
    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
      <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">
        📧 Email: <a href="mailto:support@joblifyai.com" style="color: #667eea; text-decoration: none;">support@joblifyai.com</a>
      </p>
      <p style="font-size: 14px; color: #64748b; margin: 0;">
        We review all inquiries within 2-3 business days
      </p>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      Best regards,<br>
      <span style="font-weight: 600;">The Joblify Team</span>
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "AI Features Access Update - Joblify",
    html: getEmailTemplate(content, "AI features access update notification"),
  });
}

/**
 * Send 2FA verification code email
 */
export async function send2FAEmail(email: string, username: string, code: string): Promise<boolean> {
  const content = `
    <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #0f172a;">
      Your verification code
    </h1>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 20px 0;">
      Hi ${username},
    </p>
    <p style="font-size: 16px; line-height: 1.7; color: #334155; margin: 0 0 24px 0;">
      You're attempting to sign in to your Joblify account. Please use the verification code below to complete your login:
    </p>
    <div style="background-color: #f8fafc; border: 2px solid #22C35D; border-radius: 12px; padding: 32px; text-align: center; margin: 28px 0;">
      <div style="font-size: 48px; font-weight: 700; letter-spacing: 8px; color: #0f172a; font-family: 'Courier New', monospace;">
        ${code}
      </div>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      This code will expire in <strong>5 minutes</strong>.
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #64748b; margin: 16px 0 0;">
      If you didn't attempt to sign in, please ignore this email and ensure your account is secure.
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "Your Joblify verification code",
    html: getEmailTemplate(content, `Your verification code is ${code}`),
  });
}
