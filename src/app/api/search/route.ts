import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { sendDiscordError } from "@/lib/discord";

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ results: { users: [], tickets: [], purchases: [], products: [] } });
    }

    const [users, tickets, purchases, products] = await Promise.all([
      prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, email: true },
        take: 5,
      }),
      prisma.ticket.findMany({
        where: { subject: { contains: q, mode: "insensitive" } },
        select: { id: true, subject: true, status: true },
        take: 5,
      }),
      prisma.purchase.findMany({
        where: {
          OR: [
            { transactionId: { contains: q, mode: "insensitive" } },
            { user: { name: { contains: q, mode: "insensitive" } } },
            { user: { email: { contains: q, mode: "insensitive" } } },
          ],
        },
        select: {
          id: true,
          transactionId: true,
          status: true,
          totalPrice: true,
          user: { select: { name: true } },
        },
        take: 5,
      }),
      prisma.product.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        select: { id: true, name: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({ results: { users, tickets, purchases, products } });
  } catch (err) {
    console.error("[search]", err);
    sendDiscordError("search", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
