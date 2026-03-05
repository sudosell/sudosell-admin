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
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        purchases: { include: { items: true }, orderBy: { createdAt: "desc" } },
        tickets: { orderBy: { updatedAt: "desc" } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const activity = await prisma.activityLog.findMany({
      where: { actor: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ user, activity });
  } catch (err) {
    console.error("[users/id]", err);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
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
    if (typeof body.emailVerified === "boolean") data.emailVerified = body.emailVerified;

    const user = await prisma.user.update({ where: { id }, data });

    if (session) {
      logActivity({
        action: "admin.user.update",
        actor: session.discordId,
        actorType: "admin",
        target: id,
        targetType: "user",
        metadata: data as Record<string, boolean>,
      });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("[users/id]", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
