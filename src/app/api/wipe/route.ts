import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    if (body.confirm !== "WIPE ALL DATA") {
      return NextResponse.json(
        { error: "You must type 'WIPE ALL DATA' to confirm" },
        { status: 400 }
      );
    }

    // Delete in order (children before parents)
    const results: Record<string, number> = {};

    results.ticketMessages = (await prisma.ticketMessage.deleteMany()).count;
    results.tickets = (await prisma.ticket.deleteMany()).count;
    results.purchaseItems = (await prisma.purchaseItem.deleteMany()).count;
    results.purchases = (await prisma.purchase.deleteMany()).count;
    results.releases = (await prisma.release.deleteMany()).count;
    results.products = (await prisma.product.deleteMany()).count;
    results.webhooks = (await prisma.webhook.deleteMany()).count;
    results.subscribers = (await prisma.subscriber.deleteMany()).count;
    results.activityLogs = (await prisma.activityLog.deleteMany()).count;
    results.adminNotifications = (await prisma.adminNotification.deleteMany()).count;
    results.announcements = (await prisma.announcement.deleteMany()).count;
    results.users = (await prisma.user.deleteMany()).count;

    return NextResponse.json({ success: true, deleted: results });
  } catch (err) {
    console.error("[wipe]", err);
    return NextResponse.json({ error: "Wipe failed" }, { status: 500 });
  }
}
