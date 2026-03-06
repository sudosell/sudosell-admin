import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { resolveActors } from "@/lib/resolve-actors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, image: true, provider: true,
        emailVerified: true, banned: true, banReason: true, adminNotes: true,
        createdAt: true, updatedAt: true,
        purchases: { include: { items: true }, orderBy: { createdAt: "desc" } },
        tickets: { orderBy: { updatedAt: "desc" } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const rawActivity = await prisma.activityLog.findMany({
      where: { actor: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const activity = await resolveActors(rawActivity);

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
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (typeof body.emailVerified === "boolean") data.emailVerified = body.emailVerified;
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (typeof body.email === "string" && body.email.trim()) data.email = body.email.trim();
    if (typeof body.banned === "boolean") data.banned = body.banned;
    if (typeof body.banReason === "string") data.banReason = body.banReason || null;
    if (typeof body.adminNotes === "string") data.adminNotes = body.adminNotes || null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true, image: true, provider: true,
        emailVerified: true, banned: true, banReason: true, adminNotes: true,
        createdAt: true, updatedAt: true,
      },
    });

    logActivity({
      action: body.banned !== undefined ? (body.banned ? "admin.user.ban" : "admin.user.unban") : "admin.user.update",
      actor: session.discordId,
      actorType: "admin",
      target: id,
      targetType: "user",
      metadata: data as Record<string, boolean>,
    });

    return NextResponse.json(user);
  } catch (err) {
    console.error("[users/id]", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    await prisma.user.delete({ where: { id } });

    logActivity({
      action: "admin.user.delete",
      actor: session.discordId,
      actorType: "admin",
      target: id,
      targetType: "user",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[users/id]", err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
