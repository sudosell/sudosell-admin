"use client";

import { useState, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import { DetailSkeleton } from "@/components/Skeleton";
import { useFetch } from "@/lib/hooks";

interface PurchaseDetail {
  id: string;
  status: string;
  totalPrice: number;
  currency: string;
  basketIdent: string;
  transactionId: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  items: Array<{ id: string; name: string; price: number; packageId: number }>;
}

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: purchase, loading, setData: setPurchase } = useFetch<PurchaseDetail>(`/api/purchases/${id}`);
  const [showModal, setShowModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const handleStatusChange = useCallback(async () => {
    const res = await fetch(`/api/purchases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setPurchase((p) => p ? { ...p, status: newStatus } : p);
      setShowModal(false);
    }
  }, [id, newStatus, setPurchase]);

  if (loading) return <DetailSkeleton />;
  if (!purchase) return <div className="text-sm text-red-400 animate-in">Purchase not found</div>;

  return (
    <div>
      <Link href="/purchases" className="text-sm text-[#9898ac] hover:text-white transition-colors duration-150 mb-4 inline-block">&larr; Back to Purchases</Link>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 mb-6 animate-in">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Purchase Detail</h2>
            <p className="text-xs text-[#4a4a5a] font-mono select-all">{purchase.id}</p>
          </div>
          <Badge value={purchase.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div>
            <span className="text-[#4a4a5a] text-xs">User</span>
            <p className="text-white">
              <Link href={`/users/${purchase.user.id}`} className="hover:text-[#b249f8] transition-colors duration-150">{purchase.user.name}</Link>
              <span className="text-[#9898ac] ml-2">{purchase.user.email}</span>
            </p>
          </div>
          <div>
            <span className="text-[#4a4a5a] text-xs">Total</span>
            <p className="text-white tabular-nums">${purchase.totalPrice.toFixed(2)} {purchase.currency}</p>
          </div>
          <div>
            <span className="text-[#4a4a5a] text-xs">Transaction ID</span>
            <p className="text-white font-mono text-xs select-all">{purchase.transactionId ?? "—"}</p>
          </div>
          <div>
            <span className="text-[#4a4a5a] text-xs">Date</span>
            <p className="text-white tabular-nums">{new Date(purchase.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-white mb-2">Items</h3>
        <div className="space-y-2">
          {purchase.items.map((item) => (
            <div key={item.id} className="flex justify-between p-3 rounded-lg border border-white/[0.04]">
              <span className="text-sm text-white">{item.name}</span>
              <span className="text-sm text-[#9898ac] tabular-nums">${item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setNewStatus(purchase.status === "completed" ? "declined" : "completed"); setShowModal(true); }}
          className="mt-4 px-4 py-2 rounded-lg text-sm font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150"
        >
          Override Status
        </button>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Override Purchase Status"
        actions={
          <>
            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors duration-150">Cancel</button>
            <button onClick={handleStatusChange} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] transition-colors duration-150">Confirm</button>
          </>
        }
      >
        <div className="space-y-3">
          <p>Change status to:</p>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-white text-sm focus:outline-none focus:border-[#b249f8]/30 transition-colors duration-150"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}
