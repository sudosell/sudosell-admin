"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewProductPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tebexPackageId, setTebexPackageId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, tebexPackageId }),
    });

    if (res.ok) {
      const product = await res.json();
      router.push(`/products/${product.id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create product");
      setSaving(false);
    }
  }, [name, tebexPackageId, router]);

  return (
    <div>
      <Link href="/products" className="text-sm text-[#9898ac] hover:text-white transition-colors duration-150 mb-4 inline-block">&larr; Back to Products</Link>

      <div className="max-w-md animate-in">
        <h2 className="text-xl font-bold text-white mb-6">Create Product</h2>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 animate-in">{error}</div>
          )}

          <div>
            <label className="block text-sm text-[#9898ac] mb-1.5">Product Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150"
            />
          </div>

          <div>
            <label className="block text-sm text-[#9898ac] mb-1.5">Tebex Package ID</label>
            <input
              type="number"
              value={tebexPackageId}
              onChange={(e) => setTebexPackageId(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] disabled:opacity-50 transition-all duration-150"
          >
            {saving ? "Creating..." : "Create Product"}
          </button>
        </form>
      </div>
    </div>
  );
}
