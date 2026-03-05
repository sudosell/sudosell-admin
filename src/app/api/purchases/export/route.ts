import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        user: { select: { name: true, email: true } },
        items: { select: { name: true, price: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const header = "id,user,email,status,total,currency,transactionId,items,date";
    const rows = purchases.map((p) =>
      [
        p.id,
        `"${p.user.name}"`,
        p.user.email,
        p.status,
        p.totalPrice.toFixed(2),
        p.currency,
        p.transactionId ?? "",
        `"${p.items.map((i) => i.name).join("; ")}"`,
        p.createdAt.toISOString(),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="purchases-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error("[purchases/export]", err);
    return NextResponse.json({ error: "Failed to export purchases" }, { status: 500 });
  }
}
