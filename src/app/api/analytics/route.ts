import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const completedPurchases = await prisma.purchase.findMany({
      where: { status: "completed" },
      select: { userId: true, totalPrice: true },
    });

    const totalPurchases = completedPurchases.length;
    const totalRevenue = completedPurchases.reduce((s, p) => s + p.totalPrice, 0);
    const uniqueBuyers = new Set(completedPurchases.map((p) => p.userId));
    const buyerPurchaseCounts = new Map<string, number>();
    for (const p of completedPurchases) {
      buyerPurchaseCounts.set(p.userId, (buyerPurchaseCounts.get(p.userId) ?? 0) + 1);
    }
    const repeatBuyers = [...buyerPurchaseCounts.values()].filter((c) => c >= 2).length;

    const repeatBuyerRate = uniqueBuyers.size > 0
      ? Math.round((repeatBuyers / uniqueBuyers.size) * 100)
      : 0;
    const averageOrderValue = totalPurchases > 0
      ? Math.round((totalRevenue / totalPurchases) * 100) / 100
      : 0;

    const items = await prisma.purchaseItem.findMany({
      where: { purchase: { status: "completed" } },
      select: { packageId: true, name: true, price: true },
    });

    const productMap = new Map<number, { name: string; revenue: number; count: number }>();
    for (const item of items) {
      const entry = productMap.get(item.packageId) ?? { name: item.name, revenue: 0, count: 0 };
      entry.revenue += item.price;
      entry.count++;
      productMap.set(item.packageId, entry);
    }
    const revenueByProduct = [...productMap.entries()]
      .map(([packageId, data]) => ({ packageId, ...data, revenue: Math.round(data.revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue);

    const ticketCounts = await prisma.ticket.groupBy({
      by: ["userId"],
      _count: true,
    });
    const ticketByUser = new Map(ticketCounts.map((t) => [t.userId, t._count]));

    const purchasesByProduct = await prisma.purchaseItem.findMany({
      where: { purchase: { status: "completed" } },
      select: { packageId: true, name: true, purchase: { select: { userId: true } } },
    });

    const productTickets = new Map<number, { name: string; tickets: number }>();
    const productOwners = new Map<number, Set<string>>();
    for (const pi of purchasesByProduct) {
      if (!productOwners.has(pi.packageId)) {
        productOwners.set(pi.packageId, new Set());
        productTickets.set(pi.packageId, { name: pi.name, tickets: 0 });
      }
      const owners = productOwners.get(pi.packageId)!;
      if (!owners.has(pi.purchase.userId)) {
        owners.add(pi.purchase.userId);
        productTickets.get(pi.packageId)!.tickets += ticketByUser.get(pi.purchase.userId) ?? 0;
      }
    }
    const ticketsPerProduct = [...productTickets.entries()]
      .map(([packageId, data]) => ({ packageId, ...data }))
      .sort((a, b) => b.tickets - a.tickets);

    const topBuyersMap = new Map<string, { name: string; email: string; total: number }>();
    const usersForBuyers = await prisma.user.findMany({
      where: { id: { in: [...uniqueBuyers] } },
      select: { id: true, name: true, email: true },
    });
    const userLookup = new Map(usersForBuyers.map((u) => [u.id, u]));
    for (const p of completedPurchases) {
      const u = userLookup.get(p.userId);
      if (!u) continue;
      const entry = topBuyersMap.get(p.userId) ?? { name: u.name, email: u.email, total: 0 };
      entry.total += p.totalPrice;
      topBuyersMap.set(p.userId, entry);
    }
    const topBuyers = [...topBuyersMap.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((b) => ({ ...b, total: Math.round(b.total * 100) / 100 }));

    return NextResponse.json({
      repeatBuyerRate,
      averageOrderValue,
      revenueByProduct,
      ticketsPerProduct,
      topBuyers,
    });
  } catch (err) {
    console.error("[analytics]", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
