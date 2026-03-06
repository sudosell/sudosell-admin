import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { sendDiscordError } from "@/lib/discord";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, items, currency, note } = await req.json();

    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "userId and items are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const totalPrice = items.reduce((sum: number, i: { price: number }) => sum + (i.price || 0), 0);

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        basketIdent: `manual-${Date.now()}`,
        transactionId: `manual-${Date.now()}`,
        status: "completed",
        totalPrice,
        currency: currency || "USD",
        refundNote: note || null,
        items: {
          create: items.map((i: { packageId: number; name: string; price: number }) => ({
            packageId: i.packageId,
            name: i.name,
            price: i.price,
          })),
        },
      },
      include: { items: true },
    });

    logActivity({
      action: "admin.purchase.manual_create",
      actor: session.discordId,
      actorType: "admin",
      target: purchase.id,
      targetType: "purchase",
      metadata: { userId, totalPrice, itemCount: items.length },
    });

    return NextResponse.json(purchase, { status: 201 });
  } catch (err) {
    console.error("[purchases/manual]", err);
    sendDiscordError("purchases/manual", err);
    return NextResponse.json({ error: "Failed to create manual purchase" }, { status: 500 });
  }
}
