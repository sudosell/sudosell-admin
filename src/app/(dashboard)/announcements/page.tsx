"use client";

import { useState, useCallback } from "react";
import { Trash2 } from "lucide-react";
import Badge from "@/components/Badge";
import Modal from "@/components/Modal";
import { useFetch } from "@/lib/hooks";

interface Announcement {
  id: string;
  message: string;
  active: boolean;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const { data: announcements, loading, setData } = useFetch<Announcement[]>("/api/announcements");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSaving(true);
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (res.ok) {
      const newAnn = await res.json();
      setData((prev) => prev ? [newAnn, ...prev.map((a) => ({ ...a, active: false }))] : [newAnn]);
      setMessage("");
    }
    setSaving(false);
  }, [message, setData]);

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    const res = await fetch(`/api/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    if (res.ok) {
      setData((prev) => prev?.map((a) => a.id === id ? { ...a, active: !active } : active ? a : { ...a, active: false }) ?? null);
    }
  }, [setData]);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;
    const res = await fetch(`/api/announcements/${deleteId}`, { method: "DELETE" });
    if (res.ok) {
      setData((prev) => prev?.filter((a) => a.id !== deleteId) ?? null);
    }
    setDeleteId(null);
  }, [deleteId, setData]);

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Announcements</h2>

      <form onSubmit={handleCreate} className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 mb-6 animate-in">
        <h3 className="text-sm font-semibold text-white mb-3">New Announcement</h3>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Announcement message..."
          rows={2}
          className="w-full px-4 py-3 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] resize-none focus:outline-none focus:border-[#b249f8]/30 transition-colors"
        />
        <button type="submit" disabled={saving || !message.trim()} className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] disabled:opacity-50 transition-all duration-150">
          {saving ? "Creating..." : "Create & Activate"}
        </button>
      </form>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 animate-in" style={{ animationDelay: "50ms" }}>
        <h3 className="text-sm font-semibold text-white mb-4">All Announcements</h3>
        {loading ? (
          <p className="text-sm text-[#9898ac]">Loading...</p>
        ) : !announcements || announcements.length === 0 ? (
          <p className="text-sm text-[#9898ac]">No announcements yet</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a, i) => (
              <div key={a.id} className="flex items-start justify-between p-4 rounded-xl border border-white/[0.04] hover:bg-white/[0.02] transition-colors animate-in" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge value={a.active ? "active" : "inactive"} />
                    <span className="text-xs text-[#4a4a5a] tabular-nums">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-[#9898ac]">{a.message}</p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => toggleActive(a.id, a.active)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150"
                  >
                    {a.active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => setDeleteId(a.id)} className="p-1.5 text-[#9898ac] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-150">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Announcement" actions={<><button onClick={() => setDeleteId(null)} className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors">Cancel</button><button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">Delete</button></>}>
        <p>Are you sure you want to delete this announcement?</p>
      </Modal>
    </div>
  );
}
