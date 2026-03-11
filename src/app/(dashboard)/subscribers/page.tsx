"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Download, Trash2, Mail } from "lucide-react";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeleton";
import { useDebounce } from "@/lib/hooks";

interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
}

interface SubscribersResponse {
  subscribers: Subscriber[];
  totalPages: number;
  total: number;
}

export default function SubscribersPage() {
  const [data, setData] = useState<SubscribersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search);

  const fetchSubscribers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch(`/api/subscribers?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  async function handleDelete(id: string) {
    if (!confirm("Remove this subscriber?")) return;
    setDeleting(id);
    try {
      await fetch("/api/subscribers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchSubscribers();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Subscribers</h2>
          {data && (
            <p className="text-sm text-[#9898ac] mt-0.5">{data.total} total</p>
          )}
        </div>
        <a
          href="/api/subscribers/export"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150"
        >
          <Download size={14} />
          Export CSV
        </a>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4a5a]" />
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-white/[0.06] bg-[#0d0d12] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150"
        />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={3} />
        ) : !data || data.subscribers.length === 0 ? (
          <EmptyState message="No subscribers yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[#9898ac]">
                <th className="text-left px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    Email
                  </div>
                </th>
                <th className="text-left px-4 py-3 font-medium">Subscribed</th>
                <th className="text-right px-4 py-3 font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.subscribers.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100"
                >
                  <td className="px-4 py-3 text-white">{sub.email}</td>
                  <td className="px-4 py-3 text-[#9898ac]">
                    {new Date(sub.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(sub.id)}
                      disabled={deleting === sub.id}
                      className="p-1.5 rounded-lg text-[#9898ac] hover:text-red-400 hover:bg-red-400/10 transition-all duration-150 disabled:opacity-50"
                      title="Remove subscriber"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={data.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
