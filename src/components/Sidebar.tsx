"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ShoppingCart, MessageSquare, Package, Activity } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart },
  { href: "/tickets", label: "Tickets", icon: MessageSquare },
  { href: "/products", label: "Products", icon: Package },
  { href: "/activity", label: "Activity", icon: Activity },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-56 border-r border-white/[0.06] bg-[#0a0a10] flex flex-col z-30">
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <h1 className="text-lg font-bold text-white tracking-tight">SudoSell</h1>
        <p className="text-xs text-[#9898ac]">Admin Panel</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              prefetch
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-[#b249f8]/10 text-[#b249f8]"
                  : "text-[#9898ac] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
