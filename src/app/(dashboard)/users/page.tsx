"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import Badge from "@/components/Badge";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeleton";
import { useDebounce } from "@/lib/hooks";

interface User {
  id: string;
  name: string;
  email: string;
  provider: string;
  emailVerified: boolean;
  createdAt: string;
  _count: { purchases: number; tickets: number };
}

interface UsersResponse {
  users: User[];
  totalPages: number;
}

export default function UsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounce(search);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    fetch(`/api/users?${params}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [page, debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Users</h2>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4a5a]" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-white/[0.06] bg-[#0d0d12] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150"
        />
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : !data || data.users.length === 0 ? (
          <EmptyState message="No users found" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[#9898ac]">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Provider</th>
                <th className="text-left px-4 py-3 font-medium">Verified</th>
                <th className="text-left px-4 py-3 font-medium">Purchases</th>
                <th className="text-left px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u, i) => (
                <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100 animate-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3">
                    <Link href={`/users/${u.id}`} className="text-white hover:text-[#b249f8] transition-colors duration-150">{u.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-[#9898ac]">{u.email}</td>
                  <td className="px-4 py-3"><Badge value={u.provider} /></td>
                  <td className="px-4 py-3">
                    <span className={u.emailVerified ? "text-emerald-400" : "text-red-400"}>{u.emailVerified ? "Yes" : "No"}</span>
                  </td>
                  <td className="px-4 py-3 text-[#9898ac] tabular-nums">{u._count.purchases}</td>
                  <td className="px-4 py-3 text-[#4a4a5a] tabular-nums">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />}
    </div>
  );
}
