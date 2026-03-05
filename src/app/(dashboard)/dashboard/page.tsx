"use client";

import { Users, DollarSign, ShoppingCart, MessageSquare, Package } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import ActivityItem from "@/components/ActivityItem";
import { CardSkeleton } from "@/components/Skeleton";
import { useFetch } from "@/lib/hooks";

interface Stats {
  users: number;
  revenue: string;
  purchases: number;
  openTickets: number;
  products: number;
  recentActivity: Array<{
    id: string;
    action: string;
    actor: string;
    actorType: string;
    target?: string | null;
    targetType?: string | null;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { data: stats, loading } = useFetch<Stats>("/api/stats");

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">Dashboard</h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatsCard label="Total Users" value={stats.users} icon={Users} />
            <StatsCard label="Revenue" value={`$${stats.revenue}`} icon={DollarSign} />
            <StatsCard label="Purchases" value={stats.purchases} icon={ShoppingCart} />
            <StatsCard label="Open Tickets" value={stats.openTickets} icon={MessageSquare} />
            <StatsCard label="Products" value={stats.products} icon={Package} />
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 animate-in">
            <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-[#9898ac]">No activity yet</p>
            ) : (
              stats.recentActivity.map((log) => <ActivityItem key={log.id} log={log} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}
