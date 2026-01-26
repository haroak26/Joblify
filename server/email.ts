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
<body style="margin: 0; padding: 0; background-color: #f6f7f9; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f6f7f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px;">
          <tr>
            <td style="padding-bottom: 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="width: 44px; height: 44px; background-color: #16a34a; border-radius: 14px; text-align: center; vertical-align: middle;">
                          <span style="color: white; font-size: 20px; font-weight: 700;">J</span>
                        </td>
                        <td style="padding-left: 12px;">
                          <div style="font-size: 18px; font-weight: 700; color: #0f172a;">Joblify</div>
                          <div style="font-size: 12px; color: #64748b;">Freelance ops, simplified.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="font-size: 12px; color: #94a3b8;">
                    <span>joblify.ai</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0 0 6px 0;">
                This email was sent by Joblify. If you didn’t request this, you can safely ignore it.
              </p>
              <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                Joblify • Remote-first • Built for freelancers
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
    <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-top: 20px;">
      <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 0;">
        Or paste this link in your browser:<br>
        <a href="${verifyUrl}" style="color: #16a34a; word-break: break-all;">${verifyUrl}</a>
      </p>
    </div>
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
    subject: "Welcome to Joblify - Let's find your next opportunity!",
    html: getEmailTemplate(content),
  });
}
