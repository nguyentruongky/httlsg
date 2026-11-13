import { useState } from "react";
import { useTheme } from "next-themes";
import { ChevronRight, Sun, Moon } from "lucide-react";
import { hasScheduleManagement, hasDashboard, useAuth } from "@org/core";
import { Button, Card } from "@org/ui";

export function ProfileSettings() {
  const { resolvedTheme, setTheme } = useTheme();
  const auth = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  return (
    <>
      {auth?.user && hasDashboard(auth.user.role) && (
        <Card className="mt-5">
          <a
            href="/dashboard/members"
            className="flex min-h-16 items-center justify-between px-5 text-sm"
          >
            Mở trang quản trị <ChevronRight size={17} />
          </a>
        </Card>
      )}
      {hasScheduleManagement(auth?.user) && (
        <Card className="mt-5">
          <a
            href="/client/schedules"
            className="flex min-h-16 items-center justify-between px-5 text-sm"
          >
            Lịch phân công <ChevronRight size={17} />
          </a>
        </Card>
      )}
      <Card className="mt-5 overflow-hidden">
        <h2 className="px-5 py-4 font-semibold">Cài đặt thiết bị</h2>
        <button
          type="button"
          aria-label="Đổi giao diện"
          className="flex min-h-16 w-full items-center gap-3 border-t px-5 text-left text-sm"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? (
            <Moon size={20} className="text-primary" />
          ) : (
            <Sun size={20} className="text-primary" />
          )}
          <span className="flex-1">Đổi giao diện</span>
          <span className="text-muted-foreground">
            {resolvedTheme === "dark" ? "Tối" : "Sáng"}
          </span>
        </button>
      </Card>
      {auth?.user && (
        <Button
          variant="outline"
          size="touch"
          className="mt-4 w-full"
          onClick={() => {
            setLogoutError(null);
            void auth
              .signOut()
              .catch(() =>
                setLogoutError("Không thể đăng xuất. Vui lòng thử lại."),
              );
          }}
        >
          Đăng xuất
        </Button>
      )}
      {auth?.user && (
        <Button
          variant="ghost"
          className="mt-2 w-full"
          onClick={() => {
            setLogoutError(null);
            void auth
              .signOutAll()
              .catch(() =>
                setLogoutError(
                  "Không thể đăng xuất tất cả thiết bị. Vui lòng thử lại.",
                ),
              );
          }}
        >
          Đăng xuất tất cả thiết bị
        </Button>
      )}
      {logoutError && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {logoutError}
        </p>
      )}
      {!auth && (
        <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
          Bạn đang xem hồ sơ mẫu.
          <br />
          Thông tin cá nhân và gia đình là dữ liệu minh họa.
        </p>
      )}
    </>
  );
}
