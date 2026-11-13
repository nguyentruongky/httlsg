"use client";
import { AutoLoadMore } from "../auto-load-more";
import { useState } from "react";
import {
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Bell } from "lucide-react";
import {
  createRequestId,
  apiRequest,
  calendarKey,
  canCalendar,
  displayCalendarDate,
  useAuth,
  type CalendarSendSummary,
} from "@org/core";
import { Button, Dialog, ErrorMessage, useToast } from "@org/ui";
type Failure = {
  id: string;
  kind?: "calendar" | "worship_viber";
  title: string;
  eventDate: string;
  createdAt: string;
  failed: number;
  retryable: number;
  uncertain: number;
};
export function FailureNotifications() {
  const user = useAuth()?.user;
  const allowed = canCalendar(user, "calendar.notify");
  const [open, setOpen] = useState(false);
  const client = useQueryClient(),
    { toast } = useToast();
  const alerts = useInfiniteQuery({
    queryKey: [...calendarKey, "failures"],
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      pages.length * 20 < last.total ? pages.length + 1 : undefined,
    queryFn: ({ pageParam }) =>
      apiRequest<{ items: Failure[]; total: number }>(
        `/api/notifications/failures?page=${pageParam}`,
      ),
    enabled: allowed,
    refetchInterval: 15000,
  });
  // Keep a request UUID after a lost response; a second click cannot enqueue
  // another retry unless the prior request completed with a known result.
  const [requests] = useState(() => new Map<string, string>());
  const retry = useMutation({
    mutationFn: (item: Failure) => {
      const id = item.id;
      if (!requests.has(id)) requests.set(id, createRequestId());
      return apiRequest<{ count: number; delivery?: CalendarSendSummary }>(
        item.kind === "worship_viber"
          ? `/api/worship-viber-drafts/${id}/retry`
          : `/api/notifications/${id}/retry`,
        {
          method: "POST",
          body: JSON.stringify({ requestId: requests.get(id) }),
        },
      );
    },
    onSuccess: (result, item) => {
      requests.delete(item.id);
      void client.invalidateQueries({ queryKey: calendarKey });
      const incomplete =
        result.delivery?.error ||
        (result.delivery?.failed ?? 0) > 0 ||
        (result.delivery?.uncertain ?? 0) > 0;
      toast({
        title: incomplete
          ? "Một số email chưa gửi được"
          : "Đã thử gửi lại email",
        variant: incomplete ? "error" : "success",
      });
    },
  });
  if (!allowed) return null;
  const count = alerts.data?.pages[0]?.total ?? 0;
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={
          count
            ? `Thông báo: ${count} chương trình gửi email thất bại`
            : "Thông báo"
        }
        onClick={() => {
          setOpen(true);
          void client.invalidateQueries({
            queryKey: [...calendarKey, "failures"],
          });
        }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute right-0 top-0 min-w-4 rounded-full bg-destructive px-1 text-[10px] text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Button>
      {open && (
        <Dialog
          open
          onOpenChange={setOpen}
          title="Thông báo"
          description="Email chưa gửi được"
          fullScreenOnMobile
        >
          {alerts.isPending && <p role="status">Đang tải thông báo…</p>}
          <ErrorMessage error={alerts.error || retry.error} />
          {alerts.data?.pages[0]?.items.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Không có thông báo gửi email thất bại.
            </p>
          )}
          <div className="space-y-4">
            {alerts.data?.pages
              .flatMap((page) => page.items)
              .map((item) => (
                <article key={item.id} className="rounded-xl border p-4">
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.kind === "worship_viber" && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Email bản nháp Viber
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {displayCalendarDate(item.eventDate)} ·{" "}
                    {new Intl.DateTimeFormat("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(item.createdAt))}
                  </p>
                  {item.failed > 0 && (
                    <p className="mt-2 text-sm">
                      {item.failed} email gửi thất bại.
                    </p>
                  )}
                  {item.uncertain > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.uncertain} email chưa xác định kết quả. Cần kiểm tra
                      máy chủ email trước khi gửi lại để tránh trùng lặp.
                    </p>
                  )}
                  {item.retryable > 0 ? (
                    <Button
                      className="mt-3"
                      disabled={retry.isPending}
                      onClick={() => retry.mutate(item)}
                    >
                      {retry.isPending && retry.variables?.id === item.id
                        ? "Đang gửi lại…"
                        : "Thử lại"}
                    </Button>
                  ) : (
                    item.failed > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        Đã đạt giới hạn thử lại. Vui lòng kiểm tra cấu hình
                        email.
                      </p>
                    )
                  )}
                </article>
              ))}
          </div>
          <AutoLoadMore query={alerts} enabled={open} />
        </Dialog>
      )}
    </>
  );
}
