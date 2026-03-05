import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 20;
    const status = searchParams.get("status");

    const where = status ? { status } : {};

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
    return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
  }
}
