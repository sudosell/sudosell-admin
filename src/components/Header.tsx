"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { LogOut } from "lucide-react";

interface Admin {
  discordId: string;
  username: string;
  avatar: string | null;
}

export default function Header() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setAdmin).catch(() => {});
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }, [router]);

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-white/[0.06] bg-[#08080d]/80 backdrop-blur-xl flex items-center justify-end px-6 gap-4">
      {admin && (
        <>
          <div className="flex items-center gap-3">
            {admin.avatar ? (
              <img src={admin.avatar} alt="" className="w-7 h-7 rounded-full ring-1 ring-white/10" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#b249f8]/20 flex items-center justify-center text-xs font-bold text-[#b249f8]">
                {admin.username[0]}
              </div>
            )}
            <span className="text-sm text-white font-medium">{admin.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#9898ac] hover:text-white transition-colors duration-150 p-1.5 rounded-lg hover:bg-white/[0.04]"
          >
            <LogOut size={16} />
          </button>
        </>
      )}
    </header>
  );
}
