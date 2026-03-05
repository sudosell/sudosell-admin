import { type LucideIcon } from "lucide-react";

export default function StatsCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0d0d12]/80 p-5 animate-in">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[#9898ac]">{label}</span>
        <Icon size={18} className="text-[#b249f8]" />
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}
