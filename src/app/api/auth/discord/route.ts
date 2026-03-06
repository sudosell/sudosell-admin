import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const state = crypto.randomBytes(32).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: `${appUrl}/api/auth/discord/callback`,
    response_type: "code",
    scope: "identify",
    state,
  });

  const res = NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
