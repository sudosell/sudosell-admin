import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
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
const SITE_URL = process.env.NEXT_PUBLIC_MAIN_URL ?? "https://sudosell.com";

function wrapInTemplate(subject: string, bodyHtml: string): string {
  return `
    <div style="background:#08080d;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif">
      <div style="max-width:600px;margin:0 auto;background:#0d0d12;border:1px solid rgba(255,255,255,0.06);border-radius:16px;overflow:hidden">
        <div style="height:3px;background:linear-gradient(90deg,#b249f8,#f649a7,#b249f8)"></div>
        <div style="padding:32px">
          <h1 style="color:#fff;font-size:22px;margin:0 0 24px;font-weight:700">${subject}</h1>
          <div style="color:#d0d0e0;font-size:14px;line-height:1.7">
            ${bodyHtml}
          </div>
          <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06)">
            <a href="${SITE_URL}" style="color:#b249f8;text-decoration:none;font-size:13px;font-weight:500">SudoSell</a>
            <p style="color:#4a4a5a;font-size:11px;margin:8px 0 0">You received this because you subscribed to SudoSell updates.</p>
          </div>
        </div>
      </div>
    </div>`;
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { subject, body, recipient } = await req.json();

  if (!subject || !body) {
    return new Response(JSON.stringify({ error: "Subject and body are required" }), { status: 400 });
  }

  const html = wrapInTemplate(subject, body);

  if (recipient && recipient !== "all") {
    try {
      await transporter.sendMail({ from: FROM, to: recipient, subject, html });
      return new Response(JSON.stringify({ success: true, sent: 1, total: 1 }));
    } catch (err) {
      console.error("Email send error:", err);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
    }
  }

  const subscribers = await prisma.subscriber.findMany({
    select: { email: true },
    orderBy: { createdAt: "asc" },
  });

  if (subscribers.length === 0) {
    return new Response(JSON.stringify({ error: "No subscribers found" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const total = subscribers.length;
      let sent = 0;
      let failed = 0;

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "start", total })}\n\n`));

      for (const sub of subscribers) {
        try {
          await transporter.sendMail({ from: FROM, to: sub.email, subject, html });
          sent++;
        } catch (err) {
          console.error(`Failed to send to ${sub.email}:`, err);
          failed++;
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "progress", sent, failed, total })}\n\n`)
        );
      }

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "done", sent, failed, total })}\n\n`)
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
