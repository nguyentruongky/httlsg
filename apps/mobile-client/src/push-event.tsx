"use client";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, displayCalendarDate } from "@org/core";
import { Button, Card, ErrorMessage } from "@org/ui";
import { ArrowLeft } from "lucide-react";
export function PushEvent({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["member-push-event", id],
    queryFn: () =>
      apiRequest<{
        id: string;
        eventDate: string;
        title: string;
        originalText: string;
      }>("/api/push/events/" + encodeURIComponent(id)),
  });
  return (
    <section className="space-y-4">
      <Button asChild variant="ghost" size="icon">
        <a href="#/notifications" aria-label="Về thông báo">
          <ArrowLeft size={22} />
        </a>
      </Button>
      {query.isPending ? (
        <p role="status">Đang tải chương trình…</p>
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        <Card className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            {displayCalendarDate(query.data.eventDate)}
          </p>
          <h1 className="break-words text-xl font-semibold">
            {query.data.title}
          </h1>
          <div className="whitespace-pre-wrap break-words text-base leading-relaxed">
            {query.data.originalText}
          </div>
        </Card>
      )}
    </section>
  );
}
