import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 30;
    const action = searchParams.get("action");
    const actorType = searchParams.get("actorType");
    const after = searchParams.get("after");
    const before = searchParams.get("before");

    const where: Prisma.ActivityLogWhereInput = {};
    if (action) where.action = { startsWith: action };
    if (actorType) where.actorType = actorType;
    if (after || before) {
      where.createdAt = {};
      if (after) where.createdAt.gte = new Date(after);
      if (before) where.createdAt.lte = new Date(before);
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("[activity]", err);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}
