import { prisma } from "./db";
import { type Prisma } from "@/generated/prisma/client";

interface LogParams {
  action: string;
  actor: string;
  actorType: "user" | "admin" | "system";
  target?: string;
  targetType?: "user" | "ticket" | "purchase" | "product" | "release" | "announcement";
  metadata?: Prisma.InputJsonValue;
}

export function logActivity(params: LogParams): void {
  prisma.activityLog
    .create({ data: params })
    .catch((err) => console.error("[activity-log] Failed to log:", err));
}
