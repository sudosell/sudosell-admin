import { NextResponse } from "next/server";
import { setAdminCookie } from "@/lib/auth";
import { logActivity } from "@/lib/activity-log";
import { sendDiscordError } from "@/lib/discord";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
}

interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
}

const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=no_code`);
  }

  const cookieHeader = req.headers.get("cookie") ?? "";
  const storedState = cookieHeader.match(/oauth_state=([^;]+)/)?.[1];
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_state`);
  }

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${appUrl}/api/auth/discord/callback`,
      }),
    });

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${appUrl}/login?error=token_failed`);
    }

    const tokens: DiscordTokenResponse = await tokenRes.json();

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `${tokens.token_type} ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(`${appUrl}/login?error=user_failed`);
    }

    const discordUser: DiscordUser = await userRes.json();

    if (!ADMIN_IDS.includes(discordUser.id)) {
      return NextResponse.redirect(`${appUrl}/login?error=unauthorized`);
    }

    const avatar = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    await setAdminCookie({
      discordId: discordUser.id,
      username: discordUser.global_name ?? discordUser.username,
      avatar,
    });

    logActivity({
      action: "admin.login",
      actor: discordUser.id,
      actorType: "admin",
      metadata: { username: discordUser.global_name ?? discordUser.username },
    });

    const response = NextResponse.redirect(`${appUrl}/dashboard`);
    response.cookies.delete("oauth_state");
    return response;
  } catch (err) {
    console.error("[auth/discord/callback]", err);
    sendDiscordError("auth/discord/callback", err);
    return NextResponse.redirect(`${appUrl}/login?error=failed`);
  }
}
