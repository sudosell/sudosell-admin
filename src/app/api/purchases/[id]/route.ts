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
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json(purchase);
  } catch (err) {
    console.error("[purchases/id]", err);
    return NextResponse.json({ error: "Failed to fetch purchase" }, { status: 500 });
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

    if (!["pending", "completed", "declined"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const purchase = await prisma.purchase.update({
      where: { id },
      data: { status },
    });

    if (session) {
      logActivity({
        action: "admin.purchase.status_change",
        actor: session.discordId,
        actorType: "admin",
        target: id,
        targetType: "purchase",
        metadata: { status },
      });
    }

    return NextResponse.json(purchase);
  } catch (err) {
    console.error("[purchases/id]", err);
    return NextResponse.json({ error: "Failed to update purchase" }, { status: 500 });
  }
}
