"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import Badge from "@/components/Badge";
import { TableSkeleton } from "@/components/Skeleton";
import { useFetch } from "@/lib/hooks";

interface Product {
  id: string;
  name: string;
  slug: string;
  paddleProductId: string;
  heroImage: string | null;
  category: string | null;
  status: string;
  price: number | null;
  currency: string;
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
          <TableSkeleton rows={5} cols={7} />
        ) : !products || products.length === 0 ? (
          <EmptyState message="No products yet" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[#9898ac]">
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Price</th>
                <th className="text-left px-4 py-3 font-medium">Paddle ID</th>
                <th className="text-left px-4 py-3 font-medium">Releases</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100 animate-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.id}`} className="flex items-center gap-3 group">
                      {p.heroImage ? (
                        <img
                          src={p.heroImage}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover border border-white/[0.06] flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex-shrink-0 flex items-center justify-center text-[#4a4a5a] text-xs font-medium">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-white group-hover:text-[#b249f8] transition-colors duration-150 font-medium">
                        {p.name}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={p.status || "draft"} />
                  </td>
                  <td className="px-4 py-3 text-[#9898ac]">
                    {p.category || <span className="text-[#4a4a5a]">--</span>}
                  </td>
                  <td className="px-4 py-3 text-[#9898ac] tabular-nums">
                    {p.price != null ? (
                      `$${p.price.toFixed(2)}`
                    ) : (
                      <span className="text-[#4a4a5a]">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#9898ac] font-mono tabular-nums text-xs">{p.paddleProductId}</td>
                  <td className="px-4 py-3 text-[#9898ac] tabular-nums">{p._count.releases}</td>
                  <td className="px-4 py-3 text-[#4a4a5a] tabular-nums">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
