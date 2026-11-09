import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import {
  apiRequest,
  displayCalendarDate,
  scheduleDutyText,
  useAuth,
  type CalendarEvent,
  type ScheduleRecord,
} from "@org/core";
import { Button, Card, Dialog, ErrorMessage } from "@org/ui";

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

function ReceptionDetails({
  date,
  schedules,
}: {
  date: string;
  schedules: ScheduleRecord[];
}) {
  const entries = schedules.flatMap((schedule) =>
    schedule.events
      .filter((event) => event.date === date)
      .map((event) => ({ event, schedule })),
  );
  return (
    <div className="space-y-3 border-t pt-3">
      <h3 className="font-semibold">Tiếp tân</h3>
      {entries.length ? (
        entries.map(({ event, schedule }) => (
          <div key={`${schedule.id}-${event.id}`} className="space-y-2">
            <p className="text-sm font-medium text-primary">
              {event.session || event.title}
              {event.startTime ? " · " + event.startTime : ""}
            </p>
            {event.responsibilities.map((duty) => (
              <div key={duty.id} className="text-sm">
                <p className="font-medium">{duty.name}</p>
                <p className="whitespace-pre-wrap break-words text-muted-foreground">
                  {scheduleDutyText(schedule, duty) || "Chưa phân công"}
                </p>
              </div>
            ))}
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          Chưa có lịch tiếp tân đã công bố cho ngày này.
        </p>
      )}
    </div>
  );
}

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
        Hiển thị đầy đủ chương trình và tiếp tân trong 7 ngày tính từ hôm nay.
        Chạm vào chương trình các ngày sau để xem chi tiết.
      </p>
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
                <h2 className="break-words font-semibold">{event.title}</h2>
                {event.expanded ? (
                  <>
                    <div className="whitespace-pre-wrap break-words text-sm">
                      {event.originalText}
                    </div>
                    <ReceptionDetails
                      date={event.eventDate}
                      schedules={page.reception}
                    />
                  </>
                ) : (
                  <>
                    {event.summary && (
                      <p className="line-clamp-2 break-words text-sm text-muted-foreground">
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
          {!query.data.pages[0].items.length && (
            <p className="py-6 text-center text-muted-foreground">
              Chưa có chương trình sắp tới.
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
          Tải thêm chương trình
        </Button>
      )}
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
              <div className="whitespace-pre-wrap break-words text-sm">
                {detail.data.event.originalText}
              </div>
              <ReceptionDetails
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
