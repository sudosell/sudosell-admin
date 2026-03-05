"use client";

import { useState } from "react";
import { Users, DollarSign, ShoppingCart, MessageSquare, Package } from "lucide-react";
import StatsCard from "@/components/StatsCard";
import ActivityItem from "@/components/ActivityItem";
import RevenueChart from "@/components/RevenueChart";
import { CardSkeleton, ChartSkeleton } from "@/components/Skeleton";
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

interface ChartData {
  revenueData: Array<{ date: string; revenue: number }>;
  userGrowth: Array<{ date: string; users: number }>;
  topProducts: Array<{ name: string; revenue: number; count: number }>;
}

const periods = ["daily", "weekly", "monthly"] as const;

export default function DashboardPage() {
  const { data: stats, loading } = useFetch<Stats>("/api/stats");
  const [period, setPeriod] = useState<string>("daily");
  const { data: charts, loading: chartsLoading } = useFetch<ChartData>(`/api/charts?period=${period}`);

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

          <div className="flex gap-2 mb-4">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
                  period === p
                    ? "border-[#b249f8]/30 bg-[#b249f8]/10 text-[#b249f8]"
                    : "border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {chartsLoading ? <ChartSkeleton /> : charts && (
            <RevenueChart
              revenueData={charts.revenueData}
              userGrowth={charts.userGrowth}
              topProducts={charts.topProducts}
            />
          )}

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
