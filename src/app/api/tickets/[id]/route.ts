import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

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
    const { status } = await req.json();
    const session = await getAdminSession();

    if (!["open", "closed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status },
    });

    if (session) {
      logActivity({
        action: status === "closed" ? "admin.ticket.close" : "admin.ticket.reopen",
        actor: session.discordId,
        actorType: "admin",
        target: id,
        targetType: "ticket",
      });
    }

    return NextResponse.json(ticket);
  } catch (err) {
    console.error("[tickets/id]", err);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
