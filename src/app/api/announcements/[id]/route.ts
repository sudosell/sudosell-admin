import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { sendDiscordError } from "@/lib/discord";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data: Record<string, unknown> = {};

    if (typeof body.active === "boolean") {
      if (body.active) {
        await prisma.announcement.updateMany({ where: { active: true }, data: { active: false } });
      }
      data.active = body.active;
    }
    if (typeof body.message === "string") data.message = body.message.trim();

    const announcement = await prisma.announcement.update({ where: { id }, data });

    logActivity({
      action: "admin.announcement.update",
      actor: session.discordId,
      actorType: "admin",
      target: id,
      targetType: "announcement",
    });

    return NextResponse.json(announcement);
  } catch (err) {
    console.error("[announcements/id]", err);
    sendDiscordError("announcements/id", err);
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await prisma.announcement.delete({ where: { id } });

    logActivity({
      action: "admin.announcement.delete",
      actor: session.discordId,
      actorType: "admin",
      target: id,
      targetType: "announcement",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[announcements/id]", err);
    sendDiscordError("announcements/id", err);
    return NextResponse.json({ error: "Failed to delete announcement" }, { status: 500 });
  }
}
