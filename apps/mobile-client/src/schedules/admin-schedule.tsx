import { AutoLoadMore } from "../auto-load-more";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import {
  apiRequest,
  displayCalendarDate,
  todayInChurch,
  addCalendarDays,
  useAuth,
  type CalendarEvent,
  type ScheduleRecord,
} from "@org/core";
import { Button, Card, Dialog, ErrorMessage } from "@org/ui";
import { DayResponsibilities } from "./day-responsibilities";

type AgendaEvent = {
  id: string;
  eventDate: string;
  title: string;
  timeText: string | null;
  summary: string;
  expanded: boolean;
  originalText: string | null;
};
type AgendaPage = {
  items: AgendaEvent[];
  reception: ScheduleRecord[];
  nextPage: number | null;
};

export function AdminSchedule() {
  const auth = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const query = useInfiniteQuery({
    queryKey: ["client-schedule", auth?.user?.id],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest<AgendaPage>("/api/client-schedule?page=" + pageParam),
    getNextPageParam: (page) => page.nextPage ?? undefined,
  });
  const today = todayInChurch();
  const weekEnd = addCalendarDays(today, 6);
  const responsibilities = useQuery({
    queryKey: ["calendar-responsibilities", auth?.user?.id, today, weekEnd],
    queryFn: () =>
      apiRequest<{ items: ScheduleRecord[] }>(
        `/api/calendar-responsibilities?from=${today}&to=${weekEnd}`,
      ),
  });
  const eventDates = new Set(
    query.data?.pages.flatMap((page) =>
      page.items.map((event) => event.eventDate),
    ) ?? [],
  );
  const assignmentOnlyDates = [
    ...new Set(
      responsibilities.data?.items.flatMap((schedule) =>
        schedule.events.map((event) => event.date),
      ) ?? [],
    ),
  ]
    .filter((date) => !eventDates.has(date))
    .sort();
  const detail = useQuery({
    queryKey: ["client-schedule", auth?.user?.id, selected],
    queryFn: () =>
      apiRequest<{ event: CalendarEvent; reception: ScheduleRecord[] }>(
        "/api/client-schedule?id=" + selected,
      ),
    enabled: Boolean(selected),
  });
  return (
    <section className="space-y-5 [&_.ui-button]:min-h-11">
      <h1 className="text-xl font-semibold">Lịch sinh hoạt</h1>
      <p className="text-sm text-muted-foreground">
        Hiển thị đầy đủ chương trình và phân công phục vụ trong 7 ngày tính từ
        hôm nay. Chạm vào chương trình các ngày sau để xem chi tiết.
      </p>
      {responsibilities.error && (
        <ErrorMessage error={responsibilities.error} />
      )}
      {!query.isPending &&
        !query.error &&
        assignmentOnlyDates.map((date) => (
          <Card key={date} className="space-y-3 p-4">
            <h2 className="font-semibold">
              Phân công phục vụ · {displayCalendarDate(date)}
            </h2>
            <DayResponsibilities
              date={date}
              schedules={responsibilities.data?.items ?? []}
            />
          </Card>
        ))}
      {query.isPending ? (
        <p role="status">Đang tải lịch…</p>
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        <div className="space-y-4">
          {query.data.pages.flatMap((page) =>
            page.items.map((event) => (
              <Card key={event.id} className="space-y-3 p-4">
                <p className="text-sm text-primary">
                  {displayCalendarDate(event.eventDate)}
                  {event.timeText ? " · " + event.timeText : ""}
                </p>
                <h2 className="wrap-break-word font-semibold">{event.title}</h2>
                {event.expanded ? (
                  <>
                    <div className="whitespace-pre-wrap wrap-break-word text-sm">
                      {event.originalText}
                    </div>
                    <DayResponsibilities
                      date={event.eventDate}
                      schedules={page.reception}
                    />
                  </>
                ) : (
                  <>
                    {event.summary && (
                      <p className="line-clamp-2 wrap-break-word text-sm text-muted-foreground">
                        {event.summary}
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelected(event.id)}
                    >
                      Xem chi tiết <ChevronRight size={17} />
                    </Button>
                  </>
                )}
              </Card>
            )),
          )}
          {!query.data.pages[0].items.length && !assignmentOnlyDates.length && (
            <p className="py-6 text-center text-muted-foreground">
              Chưa có chương trình sắp tới.
            </p>
          )}
        </div>
      )}
      <AutoLoadMore query={query} />
      {selected && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null);
          }}
          title={detail.data?.event.title ?? "Chi tiết chương trình"}
          description=""
          closeLabel="Đóng chi tiết chương trình"
          fullScreenOnMobile
        >
          {detail.isPending ? (
            <p role="status">Đang tải chương trình…</p>
          ) : detail.error ? (
            <ErrorMessage error={detail.error} />
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-primary">
                {displayCalendarDate(detail.data.event.eventDate)}
                {detail.data.event.timeText
                  ? " · " + detail.data.event.timeText
                  : ""}
              </p>
              <div className="whitespace-pre-wrap wrap-break-word text-sm">
                {detail.data.event.originalText}
              </div>
              <DayResponsibilities
                date={detail.data.event.eventDate}
                schedules={detail.data.reception}
              />
            </div>
          )}
        </Dialog>
      )}
    </section>
  );
}
