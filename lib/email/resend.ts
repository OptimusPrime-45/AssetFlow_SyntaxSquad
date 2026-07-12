import 'dotenv/config';

export interface EmailParams {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Sends an email using the Resend REST API via native fetch.
 */
export async function sendEmail({ to, subject, html }: EmailParams): Promise<{ success: boolean; data?: any; error?: any }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('WARNING: RESEND_API_KEY is not defined in environment variables');
    return { success: false, error: 'RESEND_API_KEY is missing' };
  }

  const recipients = Array.isArray(to) ? to : [to];

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'AssetFlow <onboarding@resend.dev>',
        to: recipients,
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true, data };
    } else {
      console.error('Resend API error:', data);
      return { success: false, error: data };
    }
  } catch (error: any) {
    console.error('Failed to send email via Resend fetch:', error);
    return { success: false, error: error.message || error };
  }
}
