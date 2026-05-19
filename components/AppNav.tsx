"use client";

import { Activity, ChartColumn, Map } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "지도", icon: Map },
  { href: "/statistics", label: "통계", icon: ChartColumn },
  { href: "/realtime", label: "진단", icon: Activity },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="relative z-40 flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-4 py-2 text-slate-100">
      <Link
        href="/"
        className="min-w-0 text-sm font-semibold tracking-[0.14em] text-white"
        aria-label="CampusEMS 홈"
      >
        CampusEMS
      </Link>
      <div className="flex shrink-0 items-center gap-1 rounded-sm border border-slate-800 bg-slate-900/70 p-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex h-8 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors",
                isActive
                  ? "bg-sky-500 text-slate-950"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
