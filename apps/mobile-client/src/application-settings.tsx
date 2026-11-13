"use client";
import { useEffect, useState } from "react";
import {
  Settings,
  ChevronLeft,
  Activity,
  Key,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@org/core";
import { cn } from "@org/ui";
import { ActivityPage, ChurchStatusReportPage } from "./workspace-pages";
import { AdminOtpConsole } from "./admin-otp-console";
import { navigateClient, usePathname } from "./client-router";
import { Avatar, Button, DropdownMenu, MenuItem } from "@org/ui";

type SettingsPage = "activity" | "otps" | "status-report";

const SETTINGS_PAGES: {
  value: SettingsPage;
  label: string;
  icon: React.ElementType;
  Component: React.ComponentType;
}[] = [
  {
    value: "activity",
    label: "Nhật ký hoạt động",
    icon: Activity,
    Component: ActivityPage,
  },
  { value: "otps", label: "Mã OTP", icon: Key, Component: AdminOtpConsole },
  {
    value: "status-report",
    label: "Báo cáo tình trạng",
    icon: ClipboardList,
    Component: ChurchStatusReportPage,
  },
];

export function ApplicationSettings() {
  const auth = useAuth();
  const path = usePathname();
  const [desktop, setDesktop] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [selected, setSelected] = useState<SettingsPage>(() => {
    if (path === "/dashboard/otps") return "otps";
    if (path === "/dashboard/church-status-report") return "status-report";
    return "activity";
  });
  const admin = auth?.user?.role === "admin";
  const page = SETTINGS_PAGES.find((p) => p.value === selected);

  useEffect(() => {
    if (path === "/dashboard/otps") {
      setSelected("otps");
    } else if (path === "/dashboard/church-status-report") {
      setSelected("status-report");
    } else {
      setSelected("activity");
    }
  }, [path]);

  useEffect(() => {
    const mediaDesktop = window.matchMedia("(min-width: 1024px)");
    const mediaMobile = window.matchMedia("(max-width: 767px)");
    const updateDesktop = () => setDesktop(mediaDesktop.matches);
    const updateMobile = () => setMobile(mediaMobile.matches);
    updateDesktop();
    updateMobile();
    mediaDesktop.addEventListener("change", updateDesktop);
    mediaMobile.addEventListener("change", updateMobile);
    return () => {
      mediaDesktop.removeEventListener("change", updateDesktop);
      mediaMobile.removeEventListener("change", updateMobile);
    };
  }, []);

  return (
    <section className="min-w-0 space-y-6">
      <h1 className="flex items-center justify-between gap-3 text-2xl font-semibold">
        <div className="flex items-center gap-3">
          <Settings className="shrink-0 text-primary" aria-hidden="true" />
          Cài đặt
        </div>
        {mobile && (
          <DropdownMenu
            label={`${auth?.user?.name ?? ""} · ${auth?.user?.roleLabel ?? ""}`}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Menu tài khoản">
                <Avatar name={auth?.user?.name?.toUpperCase() ?? ""} />
              </Button>
            }
          >
            <MenuItem
              onSelect={() => {
                navigateClient("/client/profile");
              }}
            >
              Chuyển sang ứng dụng thành viên
            </MenuItem>
          </DropdownMenu>
        )}
      </h1>
      {admin && (
        <>
          {desktop ? (
            <div className="hidden lg:flex gap-6">
              <aside className="w-64 flex flex-col gap-1 border-r border-border pr-4">
                {SETTINGS_PAGES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setSelected(item.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                        selected === item.value
                          ? "bg-accent font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon size={18} className="shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </aside>
              <div className="flex-1 min-w-0 overflow-auto">
                {page && <page.Component />}
              </div>
            </div>
          ) : (
            <div className="lg:hidden relative overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{
                  transform: `translateX(${mobileDetail ? -100 : 0}%)`,
                }}
              >
                <div className="shrink-0 w-full p-4 space-y-3">
                  <h2 className="text-lg font-semibold">Cài đặt</h2>
                  {SETTINGS_PAGES.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setSelected(item.value);
                          setMobileDetail(true);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                          selected === item.value
                            ? "bg-accent font-medium text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon size={18} className="shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="shrink-0 w-full p-4 space-y-4">
                  <button
                    type="button"
                    onClick={() => setMobileDetail(false)}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ChevronLeft size={16} className="shrink-0" />
                    Quay lại
                  </button>
                  {page && <page.Component />}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
