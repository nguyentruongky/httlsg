"use client";
import { useState } from "react";
import { CalendarDays, ChevronRight, UserRound } from "lucide-react";
import {
  apiRequest,
  todayInChurch,
  type QuarterlyPreview,
  type ScheduleCategory,
} from "@org/core";
import { Button, Dialog, ErrorMessage, cn } from "@org/ui";
import { ReceptionPlanner, type ReceptionPreview } from "./reception-planner";

type Period = { from: string; to: string; title: string };
export function ScheduleCreate({
  categories,
  onClose,
  onOpenPeriod,
  onQuarterGenerated,
  onGenerated,
}: {
  categories: ScheduleCategory[];
  onClose: () => void;
  onOpenPeriod: (categoryId: string, period: Period) => Promise<boolean>;
  onQuarterGenerated: (result: QuarterlyPreview) => void;
  onGenerated: (result: ReceptionPreview) => void;
}) {
  const [kind, setKind] = useState<"quarter" | "month" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const program = categories.find(
    (item) => item.id === "program_guidance" && item.canManage,
  );
  const reception = categories.find(
    (item) => item.id === "reception" && item.canManage,
  );
  const today = todayInChurch();
  const startQuarter =
    Number(today.slice(0, 4)) * 4 +
    Math.floor((Number(today.slice(5, 7)) - 1) / 3);
  const quarters = Array.from({ length: 4 }, (_, offset) => {
    const index = startQuarter + offset;
    const year = Math.floor(index / 4),
      quarter = (index % 4) + 1;
    return {
      label: `Quý ${quarter}/${year}`,
      from: `${year}-${String((quarter - 1) * 3 + 1).padStart(2, "0")}-01`,
      to: new Date(Date.UTC(year, quarter * 3, 0, 12))
        .toISOString()
        .slice(0, 10),
      title: `Lịch công tác quý ${quarter}/${year}`,
    };
  });
  async function openQuarter(period: Period) {
    if (!program || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (await onOpenPeriod(program.id, period)) return;
      const result = await apiRequest<QuarterlyPreview>(
        "/api/schedules/quarterly-generate",
        {
          method: "POST",
          body: JSON.stringify({
            year: Number(period.from.slice(0, 4)),
            quarter: Math.floor((Number(period.from.slice(5, 7)) - 1) / 3) + 1,
          }),
        },
      );
      onQuarterGenerated(result);
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      title="Tạo lịch phân công"
      description="Chọn loại lịch muốn tạo."
      closeLabel="Đóng tạo lịch"
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <div className="space-y-4 [&_.ui-button]:min-h-11">
        {(
          [
            [
              "quarter",
              "Lịch công tác quý",
              "Phân công theo từng quý trong năm",
              CalendarDays,
              Boolean(program),
            ],
            [
              "month",
              "Lịch tiếp tân tháng",
              "Phân công trực tiếp tân hàng tháng",
              UserRound,
              Boolean(reception),
            ],
          ] as const
        ).map(([id, label, description, Icon, available]) => (
          <section key={id}>
            <button
              type="button"
              className={cn(
                "flex min-h-20 w-full cursor-pointer items-center gap-3 rounded-xl border p-4 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out enabled:hover:border-primary/40 enabled:hover:bg-muted/50 motion-safe:enabled:hover:-translate-y-0.5 enabled:hover:shadow-sm motion-safe:enabled:active:scale-[0.99] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45",
                kind === id
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background",
              )}
              disabled={busy || !available}
              aria-expanded={kind === id}
              aria-controls={`create-${id}`}
              onClick={() => {
                setKind(kind === id ? null : id);
                setError(null);
              }}
            >
              <Icon
                size={22}
                className="shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 space-y-1">
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm font-normal text-muted-foreground">
                  {description}
                </span>
              </span>
              <ChevronRight
                size={19}
                className={cn(
                  "shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none",
                  kind === id && "rotate-90",
                )}
                aria-hidden="true"
              />
            </button>
            {!available && (
              <p className="mt-2 text-sm text-muted-foreground">
                Bạn chưa được giao quản lý lịch này hoặc lịch đã tắt.
              </p>
            )}
            <div
              id={`create-${id}`}
              aria-hidden={kind !== id}
              inert={kind !== id}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                kind === id
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="pt-4">
                  {id === "quarter" ? (
                    <div
                      className="grid grid-cols-2 gap-2"
                      role="group"
                      aria-label="Chọn quý phân công"
                    >
                      {quarters.map((quarter) => (
                        <Button
                          key={quarter.from}
                          type="button"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void openQuarter(quarter)}
                        >
                          {quarter.label}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <ReceptionPlanner
                      embedded
                      onBusyChange={setBusy}
                      onClose={onClose}
                      onGenerated={onGenerated}
                      onOpenMonth={(month) =>
                        onOpenPeriod("reception", {
                          from: month + "-01",
                          to: new Date(
                            Date.UTC(
                              Number(month.slice(0, 4)),
                              Number(month.slice(5)),
                              0,
                              12,
                            ),
                          )
                            .toISOString()
                            .slice(0, 10),
                          title: `Lịch tiếp tân tháng ${month.slice(5)}/${month.slice(0, 4)}`,
                        })
                      }
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        ))}
        {busy && kind === "quarter" && <p role="status">Đang mở lịch…</p>}
        {error != null && <ErrorMessage error={error} />}
      </div>
    </Dialog>
  );
}
