"use client";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRequestId,
  useAuth,
  canCalendar,
  apiRequest,
  calendarKey,
  parseEventText,
  renderEventPreset,
  isWorshipProgramText,
  type EventPreset,
  CalendarDate,
  type CalendarEvent,
  type CalendarSaveResult,
  type EmailGroup,
} from "@org/core";
import { Button, Checkbox, Dialog, ErrorMessage, useToast } from "@org/ui";
import { DateInput } from "../../../mobile-client/src/date-input";
import { WorshipInformationPanel } from "./worship-information-panel";
import { EventPresetSelector } from "./event-preset-selector";
const textarea =
  "min-h-80 w-full resize-y rounded-xl border bg-background p-4 text-base leading-relaxed outline-none focus:ring-2 focus:ring-ring";
export function EventEditor({
  date,
  event,
  onClose,
}: {
  date: string;
  event?: CalendarEvent;
  onClose: () => void;
}) {
  const user = useAuth()?.user,
    client = useQueryClient(),
    { toast } = useToast();
  const write = canCalendar(user, "calendar.write");
  const [eventDate, setDate] = useState(date),
    [text, setText] = useState(event?.originalText ?? ""),
    [selected, setSelected] = useState(event?.groupIds ?? []),
    [deleting, setDeleting] = useState(false);
  const [presetId, setPresetId] = useState<string>(),
    [replacement, setReplacement] = useState<EventPreset | null>(null);
  const worship =
    presetId === "worship-program" ||
    event?.presetId === "worship-program" ||
    isWorshipProgramText(event?.originalText ?? text);
  function applyPreset(preset: EventPreset) {
    setText(renderEventPreset(preset, { date: eventDate }));
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
    enabled: write && canCalendar(user, "calendar.groups"),
  });
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
        description: selected.length
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
  const busy = save.isPending || remove.isPending;
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose();
        }}
        title={
          event
            ? write
              ? "Chương trình sinh hoạt"
              : "Chương trình"
            : "Tạo chương trình"
        }
        description=""
        fullScreenOnMobile
        closeLabel="Đóng chương trình"
        className="sm:max-w-2xl"
      >
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (write) save.mutate();
          }}
        >
          <label className="block text-sm font-medium">
            Ngày chương trình
            <DateInput
              aria-label="Ngày chương trình"
              value={eventDate}
              onChange={setDate}
              disabled={!write || busy}
              className="mt-2"
            />
          </label>
          {!event && write && (
            <EventPresetSelector
              value={presetId}
              disabled={
                busy ||
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
          <label className="block text-sm font-medium">
            Nội dung chương trình
            <textarea
              aria-label="Nội dung chương trình"
              className={textarea + " mt-2"}
              value={text}
              onChange={(e) => setText(e.target.value)}
              readOnly={!write}
              disabled={busy}
              maxLength={50000}
              placeholder={
                "Tiêu đề chương trình\n08:00 - 10:00\nNội dung chi tiết…"
              }
            />
          </label>
          {user?.role === "admin" &&
            canCalendar(user, "calendar.notify") &&
            (presetId === "worship-program" ||
              event?.presetId === "worship-program" ||
              isWorshipProgramText(event?.originalText ?? text)) && (
              <WorshipInformationPanel draft={text} />
            )}
          {write && (
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-semibold">
                Nhóm nhận thông báo
              </legend>
              {groups.isPending ? (
                <p role="status">Đang tải nhóm…</p>
              ) : groups.error ? (
                <ErrorMessage error={groups.error} />
              ) : !groups.data?.items.length ? (
                <p className="text-sm text-muted-foreground">
                  Chưa có nhóm email.{" "}
                  <a
                    className="text-primary underline"
                    href="/dashboard/calendar/email-groups"
                  >
                    Tạo nhóm email
                  </a>
                </p>
              ) : (
                groups.data.items.map((g) => (
                  <label
                    key={g.id}
                    className="flex min-h-10 items-center gap-3 text-sm"
                  >
                    <Checkbox
                      checked={selected.includes(g.id)}
                      onCheckedChange={(checked) => {
                        setSelected((old) =>
                          checked
                            ? [...old, g.id]
                            : old.filter((id) => id !== g.id),
                        );
                      }}
                      disabled={busy}
                    />
                    <span className="flex-1">{g.name}</span>
                  </label>
                ))
              )}
            </fieldset>
          )}
          {(save.error || remove.error) && (
            <ErrorMessage error={save.error ?? remove.error} />
          )}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {write && (
              <Button
                type="submit"
                disabled={
                  busy ||
                  !parsed.title ||
                  parsed.title.length > 300 ||
                  !CalendarDate.safeParse(eventDate).success ||
                  Boolean(groups.error)
                }
              >
                {save.isPending
                  ? selected.length
                    ? "Đang lưu và gửi email…"
                    : "Đang lưu…"
                  : event
                    ? "Lưu thay đổi"
                    : "Lưu chương trình"}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Đóng
            </Button>
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
