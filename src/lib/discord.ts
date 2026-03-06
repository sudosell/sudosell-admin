const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const LOG_WEBHOOK_URL = process.env.DISCORD_LOG_WEBHOOK_URL;

interface Embed {
  title: string;
  description?: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
  footer?: { text: string };
}

function sendToWebhook(url: string, embeds: Embed[]): void {
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds }),
  }).catch(() => {});
}

export function sendDiscordNotification(embeds: Embed[]): void {
  if (!WEBHOOK_URL) return;
  sendToWebhook(WEBHOOK_URL, embeds);
}

export function sendDiscordLog(action: string, actor: string, actorType: string, details?: string): void {
  const url = LOG_WEBHOOK_URL ?? WEBHOOK_URL;
  if (!url) return;

  const colors: Record<string, number> = {
    "admin.login": 0xf649a7,
    "admin.ticket.reply": 0x8b5cf6,
    "admin.ticket.close": 0x6b7280,
    "admin.ticket.reopen": 0x22c55e,
    "admin.ticket.delete": 0xef4444,
    "admin.user.ban": 0xef4444,
    "admin.user.unban": 0x22c55e,
    "admin.user.update": 0x6366f1,
    "admin.user.delete": 0xef4444,
    "admin.release.upload": 0x06b6d4,
    "admin.release.delete": 0xef4444,
    "admin.product.create": 0x22c55e,
    "admin.purchase.update": 0xf59e0b,
  };

  sendToWebhook(url, [{
    title: action.replace(/\./g, " → "),
    description: details || undefined,
    color: colors[action] ?? 0x4a4a5a,
    fields: [
      { name: "Actor", value: actor, inline: true },
      { name: "Type", value: actorType, inline: true },
    ],
    footer: { text: "SudoSell Admin Log" },
    timestamp: new Date().toISOString(),
  }]);
}

export function sendDiscordError(route: string, error: unknown): void {
  const url = LOG_WEBHOOK_URL ?? WEBHOOK_URL;
  if (!url) return;

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack?.split("\n").slice(0, 3).join("\n") : undefined;

  sendToWebhook(url, [{
    title: "Admin Error",
    description: `**${route}**\n\`\`\`${message}\`\`\`${stack ? `\n\`\`\`${stack}\`\`\`` : ""}`,
    color: 0xef4444,
    footer: { text: "SudoSell Admin Error Log" },
    timestamp: new Date().toISOString(),
  }]);
}
