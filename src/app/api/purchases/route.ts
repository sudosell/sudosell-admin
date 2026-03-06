import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { sendDiscordError } from "@/lib/discord";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 20;
    const status = searchParams.get("status");
    const after = searchParams.get("after");
    const before = searchParams.get("before");

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (after || before) {
      where.createdAt = {} as Record<string, Date>;
      if (after) (where.createdAt as Record<string, Date>).gte = new Date(after);
      if (before) (where.createdAt as Record<string, Date>).lte = new Date(before);
    }

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          items: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.purchase.count({ where }),
    ]);

    return NextResponse.json({ purchases, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[purchases]", err);
    sendDiscordError("purchases", err);
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}
