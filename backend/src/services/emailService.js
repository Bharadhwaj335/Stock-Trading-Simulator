const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const isMock = !smtpUser || !smtpPass || 
                   smtpUser.includes('replace_with') || 
                   smtpPass.includes('replace_with');

    // If SMTP_USER or SMTP_PASS is missing or has placeholder values, mock success.
    if (isMock) {
      logger.info(`[Email MOCK] Sending email to ${to}: "${subject}". (SMTP credentials missing or placeholders, skipping real send)`);
      return { mock: true };
    }

    const info = await transporter.sendMail({
      from: `"StockSim Alerts" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    logger.info(`[Email Service] Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`[Email Service] Failed to send email to ${to}:`, err.message);
    throw err;
  }
};

module.exports = { sendEmail };
