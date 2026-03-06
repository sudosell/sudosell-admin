import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { sendTicketTranscriptEmail } from "@/lib/email";
import { deleteTicketFiles } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (err) {
    console.error("[tickets/id]", err);
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const session = await getAdminSession();

    const data: Record<string, unknown> = {};
    if (body.status) {
      if (!["open", "closed"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = body.status;
    }
    if (body.priority) {
      if (!["low", "medium", "high", "urgent"].includes(body.priority)) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
      }
      data.priority = body.priority;
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data,
      include: {
        user: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (session) {
      const action = body.priority ? "admin.ticket.priority_change" : (body.status === "closed" ? "admin.ticket.close" : "admin.ticket.reopen");
      logActivity({
        action,
        actor: session.discordId,
        actorType: "admin",
        target: id,
        targetType: "ticket",
        metadata: data as Record<string, string>,
      });
    }

    if (body.status === "closed") {
      sendTicketTranscriptEmail(
        ticket.user.email,
        ticket.user.name,
        ticket.subject,
        ticket.messages,
      ).catch((err) => console.error("[transcript email]", err));
    }

    return NextResponse.json(ticket);
  } catch (err) {
    console.error("[tickets/id]", err);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.status !== "closed") {
      return NextResponse.json({ error: "Only closed tickets can be deleted" }, { status: 400 });
    }

    await deleteTicketFiles(id).catch((err) =>
      console.error("[ticket/delete-files]", err),
    );

    await prisma.ticket.delete({ where: { id } });

    logActivity({
      action: "admin.ticket.delete",
      actor: session.discordId,
      actorType: "admin",
      target: id,
      targetType: "ticket",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[tickets/id DELETE]", err);
    return NextResponse.json({ error: "Failed to delete ticket" }, { status: 500 });
  }
}
