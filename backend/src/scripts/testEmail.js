require('dotenv').config();
const { sendEmail } = require('../services/emailService');

const recipient = process.argv[2] || process.env.SMTP_USER || 'test@example.com';

console.log('─── Testing StockSim Email Service (Nodemailer + Brevo) ───');
console.log(`SMTP Host: ${process.env.SMTP_HOST || 'smtp-relay.brevo.com'}`);
console.log(`SMTP Port: ${process.env.SMTP_PORT || 587}`);
console.log(`SMTP User: ${process.env.SMTP_USER || '(None configured)'}`);
console.log(`SMTP Pass: ${process.env.SMTP_PASS ? '********' : '(None configured)'}`);
console.log(`Recipient: ${recipient}`);
console.log('────────────────────────────────────────────────────────────');

const testSend = async () => {
  try {
    const result = await sendEmail({
      to: recipient,
      subject: '🔔 StockSim SMTP Brevo Test',
      text: 'This is a test email sent from the StockSim simulated trading application using Nodemailer + Brevo.',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; border-radius: 8px; background-color: #020617; color: #f8fafc;">
          <h2 style="color: #10b981; border-bottom: 1px solid #1e293b; padding-bottom: 10px; margin-top: 0;">🔔 SMTP Connection Active</h2>
          <p>Hi there,</p>
          <p>This is a high-priority test email confirming that your <strong>Nodemailer + Brevo SMTP relay connection</strong> is successfully configured and working!</p>
          <p style="color: #38bdf8; font-weight: bold;">Connection status: OK</p>
        </div>
      `
    });

    if (result.mock) {
      console.log('\n⚠️  EMAIL SENT VIA MOCK MODE: SMTP credentials are not configured in your backend/.env file.');
      console.log('To enable real emails, please sign up for a free Brevo account (https://www.brevo.com/), obtain your SMTP credentials, and add them to backend/.env:');
      console.log('  SMTP_USER=<your-brevo-registered-email>');
      console.log('  SMTP_PASS=<your-brevo-smtp-key>');
    } else {
      console.log('\n✅ SUCCESS: Email sent successfully via Brevo SMTP!');
      console.log(`Message ID: ${result.messageId}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR: SMTP Email send failed:', err.message);
    process.exit(1);
  }
};

testSend();
