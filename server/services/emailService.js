const nodemailer = require('nodemailer');

/**
 * Subject display name helper
 */
const SUBJECT_NAMES = {
  marketing: 'Marketing',
  hr: 'Human Resources (HR)',
  digital_marketing: 'Digital Marketing',
  general_reasoning: 'General Reasoning',
};

/**
 * Format subject key to human readable name
 */
const getSubjectName = (key) => SUBJECT_NAMES[key] || (key ? key.replace(/_/g, ' ').toUpperCase() : 'General Exam');

/**
 * Creates and returns a configured Nodemailer transporter
 */
let cachedTransporter = null;

const getTransporter = () => {
  const user = (process.env.SMTP_USER || '').trim();
  // App passwords can have spaces when copied from Google Account; strip internal spaces
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!user || !pass) {
    return null;
  }

  // Reuse transporter instance if settings haven't changed
  if (cachedTransporter) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return cachedTransporter;
};

/**
 * Reset cached transporter (useful if env vars change at runtime)
 */
const resetTransporter = () => {
  if (cachedTransporter) {
    try {
      cachedTransporter.close();
    } catch (_) {}
    cachedTransporter = null;
  }
};

/**
 * Check if email service is configured
 */
const isConfigured = () => {
  return !!(
    process.env.BREVO_API_KEY ||
    process.env.RESEND_API_KEY ||
    (process.env.SMTP_USER && process.env.SMTP_PASS)
  );
};

/**
 * Unified email sender:
 * 1. Uses Brevo HTTPS API over port 443 if BREVO_API_KEY is configured (free 300 emails/day to any recipient)
 * 2. Uses Resend HTTPS API over port 443 if RESEND_API_KEY is configured (free 3,000 emails/month)
 * 3. Falls back to Nodemailer SMTP (Gmail, AWS SES, etc.) for local development or unblocked hosts
 */
const sendMailUnified = async ({ to, subject, html }) => {
  const fromName = process.env.SMTP_FROM_NAME || 'Diverse Solutions Exam Portal';
  const defaultSenderEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'debiprasaddiversesolutions@gmail.com').trim();

  // 1. Brevo (Sendinblue) HTTPS API (Port 443 - free 300 emails/day to any recipient)
  if (process.env.BREVO_API_KEY) {
    const toList = Array.isArray(to)
      ? to.map((e) => ({ email: typeof e === 'string' ? e : e.email }))
      : [{ email: to }];

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY.trim(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: defaultSenderEmail },
        to: toList,
        subject,
        htmlContent: html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}: Brevo email delivery failed`);
    }
    return { sent: true, messageId: data.messageId || 'brevo-sent' };
  }

  // 2. Resend HTTPS API (Port 443 - free 3,000 emails/month)
  if (process.env.RESEND_API_KEY) {
    const fromEmail = process.env.RESEND_FROM || 'onboarding@resend.dev';
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}: Resend email delivery failed`);
    }
    return { sent: true, messageId: data.id };
  }

  // 3. Fallback: Nodemailer SMTP
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('Email credentials are not configured on the server (BREVO_API_KEY, RESEND_API_KEY, or SMTP_USER/SMTP_PASS).');
  }

  const fromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '').trim();
  const info = await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html,
  });
  return { sent: true, messageId: info.messageId };
};

/**
 * Verify email connection
 */
const verifySMTP = async () => {
  if (!isConfigured()) {
    return { success: false, message: 'Email credentials (BREVO_API_KEY, RESEND_API_KEY, or SMTP_USER/SMTP_PASS) are not configured.' };
  }

  if (process.env.BREVO_API_KEY) {
    return { success: true, message: 'Brevo HTTPS API (Port 443) configured and active.' };
  }

  if (process.env.RESEND_API_KEY) {
    return { success: true, message: 'Resend HTTPS API configured and active.' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, message: 'Failed to initialize email transporter.' };
  }

  try {
    await transporter.verify();
    return { success: true, message: 'SMTP connection verified successfully.' };
  } catch (err) {
    console.error('❌ SMTP Verification Error:', err.message);
    return { success: false, message: err.message };
  }
};

/**
 * Send test email
 */
const sendTestEmail = async (targetEmail) => {
  if (!isConfigured()) {
    throw new Error('Email service is not configured in server environment variables.');
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Diverse Solutions Exam Portal';
  const fromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'debiprasaddiversesolutions@gmail.com').trim();

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: targetEmail,
    subject: `[Test Email] SMTP Connection Verified - Diverse Solutions Exam Portal`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SMTP Test</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" style="max-width: 580px; background: #1e293b; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
                <!-- Header -->
                <tr>
                  <td style="padding: 30px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">Diverse Solutions Exam Portal</h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">SMTP Gateway Verification</p>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 32px 28px;">
                    <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
                      <span style="font-size: 28px; display: block; margin-bottom: 6px;">🎉</span>
                      <strong style="color: #34d399; font-size: 16px; display: block;">SMTP Connection Successful!</strong>
                      <span style="color: #cbd5e1; font-size: 13px;">Your email configuration is operational and ready to send admin notifications.</span>
                    </div>

                    <table width="100%" cellpadding="8" cellspacing="0" style="background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid rgba(255,255,255,0.06); font-size: 13px; margin-bottom: 24px;">
                      <tr>
                        <td style="color: #94a3b8; width: 40%;">Host:</td>
                        <td style="color: #f8fafc; font-weight: 500;">${process.env.SMTP_HOST || 'smtp.gmail.com'}</td>
                      </tr>
                      <tr>
                        <td style="color: #94a3b8;">Port:</td>
                        <td style="color: #f8fafc; font-weight: 500;">${process.env.SMTP_PORT || '465'}</td>
                      </tr>
                      <tr>
                        <td style="color: #94a3b8;">Sender Account:</td>
                        <td style="color: #f8fafc; font-weight: 500;">${fromEmail}</td>
                      </tr>
                      <tr>
                        <td style="color: #94a3b8;">Timestamp:</td>
                        <td style="color: #f8fafc; font-weight: 500;">${new Date().toUTCString()}</td>
                      </tr>
                    </table>

                    <p style="margin: 0; color: #94a3b8; font-size: 13px; line-height: 1.6; text-align: center;">
                      This is an automated test email triggered from the Diverse Solutions Exam Portal Admin panel.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding: 20px; background-color: #0f172a; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                    <p style="margin: 0; color: #64748b; font-size: 12px;">© ${new Date().getFullYear()} Diverse Solutions. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  const info = await sendMailUnified({
    to: targetEmail,
    subject: mailOptions.subject,
    html: mailOptions.html,
  });
  return info;
};

/**
 * Send password reset OTP email to administrator
 */
const sendPasswordResetOtpEmail = async ({ toEmail, otp }) => {
  if (!isConfigured()) {
    throw new Error('Email service is not configured on the server.');
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Diverse Solutions Exam Portal';
  const fromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'debiprasaddiversesolutions@gmail.com').trim();

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: toEmail,
    subject: `Password Reset Verification Code: ${otp} - Diverse Solutions`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Verification</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="540" style="max-width: 540px; background: #1e293b; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
                
                <!-- Header -->
                <tr>
                  <td style="padding: 30px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Diverse Solutions Exam Portal</h1>
                    <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.85); font-size: 13px;">Administrator Password Recovery</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px 28px;">
                    <p style="margin: 0 0 16px 0; font-size: 15px; color: #f1f5f9; line-height: 1.5;">
                      Hello Administrator,
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                      We received a request to reset your password for the Diverse Solutions Exam Portal Admin panel. Use the verification code below to complete the reset:
                    </p>

                    <!-- OTP Code Card -->
                    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 22px; text-align: center; margin-bottom: 24px;">
                      <span style="font-size: 11px; font-weight: 600; letter-spacing: 1.5px; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; display: inline-block;">
                        ${otp}
                      </span>
                      <p style="margin: 10px 0 0 0; font-size: 12px; color: #f59e0b; font-weight: 500;">
                        ⏳ Valid for the next 15 minutes
                      </p>
                    </div>

                    <div style="background: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; padding: 12px 14px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                      <p style="margin: 0; color: #fca5a5; font-size: 12px; line-height: 1.5;">
                        <strong>Security Reminder:</strong> If you did not request a password reset, please ignore this email. Your current password remains secure.
                      </p>
                    </div>

                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                      Best regards,<br>
                      <strong style="color: #cbd5e1;">Diverse Solutions Security Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 18px; background-color: #0f172a; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                    <p style="margin: 0; color: #64748b; font-size: 11px;">
                      © ${new Date().getFullYear()} Diverse Solutions. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  const info = await sendMailUnified({
    to: toEmail,
    subject: mailOptions.subject,
    html: mailOptions.html,
  });
  console.log(`✉️ Password reset OTP email sent to ${toEmail} (MessageId: ${info.messageId})`);
  return { sent: true, messageId: info.messageId };
};

module.exports = {
  isConfigured,
  verifySMTP,
  sendTestEmail,
  sendPasswordResetOtpEmail,
  resetTransporter,
  getSubjectName,
};

2