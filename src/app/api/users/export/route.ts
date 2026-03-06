import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { sendDiscordError } from "@/lib/discord";

export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        provider: true,
        emailVerified: true,
        banned: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const header = "id,name,email,provider,emailVerified,banned,createdAt";
    const rows = users.map((u) =>
      [u.id, `"${u.name}"`, u.email, u.provider, u.emailVerified, u.banned, u.createdAt.toISOString()].join(",")
    );
    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error("[users/export]", err);
    sendDiscordError("users/export", err);
    return NextResponse.json({ error: "Failed to export users" }, { status: 500 });
  }
}
