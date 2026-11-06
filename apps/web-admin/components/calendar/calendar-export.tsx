"use client";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  apiRequest,
  canCalendar,
  useAuth,
  createRequestId,
  authenticatedFetch,
  calendarKey,
  calendarWeek,
  updateExportEventOrders,
  type ExportHeadingRange,
  addCalendarDays,
  CalendarRange,
  ExportInput,
  displayCalendarDate,
} from "@org/core";
import { Button, Dialog, ErrorMessage, useToast } from "@org/ui";
import { DateInput } from "../../../mobile-client/src/date-input";
type Preview = {
  from: string;
  to: string;
  text: string;
  count: number;
  headingRanges?: ExportHeadingRange[];
};
export function CalendarExport({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef<{ start: number; end: number } | null>(null);
  const actor = useAuth()?.user;
  const canSend = actor && canCalendar(actor, "calendar.notify");
  const { toast } = useToast();
  const emailRequest = useRef<{ key: string; id: string } | null>(null);
  const mail = useMutation({
    mutationFn: (input: {
      requestId: string;
      preview: { from: string; to: string; text: string };
    }) =>
      apiRequest<{
        sent: number;
        failed: number;
        uncertain: number;
        sending: number;
        exhausted: boolean;
      }>("/api/events/export/email", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (result) => {
      if (result.sent === 2)
        toast({
          title: "Đã gửi email đến Ban Trình chiếu (2/2 địa chỉ).",
          variant: "success",
        });
    },
  });
  const sending = mail.isPending;
  const [initial] = useState(() => calendarWeek(date)),
    [range, setRange] = useState(initial),
    [preview, setPreview] = useState<Preview | null>(null),
    [edited, setEdited] = useState(false),
    [confirmRefresh, setConfirmRefresh] = useState(false),
    [pendingWeek, setPendingWeek] = useState<typeof initial | null>(null),
    [downloading, setDownloading] = useState(false),
    [downloadError, setDownloadError] = useState<Error | null>(null);
  useLayoutEffect(() => {
    if (selection.current && textarea.current) {
      textarea.current.setSelectionRange(
        selection.current.start,
        selection.current.end,
      );
      selection.current = null;
    }
  }, [preview?.text]);
  const query = useQuery({
    queryKey: [...calendarKey, "export-initial", initial],
    queryFn: () =>
      apiRequest<Preview>(
        `/api/events/export?from=${initial.from}&to=${initial.to}`,
      ),
    staleTime: 0,
  });
  useEffect(() => {
    if (query.data && !preview) setPreview(query.data);
  }, [query.data, preview]);
  const regenerate = useMutation({
    mutationFn: (r: typeof range) =>
      apiRequest<Preview>(`/api/events/export?from=${r.from}&to=${r.to}`),
    onSuccess: (data) => {
      setRange({ from: data.from, to: data.to });
      setPreview(data);
      setEdited(false);
      setConfirmRefresh(false);
      setPendingWeek(null);
      setDownloadError(null);
    },
  });
  const documentValid = preview
    ? ExportInput.safeParse({
        from: preview.from,
        to: preview.to,
        text: preview.text,
      }).success
    : false;
  const valid = CalendarRange.safeParse(range).success,
    rangeChanged = Boolean(
      preview && (range.from !== preview.from || range.to !== preview.to),
    );
  function selectWeek(next: typeof range) {
    if (!CalendarRange.safeParse(next).success) return;
    if (edited) {
      setPendingWeek(next);
      setConfirmRefresh(true);
    } else {
      regenerate.mutate(next);
    }
  }
  function closeConfirmation(open: boolean) {
    setConfirmRefresh(open);
    if (!open) setPendingWeek(null);
  }
  const emailPreview = preview
    ? { from: preview.from, to: preview.to, text: preview.text }
    : null;
  const emailKey = JSON.stringify(emailPreview);
  const emailCurrent =
    mail.variables && JSON.stringify(mail.variables.preview) === emailKey;
  const emailResult = emailCurrent ? mail.data : undefined;
  function sendEmail() {
    if (!emailPreview || sending) return;
    if (emailRequest.current?.key !== emailKey)
      emailRequest.current = { key: emailKey, id: createRequestId() };
    mail.mutate({ requestId: emailRequest.current.id, preview: emailPreview });
  }
  async function download() {
    if (!preview) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const response = await authenticatedFetch("/api/events/export/docx", {
        method: "POST",
        body: JSON.stringify({
          from: preview.from,
          to: preview.to,
          text: preview.text,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message ?? "Không thể tạo tệp Word.");
      }
      const blob = await response.blob(),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
      try {
        link.href = url;
        link.download = `lich-sinh-hoat-${preview.from}-den-${preview.to}.docx`;
        document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error : new Error("Không thể tải file Word."),
      );
    } finally {
      setDownloading(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !downloading && !sending) onClose();
      }}
      title="Xuất lịch chương trình"
      description="Chọn tuần hoặc khoảng ngày bao gồm cả ngày đầu/cuối. Chỉnh sửa bản xem trước không thay đổi các chương trình đã lưu."
      fullScreenOnMobile
      className="sm:max-w-3xl"
      closeLabel="Đóng xuất lịch"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tuần trước"
            disabled={
              !preview ||
              !valid ||
              regenerate.isPending ||
              downloading ||
              sending
            }
            onClick={() =>
              selectWeek(calendarWeek(addCalendarDays(range.from, -7)))
            }
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Button>
          <p
            className="min-w-0 text-center text-xs tracking-tight whitespace-nowrap tabular-nums sm:text-base"
            aria-live="polite"
          >
            {valid
              ? `${displayCalendarDate(range.from)} – ${displayCalendarDate(range.to)}`
              : "Chọn khoảng ngày"}
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Tuần sau"
            disabled={
              !preview ||
              !valid ||
              regenerate.isPending ||
              downloading ||
              sending
            }
            onClick={() =>
              selectWeek(calendarWeek(addCalendarDays(range.from, 7)))
            }
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Từ ngày
            <DateInput
              aria-label="Xuất từ ngày"
              className="mt-2"
              disabled={regenerate.isPending || downloading || sending}
              value={range.from}
              onChange={(from) => setRange((r) => ({ ...r, from }))}
            />
          </label>
          <label className="text-sm font-medium">
            Đến ngày
            <DateInput
              aria-label="Xuất đến ngày"
              className="mt-2"
              disabled={regenerate.isPending || downloading || sending}
              value={range.to}
              onChange={(to) => setRange((r) => ({ ...r, to }))}
            />
          </label>
        </div>
        {!valid && (
          <p role="alert" className="text-sm text-destructive">
            Chọn khoảng ngày hợp lệ, tối đa 367 ngày.
          </p>
        )}
        <Button
          variant="outline"
          disabled={!valid || regenerate.isPending || downloading || sending}
          onClick={() =>
            edited ? setConfirmRefresh(true) : regenerate.mutate(range)
          }
        >
          {regenerate.isPending ? "Đang tạo…" : "Tạo lại bản xem trước"}
        </Button>
        {rangeChanged && (
          <p className="text-sm text-primary">
            Khoảng ngày đã thay đổi. Tạo lại bản xem trước trước khi tải xuống.
          </p>
        )}
        {query.isPending && !preview ? (
          <p role="status">Đang chuẩn bị bản xem trước…</p>
        ) : query.error && !preview ? (
          <ErrorMessage error={query.error} />
        ) : (
          preview && (
            <section className="space-y-2" aria-busy={regenerate.isPending}>
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <h2 className="font-semibold">
                  Bản xem trước có thể chỉnh sửa
                </h2>
              </div>
              <textarea
                ref={textarea}
                aria-label="Bản xem trước xuất file Word"
                className="min-h-80 w-full rounded-xl border bg-background p-4 text-sm leading-relaxed focus:ring-2 focus:ring-ring"
                value={preview.text}
                readOnly={regenerate.isPending || downloading || sending}
                maxLength={500000}
                onChange={(e) => {
                  if (!preview) return;
                  const updated = updateExportEventOrders(
                    {
                      text: preview.text,
                      headingRanges: preview.headingRanges ?? [],
                    },
                    e.target.value,
                    e.target.selectionStart,
                    e.target.selectionEnd,
                  );
                  selection.current = {
                    start: updated.selectionStart,
                    end: updated.selectionEnd,
                  };
                  setPreview({
                    ...preview,
                    text: updated.text,
                    headingRanges: updated.headingRanges,
                  });
                  setEdited(true);
                }}
              />
              <p className="text-xs text-muted-foreground">
                {edited
                  ? "Nội dung đã chỉnh sửa chỉ áp dụng cho tệp xuất."
                  : "Bản xem trước giữ nguyên cho đến khi bạn chủ động tạo lại."}
              </p>
            </section>
          )
        )}
        {preview && !documentValid && (
          <p role="alert" className="text-sm text-destructive">
            Bản xuất tối đa 500.000 ký tự, 10.000 dòng và không chứa ký tự điều
            khiển. Vui lòng sửa bản xem trước.
          </p>
        )}
        {(regenerate.error || downloadError) && (
          <ErrorMessage error={regenerate.error ?? downloadError} />
        )}
        {canSend && (
          <div className="space-y-2">
            {emailResult && emailResult.sent < 2 && (
              <p role="alert" className="text-sm text-destructive">
                Đã gửi {emailResult.sent}/2 địa chỉ.
                {emailResult.uncertain || emailResult.sending
                  ? " Chưa xác nhận được toàn bộ kết quả. Vui lòng kiểm tra trước khi gửi lại."
                  : emailResult.exhausted
                    ? " Đã hết lượt thử lại."
                    : " Có email gửi thất bại. Bạn có thể thử lại."}
              </p>
            )}
            {emailCurrent && mail.error && <ErrorMessage error={mail.error} />}
          </div>
        )}
        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button
            disabled={
              !preview ||
              !documentValid ||
              rangeChanged ||
              downloading ||
              sending ||
              regenerate.isPending ||
              !valid
            }
            onClick={() => void download()}
          >
            {downloading ? "Đang tạo file Word…" : "Tải file Word (.docx)"}
          </Button>
          {canSend && (
            <Button
              variant="outline"
              disabled={
                !preview ||
                !documentValid ||
                rangeChanged ||
                downloading ||
                sending ||
                regenerate.isPending ||
                !valid ||
                emailResult?.sent === 2 ||
                emailResult?.exhausted ||
                Boolean(emailResult?.uncertain || emailResult?.sending)
              }
              onClick={sendEmail}
              className="h-auto min-h-11 whitespace-normal"
            >
              <Mail className="size-4 shrink-0" aria-hidden="true" />
              {sending
                ? "Đang gửi email…"
                : emailResult?.sent === 2
                  ? "Đã gửi Ban Trình chiếu"
                  : emailResult?.failed
                    ? "Thử gửi lại Ban Trình chiếu"
                    : "Gửi email Ban Trình chiếu"}
            </Button>
          )}
          <Button
            variant="outline"
            disabled={downloading || sending}
            onClick={onClose}
          >
            Đóng
          </Button>
        </div>
      </div>
      {confirmRefresh && (
        <Dialog
          open
          onOpenChange={closeConfirmation}
          closeLabel="Đóng xác nhận"
          title="Thay thế bản xem trước?"
          description="Nội dung bạn chỉnh sửa sẽ được thay bằng dữ liệu lịch mới nhất. Các chương trình gốc không thay đổi."
        >
          <Button
            disabled={regenerate.isPending}
            onClick={() => {
              const target = pendingWeek ?? range;
              regenerate.mutate(target);
            }}
          >
            Xác nhận tạo lại
          </Button>
          <Button variant="outline" onClick={() => closeConfirmation(false)}>
            Giữ bản đang sửa
          </Button>
          {regenerate.error && <ErrorMessage error={regenerate.error} />}
        </Dialog>
      )}
    </Dialog>
  );
}
