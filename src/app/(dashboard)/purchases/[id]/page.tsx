"use client";

import { useState, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import Breadcrumb from "@/components/Breadcrumb";
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
  refundNote: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
  items: Array<{ id: string; name: string; price: number; packageId: number }>;
}

export default function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: purchase, loading, setData: setPurchase } = useFetch<PurchaseDetail>(`/api/purchases/${id}`);
  const [showModal, setShowModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [refundNote, setRefundNote] = useState("");

  const handleStatusChange = useCallback(async () => {
    const res = await fetch(`/api/purchases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, refundNote: refundNote || undefined }),
    });
    if (res.ok) {
      setPurchase((p) => p ? { ...p, status: newStatus, refundNote: refundNote || p.refundNote } : p);
      setShowModal(false);
    }
  }, [id, newStatus, refundNote, setPurchase]);

  if (loading) return <DetailSkeleton />;
  if (!purchase) return <div className="text-sm text-red-400 animate-in">Purchase not found</div>;

  return (
    <div>
      <Breadcrumb items={[{ label: "Purchases", href: "/purchases" }, { label: `Purchase` }]} />

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
            <p className="text-white tabular-nums">£{purchase.totalPrice.toFixed(2)} {purchase.currency}</p>
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

        {purchase.refundNote && (
          <div className="mb-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
            <span className="text-xs text-yellow-400 font-medium">Refund Note</span>
            <p className="text-sm text-[#9898ac] mt-1">{purchase.refundNote}</p>
          </div>
        )}

        <h3 className="text-sm font-semibold text-white mb-2">Items</h3>
        <div className="space-y-2">
          {purchase.items.map((item) => (
            <div key={item.id} className="flex justify-between p-3 rounded-lg border border-white/[0.04]">
              <span className="text-sm text-white">{item.name}</span>
              <span className="text-sm text-[#9898ac] tabular-nums">£{item.price.toFixed(2)}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => { setNewStatus(purchase.status === "completed" ? "declined" : "completed"); setRefundNote(purchase.refundNote ?? ""); setShowModal(true); }}
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
            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors">Cancel</button>
            <button onClick={handleStatusChange} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] transition-colors">Confirm</button>
          </>
        }
      >
        <div className="space-y-3">
          <p>Change status to:</p>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-white text-sm focus:outline-none focus:border-[#b249f8]/30 transition-colors"
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
          </select>
          <div>
            <label className="block text-xs text-[#9898ac] mb-1">Refund Note (optional)</label>
            <textarea
              value={refundNote}
              onChange={(e) => setRefundNote(e.target.value)}
              rows={2}
              placeholder="Reason for refund or status change..."
              className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] resize-none focus:outline-none focus:border-[#b249f8]/30 transition-colors"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
