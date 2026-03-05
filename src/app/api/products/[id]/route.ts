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
    if (body.tebexPackageId) data.tebexPackageId = parseInt(body.tebexPackageId);
    if (typeof body.description === "string") data.description = body.description || null;
    if (typeof body.imageUrl === "string") data.imageUrl = body.imageUrl || null;

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
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
