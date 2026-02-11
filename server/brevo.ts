
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "noreply@joblifyai.com";
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

export async function sendOnboardingReminderEmail(to: string, name: string): Promise<boolean> {
  const subject = "Complete Your Joblify Profile - Get Started Today!";
  
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Joblify Profile</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <!-- Header -->
  <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #16a34a;">
    <h1 style="color: #16a34a; margin: 0; font-size: 28px;">Joblify</h1>
    <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">AI-Powered Resume & Career Tools</p>
  </div>

  <!-- Main Content -->
  <div style="padding: 30px 0;">
    <h2 style="color: #333; font-size: 24px; margin: 0 0 15px 0;">Hi ${name || 'there'}! 👋</h2>
    
    <p style="font-size: 16px; margin: 0 0 20px 0;">
      We noticed you created your Joblify account a couple of days ago, but haven't completed your profile yet. 
      We're here to help you get the most out of our AI-powered career tools!
    </p>

    <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 4px;">
      <h3 style="color: #16a34a; margin: 0 0 15px 0; font-size: 18px;">🚀 Get Started in 3 Easy Steps</h3>
      
      <div style="margin: 15px 0;">
        <div style="display: flex; align-items: start; margin-bottom: 12px;">
          <span style="background: #16a34a; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0;">1</span>
          <div>
            <strong>Create Your First Resume</strong>
            <p style="margin: 3px 0 0 0; color: #666; font-size: 14px;">Use our AI Resume Builder to create a professional resume in minutes</p>
          </div>
        </div>
        
        <div style="display: flex; align-items: start; margin-bottom: 12px;">
          <span style="background: #16a34a; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0;">2</span>
          <div>
            <strong>Generate a Cover Letter</strong>
            <p style="margin: 3px 0 0 0; color: #666; font-size: 14px;">Create tailored cover letters for any job posting</p>
          </div>
        </div>
        
        <div style="display: flex; align-items: start;">
          <span style="background: #16a34a; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 12px; flex-shrink: 0;">3</span>
          <div>
            <strong>Get Your ATS Score</strong>
            <p style="margin: 3px 0 0 0; color: #666; font-size: 14px;">See how well your resume passes Applicant Tracking Systems</p>
          </div>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${process.env.APP_URL || 'https://joblifyai.com'}/dashboard" 
         style="background: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
        Complete My Profile
      </a>
    </div>

    <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #78350f;">
        <strong>💡 Pro Tip:</strong> Users who complete their profile are 3x more likely to land interviews. 
        Take 10 minutes today to set yourself up for success!
      </p>
    </div>

    <p style="font-size: 14px; color: #666; margin: 25px 0 0 0;">
      If you have any questions or need help getting started, just reply to this email. We're here to help!
    </p>

    <p style="font-size: 14px; color: #666; margin: 10px 0 0 0;">
      Best regards,<br>
      <strong>The Joblify Team</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="border-top: 1px solid #e5e7eb; padding: 20px 0; text-align: center; color: #666; font-size: 12px;">
    <p style="margin: 0 0 10px 0;">
      © ${new Date().getFullYear()} Joblify. All rights reserved.
    </p>
    <p style="margin: 0;">
      Don't want to receive these emails? You can update your preferences in your account settings.
    </p>
  </div>

</body>
</html>
  `;

  return sendEmail({ to, subject, htmlContent });
}
