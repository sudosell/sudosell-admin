import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
    });

    const rows = ["Email,Subscribed At"];
    for (const s of subscribers) {
      rows.push(`${s.email},${s.createdAt.toISOString()}`);
    }

    logActivity({
      action: "admin.subscriber.export",
      actor: session.discordId,
      actorType: "admin",
      targetType: "subscriber",
      metadata: { count: subscribers.length },
    });

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    console.error("Subscribers export error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
