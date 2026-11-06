"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import {
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
  const [open, setOpen] = useState(false),
    [page, setPage] = useState(1);
  const client = useQueryClient(),
    { toast } = useToast();
  const alerts = useQuery({
    queryKey: [...calendarKey, "failures", page],
    queryFn: () =>
      apiRequest<{ items: Failure[]; total: number }>(
        `/api/notifications/failures?page=${page}`,
      ),
    enabled: allowed,
    refetchInterval: 15000,
  });
  // Keep a request UUID after a lost response; a second click cannot enqueue
  // another retry unless the prior request completed with a known result.
  const [requests] = useState(() => new Map<string, string>());
  const retry = useMutation({
    mutationFn: (id: string) => {
      if (!requests.has(id)) requests.set(id, crypto.randomUUID());
      return apiRequest<{ count: number; delivery?: CalendarSendSummary }>(
        `/api/notifications/${id}/retry`,
        {
          method: "POST",
          body: JSON.stringify({ requestId: requests.get(id) }),
        },
      );
    },
    onSuccess: (result, id) => {
      requests.delete(id);
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
  const count = alerts.data?.total ?? 0;
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={
          count
            ? `Thông báo: ${count} sinh hoạt gửi email thất bại`
            : "Thông báo"
        }
        onClick={() => {
          setOpen(true);
          setPage(1);
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
          {alerts.data?.items.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Không có thông báo gửi email thất bại.
            </p>
          )}
          <div className="space-y-4">
            {alerts.data?.items.map((item) => (
              <article key={item.id} className="rounded-xl border p-4">
                <h3 className="font-semibold">{item.title}</h3>
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
                    onClick={() => retry.mutate(item.id)}
                  >
                    {retry.isPending && retry.variables === item.id
                      ? "Đang gửi lại…"
                      : "Thử lại"}
                  </Button>
                ) : (
                  item.failed > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Đã đạt giới hạn thử lại. Vui lòng kiểm tra cấu hình email.
                    </p>
                  )
                )}
              </article>
            ))}
          </div>
          {count > 20 && (
            <div className="mt-4 flex justify-between">
              <Button
                variant="outline"
                disabled={page === 1 || alerts.isFetching}
                onClick={() => setPage((p) => p - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                disabled={page * 20 >= count || alerts.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Tiếp
              </Button>
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
