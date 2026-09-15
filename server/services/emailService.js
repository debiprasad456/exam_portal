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
  return !!(process.env.RESEND_API_KEY || (process.env.SMTP_USER && process.env.SMTP_PASS));
};

/**
 * Unified email sender:
 * Uses Resend HTTPS API over port 443 if RESEND_API_KEY is configured (works on Render Free tier),
 * otherwise falls back to Nodemailer SMTP (Gmail, AWS SES, etc.).
 */
const sendMailUnified = async ({ to, subject, html }) => {
  if (process.env.RESEND_API_KEY) {
    const fromName = process.env.SMTP_FROM_NAME || 'Diverse Solutions Exam Portal';
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

  const transporter = getTransporter();
  if (!transporter) throw new Error('Email credentials are not configured on the server.');

  const fromName = process.env.SMTP_FROM_NAME || 'Diverse Solutions Exam Portal';
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
    return { success: false, message: 'Email credentials (RESEND_API_KEY or SMTP_USER/SMTP_PASS) are not configured.' };
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
    throw new Error('SMTP is not configured in server environment variables.');
  }

  const transporter = getTransporter();
  if (!transporter) throw new Error('Transporter initialization failed.');

  const fromName = process.env.SMTP_FROM_NAME || 'Diverse Solutions Exam Portal';
  const fromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '').trim();

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
                      <span style="color: #cbd5e1; font-size: 13px;">Your email configuration is operational and ready to send scorecards and notifications.</span>
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
 * Send candidate exam scorecard / result email
 */
const sendExamResultEmail = async ({ candidate, result, subjectTitle }) => {
  if (!isConfigured()) {
    console.warn('⚠️ SMTP not configured. Skipping exam result email.');
    return { sent: false, reason: 'SMTP not configured' };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { sent: false, reason: 'Transporter unavailable' };
  }

  const recipientEmail = candidate.email;
  const candidateName = candidate.name || 'Candidate';
  const displaySubject = subjectTitle || getSubjectName(candidate.subject || result.subject);

  const score = typeof result.score === 'number' ? result.score : 0;
  const totalQuestions = typeof result.totalQuestions === 'number' ? result.totalQuestions : 0;
  const percentage = typeof result.percentage === 'number' ? result.percentage : (totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0);

  const isPassed = percentage >= 50;
  const statusBadgeColor = isPassed ? '#10b981' : '#f59e0b';
  const statusBadgeBg = isPassed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  const statusBadgeText = isPassed ? 'PASSED' : 'NEEDS IMPROVEMENT';

  const fromName = process.env.SMTP_FROM_NAME || 'Diverse Solutions Exam Portal';
  const fromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '').trim();

  const formattedDate = new Date(result.createdAt || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: recipientEmail,
    subject: `Exam Scorecard: ${displaySubject} - Diverse Solutions`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Exam Scorecard</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="600" style="max-width: 600px; background: #1e293b; border-radius: 18px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                
                <!-- Hero Header -->
                <tr>
                  <td style="padding: 36px 30px; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%); text-align: center;">
                    <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 1px; color: #ffffff; text-transform: uppercase; margin-bottom: 12px; backdrop-filter: blur(4px);">
                      Official Examination Scorecard
                    </div>
                    <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Diverse Solutions</h1>
                    <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.9); font-size: 15px; font-weight: 500;">
                      ${displaySubject} Assessment
                    </p>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 36px 30px;">
                    <p style="margin: 0 0 20px 0; font-size: 16px; color: #f1f5f9; line-height: 1.5;">
                      Dear <strong style="color: #ffffff;">${candidateName}</strong>,
                    </p>
                    <p style="margin: 0 0 28px 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                      Thank you for completing your examination for <strong>${displaySubject}</strong>. Your answers have been graded. Below is your official performance summary:
                    </p>

                    <!-- Score Highlight Card -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; margin-bottom: 28px; overflow: hidden;">
                      <tr>
                        <td align="center" style="padding: 26px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
                          <span style="font-size: 12px; font-weight: 600; letter-spacing: 1px; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 8px;">Final Score</span>
                          <span style="font-size: 42px; font-weight: 800; color: #ffffff; letter-spacing: -1px; line-height: 1;">
                            ${score} <span style="font-size: 22px; color: #64748b; font-weight: 500;">/ ${totalQuestions}</span>
                          </span>
                          <div style="margin-top: 14px;">
                            <span style="display: inline-block; padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; color: ${statusBadgeColor}; background-color: ${statusBadgeBg}; border: 1px solid ${statusBadgeColor}40;">
                              ${percentage}% — ${statusBadgeText}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Candidate & Exam Details Table -->
                    <h3 style="margin: 0 0 14px 0; font-size: 14px; font-weight: 600; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px;">Candidate Information</h3>
                    <table width="100%" cellpadding="10" cellspacing="0" style="background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px solid rgba(255,255,255,0.06); font-size: 13px; margin-bottom: 28px;">
                      <tr>
                        <td style="color: #64748b; width: 35%; border-bottom: 1px solid rgba(255,255,255,0.04);">Candidate Name:</td>
                        <td style="color: #f1f5f9; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.04);">${candidateName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; border-bottom: 1px solid rgba(255,255,255,0.04);">Registered Email:</td>
                        <td style="color: #f1f5f9; border-bottom: 1px solid rgba(255,255,255,0.04);">${recipientEmail}</td>
                      </tr>
                      ${candidate.phone ? `
                      <tr>
                        <td style="color: #64748b; border-bottom: 1px solid rgba(255,255,255,0.04);">Phone:</td>
                        <td style="color: #f1f5f9; border-bottom: 1px solid rgba(255,255,255,0.04);">${candidate.phone}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="color: #64748b; border-bottom: 1px solid rgba(255,255,255,0.04);">Subject:</td>
                        <td style="color: #60a5fa; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.04);">${displaySubject}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b;">Submitted At:</td>
                        <td style="color: #f1f5f9;">${formattedDate}</td>
                      </tr>
                    </table>

                    <div style="background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3b82f6; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                      <p style="margin: 0; color: #93c5fd; font-size: 13px; line-height: 1.5;">
                        <strong>Next Steps:</strong> Our evaluation team has recorded your scorecard. If this exam is part of a hiring or certification process, our coordinators will get in touch with you regarding the next round.
                      </p>
                    </div>

                    <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.6;">
                      Best regards,<br>
                      <strong style="color: #cbd5e1;">Diverse Solutions Academic & HR Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 30px; background-color: #0f172a; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
                    <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px;">
                      This is an automated examination scorecard generated by the Diverse Solutions Exam Portal.
                    </p>
                    <p style="margin: 0; color: #475569; font-size: 11px;">
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
    to: recipientEmail,
    subject: mailOptions.subject,
    html: mailOptions.html,
  });
  console.log(`✉️ Scorecard email sent to ${recipientEmail} (MessageId: ${info.messageId})`);
  return { sent: true, messageId: info.messageId };
};

/**
 * Send password reset OTP email to administrator
 */
const sendPasswordResetOtpEmail = async ({ toEmail, otp }) => {
  if (!isConfigured()) {
    throw new Error('SMTP is not configured on the server.');
  }

  const transporter = getTransporter();
  if (!transporter) throw new Error('Transporter initialization failed.');

  const fromName = process.env.SMTP_FROM_NAME || 'Diverse Solutions Exam Portal';
  const fromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '').trim();

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
  sendExamResultEmail,
  sendPasswordResetOtpEmail,
  resetTransporter,
  getSubjectName,
};

