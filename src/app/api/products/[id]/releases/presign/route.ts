import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { getSignedUploadUrl } from "@/lib/s3";
import { sendDiscordError } from "@/lib/discord";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { version, fileName, contentType } = await req.json();

    if (!version || !fileName) {
      return NextResponse.json({ error: "Version and fileName are required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `releases/${id}/${version}/${safeName}`;

    const uploadUrl = await getSignedUploadUrl(
      fileKey,
      contentType || "application/octet-stream",
    );

    return NextResponse.json({ uploadUrl, fileKey });
  } catch (err) {
    console.error("[presign]", err);
    sendDiscordError("presign", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
