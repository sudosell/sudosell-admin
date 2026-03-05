import crypto from "crypto";
import { prisma } from "./db";

export async function dispatchWebhooks(
  tebexPackageId: number,
  payload: Record<string, unknown>,
) {
  const webhooks = await prisma.webhook.findMany({
    where: { packageId: tebexPackageId, active: true },
  });

  const body = JSON.stringify(payload);

  for (const wh of webhooks) {
    const signature = crypto
      .createHmac("sha256", wh.secret)
      .update(body)
      .digest("hex");

    fetch(wh.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(5000),
    }).catch(() => {
      // fire-and-forget — ignore delivery failures
    });
  }
}
