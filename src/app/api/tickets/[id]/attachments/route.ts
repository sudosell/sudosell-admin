import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getSignedViewUrl } from "@/lib/s3";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const key = req.nextUrl.searchParams.get("key");

    if (!key || !key.startsWith(`tickets/${id}/`)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const url = await getSignedViewUrl(key);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[tickets/attachments]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
