import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { sendNewReleaseEmail } from "@/lib/email";
import { dispatchWebhooks } from "@/lib/webhooks";
import { sendDiscordError } from "@/lib/discord";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const releases = await prisma.release.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(releases);
  } catch (err) {
    console.error("[products/id/releases]", err);
    sendDiscordError("products/id/releases", err);
    return NextResponse.json({ error: "Failed to fetch releases" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { version, patchNotes, fileKey, fileName, fileSize } = await req.json();

    if (!version || !fileKey || !fileName) {
      return NextResponse.json({ error: "version, fileKey, and fileName are required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const release = await prisma.release.create({
      data: {
        productId: id,
        version,
        patchNotes: patchNotes || null,
        fileKey,
        fileName,
        fileSize: fileSize || 0,
      },
    });

    logActivity({
      action: "admin.release.upload",
      actor: session.discordId,
      actorType: "admin",
      target: release.id,
      targetType: "release",
      metadata: { productId: id, version, fileName },
    });

    const dashboardUrl = `${process.env.NEXT_PUBLIC_MAIN_URL ?? "https://sudosell.com"}/dashboard?tab=assets`;
    try {
      const owners = await prisma.user.findMany({
        where: {
          purchases: {
            some: {
              status: "completed",
              items: { some: { packageId: product.tebexPackageId } },
            },
          },
        },
        select: { email: true, name: true },
      });

      await Promise.allSettled(
        owners.map((owner) =>
          sendNewReleaseEmail(
            owner.email, owner.name, product.name,
            version, patchNotes || null, dashboardUrl,
          ),
        ),
      );
    } catch (e) {
      console.error("[release-email]", e);
      sendDiscordError("release-email", e);
    }

    try {
      await dispatchWebhooks(product.tebexPackageId, {
        event: "release.published",
        product: { packageId: product.tebexPackageId, name: product.name },
        release: { version, patchNotes: patchNotes || null, fileName },
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[release-webhooks]", e);
      sendDiscordError("release-webhooks", e);
    }

    return NextResponse.json(release, { status: 201 });
  } catch (err) {
    console.error("[products/id/releases]", err);
    sendDiscordError("products/id/releases", err);
    return NextResponse.json({ error: "Failed to upload release" }, { status: 500 });
  }
}
