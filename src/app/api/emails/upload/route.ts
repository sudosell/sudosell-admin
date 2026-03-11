import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { uploadTicketFile } from "@/lib/s3";
import { getSignedViewUrl } from "@/lib/s3";
import crypto from "crypto";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export async function POST(req: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "Max 5MB" }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Only images allowed" }, { status: 400 });

    const uuid = crypto.randomUUID();
    const ext = file.name.split(".").pop() || "png";
    const key = `emails/${uuid}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadTicketFile(key, buffer, file.type);
    const url = await getSignedViewUrl(key, 86400 * 7);

    return NextResponse.json({ url, key });
  } catch (err) {
    console.error("[emails/upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
