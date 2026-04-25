'use strict';

const nodemailer = require('nodemailer');

function createTransport() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.warn('[mailer] SMTP_HOST / SMTP_USER / SMTP_PASS not fully set — emails will not be sent.');
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
    });
}

const transport = createTransport();

function appUrl() {
    return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function fromAddress() {
    return process.env.SMTP_FROM || `Northern Veterinary Service <${process.env.SMTP_USER}>`;
}

/**
 * Send an account verification email.
 * @param {string} toEmail  Recipient address.
 * @param {string} token    The raw hex verification token.
 */
async function sendVerificationEmail(toEmail, token) {
    if (!transport) {
        console.warn(`[mailer] Skipping verification email to ${toEmail} — SMTP not configured.`);
        return;
    }

    const verifyUrl = `${appUrl()}/api/auth/verify-email?token=${token}`;

    await transport.sendMail({
        from: fromAddress(),
        to: toEmail,
        subject: 'Verify your Northern Veterinary Service account',
        text: [
            'Thank you for registering with Northern Veterinary Service.',
            '',
            'Please verify your email address by clicking the link below:',
            verifyUrl,
            '',
            'This link expires in 24 hours.',
            '',
            'If you did not create this account you can safely ignore this email.',
        ].join('\n'),
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#2c5f2e">Northern Veterinary Service</h2>
  <p>Thank you for registering. Please verify your email address to activate your account.</p>
  <p style="margin:28px 0">
    <a href="${verifyUrl}"
       style="background:#2c5f2e;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold">
      Verify my email address
    </a>
  </p>
  <p style="font-size:13px;color:#666">
    Or copy and paste this link into your browser:<br>
    <a href="${verifyUrl}" style="color:#2c5f2e">${verifyUrl}</a>
  </p>
  <p style="font-size:13px;color:#666">This link expires in <strong>24 hours</strong>.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
  <p style="font-size:12px;color:#999">If you did not create this account you can safely ignore this email.</p>
</body>
</html>`
    });
}

module.exports = { sendVerificationEmail };
