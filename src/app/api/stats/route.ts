import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveActors } from "@/lib/resolve-actors";

export async function GET() {
  try {
    const [users, purchases, openTickets, products, rawActivity] = await Promise.all([
      prisma.user.count(),
      prisma.purchase.findMany({ where: { status: "completed" }, select: { totalPrice: true } }),
      prisma.ticket.count({ where: { status: "open" } }),
      prisma.product.count(),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    const revenue = purchases.reduce((sum, p) => sum + p.totalPrice, 0);
    const recentActivity = await resolveActors(rawActivity);

    return NextResponse.json({
      users,
      revenue: revenue.toFixed(2),
      purchases: purchases.length,
      openTickets,
      products,
      recentActivity,
    });
  } catch (err) {
    console.error("[stats]", err);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
