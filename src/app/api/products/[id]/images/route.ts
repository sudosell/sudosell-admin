import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { uploadTicketFile, getSignedViewUrl } from "@/lib/s3";
import { sendDiscordError } from "@/lib/discord";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `products/${id}/${timestamp}-${safeName}`;

    await uploadTicketFile(key, buffer, file.type || "application/octet-stream");
    const url = await getSignedViewUrl(key, 86400 * 7); // 7 day signed URL

    return NextResponse.json({ url, key });
  } catch (err) {
    console.error("[products/images]", err);
    sendDiscordError("products/images", err);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}
