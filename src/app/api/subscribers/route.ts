import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = 20;
    const search = searchParams.get("search") ?? "";

    const where = search
      ? { email: { contains: search, mode: "insensitive" as const } }
      : {};

    const [subscribers, total] = await Promise.all([
      prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscriber.count({ where }),
    ]);

    return NextResponse.json({
      subscribers,
      totalPages: Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error("Subscribers fetch error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.subscriber.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Subscriber delete error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
