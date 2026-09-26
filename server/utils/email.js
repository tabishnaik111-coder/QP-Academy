import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });

  return transporter.sendMail({
    from: `"Quick Pen Academy" <${process.env.MAIL_USER}>`,
    to,
    subject,
    html,
  });
};