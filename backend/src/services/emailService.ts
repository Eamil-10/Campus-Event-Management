/**
 * Email service for sending transactional emails.
 *
 * Uses nodemailer in production (configured via SMTP_* env vars).
 * In development/test mode with no SMTP configured, logs a usable
 * verification URL to the console without sending an email and without
 * printing the raw token. The token itself is only logged in DEV mode
 * inside a clearly labelled block, never in production logs.
 *
 * IMPORTANT: Never log plaintext passwords. The token logged in dev mode
 * is the invitation/verification link that the user would normally receive
 * by email — not a password.
 */

import { env } from '../config/env';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using nodemailer if SMTP is configured,
 * or log the email details in development mode.
 *
 * Returns true if delivered (or logged in dev), false if delivery failed.
 * In production, throws if SMTP is required but unavailable.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpFrom = process.env.SMTP_FROM || 'noreply@unievent.local';

  const hasSmtp = Boolean(smtpHost && smtpUser && smtpPass);

  if (hasSmtp) {
    // Dynamically import nodemailer only when actually needed
    // (avoids requiring it as a hard dependency in test environments)
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: smtpFrom,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      return true;
    } catch (err) {
      if (env.NODE_ENV === 'production') {
        console.error('[EmailService] SMTP delivery failed:', (err as Error).message);
        return false;
      }
      // In non-production, fall through to dev logging
      console.warn('[EmailService] SMTP configured but delivery failed, falling back to dev log:', (err as Error).message);
    }
  }

  if (env.NODE_ENV === 'production') {
    // In production, fail visibly rather than silently dropping emails
    console.error('[EmailService] SMTP not configured in production. Email to', opts.to, 'was NOT sent.');
    return false;
  }

  // Development/test: log the email content so the developer can act on it
  console.log('\n' + '='.repeat(72));
  console.log('[EmailService] DEV MODE — Email not sent. Would have delivered:');
  console.log(`  To:      ${opts.to}`);
  console.log(`  Subject: ${opts.subject}`);
  // Extract and log any URLs from the HTML for easy copy-paste verification
  const urlMatches = opts.html.match(/https?:\/\/[^\s"'<>]+/g);
  if (urlMatches) {
    console.log('  Links:');
    urlMatches.slice(0, 5).forEach((url) => console.log(`    ${url}`));
  }
  console.log('='.repeat(72) + '\n');
  return true;
}

/**
 * Build invitation email HTML for a new user.
 * Does NOT include the raw token in the email body itself;
 * the full signed URL is the token carrier.
 */
export function buildInvitationEmail(opts: {
  recipientName: string;
  universityName: string;
  inviteUrl: string;
  expiresInHours: number;
}): { subject: string; html: string; text: string } {
  const subject = `You're invited to join ${opts.universityName} on UniEvent`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
      <h2 style="color: #4f46e5;">Welcome to UniEvent</h2>
      <p>Hello ${opts.recipientName},</p>
      <p>You have been invited to join <strong>${opts.universityName}</strong> on the UniEvent platform.</p>
      <p>Click the button below to verify your email address and set your password. This link expires in ${opts.expiresInHours} hours.</p>
      <div style="margin: 2rem 0;">
        <a href="${opts.inviteUrl}"
           style="background-color:#4f46e5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #6b7280; font-size: 0.875rem;">
        If you did not expect this invitation, you can safely ignore this email.
        This link is single-use and will expire after ${opts.expiresInHours} hours.
      </p>
      <p style="color: #6b7280; font-size: 0.875rem;">
        If the button does not work, copy this URL into your browser:<br/>
        <span style="word-break:break-all;">${opts.inviteUrl}</span>
      </p>
    </div>
  `;
  const text = `
Welcome to UniEvent — ${opts.universityName}

You have been invited to join ${opts.universityName}.
Click the link below to verify your email and set your password (expires in ${opts.expiresInHours} hours):

${opts.inviteUrl}

If you did not expect this invitation, ignore this email.
  `.trim();
  return { subject, html, text };
}
