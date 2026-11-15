"use client";
import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { LoaderCircle, Mail } from "lucide-react";
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
  CalendarRange,
  ExportInput,
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
    [downloading, setDownloading] = useState(false),
    [downloadError, setDownloadError] = useState<Error | null>(null);
  const latestRange = useRef(range);
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
    if (query.data && !preview && query.data.from === range.from && query.data.to === range.to)
      setPreview(query.data);
  }, [query.data, preview, range.from, range.to]);
  const regenerate = useMutation({
    mutationFn: (r: typeof range) =>
      apiRequest<Preview>(`/api/events/export?from=${r.from}&to=${r.to}`),
    onSuccess: (data) => {
      if (data.from !== latestRange.current.from || data.to !== latestRange.current.to) return;
      setPreview(data);
      setEdited(false);
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
  function changeRange(next: typeof range) {
    latestRange.current = next;
    setRange(next);
    if (CalendarRange.safeParse(next).success &&
        (next.from !== range.from || next.to !== range.to)) {
      regenerate.mutate(next);
    }
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
      description="Chọn khoảng ngày và chỉnh sửa bản xem trước trước khi xuất. Các chương trình đã lưu không thay đổi."
      fullScreenOnMobile
      mobileBackButton
      className="sm:max-w-3xl"
      closeLabel="Quay lại lịch"
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 text-sm font-medium">
            <span className="w-16 shrink-0">Từ ngày</span>
            <DateInput
              aria-label="Xuất từ ngày"
              className="min-w-0 flex-1"
              disabled={downloading || sending}
              value={range.from}
              onChange={(from) => changeRange({ ...range, from })}
            />
          </label>
          <label className="flex items-center gap-3 text-sm font-medium">
            <span className="w-16 shrink-0">Đến ngày</span>
            <DateInput
              aria-label="Xuất đến ngày"
              className="min-w-0 flex-1"
              disabled={downloading || sending}
              value={range.to}
              onChange={(to) => changeRange({ ...range, to })}
            />
          </label>
        </div>
        {!valid && (
          <p role="alert" className="text-sm text-destructive">
            Chọn khoảng ngày hợp lệ, tối đa 367 ngày.
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
                <h2 className="flex items-center gap-2 font-semibold">
                  Bản xem trước có thể chỉnh sửa
                  {regenerate.isPending && <LoaderCircle size={16} className="animate-spin" role="status" aria-label="Đang cập nhật bản xem trước" />}
                </h2>
              </div>
              <textarea
                ref={textarea}
                aria-label="Bản xem trước xuất file Word"
                className="h-[50dvh] w-full rounded-xl border bg-background p-4 text-sm leading-relaxed focus:ring-2 focus:ring-ring sm:h-auto sm:min-h-80"
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
                  : "Bản xem trước tự cập nhật khi thay đổi khoảng ngày."}
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
        </div>
      </div>
    </Dialog>
  );
}
