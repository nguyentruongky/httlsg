"use client";
import {
  useAuth,
  hasDashboard,
  canCalendar,
  hasScheduleManagement,
} from "@org/core";
import { useState, useEffect, type ReactNode } from "react";
import { usePathname, navigateClient } from "./client-router";
import { useTheme } from "next-themes";
import {
  CalendarDays,
  Users,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Menu,
  UserCog,
  Settings,
  ClipboardList,
} from "lucide-react";
import { Avatar, Button, Dialog, DropdownMenu, MenuItem, cn } from "@org/ui";
import { FailureNotifications } from "./calendar/failure-notifications";
const links = [
  { href: "/dashboard/members", label: "Thành viên", icon: Users },
  { href: "/dashboard/admin/roles/members", label: "Nhân sự", icon: UserCog },
  { href: "/dashboard/departments", label: "Ban ngành", icon: Building2 },
];
export function AdminShell({
  children,
  contentHidden = false,
}: {
  children: ReactNode;
  contentHidden?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false),
    [isMobileScreen, setIsMobileScreen] = useState(false);
  const auth = useAuth();
  const path = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobileScreen(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobileScreen(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  if (auth?.loading)
    return (
      <p role="status" className="p-8">
        Đang tải…
      </p>
    );
  if (
    !auth?.user ||
    auth.user.requiresPasswordSetup ||
    !hasDashboard(auth.user.role)
  )
    return (
      <main className="p-8">
        <h1 className="text-xl font-semibold">Bạn không có quyền truy cập</h1>
        <a
          href="/client/members"
          onClick={(e) => {
            e.preventDefault();
            navigateClient("/client/members");
          }}
          className="mt-4 inline-block text-primary underline"
        >
          Về danh sách thành viên
        </a>
      </main>
    );
  const visibleLinks = [...links];
  if (canCalendar(auth.user) || hasScheduleManagement(auth.user))
    visibleLinks.push({
      href: canCalendar(auth.user)
        ? "/dashboard/calendar"
        : "/dashboard/schedules",
      label: "Lịch",
      icon: CalendarDays,
    });
  visibleLinks.push({
    href: "/dashboard/settings",
    label: "Cài đặt",
    icon: Settings,
  });
  const isSettingsRoute =
    path === "/dashboard/settings" ||
    path === "/dashboard/otps" ||
    path === "/dashboard/activity" ||
    path === "/dashboard/church-status-report";
  const title =
    path === "/dashboard/otps"
      ? "Mã OTP"
      : path === "/dashboard/activity"
        ? "Nhật ký hoạt động"
        : path === "/dashboard/church-status-report"
          ? "Báo cáo tình trạng"
          : path === "/dashboard/settings"
            ? "Cài đặt"
            : path.startsWith("/dashboard/schedules") ||
                path.startsWith("/dashboard/calendar")
              ? "Lịch"
              : path.startsWith("/dashboard/admin/roles/settings")
                ? "Cấu hình quyền"
                : (visibleLinks
                    .filter(
                      (link) =>
                        path === link.href ||
                        (link.href !== "/dashboard" &&
                          path.startsWith(link.href + "/")),
                    )
                    .sort((a, b) => b.href.length - a.href.length)[0]?.label ??
                  "Ứng dụng");
  const isActiveLink = (href: string) => {
    if (path === href || path.startsWith(href + "/")) return true;
    if (
      href === "/dashboard/admin/roles/members" &&
      path.startsWith("/dashboard/admin/roles/")
    )
      return true;
    if (href === "/dashboard/calendar")
      return (
        path.startsWith("/dashboard/schedules") ||
        path === "/dashboard/schedule-leaders"
      );
    if (href === "/dashboard/settings") return isSettingsRoute;
    return (
      path.startsWith("/client/members/") &&
      window.history.state?.memberReturnHref === href
    );
  };
  const navigation = (compact = collapsed) => (
    <nav aria-label="Điều hướng chính" className="space-y-1">
      {visibleLinks.map(({ href, label, icon: Icon }) => (
        <a
          title={compact ? label : undefined}
          onClick={(e) => {
            e.preventDefault();
            setMobile(false);
            navigateClient(href);
          }}
          key={href}
          href={href}
          aria-current={isActiveLink(href) ? "page" : undefined}
          className={cn(
            "flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
            isActiveLink(href)
              ? "bg-accent font-medium text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon size={18} className="shrink-0" />
          <span className={compact ? "sr-only" : ""}>{label}</span>
          {!compact && label === "Members" && (
            <span className="ml-auto text-xs opacity-60">Team</span>
          )}
        </a>
      ))}
    </nav>
  );
  return (
    <div
      className={cn(
        "admin-console min-w-0",
        contentHidden ? "contents" : "min-h-dvh",
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:p-4"
      >
        Đến nội dung
      </a>
      {!contentHidden && !isMobileScreen && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto overscroll-contain border-r bg-card px-4 py-7 lg:flex",
            collapsed ? "w-20" : "w-64",
          )}
        >
          <a
            href="/dashboard/members"
            onClick={(e) => {
              e.preventDefault();
              navigateClient("/dashboard/members");
            }}
            className="mb-10 flex items-center gap-2 px-2 text-2xl font-semibold tracking-tight"
          >
            <img
              src="/pwa/icon-192.png"
              alt=""
              className="size-10 shrink-0 rounded-full bg-white object-contain"
            />
            {!collapsed && "HTSG"}
          </a>
          {!collapsed && (
            <>
              <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">
                Quản lý
              </p>
            </>
          )}
          {navigation()}
        </aside>
      )}
      <div
        className={cn(
          "min-w-0 transition-[padding] duration-200",
          contentHidden && "hidden",
          collapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        <header
          className="admin-header sticky top-0 z-20 hidden min-h-16 sm:min-h-20 items-center justify-between gap-2 border-b bg-card/95 backdrop-blur-md px-3 sm:px-5 md:flex lg:px-10"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "shrink-0 lg:hidden",
                isMobileScreen ? "hidden" : "",
              )}
              aria-label="Mở điều hướng"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </Button>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              aria-label="Đổi giao diện"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun size={18} className="dark:hidden" />
              <Moon size={18} className="hidden dark:block" />
            </Button>
            {!isMobileScreen && <FailureNotifications />}
            <div className="hidden h-7 border-l sm:block" />
            <DropdownMenu
              label={`${auth.user.name} · ${auth.user.roleLabel}`}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Menu tài khoản">
                  <Avatar name={auth.user.name.toUpperCase()} />
                </Button>
              }
            >
              <MenuItem
                onSelect={() => {
                  navigateClient("/client/profile");
                }}
              >
                Hồ sơ cá nhân
              </MenuItem>
            </DropdownMenu>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto min-w-0 max-w-[1600px] overflow-x-clip p-3 sm:p-5 lg:p-10"
        >
          <div className="min-w-0">{children}</div>
        </main>
      </div>
      {isMobileScreen && (
        <nav
          data-bottom-tabs
          aria-label="Điều hướng chính"
          className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 items-start border-x border-t border-primary/20 bg-accent/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
        >
          {visibleLinks.map(({ href, label, icon: Icon }) => {
            const active = isActiveLink(href);
            return (
              <a
                key={href}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  navigateClient(href);
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon
                  size={23}
                  strokeWidth={active ? 2.2 : 1.6}
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={0.1}
                />
                <span className="text-xs font-medium">{label}</span>
                {active && (
                  <span className="absolute bottom-0 h-0.5 w-4 rounded-full bg-primary" />
                )}
              </a>
            );
          })}
        </nav>
      )}
      {!isMobileScreen && (
        <Dialog
          open={mobile}
          onOpenChange={setMobile}
          title="Điều hướng"
          description="Chọn trang bạn muốn mở."
          className="bottom-sheet-menu left-0! right-0! top-auto! bottom-0! max-h-[85dvh] w-full! max-w-none! translate-x-0! translate-y-0! rounded-b-none rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          {navigation(false)}
        </Dialog>
      )}
    </div>
  );
}
