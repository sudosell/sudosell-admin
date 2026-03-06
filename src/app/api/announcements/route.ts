import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { sendDiscordError } from "@/lib/discord";

export async function GET() {
  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(announcements);
  } catch (err) {
    console.error("[announcements]", err);
    sendDiscordError("announcements", err);
    return NextResponse.json({ error: "Failed to fetch announcements" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { message } = await req.json();
    if (!message || typeof message !== "string" || message.trim().length < 1) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await prisma.announcement.updateMany({ where: { active: true }, data: { active: false } });

    const announcement = await prisma.announcement.create({
      data: { message: message.trim(), active: true },
    });

    logActivity({
      action: "admin.announcement.create",
      actor: session.discordId,
      actorType: "admin",
      target: announcement.id,
      targetType: "announcement",
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (err) {
    console.error("[announcements]", err);
    sendDiscordError("announcements", err);
    return NextResponse.json({ error: "Failed to create announcement" }, { status: 500 });
  }
}
