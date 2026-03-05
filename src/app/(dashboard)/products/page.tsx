"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { TableSkeleton } from "@/components/Skeleton";
import { useFetch } from "@/lib/hooks";

interface Product {
  id: string;
  name: string;
  tebexPackageId: number;
  createdAt: string;
  _count: { releases: number };
}

export default function ProductsPage() {
  const { data: products, loading } = useFetch<Product[]>("/api/products");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Products</h2>
        <Link
          href="/products/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] transition-colors duration-150"
        >
          <Plus size={16} />
          New Product
        </Link>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : !products || products.length === 0 ? (
          <EmptyState message="No products yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[#9898ac]">
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Tebex ID</th>
                <th className="text-left px-4 py-3 font-medium">Releases</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100 animate-in" style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.id}`} className="text-white hover:text-[#b249f8] transition-colors duration-150">{p.name}</Link>
                  </td>
                  <td className="px-4 py-3 text-[#9898ac] font-mono tabular-nums">{p.tebexPackageId}</td>
                  <td className="px-4 py-3 text-[#9898ac] tabular-nums">{p._count.releases}</td>
                  <td className="px-4 py-3 text-[#4a4a5a] tabular-nums">{new Date(p.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
