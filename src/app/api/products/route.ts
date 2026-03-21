import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { sendDiscordError } from "@/lib/discord";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const products = await prisma.product.findMany({
      include: { _count: { select: { releases: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (err) {
    console.error("[products]", err);
    sendDiscordError("products", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, paddleProductId, description, imageUrl } = await req.json();

    if (!name || !paddleProductId) {
      return NextResponse.json({ error: "Name and Paddle Product ID are required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        paddleProductId,
        ...(description && { description }),
        ...(imageUrl && { imageUrl }),
      },
    });

    logActivity({
      action: "admin.product.create",
      actor: session.discordId,
      actorType: "admin",
      target: product.id,
      targetType: "product",
      metadata: { name, paddleProductId },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error("[products]", err);
    sendDiscordError("products", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
