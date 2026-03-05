"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function Modal({ open, onClose, title, children, actions }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#0d0d12] p-6 animate-in shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-[#9898ac] hover:text-white transition-colors duration-150">
            <X size={18} />
          </button>
        </div>
        <div className="text-sm text-[#9898ac]">{children}</div>
        {actions && <div className="flex justify-end gap-3 mt-6">{actions}</div>}
      </div>
    </div>
  );
}
