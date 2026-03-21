import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { sendDiscordError } from "@/lib/discord";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { releases: { orderBy: { createdAt: "desc" } } },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (err) {
    console.error("[products/id]", err);
    sendDiscordError("products/id", err);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
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

    if (body.name) data.name = body.name;
    if (body.paddleProductId) data.paddleProductId = body.paddleProductId;
    if (typeof body.paddlePriceId === "string") data.paddlePriceId = body.paddlePriceId || null;
    if (typeof body.slug === "string" && body.slug.trim()) {
      // Check slug uniqueness (exclude current product)
      const existing = await prisma.product.findFirst({
        where: { slug: body.slug.trim(), NOT: { id } },
      });
      if (existing) {
        return NextResponse.json({ error: "A product with this slug already exists" }, { status: 400 });
      }
      data.slug = body.slug.trim();
    }
    if (typeof body.shortDescription === "string") data.shortDescription = body.shortDescription || null;
    if (typeof body.description === "string") data.description = body.description || null;
    if (typeof body.heroImage === "string") data.heroImage = body.heroImage || null;
    if (body.galleryImages !== undefined) data.galleryImages = body.galleryImages;
    if (typeof body.category === "string") data.category = body.category || null;
    if (body.tags !== undefined) data.tags = body.tags;
    if (body.features !== undefined) data.features = body.features;
    if (typeof body.status === "string") data.status = body.status;
    if (typeof body.price === "number") data.price = body.price;
    if (body.price === null) data.price = null;
    if (typeof body.currency === "string") data.currency = body.currency;

    const product = await prisma.product.update({ where: { id }, data });

    if (session) {
      logActivity({
        action: "admin.product.update",
        actor: session.discordId,
        actorType: "admin",
        target: id,
        targetType: "product",
        metadata: data as Record<string, string | number>,
      });
    }

    return NextResponse.json(product);
  } catch (err) {
    console.error("[products/id]", err);
    sendDiscordError("products/id", err);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getAdminSession();

    await prisma.product.delete({ where: { id } });

    if (session) {
      logActivity({
        action: "admin.product.delete",
        actor: session.discordId,
        actorType: "admin",
        target: id,
        targetType: "product",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[products/id]", err);
    sendDiscordError("products/id", err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
