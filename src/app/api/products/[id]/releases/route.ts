import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { uploadReleaseFile } from "@/lib/s3";
import { sendNewReleaseEmail } from "@/lib/email";
import { dispatchWebhooks } from "@/lib/webhooks";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const releases = await prisma.release.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(releases);
  } catch (err) {
    console.error("[products/id/releases]", err);
    return NextResponse.json({ error: "Failed to fetch releases" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getAdminSession();

    const formData = await req.formData();
    const version = formData.get("version") as string;
    const patchNotes = formData.get("patchNotes") as string | null;
    const file = formData.get("file") as File | null;

    if (!version || !file) {
      return NextResponse.json({ error: "Version and file are required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileKey = `releases/${id}/${version}/${file.name}`;

    await uploadReleaseFile(fileKey, buffer, file.type || "application/octet-stream");

    const release = await prisma.release.create({
      data: {
        productId: id,
        version,
        patchNotes: patchNotes || null,
        fileKey,
        fileName: file.name,
        fileSize: buffer.length,
      },
    });

    if (session) {
      logActivity({
        action: "admin.release.upload",
        actor: session.discordId,
        actorType: "admin",
        target: release.id,
        targetType: "release",
        metadata: { productId: id, version, fileName: file.name },
      });
    }

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
    }

    try {
      await dispatchWebhooks(product.tebexPackageId, {
        event: "release.published",
        product: { packageId: product.tebexPackageId, name: product.name },
        release: { version, patchNotes: patchNotes || null, fileName: file.name },
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[release-webhooks]", e);
    }

    return NextResponse.json(release, { status: 201 });
  } catch (err) {
    console.error("[products/id/releases]", err);
    return NextResponse.json({ error: "Failed to upload release" }, { status: 500 });
  }
}
