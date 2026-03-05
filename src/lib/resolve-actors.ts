import { prisma } from "./db";

interface RawLog {
  id: string;
  action: string;
  actor: string;
  actorType: string;
  target?: string | null;
  targetType?: string | null;
  metadata?: unknown;
  createdAt: Date;
}

export async function resolveActors(logs: RawLog[]) {
  const userIds = [...new Set(logs.filter((l) => l.actorType === "user").map((l) => l.actor))];

  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  return logs.map((log) => {
    const user = log.actorType === "user" ? userMap.get(log.actor) : null;
    return {
      ...log,
      actorLabel: user ? `${user.name} (${user.email})` : log.actor,
    };
  });
}
