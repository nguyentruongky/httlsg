"use client";
import { useEffect, useId, useRef, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRequestId,
  useAuth,
  canCalendar,
  apiRequest,
  calendarKey,
  parseEventText,
  renderEventPreset,
  defaultEventPreset,
  EVENT_PRESETS,
  calendarWeekday,
  type EventPreset,
  CalendarDate,
  type CalendarEvent,
  type CalendarSaveResult,
  type EmailGroup,
} from "@org/core";
import {
  Button,
  Checkbox,
  Dialog,
  ErrorMessage,
  WorshipInformationPanel,
  useToast,
} from "@org/ui";
import { formatDate } from "../date-input";
import { EventResponsibilityBadges } from "./event-responsibility-badges";
import { WorshipMentionTextarea } from "./worship-mention-textarea";
import { EventPresetSelector } from "./event-preset-selector";
// Keep the selector implementation available for a future reintroduction.
const SHOW_EVENT_PRESET_SELECTOR = false;
const textarea =
  "w-full rounded-xl border bg-background px-4 py-4 text-base leading-relaxed outline-none focus:ring-2 focus:ring-ring min-h-[320px] overflow-y-auto resize-none box-border min-w-0 block";
export function EventEditor({
  date,
  event,
  blank = false,
  onClose,
}: {
  date: string;
  event?: CalendarEvent;
  blank?: boolean;
  onClose: () => void;
}) {
  const formId = useId();
  const user = useAuth()?.user,
    client = useQueryClient(),
    { toast } = useToast();
  const write = canCalendar(user, "calendar.write");
  const contribute = !write && canCalendar(user) && Boolean(event);
  const composer = useRef<HTMLTextAreaElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const automaticServiceTitle = useRef<{ date: string; title: string } | null>(null);
  const [eventDate, setDate] = useState(date),
    [text, setText] = useState(event?.originalText ?? ""),
    [selected, setSelected] = useState(event?.groupIds ?? []),
    [deleting, setDeleting] = useState(false);
  const [presetId, setPresetId] = useState<string>(),
    [replacement, setReplacement] = useState<EventPreset | null>(null);
  useEffect(() => {
    if (pendingCaret.current === null || !composer.current) return;
    const position = pendingCaret.current;
    pendingCaret.current = null;
    composer.current.focus();
    composer.current.setSelectionRange(position, position);
  }, [text]);
  function applyPreset(preset: EventPreset, serviceNumber?: string) {
    initialized.current = true;
    const content = renderEventPreset(preset, {
      date: eventDate,
      service_number:
        serviceNumber ??
        defaultEventPreset(eventDate, dayEvents.data?.items)?.serviceNumber,
    });
    automaticServiceTitle.current = !event && preset.id === "worship-program"
      ? { date: eventDate, title: content.split("\n")[0] } : null;
    const weekday = calendarWeekday(eventDate);
    if (!event && (weekday === 0 || weekday === 3)) {
      const lines = content.split("\n");
      pendingCaret.current =
        weekday === 0 && lines.length > 1
          ? lines[0].length + 1 + lines[1].length
          : lines[0].length;
    }
    setText(content);
    setPresetId(preset.id);
    const groupName = preset.emailGroupName;
    if (groupName) {
      const normalize = (name: string) =>
        name.normalize("NFC").trim().toLocaleLowerCase("vi");
      const group = groups.data?.items.find(
        (item) => normalize(item.name) === normalize(groupName),
      );
      if (group)
        setSelected((current) =>
          current.includes(group.id) ? current : [...current, group.id],
        );
    }
    setReplacement(null);
  }
  const [requestId] = useState(() => createRequestId());
  const parsed = useMemo(() => parseEventText(text), [text]);
  const groups = useQuery({
    queryKey: [...calendarKey, "groups"],
    queryFn: () => apiRequest<{ items: EmailGroup[] }>("/api/email-groups"),
    enabled: write && canCalendar(user),
  });
  const initialized = useRef(Boolean(event) || blank);
  const needsSundayCount =
    !blank &&
    !event &&
    write &&
    CalendarDate.safeParse(eventDate).success &&
    calendarWeekday(eventDate) === 0;
  const dayEvents = useQuery({
    queryKey: [...calendarKey, "preset-day-events", eventDate],
    queryFn: () =>
      apiRequest<{ items: CalendarEvent[] }>(
        `/api/events?from=${eventDate}&to=${eventDate}`,
      ),
    enabled: needsSundayCount,
    staleTime: 0,
  });
  // Fill the default event template immediately, without waiting for network.
  useEffect(() => {
    if (blank || initialized.current || !write || text.trim()) return;
    initialized.current = true;
    const suggestion = defaultEventPreset(eventDate, dayEvents.data?.items ?? []);
    if (suggestion) applyPreset(suggestion.preset, suggestion.serviceNumber);
  }, [eventDate, write, blank]);

  // Reconcile the provisional service number once the day's events arrive.
  // Only change the generated title; preserve all entered details and manual titles.
  useEffect(() => {
    const automatic = automaticServiceTitle.current;
    if (!needsSundayCount || dayEvents.isFetching || !dayEvents.data || !automatic || automatic.date !== eventDate) return;
    const suggestion = defaultEventPreset(eventDate, dayEvents.data.items);
    if (!suggestion?.serviceNumber) return;
    const title = renderEventPreset(suggestion.preset, {
      date: eventDate, service_number: suggestion.serviceNumber,
    }).split("\n")[0];
    if (title === automatic.title) return;
    const newline = text.indexOf("\n");
    const currentTitle = newline < 0 ? text : text.slice(0, newline);
    if (currentTitle !== automatic.title) return;
    const input = composer.current;
    if (input && document.activeElement === input) {
      const caret = input.selectionStart;
      pendingCaret.current = caret >= currentTitle.length ? caret + title.length - currentTitle.length : Math.min(caret, title.length);
    }
    automaticServiceTitle.current = { date: eventDate, title };
    setText(title + (newline < 0 ? "" : text.slice(newline)));
  }, [needsSundayCount, dayEvents.data, dayEvents.isFetching, eventDate, text]);

  // Select the preset's email recipient group once the groups list loads.
  useEffect(() => {
    if (groups.isPending || groups.error || !presetId || !write) return;
    const preset = EVENT_PRESETS.find((p) => p.id === presetId);
    const groupName = preset?.emailGroupName;
    if (!groupName) return;
    const normalize = (name: string) =>
      name.normalize("NFC").trim().toLocaleLowerCase("vi");
    const group = groups.data?.items.find(
      (item) => normalize(item.name) === normalize(groupName),
    );
    if (group && !selected.includes(group.id))
      setSelected((current) => [...current, group.id]);
  }, [groups.data, groups.isPending, groups.error, presetId, selected, write]);
  const save = useMutation({
    mutationFn: () =>
      apiRequest<CalendarSaveResult>(
        event ? `/api/events/${event.id}` : "/api/events",
        {
          method: event ? "PATCH" : "POST",
          body: JSON.stringify({
            eventDate,
            originalText: text,
            groupIds: selected,
            ...(!event && presetId ? { presetId } : {}),
            requestId,
            ...(event ? { version: event.version } : {}),
          }),
        },
      ),
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: calendarKey });
      const delivery = result.delivery;
      const failed = Boolean(
        delivery?.error ||
        (delivery?.failed ?? 0) > 0 ||
        (delivery?.uncertain ?? 0) > 0 ||
        (delivery?.cancelled ?? 0) > 0,
      );
      const pending =
        (delivery?.pending ?? 0) > 0 || (delivery?.sending ?? 0) > 0;
      toast({
        title: "Đã lưu chương trình",
        description: result.deliveryQueued
          ? "Chương trình đã lưu. Thông báo đang được xử lý trong nền."
          : selected.length
          ? failed
            ? "Email chưa gửi đầy đủ. Mở chuông thông báo để thử lại."
            : pending
              ? "Một số email đang được xử lý. Bạn sẽ nhận thông báo nếu gửi thất bại."
              : (delivery?.sent ?? 0) > 0
                ? "Đã gửi thông báo."
                : "Nhóm đã chọn chưa có địa chỉ nhận email."
          : undefined,
        variant: failed ? "error" : "success",
      });
      onClose();
    },
  });

  const submitContribution = useMutation({
    mutationFn: () =>
      apiRequest<{ saved: boolean }>("/api/events/contributions", {
        method: "POST",
        body: JSON.stringify({
          requestId,
          eventId: event?.id ?? null,
          ...(event ? { version: event.version } : {}),
          eventDate,
          originalText: text,
          groupIds: selected,
          contributorName: user?.name ?? "",
          ...(presetId ? { presetId } : {}),
        }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["worship-contributions"] });
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: () =>
      apiRequest(`/api/events/${event!.id}`, {
        method: "DELETE",
        body: JSON.stringify({ version: event!.version }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: calendarKey });
      toast({ title: "Đã xóa chương trình", variant: "success" });
      onClose();
    },
  });
  const busy =
    save.isPending || submitContribution.isPending || remove.isPending;
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
        onOpenAutoFocus={(focusEvent) => {
          if (!event && write && !blank) {
            focusEvent.preventDefault();
            composer.current?.focus();
          }
        }}
        title={
          event
            ? write
              ? "Chương trình sinh hoạt"
              : "Thêm thông tin"
            : `Thêm chương trình ngày ${formatDate(eventDate)}`
        }
        description={contribute ? "Bổ sung phần thông tin bạn phụ trách." : ""}
        scrollableBody
        footer={
          <div className="flex flex-wrap gap-2">
            {(write || contribute) && (
              <Button
                type="submit"
                form={formId}
                disabled={
                  busy ||
                  Boolean(needsSundayCount && (dayEvents.isPending || dayEvents.isFetching || dayEvents.error)) ||
                  (contribute && text.trim() === event?.originalText.trim()) ||
                  !parsed.title ||
                  parsed.title.length > 300 ||
                  !CalendarDate.safeParse(eventDate).success ||
                  Boolean(groups.error)
                }
              >
                {save.isPending || submitContribution.isPending
                  ? write
                    ? "Đang lưu…"
                    : "Đang gửi đóng góp…"
                  : event
                    ? write
                      ? "Lưu thay đổi"
                      : "Gửi"
                    : write
                      ? "Lưu chương trình"
                      : "Gửi đóng góp"}
              </Button>
            )}
            {event && write && (
              <Button
                type="button"
                variant="ghost"
                className="ml-auto text-destructive"
                disabled={busy}
                onClick={() => setDeleting(true)}
              >
                Xóa chương trình
              </Button>
            )}
          </div>
        }
        closeLabel="Đóng chương trình"
        className={
          write
            ? "event-edit-dialog h-[80dvh] max-h-[80dvh]"
            : "event-edit-dialog assignment-detail-dialog h-[80dvh] max-h-[80dvh]"
        }
      >
        <form
          id={formId}
          className="event-edit-form space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (write) save.mutate();
            else if (contribute) submitContribution.mutate();
          }}
        >
          {blank && !event && write && (
            <label className="block text-sm font-medium">
              Ngày chương trình
              <input
                type="date"
                aria-label="Ngày chương trình"
                className="mt-2 block w-full rounded-xl border bg-background px-3 py-2 text-base outline-none focus:ring-2 focus:ring-ring"
                value={eventDate}
                onChange={(e) => setDate(e.target.value)}
                disabled={busy}
                required
              />
            </label>
          )}
          {SHOW_EVENT_PRESET_SELECTOR && !event && write && (
            <EventPresetSelector
              date={eventDate}
              value={presetId}
              disabled={
                busy ||
                Boolean(needsSundayCount && (dayEvents.isPending || dayEvents.isFetching || dayEvents.error)) ||
                groups.isLoading ||
                Boolean(groups.error) ||
                !CalendarDate.safeParse(eventDate).success
              }
              onSelect={(preset) => {
                if (text.trim()) setReplacement(preset);
                else applyPreset(preset);
              }}
            />
          )}
          {needsSundayCount && dayEvents.error && (
            <div className="space-y-2">
              <ErrorMessage error={dayEvents.error} />
              <Button
                type="button"
                variant="outline"
                onClick={() => void dayEvents.refetch()}
              >
                Tải lại chương trình trong ngày
              </Button>
            </div>
          )}
          <label className="event-edit-content block px-0.5 text-sm font-medium">
            <WorshipMentionTextarea
              ref={composer}
              aria-label="Nội dung chương trình"
              className={textarea + " mt-2"}
              value={text}
              onValueChange={(value) => {
                initialized.current = true;
                setText(value);
              }}
              readOnly={!write && !contribute}
              disabled={busy}
              maxLength={50000}
              placeholder={
                "Tiêu đề chương trình\n08:00 - 10:00\nNội dung chi tiết…"
              }
            />
          </label>
          {write && (
            <div
              className="event-edit-warnings space-y-4"
              role="region"
              aria-label="Thông báo và cảnh báo chương trình"
              tabIndex={0}
            >
              <EventResponsibilityBadges
                text={text}
                onChange={setText}
                disabled={busy}
              />
              {user?.role === "admin" && canCalendar(user, "calendar.notify") && (
                <WorshipInformationPanel draft={text} />
              )}
            </div>
          )}
          {(save.error || submitContribution.error || remove.error) && (
            <ErrorMessage
              error={save.error ?? submitContribution.error ?? remove.error}
            />
          )}
        </form>
      </Dialog>
      {replacement && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setReplacement(null);
          }}
          title="Thay thế nội dung?"
          description="Bạn có muốn thay thế nội dung hiện tại bằng mẫu mới không?"
          closeLabel="Hủy thay thế"
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReplacement(null)}
            >
              Hủy
            </Button>
            <Button type="button" onClick={() => applyPreset(replacement)}>
              Thay thế nội dung
            </Button>
          </div>
        </Dialog>
      )}
      {deleting && (
        <Dialog
          open
          onOpenChange={setDeleting}
          title="Xóa chương trình?"
          description="Chương trình sẽ ẩn khỏi lịch. Email đang chờ sẽ bị hủy; lịch sử gửi được giữ lại. Email đang gửi có thể vẫn đến người nhận."
          closeLabel="Hủy xóa"
        >
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => remove.mutate()}>
              Xác nhận xóa
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setDeleting(false)}
            >
              Hủy
            </Button>
          </div>
          {remove.error && <ErrorMessage error={remove.error} />}
        </Dialog>
      )}
    </>
  );
}
