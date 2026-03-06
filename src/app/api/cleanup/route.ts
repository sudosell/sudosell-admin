import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mainUrl = process.env.NEXT_PUBLIC_MAIN_URL ?? "http://localhost:3000";
  const secret = process.env.ADMIN_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET not configured" }, { status: 500 });
  }

  const res = await fetch(`${mainUrl}/api/admin/cleanup`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to run cleanup" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
