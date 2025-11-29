// backend/utils/sendEmail.js
const nodemailer = require("nodemailer");

async function sendEmail({ to, subject, html }) {
  // Create transporter using SMTP from env
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // true for 465, false for 587/other
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const from = process.env.EMAIL_FROM || "no-reply@example.com";

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  console.log("Email sent:", info.messageId);
}

module.exports = sendEmail;
