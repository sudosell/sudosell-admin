import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { uploadTicketFile } from "@/lib/s3";
import crypto from "crypto";

const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File size must be under 25MB" },
        { status: 400 },
      );
    }

    const uuid = crypto.randomUUID();
    const ext = file.name.split(".").pop() || "bin";
    const key = `tickets/${id}/${uuid}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadTicketFile(key, buffer, file.type);

    return NextResponse.json({
      key,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (err) {
    console.error("[tickets/upload]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
