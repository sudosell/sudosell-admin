"use client";

import { useState, useCallback, useRef } from "react";
import { Users, DollarSign, ShoppingCart, MessageSquare, Package, TrendingUp, Repeat, BarChart3, RotateCw, AlertTriangle, Trash2 } from "lucide-react";
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
  const [wipeConfirm, setWipeConfirm] = useState("");
  const [wiping, setWiping] = useState(false);
  const [wipeResult, setWipeResult] = useState<Record<string, number> | null>(null);
  const [wipeError, setWipeError] = useState("");
  const [showWipeModal, setShowWipeModal] = useState(false);
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

      {/* Danger Zone */}
      <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-5 animate-in">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white">Wipe Database</h3>
            <p className="mt-1 text-xs text-[#9898ac]">
              Delete all users, purchases, products, tickets, subscribers, and activity logs. Use this before going live to start fresh. This cannot be undone.
            </p>
            <button
              onClick={() => { setShowWipeModal(true); setWipeConfirm(""); setWipeResult(null); setWipeError(""); }}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all duration-150"
            >
              <Trash2 size={14} />
              Wipe All Data
            </button>
          </div>
        </div>
      </div>

      {/* Wipe Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !wiping && setShowWipeModal(false)}>
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#0d0d12] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Wipe Entire Database</h3>
                <p className="text-xs text-[#9898ac]">This will permanently delete everything</p>
              </div>
            </div>

            {wipeResult ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4">
                  <p className="text-sm font-medium text-emerald-400 mb-2">Database wiped successfully</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-[#9898ac]">
                    {Object.entries(wipeResult).map(([key, count]) => (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span className="text-white font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => { setShowWipeModal(false); window.location.reload(); }}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-white/[0.06] text-white hover:bg-white/[0.1] transition-colors"
                >
                  Close & Reload
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-red-500/[0.04] border border-red-500/10 p-3">
                  <p className="text-xs text-red-300 leading-relaxed">
                    This will delete <strong>all</strong> users, purchases, products, releases, tickets, subscribers, activity logs, and announcements. You will need to re-register your admin account after this.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-[#9898ac] mb-1.5">
                    Type <span className="font-mono text-red-400 font-bold">WIPE ALL DATA</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={wipeConfirm}
                    onChange={(e) => setWipeConfirm(e.target.value)}
                    placeholder="WIPE ALL DATA"
                    disabled={wiping}
                    className="w-full px-3 py-2.5 rounded-lg border border-white/[0.06] bg-[#08080d] text-sm text-white placeholder-[#4a4a5a] focus:outline-none focus:border-red-500/30 transition-colors font-mono"
                  />
                </div>

                {wipeError && (
                  <p className="text-xs text-red-400">{wipeError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (wipeConfirm !== "WIPE ALL DATA") {
                        setWipeError("Confirmation text doesn't match");
                        return;
                      }
                      setWiping(true);
                      setWipeError("");
                      try {
                        const res = await fetch("/api/wipe", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ confirm: "WIPE ALL DATA" }),
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          setWipeError(data.error || "Wipe failed");
                        } else {
                          setWipeResult(data.deleted);
                        }
                      } catch {
                        setWipeError("Something went wrong");
                      } finally {
                        setWiping(false);
                      }
                    }}
                    disabled={wiping || wipeConfirm !== "WIPE ALL DATA"}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                  >
                    {wiping ? "Wiping..." : "Wipe Everything"}
                  </button>
                  <button
                    onClick={() => setShowWipeModal(false)}
                    disabled={wiping}
                    className="px-4 py-2.5 rounded-lg text-sm text-[#9898ac] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
