"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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

  const fetchPurchases = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (status !== "all") params.set("status", status);
    fetch(`/api/purchases?${params}`)
      .then((r) => r.json())
      .then((data) => { setPurchases(data.purchases); setTotalPages(data.totalPages); })
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Purchases</h2>

      <div className="flex gap-2 mb-4">
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
                    <Link href={`/purchases/${p.id}`} className="text-[#4a4a5a] hover:text-[#b249f8] transition-colors duration-150 tabular-nums">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </Link>
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
