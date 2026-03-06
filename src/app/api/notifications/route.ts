import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { sendDiscordError } from "@/lib/discord";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const unreadOnly = req.nextUrl.searchParams.get("unreadOnly") === "true";
    const where = unreadOnly ? { read: false } : {};

    const [notifications, unreadCount] = await Promise.all([
      prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.adminNotification.count({ where: { read: false } }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    console.error("[notifications]", err);
    sendDiscordError("notifications", err);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ids } = await req.json();

    if (ids && Array.isArray(ids)) {
      await prisma.adminNotification.updateMany({
        where: { id: { in: ids } },
        data: { read: true },
      });
    } else {
      await prisma.adminNotification.updateMany({
        where: { read: false },
        data: { read: true },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications]", err);
    sendDiscordError("notifications", err);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }
}
