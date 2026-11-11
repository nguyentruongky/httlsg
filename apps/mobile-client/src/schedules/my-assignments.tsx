"use client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import {
  apiRequest,
  useAuth,
  displayCalendarDate,
  RECEPTION_ELIGIBILITY_LABELS,
} from "@org/core";
import { Button, Card, ErrorMessage } from "@org/ui";
import { saveAssignmentToCalendar } from "./phone-calendar";
import { assignmentResponsibilityLabel } from "./assignment-label";

export type Assignment = {
  scheduleId: string;
  scheduleTitle: string;
  categoryName: string;
  categoryId: string;
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

export function MyAssignments() {
  const auth = useAuth();
  const query = useInfiniteQuery({
    queryKey: ["my-assignments", auth?.user?.id, "upcoming"],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest<{ items: Assignment[]; nextPage: number | null }>(
        "/api/my-assignments?view=upcoming&page=" + pageParam,
      ),
    getNextPageParam: (page) => page.nextPage ?? undefined,
  });
  const rows = query.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <section className="space-y-5 [&_.ui-button]:min-h-11">
      <h1 className="text-xl font-semibold">Lịch phục vụ của tôi</h1>
      {query.isPending ? (
        <p role="status">Đang tải phân công…</p>
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card
              key={row.responsibilityId}
              className="relative space-y-3 p-4 hover:border-primary/40 focus-within:ring-2 focus-within:ring-ring"
            >
              <h2 className="break-words font-semibold">
                <a
                  href={`/client/assignments/${row.scheduleId}`}
                  aria-label={`Xem toàn bộ ${row.scheduleTitle}`}
                  className="after:absolute after:inset-0 after:rounded-xl"
                >
                  {row.categoryName}
                </a>
              </h2>
              <p>
                {displayCalendarDate(row.date)}
                {row.session ? " - " + row.session : ""}
              </p>
              {row.responsibility && row.responsibility !== "Buổi tối" && (
                <p className="break-words">
                  {row.categoryId === "reception" ? "Vị trí" : "Công tác"}:{" "}
                  {assignmentResponsibilityLabel(row.responsibility)}
                </p>
              )}
              {row.startTime && (
                <p className="text-sm text-muted-foreground">
                  {row.startTime}
                  {row.endTime ? " – " + row.endTime : ""}
                </p>
              )}
              {row.location && (
                <p className="break-words text-sm">{row.location}</p>
              )}
              {row.notes &&
                !Object.values(RECEPTION_ELIGIBILITY_LABELS).some(
                  (role) => role === row.notes.trim(),
                ) && (
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {row.notes}
                  </p>
                )}
              <Button
                type="button"
                variant="outline"
                className="relative z-10"
                onClick={() => saveAssignmentToCalendar(row, auth?.user?.id)}
              >
                <CalendarPlus size={18} aria-hidden="true" />
                Lưu vào lịch điện thoại
              </Button>
            </Card>
          ))}
          {!rows.length && (
            <p className="py-6 text-center text-muted-foreground">
              Bạn chưa có lịch phục vụ sắp tới.
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
    </section>
  );
}
