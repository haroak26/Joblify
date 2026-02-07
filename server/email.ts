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
                  <td style="width: 44px; height: 44px; background-color: #16a34a; border-radius: 12px; text-align: center; vertical-align: middle;">
                    <span style="color: white; font-size: 20px; font-weight: 700;">J</span>
                  </td>
                  <td style="padding-left: 12px; font-size: 18px; font-weight: 700; color: #0f172a;">
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
        <td style="background-color: #16a34a; border-radius: 10px;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
            Verify email
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 0 0 16px 0;">
      Or paste this link in your browser:<br>
      <a href="${verifyUrl}" style="color: #16a34a; word-break: break-all;">${verifyUrl}</a>
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
        <td style="background-color: #16a34a; border-radius: 10px;">
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
            Reset password
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 0 0 16px 0;">
      Or paste this link in your browser:<br>
      <a href="${resetUrl}" style="color: #16a34a; word-break: break-all;">${resetUrl}</a>
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
      Your email is verified and your workspace is ready. Here’s a quick checklist to get you moving:
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 0 24px 0;">
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <strong style="color: #0f172a;">1. Add your skills</strong>
          <div style="font-size: 14px; color: #64748b; margin-top: 4px;">We’ll match you with the right gigs.</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
          <strong style="color: #0f172a;">2. Browse curated leads</strong>
          <div style="font-size: 14px; color: #64748b; margin-top: 4px;">Find opportunities across trusted sources.</div>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 0;">
          <strong style="color: #0f172a;">3. Follow up faster</strong>
          <div style="font-size: 14px; color: #64748b; margin-top: 4px;">Generate polished messages in seconds.</div>
        </td>
      </tr>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #16a34a; border-radius: 10px;">
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
