"use client";

import { useMounted } from "@/lib/hooks";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RevenueData {
  date: string;
  revenue: number;
}

interface UserGrowth {
  date: string;
  users: number;
}

interface TopProduct {
  name: string;
  revenue: number;
  count: number;
}

interface Props {
  revenueData: RevenueData[];
  userGrowth: UserGrowth[];
  topProducts: TopProduct[];
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#0d0d12",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#fff",
  },
  labelStyle: { color: "#9898ac" },
};

export default function RevenueChart({ revenueData, userGrowth, topProducts }: Props) {
  const mounted = useMounted();
  if (!mounted) return null;

  const maxRevenue = Math.max(...topProducts.map((p) => p.revenue), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 animate-in">
        <h3 className="text-sm font-semibold text-white mb-4">Revenue</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={revenueData}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b249f8" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#b249f8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#4a4a5a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#4a4a5a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${v}`} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`£${Number(v).toFixed(2)}`, "Revenue"]} />
            <Area type="monotone" dataKey="revenue" stroke="#b249f8" strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 animate-in" style={{ animationDelay: "50ms" }}>
        <h3 className="text-sm font-semibold text-white mb-4">New Users</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={userGrowth}>
            <XAxis dataKey="date" tick={{ fill: "#4a4a5a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#4a4a5a", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip {...tooltipStyle} />
            <Bar dataKey="users" fill="#b249f8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 lg:col-span-2 animate-in" style={{ animationDelay: "100ms" }}>
        <h3 className="text-sm font-semibold text-white mb-4">Top Products</h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-[#9898ac]">No sales data yet</p>
        ) : (
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-4 animate-in" style={{ animationDelay: `${i * 40}ms` }}>
                <span className="text-xs text-[#4a4a5a] w-5 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white truncate">{p.name}</span>
                    <span className="text-xs text-[#9898ac] tabular-nums ml-3">£{p.revenue.toFixed(2)} · {p.count} sales</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full bg-[#b249f8]/60"
                      style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
