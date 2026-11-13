"use client";
import type { ComponentType } from "react";
import {
  Settings,
  ArrowLeft,
  ChevronRight,
  Activity,
  KeyRound,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@org/core";
import { Avatar, Button, DropdownMenu, MenuItem, cn } from "@org/ui";
import { ActivityPage, ChurchStatusReportPage } from "./workspace-pages";
import { AdminOtpConsole } from "./admin-otp-console";
import { navigateClient, usePathname } from "./client-router";

type SettingsDestination = {
  href: string;
  label: string;
  description: string;
  category: string;
  icon: LucideIcon;
  iconClassName: string;
  Component: ComponentType;
};

const settingsPages: SettingsDestination[] = [
  {
    href: "/dashboard/activity",
    label: "Nhật ký hoạt động",
    description: "Xem những cập nhật và thay đổi trong Hội Thánh.",
    category: "Theo dõi",
    icon: Activity,
    iconClassName:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    Component: ActivityPage,
  },
  {
    href: "/dashboard/otps",
    label: "Mã OTP",
    description: "Tra cứu mã xác thực để hỗ trợ thành viên đăng nhập.",
    category: "Hỗ trợ đăng nhập",
    icon: KeyRound,
    iconClassName:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    Component: AdminOtpConsole,
  },
  {
    href: "/dashboard/church-status-report",
    label: "Báo cáo tình trạng",
    description: "Theo dõi tình trạng thành viên và các thay đổi theo tháng.",
    category: "Thành viên",
    icon: ClipboardList,
    iconClassName:
      "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    Component: ChurchStatusReportPage,
  },
];

function SettingsLink({
  item,
  compact = false,
  active = false,
}: {
  item: SettingsDestination;
  compact?: boolean;
  active?: boolean;
}) {
  const Icon = item.icon;
  return (
    <a
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-w-0 items-center gap-4 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        compact
          ? "gap-3 px-3 py-3"
          : "border bg-card p-4 shadow-xs hover:border-primary/30 hover:bg-accent/20 sm:p-5",
        active && "bg-accent text-primary",
        compact && !active && "hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl",
          compact ? "size-9" : "size-12",
          item.iconClassName,
        )}
      >
        <Icon size={compact ? 18 : 23} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        {!compact && (
          <span className="mb-1 block text-xs text-muted-foreground">
            {item.category}
          </span>
        )}
        <span
          className={cn("block font-medium", compact ? "text-sm" : "text-base")}
        >
          {item.label}
        </span>
        {!compact && (
          <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
            {item.description}
          </span>
        )}
      </span>
      <ChevronRight
        size={18}
        className="shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
        aria-hidden="true"
      />
    </a>
  );
}

export function ApplicationSettings() {
  const user = useAuth()?.user;
  const path = usePathname();
  const canViewManagement = ["admin", "deacon"].includes(user?.role ?? "");
  const page = canViewManagement
    ? settingsPages.find((item) => item.href === path)
    : undefined;

  if (page) {
    return (
      <section className="min-w-0 space-y-5">
        <a
          href="/dashboard/settings"
          data-navigation="back"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Cài đặt
        </a>
        <div className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="hidden self-start rounded-2xl border bg-card p-2 shadow-xs lg:sticky lg:top-24 lg:block">
            <p className="px-3 pb-2 pt-3 text-xs font-medium text-muted-foreground">
              Quản lý Hội Thánh
            </p>
            <nav aria-label="Danh mục cài đặt" className="space-y-1">
              {settingsPages.map((item) => (
                <SettingsLink
                  key={item.href}
                  item={item}
                  compact
                  active={item.href === path}
                />
              ))}
            </nav>
          </aside>
          <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-xs sm:p-6">
            <page.Component />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto min-w-0 max-w-6xl space-y-7 sm:space-y-8">
      <header className="flex items-start gap-4 pt-1 sm:pt-0">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-accent text-primary sm:size-14">
          <Settings size={25} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Cài đặt
            </h1>
            <div className="shrink-0 md:hidden">
              <DropdownMenu
                label={`${user?.name ?? ""} · ${user?.roleLabel ?? ""}`}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Menu tài khoản"
                  >
                    <Avatar name={user?.name.toUpperCase() ?? "Tài khoản"} />
                  </Button>
                }
              >
                <MenuItem onSelect={() => navigateClient("/client/profile")}>
                  Hồ sơ cá nhân
                </MenuItem>
              </DropdownMenu>
            </div>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Quản lý tài khoản và theo dõi hoạt động Hội Thánh.
          </p>
        </div>
      </header>
      <div className="min-w-0">
        <div className="min-w-0 space-y-6">
          {canViewManagement && (
            <section aria-labelledby="settings-management">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="settings-management" className="text-sm font-semibold">
                  Quản lý Hội Thánh
                </h2>
                {user?.role === "deacon" && (
                  <span className="text-xs text-muted-foreground">
                    Quyền xem
                  </span>
                )}
              </div>
              <nav aria-label="Cài đặt quản trị" className="grid gap-3">
                {settingsPages.map((item) => (
                  <SettingsLink key={item.href} item={item} />
                ))}
              </nav>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
