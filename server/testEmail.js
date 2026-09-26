import dotenv from "dotenv";
dotenv.config();

console.log("=================================");
console.log("QPA EMAIL TEST STARTING");
console.log("=================================");

console.log("MAIL_USER:", process.env.MAIL_USER ? "FOUND" : "MISSING");
console.log("MAIL_PASSWORD:", process.env.MAIL_PASSWORD ? "FOUND" : "MISSING");

const testEmail = async () => {
  try {
    console.log("Loading email utility...");

    const { sendEmail } = await import("./utils/email.js");

    console.log("Email utility loaded.");
    console.log("Sending test email...");

    await sendEmail({
      to: process.env.MAIL_USER,
      subject: "QPA Email Test",
      html: `
        <!DOCTYPE html>
        <html>
          <body style="margin:0;padding:40px 20px;background:#f4f4f5;font-family:Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:40px;border-radius:12px;">
              <h1 style="margin:0 0 20px;font-size:28px;">Quick Pen Academy</h1>
              <p style="font-size:16px;line-height:1.6;">This is a test email from your QPA backend.</p>
              <p style="font-size:16px;line-height:1.6;">If you received this email, your Gmail and Nodemailer configuration is working correctly.</p>
              <p style="margin-top:30px;font-size:14px;color:#666666;">Quick Pen Academy — QPA</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("");
    console.log("=================================");
    console.log("✅ TEST EMAIL SENT SUCCESSFULLY");
    console.log("=================================");
    console.log(`Sent to: ${process.env.MAIL_USER}`);
  } catch (error) {
    console.log("");
    console.log("=================================");
    console.log("❌ EMAIL TEST FAILED");
    console.log("=================================");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error command:", error.command);
  }
};

testEmail();