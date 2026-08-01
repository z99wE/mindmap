import nodemailer from 'nodemailer';

/**
 * Email service for sending notifications and magic links.
 * 
 * Supports multiple providers:
 * - Resend (recommended, free tier)
 * - SendGrid
 * - AWS SES
 * - Any SMTP server
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST || 'smtp.resend.com',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_SMTP_USER || 'resend',
    pass: process.env.EMAIL_SMTP_PASSWORD || '',
  },
});

/**
 * Send email
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: `"Thought GPS" <noreply@${process.env.EMAIL_DOMAIN || 'thoughtgps.com'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    
    console.log('Email sent', {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
    });
    
  } catch (error) {
    console.error('Failed to send email', {
      to: options.to,
      subject: options.subject,
      error,
    });
    
    throw error;
  }
}
