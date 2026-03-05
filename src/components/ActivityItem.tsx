import Badge from "./Badge";

interface ActivityLog {
  id: string;
  action: string;
  actor: string;
  actorType: string;
  actorLabel?: string;
  target?: string | null;
  targetType?: string | null;
  createdAt: string;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
});

export default function ActivityItem({ log }: { log: ActivityLog }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-medium text-white font-mono">{log.action}</span>
          <Badge value={log.actorType} />
        </div>
        <p className="text-xs text-[#9898ac] truncate">
          {log.actorLabel ?? log.actor}
          {log.target && <> &middot; {log.target}</>}
        </p>
      </div>
      <span className="text-xs text-[#4a4a5a] whitespace-nowrap tabular-nums">
        {timeFormatter.format(new Date(log.createdAt))}
      </span>
    </div>
  );
}
