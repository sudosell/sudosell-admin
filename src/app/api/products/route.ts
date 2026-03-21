import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { sendDiscordError } from "@/lib/discord";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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

    const body = await req.json();
    const {
      name,
      paddleProductId,
      paddlePriceId,
      slug,
      shortDescription,
      description,
      heroImage,
      galleryImages,
      category,
      tags,
      features,
      status,
      price,
      currency,
    } = body;

    if (!name || !paddleProductId) {
      return NextResponse.json({ error: "Name and Paddle Product ID are required" }, { status: 400 });
    }

    const finalSlug = slug?.trim() || slugify(name);

    // Check slug uniqueness
    const existing = await prisma.product.findUnique({ where: { slug: finalSlug } });
    if (existing) {
      return NextResponse.json({ error: "A product with this slug already exists" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        paddleProductId,
        slug: finalSlug,
        ...(paddlePriceId && { paddlePriceId }),
        ...(shortDescription && { shortDescription }),
        ...(typeof description === "string" && { description }),
        ...(heroImage && { heroImage }),
        ...(galleryImages && { galleryImages }),
        ...(category && { category }),
        ...(tags && { tags }),
        ...(features && { features }),
        ...(status && { status }),
        ...(typeof price === "number" && { price }),
        ...(currency && { currency }),
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
