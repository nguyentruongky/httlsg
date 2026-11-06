"use client";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  apiRequest,
  authenticatedFetch,
  calendarKey,
  calendarWeek,
  CalendarRange,
  ExportInput,
  displayCalendarDate,
} from "@org/core";
import { Button, Dialog, ErrorMessage } from "@org/ui";
import { DateInput } from "../../../mobile-client/src/date-input";
type Preview = { from: string; to: string; text: string; count: number };
export function CalendarExport({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const [initial] = useState(() => calendarWeek(date)),
    [range, setRange] = useState(initial),
    [preview, setPreview] = useState<Preview | null>(null),
    [edited, setEdited] = useState(false),
    [confirmRefresh, setConfirmRefresh] = useState(false),
    [downloading, setDownloading] = useState(false),
    [downloadError, setDownloadError] = useState<Error | null>(null);
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
      setPreview(data);
      setEdited(false);
      setConfirmRefresh(false);
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
        error instanceof Error ? error : new Error("Không thể tải Word."),
      );
    } finally {
      setDownloading(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !downloading) onClose();
      }}
      title="Xuất lịch sinh hoạt"
      description="Chọn tuần hoặc khoảng ngày bao gồm cả ngày đầu/cuối. Chỉnh sửa bản xem trước không thay đổi các sinh hoạt đã lưu."
      fullScreenOnMobile
      className="sm:max-w-3xl"
      closeLabel="Đóng xuất lịch"
    >
      <div className="space-y-5">
        <Button variant="outline" onClick={() => setRange(calendarWeek(date))}>
          Tuần đã chọn (Chúa nhật – thứ bảy)
        </Button>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Từ ngày
            <DateInput
              aria-label="Xuất từ ngày"
              className="mt-2"
              value={range.from}
              onChange={(from) => setRange((r) => ({ ...r, from }))}
            />
          </label>
          <label className="text-sm font-medium">
            Đến ngày
            <DateInput
              aria-label="Xuất đến ngày"
              className="mt-2"
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
          disabled={!valid || regenerate.isPending || downloading}
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
            <section className="space-y-2">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <h2 className="font-semibold">
                  Bản xem trước có thể chỉnh sửa
                </h2>
                <span className="text-muted-foreground">
                  {displayCalendarDate(preview.from)} –{" "}
                  {displayCalendarDate(preview.to)} · {preview.count} sinh hoạt
                </span>
              </div>
              <textarea
                aria-label="Bản xem trước xuất Word"
                className="min-h-80 w-full rounded-xl border bg-background p-4 text-sm leading-relaxed focus:ring-2 focus:ring-ring"
                value={preview.text}
                maxLength={500000}
                onChange={(e) => {
                  setPreview((p) => (p ? { ...p, text: e.target.value } : p));
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
        <div className="flex gap-2 border-t pt-4">
          <Button
            disabled={
              !preview ||
              !documentValid ||
              rangeChanged ||
              downloading ||
              regenerate.isPending ||
              !valid
            }
            onClick={() => void download()}
          >
            {downloading ? "Đang tạo Word…" : "Tải Word (.docx)"}
          </Button>
          <Button variant="outline" disabled={downloading} onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
      {confirmRefresh && (
        <Dialog
          open
          onOpenChange={setConfirmRefresh}
          closeLabel="Đóng xác nhận"
          title="Thay thế bản xem trước?"
          description="Nội dung bạn chỉnh sửa sẽ được thay bằng dữ liệu lịch mới nhất. Các sinh hoạt gốc không thay đổi."
        >
          <Button
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate(range)}
          >
            Xác nhận tạo lại
          </Button>
          <Button variant="outline" onClick={() => setConfirmRefresh(false)}>
            Giữ bản đang sửa
          </Button>
          {regenerate.error && <ErrorMessage error={regenerate.error} />}
        </Dialog>
      )}
    </Dialog>
  );
}
