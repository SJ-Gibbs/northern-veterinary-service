package uk.co.northernveterinaryservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import uk.co.northernveterinaryservice.config.AppProperties;

import jakarta.mail.internet.MimeMessage;

/**
 * Email sending service — mirrors server/lib/mailer.js.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private AppProperties appProperties;

    @Async
    public void sendVerificationEmail(String toEmail, String token) {
        if (mailSender == null) {
            log.warn("[mailer] Skipping verification email to {} — SMTP not configured.", toEmail);
            return;
        }
        String verifyUrl = appProperties.getUrl() + "/api/auth/verify-email?token=" + token;
        String html = """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"></head>
                <body style="font-family:Arial,sans-serif;color:#333;max-width:560px;margin:0 auto;padding:24px">
                  <h2 style="color:#2c5f2e">Northern Veterinary Service</h2>
                  <p>Thank you for registering. Please verify your email address to activate your account.</p>
                  <p style="margin:28px 0">
                    <a href="%s"
                       style="background:#2c5f2e;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold">
                      Verify my email address
                    </a>
                  </p>
                  <p style="font-size:13px;color:#666">Or copy and paste this link into your browser:<br>
                    <a href="%s" style="color:#2c5f2e">%s</a></p>
                  <p style="font-size:13px;color:#666">This link expires in <strong>24 hours</strong>.</p>
                  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
                  <p style="font-size:12px;color:#999">If you did not create this account you can safely ignore this email.</p>
                </body>
                </html>
                """.formatted(verifyUrl, verifyUrl, verifyUrl);

        String text = String.join("\n",
                "Thank you for registering with Northern Veterinary Service.",
                "",
                "Please verify your email address by clicking the link below:",
                verifyUrl,
                "",
                "This link expires in 24 hours.",
                "",
                "If you did not create this account you can safely ignore this email.");

        sendMail(toEmail, "Verify your Northern Veterinary Service account", text, html);
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String token) {
        if (mailSender == null) {
            log.warn("[mailer] Skipping password reset email to {} — SMTP not configured.", toEmail);
            return;
        }
        String resetUrl = appProperties.getUrl() + "/reset-password.html?token=" + token;
        String html = """
                <!DOCTYPE html>
                <html lang="en">
                <head><meta charset="UTF-8"></head>
                <body style="font-family:Arial,sans-serif;color:#333;max-width:560px;margin:0 auto;padding:24px">
                  <h2 style="color:#2c5f2e">Northern Veterinary Service</h2>
                  <p>We received a request to reset the password for your account.</p>
                  <p style="margin:28px 0">
                    <a href="%s"
                       style="background:#2c5f2e;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;font-weight:bold">
                      Reset my password
                    </a>
                  </p>
                  <p style="font-size:13px;color:#666">Or copy and paste this link into your browser:<br>
                    <a href="%s" style="color:#2c5f2e">%s</a></p>
                  <p style="font-size:13px;color:#666">This link expires in <strong>1 hour</strong>.</p>
                  <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
                  <p style="font-size:12px;color:#999">If you did not request a password reset you can safely ignore this email.</p>
                </body>
                </html>
                """.formatted(resetUrl, resetUrl, resetUrl);

        String text = String.join("\n",
                "We received a request to reset the password for your Northern Veterinary Service account.",
                "",
                "Click the link below to choose a new password:",
                resetUrl,
                "",
                "This link expires in 1 hour.",
                "",
                "If you did not request a password reset you can safely ignore this email.");

        sendMail(toEmail, "Reset your Northern Veterinary Service password", text, html);
    }

    private void sendMail(String to, String subject, String text, String html) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(appProperties.getSmtpFrom());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, html);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("[mailer] Failed to send email to {}: {}", to, e.getMessage());
        }
    }
}
