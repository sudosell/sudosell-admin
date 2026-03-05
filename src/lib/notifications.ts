import { prisma } from "./db";
import { type Prisma } from "@/generated/prisma/client";

interface NotificationParams {
  type: string;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

export function createNotification(params: NotificationParams): void {
  prisma.adminNotification
    .create({ data: params })
    .catch((err) => console.error("[notifications] Failed to create:", err));
}
