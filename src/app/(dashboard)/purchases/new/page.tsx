"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb";
import { useDebounce } from "@/lib/hooks";

interface UserResult {
  id: string;
  name: string;
  email: string;
}

interface Item {
  packageId: string;
  name: string;
  price: string;
}

export default function ManualPurchasePage() {
  const router = useRouter();
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [items, setItems] = useState<Item[]>([{ packageId: "", name: "", price: "" }]);
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const debouncedSearch = useDebounce(userSearch, 250);

  useEffect(() => {
    if (!debouncedSearch || debouncedSearch.length < 2 || selectedUser) {
      setUserResults([]);
      return;
    }
    fetch(`/api/search?q=${encodeURIComponent(debouncedSearch)}`)
      .then((r) => r.json())
      .then((data) => setUserResults(data.results?.users ?? []))
      .catch(() => {});
  }, [debouncedSearch, selectedUser]);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { packageId: "", name: "", price: "" }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback((index: number, field: keyof Item, value: string) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) { setError("Please select a user"); return; }
    setError("");
    setSaving(true);

    const res = await fetch("/api/purchases/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: selectedUser.id,
        items: items.map((i) => ({
          packageId: parseInt(i.packageId) || 0,
          name: i.name,
          price: parseFloat(i.price) || 0,
        })),
        currency,
        note: note || undefined,
      }),
    });

    if (res.ok) {
      const purchase = await res.json();
      router.push(`/purchases/${purchase.id}`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create purchase");
      setSaving(false);
    }
  }, [selectedUser, items, currency, note, router]);

  return (
    <div>
      <Breadcrumb items={[{ label: "Purchases", href: "/purchases" }, { label: "Manual Purchase" }]} />

      <div className="max-w-lg animate-in">
        <h2 className="text-xl font-bold text-white mb-6">Manual Purchase</h2>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 space-y-4">
          {error && <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>}

          {/* User search */}
          <div>
            <label className="block text-sm text-[#9898ac] mb-1.5">User</label>
            {selectedUser ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#b249f8]/20 bg-[#b249f8]/5">
                <span className="text-sm text-white">{selectedUser.name} <span className="text-[#9898ac]">{selectedUser.email}</span></span>
                <button type="button" onClick={() => { setSelectedUser(null); setUserSearch(""); }} className="text-[#9898ac] hover:text-white"><X size={14} /></button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full px-4 py-2.5 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors"
                />
                {userResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-white/[0.06] bg-[#0d0d12] shadow-xl z-10 overflow-hidden">
                    {userResults.map((u) => (
                      <button key={u.id} type="button" onClick={() => { setSelectedUser(u); setUserResults([]); }} className="w-full text-left px-4 py-2 text-sm hover:bg-white/[0.04] transition-colors">
                        <span className="text-white">{u.name}</span> <span className="text-[#4a4a5a]">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm text-[#9898ac] mb-1.5">Items</label>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input type="number" value={item.packageId} onChange={(e) => updateItem(i, "packageId", e.target.value)} placeholder="Package ID" className="w-24 px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
                  <input type="text" value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} placeholder="Item name" required className="flex-1 px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
                  <input type="number" step="0.01" value={item.price} onChange={(e) => updateItem(i, "price", e.target.value)} placeholder="Price" required className="w-24 px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="p-2 text-[#9898ac] hover:text-red-400 transition-colors"><X size={14} /></button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addItem} className="mt-2 flex items-center gap-1 text-xs text-[#b249f8] hover:text-white transition-colors">
              <Plus size={12} /> Add Item
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-[#9898ac] mb-1.5">Currency</label>
              <input type="text" value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-[#9898ac] mb-1.5">Note (optional)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Gifted" className="w-full px-4 py-2.5 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] disabled:opacity-50 transition-all duration-150">
            {saving ? "Creating..." : "Create Purchase"}
          </button>
        </form>
      </div>
    </div>
  );
}
