import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Church,
  Layers,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/churches", label: "Hội Thánh", icon: Church },
  { to: "/departments", label: "Ban ngành", icon: Layers },
  { to: "/clergy", label: "Giáo phẩm", icon: UserCheck },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh flex flex-col md:flex-row bg-slate-50 text-slate-900">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200/80 bg-white px-4 py-6 z-20">
        <div className="flex items-center gap-3 px-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-sm tracking-tight text-slate-900">
              HTKV TP.HCM
            </p>
            <p className="text-[11px] text-slate-500">
              Quản Trị Hội Thánh 2026
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
                  active
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Compact Sticky Top Header */}
      <header className="sticky top-0 z-30 flex md:hidden items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 h-14 pt-safe">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-bold text-base tracking-tight">
            HTKV TP.HCM
          </span>
        </div>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
          Dữ Liệu 2026
        </span>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 md:pl-64 pb-24 md:pb-12">
        <div className="mx-auto max-w-5xl px-4 py-5 md:px-8 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Fixed Bottom Tab Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex md:hidden items-center justify-around border-t border-slate-200/80 bg-white/95 backdrop-blur-md h-16 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[68px] min-h-[44px] rounded-xl px-2 py-1 text-[11px] font-medium transition-transform active:scale-95",
                active
                  ? "text-indigo-600"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.3]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
