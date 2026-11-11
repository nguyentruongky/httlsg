"use client";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { useAuth } from "@org/core";
import { cn } from "@org/ui";
import { ActivityPage } from "./workspace-pages";
import { AdminOtpConsole } from "./admin-otp-console";

export function ApplicationSettings() {
  const auth = useAuth();
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [tab, setTab] = useState<"activity" | "otps">("activity");
  const admin = auth?.user?.role === "admin";
  return (
    <section className="min-w-0 space-y-6">
      <h1 className="flex items-center gap-3 text-2xl font-semibold">
        <Settings className="shrink-0 text-primary" aria-hidden="true" />
        Cài đặt
      </h1>
      {admin && (
        <div
          role="tablist"
          aria-label="Cài đặt"
          className="flex rounded-lg border bg-muted p-1 lg:hidden"
        >
          {(["activity", "otps"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`settings-tab-${value}`}
              aria-selected={tab === value}
              aria-controls={`settings-panel-${value}`}
              tabIndex={tab === value ? 0 : -1}
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "activity"
                    : event.key === "End"
                      ? "otps"
                      : value === "activity"
                        ? "otps"
                        : "activity";
                setTab(next);
                document.getElementById(`settings-tab-${next}`)?.focus();
              }}
              onClick={() => setTab(value)}
              className={cn(
                "min-h-11 flex-1 rounded-md px-3 text-sm font-medium",
                tab === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {value === "activity" ? "Nhật ký hoạt động" : "Mã OTP"}
            </button>
          ))}
        </div>
      )}
      <div
        className={cn(
          "grid min-w-0 gap-6",
          admin && "lg:grid-cols-2 lg:divide-x",
        )}
      >
        <div
          id="settings-panel-activity"
          aria-label="Nhật ký hoạt động"
          className={cn(
            "min-w-0",
            admin && "lg:pr-6",
            admin && tab !== "activity" && "hidden lg:block",
          )}
        >
          <ActivityPage />
        </div>
        {admin && (
          <div
            id="settings-panel-otps"
            aria-label="Mã OTP"
            className={cn("min-w-0", tab !== "otps" && "hidden lg:block")}
          >
            {(desktop || tab === "otps") && <AdminOtpConsole />}
          </div>
        )}
      </div>
    </section>
  );
}
