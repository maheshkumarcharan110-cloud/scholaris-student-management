import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env.js";

type Message = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

let transporter: Transporter | null = null;

function getTransporter() {
  if (!env.smtpConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }
  return transporter;
}

/**
 * Sends transactional email when SMTP is configured. When it is not, the
 * message (including any one-time link) is written to the development console
 * only — never to the API response or production logs.
 */
export async function sendMail(message: Message) {
  const mailer = getTransporter();

  if (!mailer) {
    if (!env.isProduction) {
      console.log("\n[mail:not-configured] The following email was not delivered:");
      console.log(`  To: ${message.to}`);
      console.log(`  Subject: ${message.subject}`);
      console.log(`  ${message.text.replace(/\n/g, "\n  ")}\n`);
    } else {
      console.warn("[mail] SMTP is not configured; transactional email was skipped.");
    }
    return { delivered: false };
  }

  await mailer.sendMail({
    from: env.MAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
  return { delivered: true };
}

export function verificationEmail(name: string, link: string) {
  return {
    subject: "Verify your Scholaris email address",
    text: `Hello ${name},\n\nConfirm your email address to finish setting up your Scholaris account:\n${link}\n\nThis link expires in 24 hours. If you did not create an account, you can ignore this message.`,
    html: `<p>Hello ${escapeHtml(name)},</p><p>Confirm your email address to finish setting up your Scholaris account:</p><p><a href="${link}">Verify email address</a></p><p>This link expires in 24 hours. If you did not create an account, you can ignore this message.</p>`,
  };
}

export function emailChangeEmail(name: string, link: string, nextEmail: string) {
  return {
    subject: "Confirm your new Scholaris email address",
    text: `Hello ${name},\n\nConfirm ${nextEmail} as the new sign-in email for your Scholaris account:\n${link}\n\nThis link expires in 60 minutes. If you did not request this change, change your password immediately.`,
    html: `<p>Hello ${escapeHtml(name)},</p><p>Confirm <strong>${escapeHtml(nextEmail)}</strong> as the new sign-in email for your Scholaris account:</p><p><a href="${link}">Confirm email change</a></p><p>This link expires in 60 minutes. If you did not request this change, change your password immediately.</p>`,
  };
}

export function passwordResetEmail(name: string, link: string) {
  return {
    subject: "Reset your Scholaris password",
    text: `Hello ${name},\n\nUse this link to choose a new password:\n${link}\n\nThis link expires in 60 minutes and can be used once. If you did not request a reset, you can ignore this message.`,
    html: `<p>Hello ${escapeHtml(name)},</p><p>Use this link to choose a new password:</p><p><a href="${link}">Reset password</a></p><p>This link expires in 60 minutes and can be used once. If you did not request a reset, you can ignore this message.</p>`,
  };
}

export function approvalEmail(name: string, role: string) {
  return {
    subject: "Your Scholaris account has been approved",
    text: `Hello ${name},\n\nYour Scholaris account has been approved as ${role}. You can now sign in at ${env.appUrl}/login.\n\nWelcome aboard.`,
    html: `<p>Hello ${escapeHtml(name)},</p><p>Your Scholaris account has been approved as <strong>${escapeHtml(role)}</strong>.</p><p><a href="${env.appUrl}/login">Sign in to Scholaris</a></p>`,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
