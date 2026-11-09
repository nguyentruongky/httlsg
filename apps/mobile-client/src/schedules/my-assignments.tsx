"use client";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
  apiRequest,
  displayCalendarDate,
  type ScheduleRecord,
} from "@org/core";
import { Button, Card, Dialog, ErrorMessage } from "@org/ui";
import { ScheduleViews } from "./schedule-views";
type Assignment = {
  scheduleId: string;
  scheduleTitle: string;
  status: string;
  categoryName: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  location: string;
  description: string;
  session: string;
  responsibilityId: string;
  responsibility: string;
  responsibilityDescription: string;
  notes: string;
};
type Notice = { id: string; kind: string; title: string; createdAt: string };
export function MyAssignments() {
  const [view, setView] = useState<"upcoming" | "past" | "published">(
      "upcoming",
    ),
    [selected, setSelected] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["my-assignments", view],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest<{
        items: Assignment[];
        nextPage: number | null;
        notices: Notice[];
      }>(
        "/api/my-assignments?" +
          new URLSearchParams({
            view: view === "published" ? "all" : view,
            page: String(pageParam),
          }),
      ),
    getNextPageParam: (page) => page.nextPage ?? undefined,
  });
  const detail = useQuery({
    queryKey: ["my-assignments", "detail", selected],
    queryFn: () => apiRequest<ScheduleRecord>("/api/schedules/" + selected),
    enabled: Boolean(selected),
  });
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [],
    plans = [
      ...new Map(
        rows
          .filter((row) => row.status === "published")
          .map((row) => [row.scheduleId, row]),
      ).values(),
    ];
  return (
    <section className="space-y-5 [&_.ui-button]:min-h-11">
      <header className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <a href="#/profile" aria-label="Về hồ sơ cá nhân">
            <ArrowLeft size={21} />
          </a>
        </Button>
        <h1 className="text-xl font-semibold">Lịch phục vụ của tôi</h1>
      </header>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["upcoming", "Sắp tới"],
            ["past", "Đã qua / Đã hủy"],
            ["published", "Lịch đã công bố"],
          ] as const
        ).map(([id, label]) => (
          <Button
            type="button"
            key={id}
            variant={view === id ? "default" : "outline"}
            aria-pressed={view === id}
            onClick={() => setView(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      {query.isPending ? (
        <p role="status">Đang tải phân công…</p>
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : view === "published" ? (
        <div className="space-y-3">
          {plans.map((plan) => (
            <button
              key={plan.scheduleId}
              type="button"
              className="w-full rounded-xl border bg-card p-4 text-left"
              onClick={() => setSelected(plan.scheduleId)}
            >
              <p className="font-semibold">{plan.scheduleTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.categoryName}
              </p>
            </button>
          ))}
          {!plans.length && (
            <p className="py-6 text-center text-muted-foreground">
              Chưa có lịch đã công bố có phân công cho bạn.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.responsibilityId} className="space-y-2 p-4">
              <p className="text-sm text-primary">{row.categoryName}</p>
              <h2 className="font-semibold">{row.responsibility}</h2>
              <p>
                {displayCalendarDate(row.date)}
                {row.startTime
                  ? " · " +
                    row.startTime +
                    (row.endTime ? " – " + row.endTime : "")
                  : ""}
              </p>
              <p className="break-words">
                {row.title}
                {row.session ? " · " + row.session : ""}
              </p>
              {row.location && (
                <p className="text-sm text-muted-foreground">{row.location}</p>
              )}
              {row.notes && (
                <p className="whitespace-pre-wrap break-words text-sm">
                  {row.notes}
                </p>
              )}
              {row.responsibilityDescription && (
                <p className="break-words text-sm">
                  {row.responsibilityDescription}
                </p>
              )}
              {row.status === "cancelled" ? (
                <p className="font-medium text-destructive">Lịch đã hủy</p>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelected(row.scheduleId)}
                >
                  Xem lịch đã công bố
                </Button>
              )}
            </Card>
          ))}
          {!rows.length && (
            <p className="py-6 text-center text-muted-foreground">
              Bạn chưa có phân công trong khoảng này.
            </p>
          )}
        </div>
      )}
      {query.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Tải thêm phân công
        </Button>
      )}
      {query.data?.pages[0].notices.length ? (
        <details className="space-y-3 rounded-xl border p-4">
          <summary className="cursor-pointer font-semibold">
            Thông báo phân công
          </summary>
          <ul className="mt-3 divide-y">
            {query.data.pages[0].notices.map((notice) => (
              <li key={notice.id} className="space-y-1 py-3">
                <p className="break-words text-sm">
                  {{
                    assigned: "Phân công mới",
                    changed: "Phân công thay đổi",
                    removed: "Đã gỡ phân công",
                    cancelled: "Lịch đã hủy",
                  }[notice.kind] ?? "Cập nhật lịch"}
                  : {notice.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  }).format(new Date(notice.createdAt))}
                </p>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {selected && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title={detail.data?.title ?? "Lịch đã công bố"}
          description=""
          closeLabel="Đóng lịch đã công bố"
          fullScreenOnMobile
          className="sm:max-w-5xl"
        >
          {detail.isPending ? (
            <p role="status">Đang tải…</p>
          ) : detail.error ? (
            <ErrorMessage error={detail.error} />
          ) : (
            <ScheduleViews schedule={detail.data} printable />
          )}
        </Dialog>
      )}
    </section>
  );
}
