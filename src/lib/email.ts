import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM ?? "SudoSell <noreply@sudosell.com>";
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://sudosell.com";

export async function sendTicketReplyNotification(
  to: string,
  name: string,
  subject: string,
  ticketId: string,
) {
  const ticketUrl = `${SITE_URL}/dashboard/tickets/${ticketId}`;

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Re: ${subject} — SudoSell Support`,
    html: `
      <div style="background:#08080d;padding:40px 20px;font-family:system-ui,sans-serif">
        <div style="max-width:480px;margin:0 auto;background:#0d0d12;border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:32px">
          <h2 style="color:#fff;font-size:18px;margin:0 0 8px">Hi ${name},</h2>
          <p style="color:#9898ac;font-size:14px;line-height:1.6;margin:0 0 20px">
            An admin has replied to your support ticket <strong style="color:#fff">"${subject}"</strong>.
          </p>
          <a href="${ticketUrl}" style="display:inline-block;background:#b249f8;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:500">
            View Ticket
          </a>
          <p style="color:#4a4a5a;font-size:12px;margin:24px 0 0">SudoSell Support</p>
        </div>
      </div>
    `,
  });
}
