"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeleton";
import { usePolling } from "@/lib/hooks";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string; email: string };
  messages: Array<{ content: string; sender: string }>;
}

const priorities = ["all", "low", "medium", "high", "urgent"];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const pollParams = new URLSearchParams({ page: String(page) });
  if (status !== "all") pollParams.set("status", status);
  if (priority !== "all") pollParams.set("priority", priority);
  const pollUrl = `/api/tickets?${pollParams}`;

  const { loading } = usePolling<{ tickets: Ticket[]; totalPages: number }>({
    url: pollUrl,
    interval: 10000,
    onData: (data) => {
      if (data.tickets) {
        setTickets(data.tickets);
        setTotalPages(data.totalPages);
      }
    },
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Tickets</h2>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2">
          {["all", "open", "closed"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                status === s
                  ? "border-[#b249f8]/30 bg-[#b249f8]/10 text-[#b249f8]"
                  : "border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/[0.06]" />

        <div className="flex gap-2">
          {priorities.map((p) => (
            <button
              key={p}
              onClick={() => { setPriority(p); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                priority === p
                  ? "border-[#b249f8]/30 bg-[#b249f8]/10 text-[#b249f8]"
                  : "border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : tickets.length === 0 ? (
          <EmptyState message="No tickets found" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[#9898ac]">
                <th className="text-left px-4 py-3 font-medium">Subject</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Priority</th>
                <th className="text-left px-4 py-3 font-medium">Last Message</th>
                <th className="text-left px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t, i) => (
                <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100 animate-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3">
                    <Link href={`/tickets/${t.id}`} className="text-white hover:text-[#b249f8] transition-colors duration-150">{t.subject}</Link>
                  </td>
                  <td className="px-4 py-3 text-[#9898ac]">{t.user.name}</td>
                  <td className="px-4 py-3"><Badge value={t.status} /></td>
                  <td className="px-4 py-3"><Badge value={t.priority} /></td>
                  <td className="px-4 py-3 text-[#9898ac] max-w-xs truncate">
                    {t.messages[0] ? (
                      <><span className="text-[#4a4a5a]">[{t.messages[0].sender}]</span> {t.messages[0].content.slice(0, 60)}</>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-[#4a4a5a] tabular-nums">{new Date(t.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
