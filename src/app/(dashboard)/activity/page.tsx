"use client";

import { useEffect, useState, useCallback } from "react";
import ActivityItem from "@/components/ActivityItem";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeleton";
import { useDebounce } from "@/lib/hooks";

interface ActivityLog {
  id: string;
  action: string;
  actor: string;
  actorType: string;
  target?: string | null;
  targetType?: string | null;
  createdAt: string;
}

const actorTypes = ["all", "user", "admin", "system"];

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actorType, setActorType] = useState("all");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const debouncedAction = useDebounce(action);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (actorType !== "all") params.set("actorType", actorType);
    if (debouncedAction) params.set("action", debouncedAction);
    fetch(`/api/activity?${params}`)
      .then((r) => r.json())
      .then((data) => { setLogs(data.logs); setTotalPages(data.totalPages); })
      .finally(() => setLoading(false));
  }, [page, actorType, debouncedAction]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Activity Log</h2>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2">
          {actorTypes.map((t) => (
            <button
              key={t}
              onClick={() => { setActorType(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                actorType === t
                  ? "border-[#b249f8]/30 bg-[#b249f8]/10 text-[#b249f8]"
                  : "border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Filter by action..."
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
          className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-[#0d0d12] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150"
        />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5">
        {loading ? (
          <TableSkeleton rows={10} cols={3} />
        ) : logs.length === 0 ? (
          <EmptyState message="No activity logs found" />
        ) : (
          logs.map((log, i) => (
            <div key={log.id} className="animate-in" style={{ animationDelay: `${i * 20}ms` }}>
              <ActivityItem log={log} />
            </div>
          ))
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
