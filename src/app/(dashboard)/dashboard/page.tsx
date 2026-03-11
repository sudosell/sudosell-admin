"use client";

import { useState, useCallback } from "react";
import { Users, DollarSign, ShoppingCart, MessageSquare, Package, TrendingUp, Repeat, BarChart3, RotateCw } from "lucide-react";
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

interface Analytics {
  repeatBuyerRate: number;
  averageOrderValue: number;
  revenueByProduct: Array<{ packageId: number; name: string; revenue: number; count: number }>;
  ticketsPerProduct: Array<{ packageId: number; name: string; tickets: number }>;
  topBuyers: Array<{ name: string; email: string; total: number }>;
}

const periods = ["daily", "weekly", "monthly"] as const;

export default function DashboardPage() {
  const { data: stats, loading } = useFetch<Stats>("/api/stats");
  const [period, setPeriod] = useState<string>("daily");
  const { data: charts, loading: chartsLoading } = useFetch<ChartData>(`/api/charts?period=${period}`);
  const { data: analytics, loading: analyticsLoading } = useFetch<Analytics>("/api/analytics");
  const [cacheClearing, setCacheClearing] = useState(false);
  const [cacheMsg, setCacheMsg] = useState<string | null>(null);

  const clearCache = useCallback(async () => {
    setCacheClearing(true);
    setCacheMsg(null);
    try {
      const res = await fetch("/api/cache", { method: "POST" });
      if (res.ok) {
        setCacheMsg("Cache cleared");
      } else {
        const data = await res.json().catch(() => ({ error: "Failed" }));
        setCacheMsg(data.error ?? "Failed");
      }
    } catch {
      setCacheMsg("Network error");
    } finally {
      setCacheClearing(false);
      setTimeout(() => setCacheMsg(null), 3000);
    }
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Dashboard</h2>
        <button
          onClick={clearCache}
          disabled={cacheClearing}
          className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-[#9898ac] transition-all hover:border-[#b249f8]/30 hover:text-white disabled:opacity-50"
        >
          <RotateCw size={13} className={cacheClearing ? "animate-spin" : ""} />
          {cacheClearing ? "Clearing..." : "Clear Product Cache"}
        </button>
      </div>
      {cacheMsg && (
        <div className={`mb-4 rounded-lg px-3 py-2 text-xs font-medium ${cacheMsg === "Cache cleared" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          {cacheMsg}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatsCard label="Total Users" value={stats.users} icon={Users} />
            <StatsCard label="Revenue" value={`£${stats.revenue}`} icon={DollarSign} />
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

          {analyticsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <CardSkeleton /><CardSkeleton />
            </div>
          ) : analytics && (
            <div className="mb-6 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart3 size={16} className="text-[#b249f8]" />
                Insights
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StatsCard label="Repeat Buyer Rate" value={`${analytics.repeatBuyerRate}%`} icon={Repeat} />
                <StatsCard label="Avg Order Value" value={`£${analytics.averageOrderValue.toFixed(2)}`} icon={TrendingUp} />
              </div>

              {analytics.revenueByProduct.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5">
                  <h4 className="text-xs font-semibold text-[#9898ac] uppercase tracking-wider mb-3">Revenue by Product</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#5a5a6e] text-xs">
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 font-medium text-right">Revenue</th>
                        <th className="pb-2 font-medium text-right">Units</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.revenueByProduct.map((p) => (
                        <tr key={p.packageId} className="border-t border-white/[0.04]">
                          <td className="py-2 text-white/90">{p.name}</td>
                          <td className="py-2 text-right text-emerald-400 font-medium">£{p.revenue.toFixed(2)}</td>
                          <td className="py-2 text-right text-[#9898ac]">{p.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {analytics.ticketsPerProduct.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5">
                  <h4 className="text-xs font-semibold text-[#9898ac] uppercase tracking-wider mb-3">Tickets per Product</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#5a5a6e] text-xs">
                        <th className="pb-2 font-medium">Product</th>
                        <th className="pb-2 font-medium text-right">Tickets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.ticketsPerProduct.map((p) => (
                        <tr key={p.packageId} className="border-t border-white/[0.04]">
                          <td className="py-2 text-white/90">{p.name}</td>
                          <td className="py-2 text-right text-[#9898ac]">{p.tickets}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {analytics.topBuyers.length > 0 && (
                <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5">
                  <h4 className="text-xs font-semibold text-[#9898ac] uppercase tracking-wider mb-3">Top Buyers</h4>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[#5a5a6e] text-xs">
                        <th className="pb-2 font-medium">Name</th>
                        <th className="pb-2 font-medium">Email</th>
                        <th className="pb-2 font-medium text-right">Total Spent</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.topBuyers.map((b, i) => (
                        <tr key={i} className="border-t border-white/[0.04]">
                          <td className="py-2 text-white/90">{b.name}</td>
                          <td className="py-2 text-[#9898ac]">{b.email}</td>
                          <td className="py-2 text-right text-emerald-400 font-medium">£{b.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
