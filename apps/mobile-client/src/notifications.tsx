import { AutoLoadMore } from "./auto-load-more";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Bell, CalendarDays } from "lucide-react";
import { apiRequest, useAuth } from "@org/core";
import { Button, ErrorMessage } from "@org/ui";

type Notice = {
  id: string;
  type: "schedule" | "event" | "calendar_contribution" | "worship_contribution";
  kind: string;
  title: string;
  createdAt: string;
  href: string;
};
const labels: Record<string, string> = {
  contribution: "Có đóng góp nội dung mới",
  assigned: "Phân công mới",
  changed: "Phân công thay đổi",
  removed: "Đã gỡ phân công",
  cancelled: "Lịch đã hủy",
  created: "Chương trình mới",
  updated: "Chương trình cập nhật",
};
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function notificationDate(value: string) {
  const parts = dateFormat.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("hour")}:${part("minute")} - ${part("day")}/${part("month")}/${part("year")}`;
}

export function Notifications() {
  const auth = useAuth();
  const query = useInfiniteQuery({
    queryKey: ["my-notifications", auth?.user?.id],
    initialPageParam: 1,
    enabled: Boolean(auth?.user),
    refetchInterval: auth?.offline ? false : 30000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: "always",
    queryFn: ({ pageParam, signal }) =>
      apiRequest<{ items: Notice[]; nextPage: number | null }>(
        "/api/my-notifications?page=" + pageParam,
        { signal },
      ),
    getNextPageParam: (page) => page.nextPage ?? undefined,
  });
  const notices = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Trung tâm thông báo</h1>
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching || auth?.offline}
          onClick={() => void query.refetch()}
        >
          Làm mới
        </Button>
      </header>
      {query.isPending ? (
        <p role="status">
          {auth?.offline
            ? "Chưa có thông báo được lưu trên thiết bị. Kết nối Internet để tải thông báo."
            : "Đang tải thông báo…"}
        </p>
      ) : query.error && !query.data ? (
        <ErrorMessage error={query.error} />
      ) : notices.length ? (
        <ul className="divide-y rounded-xl border bg-card">
          {notices.map((notice) => {
            const Icon = notice.type === "schedule" ? CalendarDays : Bell;
            return (
              <li key={`${notice.type}-${notice.id}`}>
                <a
                  href={notice.href}
                  className="flex gap-3 rounded-xl p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon
                    className="mt-1 shrink-0 text-primary"
                    size={21}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm text-primary">
                      {labels[notice.kind] ?? "Cập nhật lịch"}
                    </p>
                    <h2 className="break-words font-semibold">
                      {notice.title}
                    </h2>
                    <time
                      dateTime={notice.createdAt}
                      className="block text-xs text-muted-foreground"
                    >
                      {notificationDate(notice.createdAt)}
                    </time>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="space-y-3 py-10 text-center text-muted-foreground">
          <Bell size={32} className="mx-auto" aria-hidden="true" />
          <p>Bạn chưa có thông báo nào.</p>
        </div>
      )}
      <AutoLoadMore query={query} enabled={!auth?.offline} />
    </section>
  );
}
