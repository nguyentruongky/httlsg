"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  apiRequest,
  todayInChurch,
  ReceptionMonthInput,
  type generateReceptionSchedule,
} from "@org/core";
import { Button, Dialog, ErrorMessage } from "@org/ui";
export type ReceptionPreview = ReturnType<typeof generateReceptionSchedule>;
export function ReceptionPlanner({
  onClose,
  onGenerated,
  onOpenMonth,
}: {
  onClose: () => void;
  onGenerated: (result: ReceptionPreview) => void;
  onOpenMonth?: (month: string) => Promise<boolean>;
}) {
  const [year, setYear] = useState(Number(todayInChurch().slice(0, 4)));
  const open = useMutation({
    mutationFn: async (month: string) => {
      ReceptionMonthInput.shape.month.parse(month);
      if (await onOpenMonth?.(month)) return null;
      const roster = await apiRequest<{ token: string }>("/api/reception-team");
      return apiRequest<ReceptionPreview>("/api/schedules/reception-generate", {
        method: "POST",
        body: JSON.stringify({ month, token: roster.token }),
      });
    },
    onSuccess: (result) => {
      if (result) onGenerated(result);
    },
  });
  return (
    <Dialog
      open
      title="Chọn tháng phân công"
      description=""
      className="max-w-sm [&>h2]:sr-only [&>p]:hidden [&>button]:hidden"
      closeLabel="Đóng chọn tháng"
      onOpenChange={(value) => {
        if (!value && !open.isPending) onClose();
      }}
    >
      <div className="space-y-4 [&_.ui-button]:min-h-11">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Năm trước"
            disabled={open.isPending || year <= 1900}
            onClick={() => {
              setYear(year - 1);
              open.reset();
            }}
          >
            <ChevronLeft size={22} />
          </Button>
          <span className="text-xl font-semibold" aria-live="polite">
            {year}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Năm sau"
            disabled={open.isPending || year >= 2100}
            onClick={() => {
              setYear(year + 1);
              open.reset();
            }}
          >
            <ChevronRight size={22} />
          </Button>
        </div>
        <div
          className="grid grid-cols-4 gap-2"
          role="group"
          aria-label={`Tháng phân công năm ${year}`}
        >
          {Array.from({ length: 12 }, (_, index) => {
            const month = `${year}-${String(index + 1).padStart(2, "0")}`;
            return (
              <Button
                key={month}
                type="button"
                variant="outline"
                className="min-w-0 px-1 text-sm"
                disabled={open.isPending}
                onClick={() => open.mutate(month)}
              >
                Tháng {index + 1}
              </Button>
            );
          })}
        </div>
        {open.isPending && (
          <p
            role="status"
            className="text-center text-sm text-muted-foreground"
          >
            Đang mở lịch…
          </p>
        )}
        {open.error && <ErrorMessage error={open.error} />}
      </div>
    </Dialog>
  );
}
