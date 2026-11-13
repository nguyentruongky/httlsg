"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  apiRequest,
  createRequestId,
  displayCalendarDate,
  type ScheduleRecord,
  type ScheduleDraftValue,
} from "@org/core";
import {
  Button,
  Dialog,
  Input,
  Dropdown,
  Checkbox,
  ErrorMessage,
} from "@org/ui";
import { DateInput } from "../date-input";
export function ScheduleCopy({
  source,
  onClose,
  onCopied,
  onLocalCopied,
}: {
  source: {
    id: string;
    categoryId?: string;
    title: string;
    version: number;
    periodStart: string;
    periodEnd: string;
  };
  onClose: () => void;
  onCopied: (record: ScheduleRecord) => void;
  onLocalCopied?: (
    draft: ScheduleDraftValue,
    names: Record<string, string>,
  ) => void;
}) {
  const [from, setFrom] = useState(source.periodStart),
    [to, setTo] = useState(source.periodEnd),
    [title, setTitle] = useState(source.title + " (bản sao)"),
    [method, setMethod] = useState<"weekday_pattern" | "exact_offset">(
      "weekday_pattern",
    ),
    [assignments, setAssignments] = useState(true),
    [responsibilities, setResponsibilities] = useState(true),
    [skip, setSkip] = useState(false),
    [preview, setPreview] = useState<{
      draft: ScheduleDraftValue;
      issues: string[];
    } | null>(null),
    [requestId] = useState(createRequestId);
  const client = useQueryClient();
  const payload = {
    periodStart: from,
    periodEnd: to,
    title,
    method,
    copyAssignments: assignments,
    copyResponsibilities: responsibilities,
    skipUnmatched: skip,
    requestId,
    sourceVersion: source.version,
  };
  const mutation = useMutation({
    mutationFn: async (save: boolean) => {
      const local = source.categoryId === "reception" && onLocalCopied;
      const result = await apiRequest<
        | ScheduleRecord
        | {
            draft: ScheduleDraftValue;
            issues: string[];
            memberNames?: Record<string, string>;
          }
      >(
        "/api/schedules/" +
          source.id +
          (save && !local ? "/copy" : "/copy-preview"),
        { method: "POST", body: JSON.stringify(payload) },
      );
      if (save && local) {
        const current = await apiRequest<ScheduleRecord>(
          "/api/schedules/" + source.id,
        );
        if (current.version !== source.version)
          throw new Error("Lịch nguồn đã thay đổi. Vui lòng mở lại bản sao.");
        return { ...result, memberNames: current.memberNames };
      }
      return result;
    },
    onSuccess: async (result, save) => {
      if (
        save &&
        source.categoryId === "reception" &&
        onLocalCopied &&
        "draft" in result
      ) {
        onLocalCopied(result.draft, result.memberNames ?? {});
        return;
      }
      if (save) {
        await client.invalidateQueries({ queryKey: ["schedules"] });
        onCopied(result as ScheduleRecord);
      } else
        setPreview(result as { draft: ScheduleDraftValue; issues: string[] });
    },
  });
  function edit(action: () => void) {
    action();
    setPreview(null);
    setSkip(false);
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
      title="Sao chép lịch"
      description={source.title}
      closeLabel="Đóng sao chép lịch"
      fullScreenOnMobile
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(false);
        }}
      >
        <fieldset className="space-y-4" disabled={mutation.isPending}>
          <label className="block text-sm">
            Tên lịch mới
            <Input
              className="mt-2 w-full"
              required
              minLength={2}
              maxLength={200}
              value={title}
              onChange={(event) => edit(() => setTitle(event.target.value))}
            />
          </label>
          <label className="block text-sm">
            Kỳ mới từ ngày
            <DateInput
              className="mt-2"
              aria-label="Sao chép từ ngày"
              value={from}
              onChange={(value) => edit(() => setFrom(value))}
            />
          </label>
          <label className="block text-sm">
            Đến ngày
            <DateInput
              className="mt-2"
              aria-label="Sao chép đến ngày"
              value={to}
              onChange={(value) => edit(() => setTo(value))}
            />
          </label>
          <label className="block text-sm">
            Cách chuyển ngày
            <Dropdown
              className="mt-2 w-full"
              value={method}
              onChange={(event) =>
                edit(() => setMethod(event.target.value as typeof method))
              }
            >
              <option value="weekday_pattern">
                Giữ thứ và lần xuất hiện trong kỳ
              </option>
              <option value="exact_offset">
                Giữ khoảng cách ngày từ đầu kỳ
              </option>
            </Dropdown>
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <Checkbox
              checked={responsibilities}
              onCheckedChange={(value) =>
                edit(() => {
                  setResponsibilities(Boolean(value));
                  if (!value) setAssignments(false);
                })
              }
            />
            Sao chép trách nhiệm
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <Checkbox
              checked={assignments}
              disabled={!responsibilities}
              onCheckedChange={(value) =>
                edit(() => setAssignments(Boolean(value)))
              }
            />
            Sao chép thành viên và Ban ngành đã phân công
          </label>
        </fieldset>
        <Button type="submit" disabled={mutation.isPending}>
          Xem trước ngày mới
        </Button>
        {mutation.error && <ErrorMessage error={mutation.error} />}
        {preview && (
          <section className="space-y-3 border-t pt-4">
            <h2 className="font-semibold">
              Bản xem trước · {preview.draft.events.length} chương trình
            </h2>
            <ul className="space-y-2">
              {preview.draft.events.map((event) => (
                <li key={event.id} className="break-words text-sm">
                  {displayCalendarDate(event.date)}
                  {event.startTime ? " · " + event.startTime : ""} ·{" "}
                  {event.session ? event.session + " · " : ""}
                  {event.title}
                </li>
              ))}
            </ul>
            {preview.issues.length > 0 && (
              <div className="space-y-2 rounded-lg border border-destructive p-3">
                <ul className="space-y-1 text-sm">
                  {preview.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
                <label className="flex min-h-11 items-center gap-3 text-sm">
                  <Checkbox
                    checked={skip}
                    onCheckedChange={(value) => setSkip(Boolean(value))}
                  />
                  Bỏ qua các ngày không phù hợp
                </label>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {source.categoryId === "reception"
                ? "Bản sao được giữ tạm trên thiết bị cho đến khi nộp lịch."
                : "Bản sao được lưu dưới dạng nháp, không gửi thông báo và không thay đổi lịch nguồn."}
            </p>
            <Button
              type="button"
              disabled={
                mutation.isPending || Boolean(preview.issues.length && !skip)
              }
              onClick={() => mutation.mutate(true)}
            >
              {source.categoryId === "reception"
                ? "Tiếp tục chỉnh sửa bản sao"
                : "Tạo bản nháp từ bản sao"}
            </Button>
          </section>
        )}
      </form>
    </Dialog>
  );
}
