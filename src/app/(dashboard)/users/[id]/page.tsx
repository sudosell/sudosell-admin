"use client";

import { useState, useCallback } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/Badge";
import Breadcrumb from "@/components/Breadcrumb";
import ActivityItem from "@/components/ActivityItem";
import Modal from "@/components/Modal";
import { DetailSkeleton } from "@/components/Skeleton";
import { useFetch } from "@/lib/hooks";

interface UserDetail {
  id: string;
  name: string;
  email: string;
  provider: string;
  emailVerified: boolean;
  banned: boolean;
  banReason: string | null;
  adminNotes: string | null;
  image: string | null;
  createdAt: string;
  purchases: Array<{
    id: string;
    status: string;
    totalPrice: number;
    currency: string;
    createdAt: string;
    items: Array<{ name: string }>;
  }>;
  tickets: Array<{
    id: string;
    subject: string;
    status: string;
    updatedAt: string;
  }>;
}

interface ActivityLog {
  id: string;
  action: string;
  actor: string;
  actorType: string;
  actorLabel?: string;
  target?: string | null;
  targetType?: string | null;
  createdAt: string;
}

interface UserResponse {
  user: UserDetail;
  activity: ActivityLog[];
}

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data, loading, setData } = useFetch<UserResponse>(`/api/users/${id}`);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editing, setEditing] = useState(false);

  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);

  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const startEditing = useCallback(() => {
    if (!data?.user) return;
    setEditName(data.user.name);
    setEditEmail(data.user.email);
    setEditing(true);
  }, [data]);

  const saveUser = useCallback(async (fields: Record<string, unknown>) => {
    if (!data?.user || saving) return;
    setSaving(true);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    if (res.ok) {
      const updated = await res.json();
      setData({ ...data, user: { ...data.user, ...updated } });
      setEditing(false);
    }
    setSaving(false);
  }, [data, id, saving, setData]);

  const toggleVerified = useCallback(() => {
    if (!data?.user) return;
    saveUser({ emailVerified: !data.user.emailVerified });
  }, [data, saveUser]);

  const saveNotes = useCallback(async () => {
    setNotesSaving(true);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNotes: notes }),
    });
    if (res.ok && data) {
      setData({ ...data, user: { ...data.user, adminNotes: notes } });
    }
    setNotesSaving(false);
  }, [id, notes, data, setData]);

  const handleBan = useCallback(async () => {
    if (!data?.user) return;
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !data.user.banned, banReason: data.user.banned ? "" : banReason }),
    });
    if (res.ok) {
      const updated = await res.json();
      setData({ ...data, user: { ...data.user, ...updated } });
    }
    setShowBanModal(false);
    setBanReason("");
  }, [data, id, banReason, setData]);

  const handleDelete = useCallback(async () => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/users");
  }, [id, router]);

  if (loading) return <DetailSkeleton />;
  if (!data?.user) return <div className="text-sm text-red-400 animate-in">User not found</div>;

  const { user, activity } = data;

  if (notes === "" && user.adminNotes) setNotes(user.adminNotes);

  return (
    <div>
      <Breadcrumb items={[{ label: "Users", href: "/users" }, { label: user.name }]} />

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 mb-6 animate-in">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-[#9898ac] mb-1">Name</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-[#9898ac] mb-1">Email</label>
              <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white focus:outline-none focus:border-[#b249f8]/30 transition-colors" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => saveUser({ name: editName, email: editEmail })} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] disabled:opacity-50 transition-all duration-150">{saving ? "Saving..." : "Save"}</button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{user.name}</h2>
                <p className="text-sm text-[#9898ac] mb-3">{user.email}</p>
                <div className="flex gap-2">
                  <Badge value={user.provider} />
                  <Badge value={user.emailVerified ? "verified" : "unverified"} />
                  {user.banned && <Badge value="banned" />}
                </div>
                {user.banned && user.banReason && (
                  <p className="text-xs text-red-400 mt-2">Ban reason: {user.banReason}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={startEditing} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] transition-all duration-150">Edit</button>
                <button onClick={toggleVerified} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] disabled:opacity-50 transition-all duration-150">{user.emailVerified ? "Unverify" : "Verify"} Email</button>
              </div>
            </div>
            <p className="text-xs text-[#4a4a5a] mt-3">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 mb-6 animate-in" style={{ animationDelay: "25ms" }}>
        <h3 className="text-sm font-semibold text-white mb-3">Admin Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Private notes about this user..."
          className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] resize-none focus:outline-none focus:border-[#b249f8]/30 transition-colors"
        />
        <button onClick={saveNotes} disabled={notesSaving} className="mt-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#b249f8] text-white hover:bg-[#9333ea] disabled:opacity-50 transition-all duration-150">{notesSaving ? "Saving..." : "Save Notes"}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 animate-in" style={{ animationDelay: "50ms" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Purchases ({user.purchases.length})</h3>
          {user.purchases.length === 0 ? (
            <p className="text-sm text-[#9898ac]">No purchases</p>
          ) : (
            <div className="space-y-2">
              {user.purchases.map((p) => (
                <Link key={p.id} href={`/purchases/${p.id}`} className="block p-3 rounded-lg border border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-white">{p.items.map((i) => i.name).join(", ")}</span>
                    <Badge value={p.status} />
                  </div>
                  <p className="text-xs text-[#4a4a5a] tabular-nums">${p.totalPrice.toFixed(2)} {p.currency} &middot; {new Date(p.createdAt).toLocaleDateString()}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 animate-in" style={{ animationDelay: "100ms" }}>
          <h3 className="text-sm font-semibold text-white mb-4">Tickets ({user.tickets.length})</h3>
          {user.tickets.length === 0 ? (
            <p className="text-sm text-[#9898ac]">No tickets</p>
          ) : (
            <div className="space-y-2">
              {user.tickets.map((t) => (
                <Link key={t.id} href={`/tickets/${t.id}`} className="block p-3 rounded-lg border border-white/[0.04] hover:bg-white/[0.02] transition-colors duration-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-white">{t.subject}</span>
                    <Badge value={t.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-red-500/20 bg-[#0d0d12]/80 p-5 mt-6 animate-in" style={{ animationDelay: "125ms" }}>
        <h3 className="text-sm font-semibold text-red-400 mb-4">Danger Zone</h3>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (user.banned) handleBan();
              else setShowBanModal(true);
            }}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all duration-150"
          >
            {user.banned ? "Unban User" : "Ban User"}
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-all duration-150"
          >
            Delete User
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 mt-6 animate-in" style={{ animationDelay: "150ms" }}>
        <h3 className="text-sm font-semibold text-white mb-4">Activity</h3>
        {activity.length === 0 ? (
          <p className="text-sm text-[#9898ac]">No activity</p>
        ) : (
          activity.map((log) => <ActivityItem key={log.id} log={log} />)
        )}
      </div>

      <Modal open={showBanModal} onClose={() => setShowBanModal(false)} title="Ban User" actions={<><button onClick={() => setShowBanModal(false)} className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors">Cancel</button><button onClick={handleBan} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">Ban</button></>}>
        <div className="space-y-3">
          <p>Are you sure you want to ban <strong className="text-white">{user.name}</strong>?</p>
          <input
            type="text"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            placeholder="Ban reason (optional)"
            className="w-full px-3 py-2 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-[#b249f8]/30 transition-colors"
          />
        </div>
      </Modal>

      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete User" actions={<><button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors">Cancel</button><button onClick={handleDelete} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">Delete</button></>}>
        <p>Are you sure you want to permanently delete <strong className="text-white">{user.name}</strong>? This will delete all their purchases, tickets, and activity. This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
