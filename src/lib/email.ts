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

interface TranscriptMessage {
  sender: string;
  content: string;
  createdAt: string | Date;
}

export async function sendTicketTranscriptEmail(
  to: string,
  name: string,
  subject: string,
  messages: TranscriptMessage[],
) {
  const messagesHtml = messages
    .map((m) => {
      const date = new Date(String(m.createdAt)).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
      });
      const label = m.sender === "admin" ? "Admin" : name;
      const color = m.sender === "admin" ? "#b249f8" : "#9898ac";
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);">
            <p style="margin:0 0 4px;font-size:12px;">
              <strong style="color:${color};">${label}</strong>
              <span style="color:#4a4a5a;margin-left:8px;">${date}</span>
            </p>
            <p style="margin:0;font-size:13px;color:#d0d0e0;line-height:1.5;white-space:pre-wrap;">${m.content}</p>
          </td>
        </tr>`;
    })
    .join("");

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Ticket Closed: ${subject} — SudoSell Support`,
    html: `
      <div style="background:#08080d;padding:40px 20px;font-family:system-ui,sans-serif">
        <div style="max-width:560px;margin:0 auto;background:#0d0d12;border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden">
          <div style="height:3px;background:linear-gradient(90deg,#b249f8,#f649a7,#b249f8)"></div>
          <div style="padding:32px">
            <h2 style="color:#fff;font-size:18px;margin:0 0 8px">Ticket Closed</h2>
            <p style="color:#9898ac;font-size:14px;line-height:1.6;margin:0 0 24px">
              Hi ${name}, your support ticket <strong style="color:#fff">"${subject}"</strong> has been closed. Below is the full conversation transcript for your records.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden">
              ${messagesHtml}
            </table>
            <p style="color:#4a4a5a;font-size:12px;margin:24px 0 0">If you need further help, feel free to open a new ticket. &mdash; SudoSell Support</p>
          </div>
        </div>
      </div>
    `,
  });
}

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
