
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
