import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { apiRequest, useAuth, type ScheduleRecord } from "@org/core";
import { Button, ErrorMessage } from "@org/ui";
import { ScheduleViews } from "./schedule-views";

export function NotifiedSchedule({
  id,
  assigned = false,
}: {
  id: string;
  assigned?: boolean;
}) {
  const auth = useAuth();
  const query = useQuery({
    queryKey: [
      assigned ? "assigned-schedule" : "notified-schedule",
      auth?.user?.id,
      id,
    ],
    queryFn: () =>
      apiRequest<ScheduleRecord>(
        (assigned
          ? "/api/my-assignments/"
          : "/api/my-notifications/schedules/") + id,
      ),
  });
  return (
    <section className="space-y-5">
      <Button asChild variant="ghost" size="icon">
        <a
          href={assigned ? "/client/assignments" : "/client/notifications"}
          aria-label={assigned ? "Về lịch phục vụ" : "Về thông báo"}
        >
          <ChevronLeft size={20} />
        </a>
      </Button>
      {query.isPending ? (
        <p role="status">Đang tải lịch…</p>
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        <>
          <h1 className="break-words text-xl font-semibold">
            {query.data.title}
          </h1>
          {query.data.status === "cancelled" && (
            <p className="font-medium text-destructive">Lịch đã hủy</p>
          )}
          <ScheduleViews schedule={query.data} printable saveToPhotos />
        </>
      )}
    </section>
  );
}
