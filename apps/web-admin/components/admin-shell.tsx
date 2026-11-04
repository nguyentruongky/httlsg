"use client";
import { useAuth, hasDashboard } from "@org/core";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  Settings,
  ScrollText,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  Plus,
  ArrowUpRight,
  Sun,
  Moon,
  Command as CommandIcon,
  Menu,
  Leaf,
  ShieldCheck,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Command,
  Dialog,
  DropdownMenu,
  MenuItem,
  cn,
} from "@org/ui";
const links = [
  {
    href: "/dashboard/admin/permissions",
    label: "Phân quyền",
    icon: ShieldCheck,
  },
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/members", label: "Members", icon: Users },
  { href: "/dashboard/activity", label: "Activity log", icon: ScrollText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];
export function AdminShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false),
    [command, setCommand] = useState(false),
    [mobile, setMobile] = useState(false);
  const auth = useAuth();
  const path = usePathname(),
    router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
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
        <Link
          href="/client"
          className="mt-4 inline-block text-primary underline"
        >
          Về danh sách thành viên
        </Link>
      </main>
    );
  const title = links.find((l) => l.href === path)?.label ?? "Workspace";
  const navigation = (
    <nav aria-label="Main navigation" className="space-y-1">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          title={collapsed ? label : undefined}
          onClick={() => setMobile(false)}
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
          className={cn(
            "flex h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
            path === href
              ? "bg-accent font-medium text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon size={18} />
          <span className={collapsed ? "sr-only" : ""}>{label}</span>
          {!collapsed && label === "Members" && (
            <span className="ml-auto text-xs opacity-60">Team</span>
          )}
        </Link>
      ))}
    </nav>
  );
  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-background focus:p-4"
      >
        Skip to content
      </a>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-card px-4 py-7 lg:flex",
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
              Manage
            </p>
          </>
        )}
        {navigation}
        <div className="mt-auto">
          {!collapsed && (
            <div className="mb-5 rounded-xl bg-muted/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Phân quyền</span>
                <Leaf size={16} className="text-primary" />
              </div>
              <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                Quản lý danh mục Ban ngành và phân công Ban điều hành.
              </p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/dashboard/settings">
                  Quản lý Ban ngành <ArrowUpRight size={13} />
                </Link>
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start px-3"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
            <span className={collapsed ? "sr-only" : ""}>Collapse sidebar</span>
          </Button>
        </div>
      </aside>
      <div
        className={cn(
          "transition-[padding] duration-200",
          collapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        <header className="flex h-20 items-center justify-between gap-3 border-b bg-card/80 px-5 lg:px-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Workspace
            </span>
            <span className="hidden text-border sm:inline">/</span>
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="hidden w-64 justify-start text-muted-foreground md:flex"
              onClick={() => setCommand(true)}
            >
              <Search size={15} />
              <span className="text-xs">Search workspace…</span>
              <kbd className="ml-auto rounded border bg-muted px-1.5 text-[10px]">
                ⌘ K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search workspace"
              className="md:hidden"
              onClick={() => setCommand(true)}
            >
              <Search size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle color theme"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              <Sun size={18} className="dark:hidden" />
              <Moon size={18} className="hidden dark:block" />
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="View workspace activity"
            >
              <Link href="/dashboard/activity">
                <Bell size={18} />
              </Link>
            </Button>
            <div className="h-7 border-l" />
            <DropdownMenu
              label={`${auth.user.name} · ${auth.user.roleLabel}`}
              trigger={
                <Button variant="ghost" size="icon" aria-label="User menu">
                  <Avatar name={auth.user.name} />
                </Button>
              }
            >
              <MenuItem onSelect={() => router.push("/client")}>
                Hồ sơ cá nhân
              </MenuItem>
              <MenuItem onSelect={() => router.push("/dashboard/settings")}>
                Workspace settings
              </MenuItem>
              <MenuItem
                onSelect={() =>
                  setTheme(resolvedTheme === "dark" ? "light" : "dark")
                }
              >
                Switch appearance
              </MenuItem>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex items-center justify-center gap-2 border-b bg-accent/40 px-4 py-2 text-center text-[11px] text-muted-foreground">
          <Badge className="border-primary/20 text-primary">
            Chế độ quản trị
          </Badge>
          Dữ liệu được lưu trên máy chủ.
        </div>
        <main id="main-content" className="mx-auto max-w-[1600px] p-5 lg:p-10">
          {children}
        </main>
        <footer className="mx-5 flex justify-between border-t py-5 text-xs text-muted-foreground lg:mx-10">
          <span>Made for people. Built for community.</span>
          <span>Gather workspace</span>
        </footer>
      </div>
      <Dialog
        open={mobile}
        onOpenChange={setMobile}
        title="Your workspace"
        description="Navigate between pages."
        className="left-0 top-0 h-dvh max-h-dvh max-w-xs translate-x-0 translate-y-0 rounded-none"
      >
        {navigation}
      </Dialog>
      <Dialog
        open={command}
        onOpenChange={setCommand}
        title="Jump to…"
        description="Search pages in your workspace."
      >
        <Command label="Workspace navigation">
          <Command.Input
            autoFocus
            placeholder="Where would you like to go?"
            className="mb-3 h-12 w-full rounded-lg border bg-background px-3 outline-none"
          />
          <Command.List className="max-h-72 overflow-auto">
            <Command.Empty className="p-4 text-sm text-muted-foreground">
              No pages found.
            </Command.Empty>
            {links.map(({ href, label, icon: Icon }) => (
              <Command.Item
                key={href}
                value={label}
                onSelect={() => {
                  router.push(href);
                  setCommand(false);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg p-3 text-sm data-[selected=true]:bg-accent"
              >
                <Icon size={17} />
                {label}
                <ArrowUpRight className="ml-auto" size={14} />
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </Dialog>
    </div>
  );
}
