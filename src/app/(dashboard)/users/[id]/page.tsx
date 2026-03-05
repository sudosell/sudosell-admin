"use client";

import { useState, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import Badge from "@/components/Badge";
import ActivityItem from "@/components/ActivityItem";
import { DetailSkeleton } from "@/components/Skeleton";
import { useFetch } from "@/lib/hooks";

interface UserDetail {
  id: string;
  name: string;
  email: string;
  provider: string;
  emailVerified: boolean;
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
  const { data, loading, setData } = useFetch<UserResponse>(`/api/users/${id}`);
  const [toggling, setToggling] = useState(false);

  const toggleVerified = useCallback(async () => {
    if (!data?.user || toggling) return;
    setToggling(true);
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailVerified: !data.user.emailVerified }),
    });
    if (res.ok) {
      setData({ ...data, user: { ...data.user, emailVerified: !data.user.emailVerified } });
    }
    setToggling(false);
  }, [data, id, toggling, setData]);

  if (loading) return <DetailSkeleton />;
  if (!data?.user) return <div className="text-sm text-red-400 animate-in">User not found</div>;

  const { user, activity } = data;

  return (
    <div>
      <Link href="/users" className="text-sm text-[#9898ac] hover:text-white transition-colors duration-150 mb-4 inline-block">&larr; Back to Users</Link>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-6 mb-6 animate-in">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">{user.name}</h2>
            <p className="text-sm text-[#9898ac] mb-3">{user.email}</p>
            <div className="flex gap-2">
              <Badge value={user.provider} />
              <Badge value={user.emailVerified ? "verified" : "unverified"} />
            </div>
          </div>
          <button
            onClick={toggleVerified}
            disabled={toggling}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] disabled:opacity-50 transition-all duration-150"
          >
            {user.emailVerified ? "Unverify" : "Verify"} Email
          </button>
        </div>
        <p className="text-xs text-[#4a4a5a] mt-3">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
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

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 mt-6 animate-in" style={{ animationDelay: "150ms" }}>
        <h3 className="text-sm font-semibold text-white mb-4">Activity</h3>
        {activity.length === 0 ? (
          <p className="text-sm text-[#9898ac]">No activity</p>
        ) : (
          activity.map((log) => <ActivityItem key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}
