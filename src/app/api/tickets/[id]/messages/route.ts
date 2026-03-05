import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

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

    const ticket = await prisma.ticket.findUnique({ where: { id } });
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

    // Reopen ticket if it was closed when admin replies
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

    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    console.error("[tickets/id/messages]", err);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
