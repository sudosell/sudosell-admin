import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const period = req.nextUrl.searchParams.get("period") ?? "daily";
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [purchases, users] = await Promise.all([
      prisma.purchase.findMany({
        where: { status: "completed", createdAt: { gte: since } },
        include: { items: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const getKey = (date: Date) => {
      if (period === "weekly") {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        return d.toISOString().split("T")[0];
      }
      if (period === "monthly") {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
      return date.toISOString().split("T")[0];
    };

    const revenueMap = new Map<string, number>();
    const userMap = new Map<string, number>();
    const productMap = new Map<string, { name: string; revenue: number; count: number }>();

    for (const p of purchases) {
      const key = getKey(p.createdAt);
      revenueMap.set(key, (revenueMap.get(key) ?? 0) + p.totalPrice);
      for (const item of p.items) {
        const existing = productMap.get(item.name) ?? { name: item.name, revenue: 0, count: 0 };
        existing.revenue += item.price;
        existing.count += 1;
        productMap.set(item.name, existing);
      }
    }

    for (const u of users) {
      const key = getKey(u.createdAt);
      userMap.set(key, (userMap.get(key) ?? 0) + 1);
    }

    const allKeys = new Set([...revenueMap.keys(), ...userMap.keys()]);
    const sortedKeys = [...allKeys].sort();

    const revenueData = sortedKeys.map((date) => ({
      date,
      revenue: Math.round((revenueMap.get(date) ?? 0) * 100) / 100,
    }));

    const userGrowth = sortedKeys.map((date) => ({
      date,
      users: userMap.get(date) ?? 0,
    }));

    const topProducts = [...productMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return NextResponse.json({ revenueData, userGrowth, topProducts, period });
  } catch (err) {
    console.error("[charts]", err);
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
