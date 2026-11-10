"use client";
import {
  useAuth,
  hasDashboard,
  canCalendar,
  hasScheduleManagement,
} from "@org/core";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  CalendarDays,
  LayoutDashboard,
  Users,
  Settings,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  Menu,
  Leaf,
  UserCog,
} from "lucide-react";
import { Avatar, Button, Dialog, DropdownMenu, MenuItem, cn } from "@org/ui";
import { FailureNotifications } from "./calendar/failure-notifications";
const links = [
  { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Thành viên", icon: Users },
  { href: "/dashboard/admin/roles/members", label: "Nhân sự", icon: UserCog },
  { href: "/dashboard/departments", label: "Ban ngành", icon: Building2 },
];
export function AdminShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false),
    [mobile, setMobile] = useState(false);
  const auth = useAuth();
  const path = usePathname(),
    router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
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
        <Link
          href="/client"
          className="mt-4 inline-block text-primary underline"
        >
          Về danh sách thành viên
        </Link>
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
  const title =
    path === "/dashboard/otps"
      ? "Mã OTP"
      : path === "/dashboard/activity"
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
  const navigation = (compact = collapsed) => (
    <nav aria-label="Điều hướng chính" className="space-y-1">
      {visibleLinks.map(({ href, label, icon: Icon }) => (
        <Link
          title={compact ? label : undefined}
          onClick={() => setMobile(false)}
          key={href}
          href={href}
          aria-current={
            path === href ||
            (label === "Lịch" &&
              (path.startsWith("/dashboard/calendar") ||
                path.startsWith("/dashboard/schedules")))
              ? "page"
              : undefined
          }
          className={cn(
            "flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
            path === href ||
              (label === "Lịch" &&
                (path.startsWith("/dashboard/calendar") ||
                  path.startsWith("/dashboard/schedules")))
              ? "bg-accent font-medium text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon size={18} className="shrink-0" />
          <span className={compact ? "sr-only" : ""}>{label}</span>
          {!compact && label === "Members" && (
            <span className="ml-auto text-xs opacity-60">Team</span>
          )}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="admin-console min-h-dvh min-w-0">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:p-4"
      >
        Đến nội dung
      </a>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto overscroll-contain border-r bg-card px-4 py-7 lg:flex",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <Link
          href="/dashboard"
          className="mb-10 flex items-center gap-2 px-2 text-2xl font-semibold tracking-tight"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf size={21} />
          </span>
          {!collapsed && "gather."}
        </Link>
        {!collapsed && (
          <>
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">
              Quản lý
            </p>
          </>
        )}
        {navigation()}
        <div className="mt-auto">
          <Button
            variant="ghost"
            className="w-full justify-start px-3"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          ></Button>
        </div>
      </aside>
      <div
        className={cn(
          "min-w-0 transition-[padding] duration-200",
          collapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        <header className="admin-header sticky top-0 z-20 flex min-h-16 sm:min-h-20 items-center justify-between gap-2 border-b bg-card/95 backdrop-blur-md px-3 sm:px-5 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              aria-label="Mở điều hướng"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </Button>
            <span className="truncate text-sm font-medium">{title}</span>
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
            <FailureNotifications />
            <div className="hidden h-7 border-l sm:block" />
            <DropdownMenu
              label={`${auth.user.name} · ${auth.user.roleLabel}`}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Menu tài khoản">
                  <Avatar name={auth.user.name} />
                </Button>
              }
            >
              <MenuItem onSelect={() => router.push("/client")}>
                Hồ sơ cá nhân
              </MenuItem>
              <MenuItem onSelect={() => router.push("/dashboard/departments")}>
                Ban ngành
              </MenuItem>
              <MenuItem
                onSelect={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                Đổi giao diện
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
        <footer className="mx-4 flex flex-wrap justify-between gap-2 border-t py-5 text-xs text-muted-foreground lg:mx-10">
          <span>Hội Thánh Tin Lành Sài Gòn 2027</span>
        </footer>
      </div>
      <Dialog
        open={mobile}
        onOpenChange={setMobile}
        title="Điều hướng"
        description="Chọn trang bạn muốn mở."
        className="bottom-sheet-menu left-0! right-0! top-auto! bottom-0! max-h-[85dvh] w-full! max-w-none! translate-x-0! translate-y-0! rounded-b-none rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        {navigation(false)}
      </Dialog>
    </div>
  );
}
