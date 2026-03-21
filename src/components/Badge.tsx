const colors: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  verified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  declined: "bg-red-500/10 text-red-400 border-red-500/20",
  unverified: "bg-red-500/10 text-red-400 border-red-500/20",
  banned: "bg-red-500/10 text-red-400 border-red-500/20",
  urgent: "bg-red-500/10 text-red-400 border-red-500/20",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  inactive: "bg-[#4a4a5a]/20 text-[#9898ac] border-[#4a4a5a]/30",
  open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  closed: "bg-[#4a4a5a]/20 text-[#9898ac] border-[#4a4a5a]/30",
  admin: "bg-[#b249f8]/10 text-[#b249f8] border-[#b249f8]/20",
  user: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  system: "bg-[#4a4a5a]/20 text-[#9898ac] border-[#4a4a5a]/30",
  credentials: "bg-[#4a4a5a]/20 text-[#9898ac] border-[#4a4a5a]/30",
  google: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  github: "bg-[#4a4a5a]/20 text-white/70 border-white/10",
  discord: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  draft: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

export default function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors[value] ?? colors.pending}`}>
      {value}
    </span>
  );
}
