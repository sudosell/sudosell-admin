import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { deleteReleaseFile } from "@/lib/s3";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; releaseId: string }> },
) {
  try {
    const { id, releaseId } = await params;
    const session = await getAdminSession();

    const release = await prisma.release.findUnique({ where: { id: releaseId } });
    if (!release || release.productId !== id) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 });
    }

    await deleteReleaseFile(release.fileKey);
    await prisma.release.delete({ where: { id: releaseId } });

    if (session) {
      logActivity({
        action: "admin.release.delete",
        actor: session.discordId,
        actorType: "admin",
        target: releaseId,
        targetType: "release",
        metadata: { productId: id, version: release.version },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[products/id/releases/releaseId]", err);
    return NextResponse.json({ error: "Failed to delete release" }, { status: 500 });
  }
}
