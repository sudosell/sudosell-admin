import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { sendTicketReplyNotification } from "@/lib/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const after = req.nextUrl.searchParams.get("after");

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const messages = await prisma.ticketMessage.findMany({
      where: {
        ticketId: id,
        ...(after ? { createdAt: { gt: new Date(after) } } : {}),
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages, status: ticket.status }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[tickets/id/messages GET]", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { content } = await req.json();
    const session = await getAdminSession();

    if (!content || typeof content !== "string" || content.trim().length < 1) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id }, include: { user: { select: { name: true, email: true } } } });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        content: content.trim(),
        sender: "admin",
      },
    });

    if (ticket.status === "closed") {
      await prisma.ticket.update({ where: { id }, data: { status: "open" } });
    } else {
      await prisma.ticket.update({ where: { id }, data: { updatedAt: new Date() } });
    }

    if (session) {
      logActivity({
        action: "admin.ticket.reply",
        actor: session.discordId,
        actorType: "admin",
        target: id,
        targetType: "ticket",
      });
    }

    sendTicketReplyNotification(ticket.user.email, ticket.user.name, ticket.subject, id).catch((err) => console.error("[email]", err));

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("[tickets/id/messages]", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
