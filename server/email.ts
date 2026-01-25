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

function getEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Joblify</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="width: 40px; height: 40px; background-color: #1B9C5D; border-radius: 10px; text-align: center; vertical-align: middle;">
                    <span style="color: white; font-size: 20px; font-weight: bold;">J</span>
                  </td>
                  <td style="padding-left: 12px;">
                    <span style="font-size: 20px; font-weight: 600; color: #1a1a2e;">Joblify</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td>
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding-top: 40px; border-top: 1px solid #e5e5e5; margin-top: 40px;">
              <p style="font-size: 12px; color: #666; margin: 0;">
                This email was sent by Joblify. If you didn't request this, you can safely ignore it.
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
  return process.env.APP_URL || 'http://localhost:5000';
}

export async function sendVerificationEmail(email: string, username: string, token: string): Promise<boolean> {
  const verifyUrl = `${getAppUrl()}/verify-email?token=${token}`;
  
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #1a1a2e;">
      Verify your email
    </h1>
    <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 24px 0;">
      Hi ${username},
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 24px 0;">
      Thanks for signing up for Joblify! Please verify your email address by clicking the button below.
    </p>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
      <tr>
        <td style="background-color: #1B9C5D; border-radius: 8px;">
          <a href="${verifyUrl}" style="display: inline-block; padding: 14px 28px; color: white; text-decoration: none; font-weight: 500; font-size: 16px;">
            Verify Email Address
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size: 14px; line-height: 1.6; color: #666; margin: 0;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${verifyUrl}" style="color: #1B9C5D;">${verifyUrl}</a>
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "Verify your Joblify email",
    html: getEmailTemplate(content),
  });
}

export async function sendWelcomeEmail(email: string, username: string): Promise<boolean> {
  const dashboardUrl = `${getAppUrl()}/dashboard`;
  
  const content = `
    <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #1a1a2e;">
      Welcome to Joblify!
    </h1>
    <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 24px 0;">
      Hi ${username},
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 16px 0;">
      Your email has been verified and your account is now fully activated. You're all set to discover amazing freelance opportunities!
    </p>
    <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0 0 24px 0;">
      Here's what you can do with Joblify:
    </p>
    <ul style="font-size: 16px; line-height: 1.8; color: #4a4a4a; margin: 0 0 24px 0; padding-left: 20px;">
      <li>Add your skills to find matching job opportunities</li>
      <li>Discover freelance gigs from Reddit, X, and Facebook</li>
      <li>Generate personalized follow-up messages with AI</li>
      <li>Track saved jobs and applications</li>
    </ul>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
      <tr>
        <td style="background-color: #1B9C5D; border-radius: 8px;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 28px; color: white; text-decoration: none; font-weight: 500; font-size: 16px;">
            Go to Dashboard
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size: 16px; line-height: 1.6; color: #4a4a4a; margin: 0;">
      Happy job hunting!<br>
      <strong>The Joblify Team</strong>
    </p>
  `;

  return sendEmail({
    to: email,
    subject: "Welcome to Joblify - Let's find your next opportunity!",
    html: getEmailTemplate(content),
  });
}
