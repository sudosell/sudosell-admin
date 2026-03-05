const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

interface Embed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
}

export function sendDiscordNotification(embeds: Embed[]): void {
  if (!WEBHOOK_URL) return;
  fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds }),
  }).catch((err) => console.error("[discord]", err));
}
