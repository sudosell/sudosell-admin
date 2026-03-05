"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2 justify-center pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-1.5 rounded-lg border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all duration-150"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm text-[#9898ac] px-3 tabular-nums">{page} / {totalPages}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-1.5 rounded-lg border border-white/[0.06] text-[#9898ac] hover:text-white hover:bg-white/[0.04] disabled:opacity-30 disabled:pointer-events-none transition-all duration-150"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
