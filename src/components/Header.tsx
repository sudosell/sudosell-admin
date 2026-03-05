"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { LogOut, Bell } from "lucide-react";
import { useClickOutside } from "@/lib/hooks";

interface Admin {
  discordId: string;
  username: string;
  avatar: string | null;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function Header() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useClickOutside(useCallback(() => setShowNotifs(false), []));

  useEffect(() => {
    fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setAdmin).catch(() => {});
  }, []);

  const fetchNotifications = useCallback(() => {
    fetch("/api/notifications?unreadOnly=true")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = useCallback(async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setNotifications((n) => n.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }, [router]);

  return (
    <header className="sticky top-0 z-20 h-14 border-b border-white/[0.06] bg-[#08080d]/80 backdrop-blur-xl flex items-center justify-end px-6 gap-4">
      <div className="relative" ref={notifRef}>
        <button
          onClick={() => setShowNotifs((v) => !v)}
          className="relative text-[#9898ac] hover:text-white transition-colors duration-150 p-1.5 rounded-lg hover:bg-white/[0.04]"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {showNotifs && (
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-white/[0.06] bg-[#0d0d12] shadow-2xl animate-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-sm font-medium text-white">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#b249f8] hover:text-white transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-4 text-sm text-[#9898ac]">No notifications</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-white/[0.04] ${!n.read ? "bg-[#b249f8]/[0.03]" : ""}`}
                >
                  <p className="text-xs font-medium text-white">{n.title}</p>
                  <p className="text-xs text-[#9898ac] mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-[#4a4a5a] mt-1 tabular-nums">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

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
