import crypto from "crypto";
import { prisma } from "./db";

function isDiscordWebhook(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "discord.com" && parsed.pathname.startsWith("/api/webhooks/");
  } catch {
    return false;
  }
}

function buildDiscordPayload(payload: Record<string, unknown>) {
  const product = payload.product as { name?: string } | undefined;
  const release = payload.release as { version?: string; patchNotes?: string | null; fileName?: string } | undefined;

  const fields = [];
  if (release?.version) fields.push({ name: "Version", value: release.version, inline: true });
  if (release?.fileName) fields.push({ name: "File", value: release.fileName, inline: true });

  return {
    embeds: [{
      title: `New Release: ${product?.name ?? "Unknown Product"}`,
      description: release?.patchNotes || "A new version has been published.",
      color: 0xb249f8,
      fields,
      footer: { text: "SudoSell" },
      timestamp: payload.timestamp as string ?? new Date().toISOString(),
    }],
  };
}

export async function dispatchWebhooks(
  paddleProductId: string,
  payload: Record<string, unknown>,
) {
  const webhooks = await prisma.webhook.findMany({
    where: { packageId: paddleProductId, active: true },
  });

  await Promise.allSettled(
    webhooks.map((wh) => {
      if (isDiscordWebhook(wh.url)) {
        return fetch(wh.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildDiscordPayload(payload)),
          signal: AbortSignal.timeout(5000),
        });
      }

      const body = JSON.stringify(payload);
      const signature = crypto
        .createHmac("sha256", wh.secret)
        .update(body)
        .digest("hex");

      return fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(5000),
      });
    }),
  );
}
