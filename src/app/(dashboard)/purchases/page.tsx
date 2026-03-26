"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
import Badge from "@/components/Badge";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeleton";

interface Purchase {
  id: string;
  status: string;
  totalPrice: number;
  currency: string;
  transactionId: string | null;
  createdAt: string;
  user: { name: string; email: string };
  items: Array<{ name: string }>;
}

const statuses = ["all", "pending", "completed", "declined"];

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [after, setAfter] = useState("");
  const [before, setBefore] = useState("");

  const fetchPurchases = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status !== "all") params.set("status", status);
    if (after) params.set("after", after);
    if (before) params.set("before", before);
    fetch(`/api/purchases?${params}`)
      .then((r) => r.json())
      .then((data) => { setPurchases(data.purchases); setTotalPages(data.totalPages); })
      .finally(() => setLoading(false));
  }, [page, status, after, before]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Purchases</h2>
        <div className="flex gap-2">
          <a href="/api/purchases/export" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150">
            <Download size={14} /> Export CSV
          </a>
          <Link href="/purchases/new" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] transition-all duration-150">
            <Plus size={14} /> Manual Purchase
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-2">
          {statuses.map((s) => (
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

        <div className="flex items-center gap-2">
          <input type="date" value={after} onChange={(e) => { setAfter(e.target.value); setPage(1); }} className="px-2 py-1 rounded-lg border border-white/[0.06] bg-[#0d0d12] text-xs text-[#9898ac] focus:outline-none focus:border-[#b249f8]/30 transition-colors [color-scheme:dark]" />
          <span className="text-[#4a4a5a] text-xs">to</span>
          <input type="date" value={before} onChange={(e) => { setBefore(e.target.value); setPage(1); }} className="px-2 py-1 rounded-lg border border-white/[0.06] bg-[#0d0d12] text-xs text-[#9898ac] focus:outline-none focus:border-[#b249f8]/30 transition-colors [color-scheme:dark]" />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : purchases.length === 0 ? (
          <EmptyState message="No purchases found" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[#9898ac]">
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Items</th>
                <th className="text-left px-4 py-3 font-medium">Total</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p, i) => (
                <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100 animate-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3 text-white">{p.user.name}</td>
                  <td className="px-4 py-3 text-[#9898ac] max-w-xs truncate">{p.items.map((i) => i.name).join(", ")}</td>
                  <td className="px-4 py-3 text-white tabular-nums">${p.totalPrice.toFixed(2)}</td>
                  <td className="px-4 py-3"><Badge value={p.status} /></td>
                  <td className="px-4 py-3">
                    <Link href={`/purchases/${p.id}`} className="text-[#4a4a5a] hover:text-[#b249f8] transition-colors duration-150 tabular-nums">{new Date(p.createdAt).toLocaleDateString()}</Link>
                  </td>
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
