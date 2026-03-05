import { NextResponse } from "next/server";

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: `${appUrl}/api/auth/discord/callback`,
    response_type: "code",
    scope: "identify",
  });

  return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}
