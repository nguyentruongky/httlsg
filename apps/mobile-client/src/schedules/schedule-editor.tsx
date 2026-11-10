"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Download,
  MoreVertical,
  Plus,
  Printer,
  Send,
  X,
} from "lucide-react";
import {
  useAuth,
  isQuarterlyWork,
  quarterlyDocumentFilename,
  normalizeQuarterlySchedule,
  quarterlyPersonnelColumn,
  quarterlyTextNames,
  normalizeRosterName,
  quarterlyWorkIssues,
  quarterlyCellIssues,
  type QuarterlyCellIssue,
  readLocalScheduleDraft,
  writeLocalScheduleDraft,
  removeLocalScheduleDraft,
  type LocalScheduleDraft,
  receptionRuleIssues,
  addReceptionExtraService,
  sortReceptionCellText,
  type ReceptionRosterPerson,
  editReceptionCell,
  apiRequest,
  authenticatedFetch,
  CalendarDate,
  addCalendarDays,
  days,
  createRequestId,
  ScheduleDraft,
  calendarWeekday,
  displayCalendarDate,
  type ScheduleRecord,
  type ScheduleDraftValue,
  type ScheduleEventValue,
  type ScheduleCategory,
} from "@org/core";
import {
  Button,
  Card,
  Input,
  Select,
  Dialog,
  DropdownMenu,
  ErrorMessage,
  MenuItem,
  useToast,
} from "@org/ui";
import { DateInput } from "../date-input";
import { ReceptionWorkloadSummary } from "./reception-workload";
import { ScheduleViews } from "./schedule-views";
import { ScheduleEventEditor } from "./event-editor";
export function ScheduleEditor({
  initial,
  initialNames,
  initialWarnings = [],
  localDraft,
  draftOwnerId,
  category,
  departments,
  onBack,
  onSaved,
}: {
  initial: ScheduleRecord | ScheduleDraftValue;
  initialNames?: Record<string, string>;
  initialWarnings?: string[];
  localDraft?: LocalScheduleDraft;
  draftOwnerId?: string;
  category: ScheduleCategory;
  departments: { id: string; name: string }[];
  onBack: () => void;
  onSaved: (schedule: ScheduleRecord) => void;
}) {
  const existing = "id" in initial ? initial : undefined;
  const auth = useAuth(),
    ownerId = draftOwnerId ?? auth?.user?.id,
    ownerVersion = auth?.user?.authVersion ?? 0;
  const [cached] = useState(
    () =>
      localDraft ??
      (ownerId && existing
        ? readLocalScheduleDraft(ownerId, ownerVersion, "record:" + existing.id)
        : undefined),
  );
  const usableCache =
    cached &&
    cached.ownerId === ownerId &&
    cached.authVersion === ownerVersion &&
    cached.baseVersion === (existing?.version ?? null)
      ? cached
      : undefined;
  const seed = normalizeQuarterlySchedule(usableCache?.draft ?? initial);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const finished = useRef(false),
    [localError, setLocalError] = useState<string>(),
    [showStale, setShowStale] = useState(false);

  const [extraOpen, setExtraOpen] = useState(false),
    [extraDay, setExtraDay] = useState(""),
    [extraSession, setExtraSession] = useState<"Sáng" | "Tối">("Tối"),
    [extraCount, setExtraCount] = useState("10"),
    [extraError, setExtraError] = useState<string>();
  const [ruleAction, setRuleAction] = useState<"save" | "publish" | null>(null);
  const [record, setRecord] = useState(existing),
    [draft, setDraft] = useState<ScheduleDraftValue>(() => ({
      categoryId: seed.categoryId,
      title: seed.title,
      description: seed.description,
      periodStart: seed.periodStart,
      periodEnd: seed.periodEnd,
      settings: seed.settings,
      events: seed.events,
    })),
    [names, setNames] = useState<Record<string, string>>(
      usableCache?.names ?? existing?.memberNames ?? initialNames ?? {},
    ),
    [event, setEvent] = useState<ScheduleEventValue | null>(null),
    [confirm, setConfirm] = useState<
      "publish" | "cancel" | "delete" | "leave" | null
    >(null),
    [error, setError] = useState<string>(),
    [requestId] = useState(() => usableCache?.requestId ?? createRequestId()),
    [exporting, setExporting] = useState(false);
  const generationWarnings = initialWarnings;
  // Member notifications are always sent; the per-save opt-out was removed.
  const notify = true;
  // Derived so reverting an edit back to the saved value clears the save button
  // instead of leaving a stale "dirty" flag that would push a needless notice.
  const dirty = useMemo(
    () => !record || draftKey(record) !== draftKey(draft),
    [record, draft],
  );
  const printAction = useRef<(() => void) | null>(null);
  const client = useQueryClient(),
    { toast } = useToast();
  const reception =
    draft.categoryId === "reception" && draft.settings.layout === "reception";
  const quarterly = isQuarterlyWork(draft);
  const autoPublish = reception || quarterly;
  const roster = useQuery({
    queryKey: ["reception-team"],
    gcTime: 0,
    queryFn: () =>
      apiRequest<{ items: ReceptionRosterPerson[] }>("/api/reception-team"),
    enabled: reception,
  });
  const localScope = existing
    ? "record:" + existing.id
    : (usableCache?.scope ?? "new:" + requestId);
  const unsubmitted =
    reception &&
    record?.status !== "published" &&
    record?.status !== "cancelled";
  const mustWarn = dirty || unsubmitted;
  function leaveEditor() {
    // Stop existing pagehide/autosave closures before removing the scoped copy.
    finished.current = true;
    if (reception && ownerId)
      removeLocalScheduleDraft(ownerId, ownerVersion, localScope);
    onBack();
  }
  useEffect(() => {
    if (
      !reception ||
      !ownerId ||
      finished.current ||
      (cached && !usableCache && !dirty)
    )
      return;
    if (
      record?.status === "cancelled" ||
      (record?.status === "published" && !dirty)
    ) {
      removeLocalScheduleDraft(ownerId, ownerVersion, localScope);
      return;
    }
    const save = () => {
      if (finished.current) return;
      const ok = writeLocalScheduleDraft({
        ownerId,
        authVersion: ownerVersion,
        scope: localScope,
        baseVersion: record?.version ?? null,
        recordId: record?.id ?? null,
        requestId,
        draft,
        names,
        notify,
        savedAt: new Date().toISOString(),
      });
      setLocalError(
        ok
          ? undefined
          : "Không thể lưu bản tạm trên thiết bị. Hãy giữ trang này mở cho đến khi gởi lịch tiếp tân.",
      );
    };
    save();
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, [
    reception,
    ownerId,
    ownerVersion,
    localScope,
    record,
    dirty,
    requestId,
    draft,
    names,
  ]);
  useEffect(() => {
    const stop = () => {
      finished.current = true;
      mounted.current = false;
    };
    window.addEventListener("church:session-expired", stop);
    return () => window.removeEventListener("church:session-expired", stop);
  }, []);
  useEffect(() => {
    if (!mustWarn) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (finished.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [mustWarn]);
  const preview: ScheduleRecord = {
    ...draft,
    id: record?.id ?? requestId,
    status: record?.status ?? "draft",
    version: record?.version ?? 0,
    createdBy: null,
    updatedBy: null,
    publishedAt: record?.publishedAt ?? null,
    cancelledAt: record?.cancelledAt ?? null,
    memberNames: names,
    departmentNames: {
      ...(record?.departmentNames ?? {}),
      ...Object.fromEntries(departments.map((item) => [item.id, item.name])),
    },
  };
  const ruleIssues =
    reception && roster.data
      ? receptionRuleIssues(preview, roster.data.items)
      : [];
  const checkingRules = reception && roster.isPending;
  const extraDate = `${draft.periodStart.slice(0, 7)}-${extraDay.padStart(2, "0")}`;
  const extraDaysInMonth = new Date(
    Date.UTC(
      Number(draft.periodStart.slice(0, 4)),
      Number(draft.periodStart.slice(5, 7)),
      0,
      12,
    ),
  ).getUTCDate();
  function update(field: keyof ScheduleDraftValue, value: unknown) {
    finished.current = false;
    setDraft((old) => ({ ...old, [field]: value }));
  }
  const mutation = useMutation({
    onMutate: () => setError(undefined),
    mutationFn: async (action: "save" | "publish" | "cancel" | "delete") => {
      let current = record;
      const submit = autoPublish && (action === "save" || action === "publish");
      if (
        action === "save" ||
        (action === "publish" && (dirty || autoPublish))
      ) {
        const value = ScheduleDraft.parse(
          reception && roster.data
            ? {
                ...draft,
                events: draft.events.map((event) => ({
                  ...event,
                  responsibilities: event.responsibilities.map((duty) => ({
                    ...duty,
                    ...(duty.displayText != null
                      ? {
                          displayText: sortReceptionCellText(
                            duty.displayText,
                            roster.data!.items,
                          ),
                        }
                      : {}),
                  })),
                })),
              }
            : draft,
        );
        current = await apiRequest<ScheduleRecord>(
          submit
            ? current
              ? "/api/schedules/" + current.id + "/submit"
              : "/api/schedules/submit"
            : current
              ? "/api/schedules/" + current.id
              : "/api/schedules",
          {
            method: submit ? "POST" : current ? "PUT" : "POST",
            body: JSON.stringify({
              ...value,
              ...(current
                ? { version: current.version, notifyAffected: notify }
                : { requestId }),
            }),
          },
        );
        // Keep the acknowledged save version even if the following publish fails.
        setRecord(current);
      }
      if (submit) return current!;
      if (action !== "save") {
        if (!current) throw new Error("Lưu bản nháp trước khi tiếp tục.");
        if (action === "delete") {
          await apiRequest("/api/schedules/" + current.id, {
            method: "DELETE",
            body: JSON.stringify({ version: current.version }),
          });
          return null;
        }
        current = await apiRequest<ScheduleRecord>(
          "/api/schedules/" + current.id + "/" + action,
          {
            method: "POST",
            body: JSON.stringify({ version: current.version }),
          },
        );
      }
      return current!;
    },
    onSuccess: async (value, action) => {
      await client.invalidateQueries({ queryKey: ["schedules"] });
      await client.invalidateQueries({ queryKey: ["my-assignments"] });
      if (reception && ownerId && value) {
        finished.current = true;
        removeLocalScheduleDraft(ownerId, ownerVersion, localScope);
      }
      if (!mounted.current) return;
      setConfirm(null);
      if (!value) {
        onBack();
        return;
      }
      setRecord(value);
      setDraft({
        categoryId: value.categoryId,
        title: value.title,
        description: value.description,
        periodStart: value.periodStart,
        periodEnd: value.periodEnd,
        settings: value.settings,
        events: value.events,
      });
      setNames(value.memberNames);
      onSaved(value);
      const delivery = (value as any).notificationDelivery;
      toast({
        title:
          action === "publish" || (action === "save" && autoPublish)
            ? reception
              ? "Đã gởi lịch tiếp tân"
              : "Đã công bố lịch"
            : action === "cancel"
              ? "Đã hủy lịch"
              : "Đã lưu lịch",
        description:
          delivery?.error || delivery?.failed
            ? "Lịch đã lưu; có thông báo chưa gửi được. Hệ thống sẽ xử lý các lần thử lại phù hợp."
            : undefined,
        variant: delivery?.error || delivery?.failed ? "error" : "success",
      });
    },
    onError: (reason) =>
      setError(
        reason instanceof Error ? reason.message : "Không thể lưu lịch.",
      ),
  });
  const busy = mutation.isPending,
    locked = record?.status === "cancelled";
  const [checkDraft, setCheckDraft] = useState(draft);
  useEffect(() => {
    if (!quarterly) return;
    const timer = window.setTimeout(() => setCheckDraft(draft), 450);
    return () => window.clearTimeout(timer);
  }, [draft, quarterly]);
  const liveCheck = useQuery({
    queryKey: ["quarterly-check", ownerId, checkDraft],
    queryFn: () =>
      apiRequest<{
        issues: string[];
        warnings: string[];
        cellIssues: QuarterlyCellIssue[];
      }>("/api/schedules/quarterly-check", {
        method: "POST",
        body: JSON.stringify({ draft: checkDraft }),
      }),
    enabled:
      quarterly && !locked && ScheduleDraft.safeParse(checkDraft).success,
    gcTime: 0,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });
  const [lastCheckedCellIssues, setLastCheckedCellIssues] = useState<
    QuarterlyCellIssue[]
  >([]);
  useEffect(() => {
    if (liveCheck.data && !liveCheck.isPlaceholderData)
      setLastCheckedCellIssues(liveCheck.data.cellIssues);
  }, [liveCheck.data, liveCheck.isPlaceholderData]);
  const quarterlyCellErrors = quarterly
    ? [
        ...quarterlyCellIssues(checkDraft, [], names),
        ...(liveCheck.data?.cellIssues ?? lastCheckedCellIssues),
      ].filter(
        (issue, index, all) =>
          issue.severity === "error" &&
          all.findIndex(
            (other) =>
              other.eventId === issue.eventId &&
              other.column === issue.column &&
              other.message === issue.message,
          ) === index,
      )
    : [];
  const currentGenerationWarnings = generationWarnings.filter(
    (warning) => !/hồ sơ|danh bạ/i.test(warning),
  );
  function requestAction(action: "save" | "publish" | "cancel" | "delete") {
    if (quarterly && (action === "save" || action === "publish")) {
      const issues = quarterlyWorkIssues(
        draft,
        [],
        autoPublish || action === "publish" || record?.status === "published",
        new Map(),
        names,
      );
      if (issues.length) {
        setError(issues.slice(0, 8).join("\n"));
        return;
      }
    }
    if ((action === "save" || action === "publish") && checkingRules) {
      setError("Đang kiểm tra danh sách Ban ngành. Vui lòng chờ.");
      return;
    }
    if (
      (action === "save" || action === "publish") &&
      reception &&
      (ruleIssues.length > 0 || roster.error)
    ) {
      setConfirm(null);
      setRuleAction(action);
      return;
    }
    mutation.mutate(action);
  }
  async function download() {
    if (!record && !autoPublish) return;
    setExporting(true);
    setError(undefined);
    try {
      const response = await authenticatedFetch(
        autoPublish
          ? "/api/schedules/export-preview"
          : "/api/schedules/" + record!.id + "/export",
        {
          method: "POST",
          body: JSON.stringify(
            autoPublish
              ? { draft, memberNames: names }
              : { version: record!.version },
          ),
        },
      );
      if (!response.ok) {
        const value = await response.json();
        throw new Error(value.message ?? "Không thể xuất lịch.");
      }
      const url = URL.createObjectURL(await response.blob()),
        link = document.createElement("a");
      link.href = url;
      link.download = reception
        ? `Lich tiep tan thang ${draft.periodStart.slice(5, 7)}-${draft.periodStart.slice(0, 4)}.docx`
        : quarterly
          ? quarterlyDocumentFilename(draft)
          : "lich-phan-cong-" + draft.periodStart + ".docx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể xuất lịch.",
      );
    } finally {
      setExporting(false);
    }
  }
  const showSave =
    !locked && (dirty || (autoPublish && record?.status !== "published"));
  const canPrint = record?.status === "published" && (autoPublish || !dirty);
  const menuActions: ScheduleMenuAction[] = [
    ...(reception && !locked
      ? [
          {
            id: "extra",
            label: "Thêm ngày bổ sung",
            icon: <Plus size={17} />,
            onSelect: () => {
              setExtraError(undefined);
              setExtraOpen(true);
            },
          },
        ]
      : []),
    ...(canPrint
      ? [
          {
            id: "print",
            label: "In lịch",
            icon: <Printer size={17} />,
            onSelect: () => printAction.current?.(),
          },
        ]
      : []),
    ...(!locked && record?.status === "published"
      ? [
          {
            id: "cancel",
            label: "Hủy lịch",
            icon: <Ban size={17} />,
            onSelect: () => setConfirm("cancel"),
          },
        ]
      : []),
    ...(autoPublish || record?.status === "published"
      ? [
          {
            id: "export",
            label: "Xuất file Word",
            icon: <Download size={17} />,
            disabled: busy || (!autoPublish && dirty) || exporting,
            onSelect: () => void download(),
          },
        ]
      : []),
    ...(!autoPublish && !locked && record?.status !== "published"
      ? [
          {
            id: "publish",
            label: reception ? "Gởi lịch tiếp tân" : "Công bố lịch",
            icon: <Send size={17} />,
            onSelect: () => setConfirm("publish"),
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-5 [&_.ui-button]:min-h-11">
      <header className="flex min-h-11 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Về danh sách lịch"
          onClick={() => (mustWarn ? setConfirm("leave") : leaveEditor())}
        >
          <ArrowLeft size={21} />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="wrap-break-word text-xl font-semibold">
            {reception
              ? `Lịch tiếp tân tháng ${draft.periodStart.slice(5, 7)}/${draft.periodStart.slice(0, 4)}`
              : quarterly
                ? draft.title
                : record
                  ? "Chi tiết lịch phân công"
                  : "Tạo lịch phân công"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {quarterly ? "Lịch công tác quý" : category.name} ·{" "}
            {record?.status === "published"
              ? "Đã công bố"
              : locked
                ? "Đã hủy"
                : "Bản nháp"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ScheduleMenu actions={menuActions} />
          {showSave && (
            <Button
              type="button"
              size="sm"
              disabled={busy || checkingRules}
              onClick={() => requestAction("save")}
            >
              {busy ? "Đang lưu…" : "Lưu"}
            </Button>
          )}
        </div>
      </header>
      {quarterly && currentGenerationWarnings.length > 0 && (
        <details
          open
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          <summary className="cursor-pointer font-semibold">
            Cần kiểm tra sau khi tự động phân công (
            {currentGenerationWarnings.length})
          </summary>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {currentGenerationWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </details>
      )}
      {quarterly && !locked && (
        <div className="space-y-2 text-sm">
          {liveCheck.error && (
            <p role="status" className="text-muted-foreground">
              Chưa kiểm tra được lịch tiếp tân. Hệ thống sẽ kiểm tra lại khi lưu
              lịch.
            </p>
          )}
        </div>
      )}
      {localError && (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
        >
          {localError}
        </p>
      )}
      {cached &&
        cached.ownerId === ownerId &&
        cached.authVersion === ownerVersion &&
        !usableCache &&
        !finished.current && (
          <p role="alert" className="text-sm text-amber-800">
            Có bản tạm cũ khác phiên bản trên máy chủ.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setShowStale(true)}
            >
              Xem bản tạm
            </button>
          </p>
        )}
      {showStale && cached && (
        <Dialog
          open
          title="Nội dung chưa đồng bộ"
          description="Bản này không được tự ghi đè lên phiên bản mới trên máy chủ."
          closeLabel="Đóng bản tạm"
          onOpenChange={(open) => {
            if (!open) setShowStale(false);
          }}
        >
          <ScheduleViews
            schedule={{
              ...cached.draft,
              id: cached.recordId ?? cached.requestId,
              status: "draft",
              version: cached.baseVersion ?? 0,
              createdBy: null,
              updatedBy: null,
              publishedAt: null,
              cancelledAt: null,
              memberNames: cached.names,
              departmentNames: {},
            }}
          />
        </Dialog>
      )}
      {!reception && !quarterly && (
        <Card className="p-4 sm:p-5">
          <fieldset disabled={busy || locked} className="space-y-4">
            <label className="block text-sm font-medium">
              Tên lịch
              <Input
                required
                minLength={2}
                maxLength={200}
                className="mt-2 w-full"
                value={draft.title}
                onChange={(e) => update("title", e.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                Từ ngày
                <DateInput
                  aria-label="Kỳ lịch từ ngày"
                  className="mt-2"
                  value={draft.periodStart}
                  onChange={(value) => update("periodStart", value)}
                />
              </label>
              <label className="block text-sm">
                Đến ngày
                <DateInput
                  aria-label="Kỳ lịch đến ngày"
                  className="mt-2"
                  value={draft.periodEnd}
                  onChange={(value) => update("periodEnd", value)}
                />
              </label>
            </div>
            <label className="block text-sm">
              Mô tả
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border bg-background p-3"
                maxLength={2000}
                value={draft.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Giờ mặc định thứ hai–thứ bảy
                <Input
                  type="time"
                  className="mt-2 w-full"
                  value={draft.settings.weekdayTime ?? ""}
                  onChange={(e) =>
                    update("settings", {
                      ...draft.settings,
                      weekdayTime: e.target.value || null,
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                Giờ mặc định Chúa nhật
                <Input
                  type="time"
                  className="mt-2 w-full"
                  value={draft.settings.sundayTime ?? ""}
                  onChange={(e) =>
                    update("settings", {
                      ...draft.settings,
                      sundayTime: e.target.value || null,
                    })
                  }
                />
              </label>
            </div>
          </fieldset>
        </Card>
      )}
      {!locked && !reception && !quarterly && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={busy || draft.events.length >= 200}
            onClick={() => {
              const date = draft.periodStart;
              setEvent({
                id: createRequestId(),
                date,
                title: category.name,
                startTime:
                  calendarWeekday(date) === 0
                    ? draft.settings.sundayTime
                    : draft.settings.weekdayTime,
                endTime: null,
                description: "",
                location: "",
                session: "",
                responsibilities: category.definitions
                  .filter((item) => item.isActive)
                  .map((item) => ({
                    id: createRequestId(),
                    name: item.name,
                    description: item.description,
                    assignments: [],
                    departmentIds: [],
                  })),
              });
            }}
          >
            <Plus size={17} />
            Thêm chương trình
          </Button>
          {category.id === "prayer_guidance" && (
            <Button
              type="button"
              variant="outline"
              disabled={busy || draft.events.length > 0}
              onClick={() => {
                try {
                  CalendarDate.parse(draft.periodStart);
                  CalendarDate.parse(draft.periodEnd);
                  if (
                    days(draft.periodStart, draft.periodEnd) < 0 ||
                    days(draft.periodStart, draft.periodEnd) > 199
                  )
                    throw new Error("Tạo tối đa 200 ngày trong một lần.");
                  const events: ScheduleEventValue[] = [];
                  for (
                    let date = draft.periodStart;
                    date <= draft.periodEnd;
                    date = addCalendarDays(date, 1)
                  )
                    events.push({
                      id: createRequestId(),
                      date,
                      title: category.name,
                      startTime:
                        calendarWeekday(date) === 0
                          ? draft.settings.sundayTime
                          : draft.settings.weekdayTime,
                      endTime: null,
                      description: "",
                      location: "",
                      session: "",
                      responsibilities: category.definitions
                        .filter((item) => item.isActive)
                        .map((item) => ({
                          id: createRequestId(),
                          name: item.name,
                          description: item.description,
                          assignments: [],
                          departmentIds: [],
                        })),
                    });
                  update("events", events);
                } catch (reason) {
                  setError(
                    reason instanceof Error
                      ? reason.message
                      : "Khoảng ngày không hợp lệ.",
                  );
                }
              }}
            >
              Tạo lịch từng ngày
            </Button>
          )}
        </div>
      )}
      {reception &&
        !locked &&
        draft.events.some((item) => calendarWeekday(item.date) !== 0) && (
          <div className="flex flex-wrap gap-2 print:hidden">
            {draft.events
              .filter((item) => calendarWeekday(item.date) !== 0)
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1 rounded-lg border pl-3 text-sm"
                >
                  <span>
                    {displayCalendarDate(item.date)} · {item.session}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={`Gỡ buổi ${item.session.toLowerCase()} ngày ${displayCalendarDate(item.date)}`}
                    onClick={() =>
                      update(
                        "events",
                        draft.events.filter((value) => value.id !== item.id),
                      )
                    }
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
          </div>
        )}
      {extraOpen && reception && !locked && (
        <Dialog
          open
          title="Thêm ngày bổ sung"
          description="Tự điền theo quy tắc nhân sự của bốn vị trí và ưu tiên người có ít lượt phân công. Bạn có thể đổi vị trí nam, nữ khi chỉnh sửa."
          closeLabel="Đóng thêm ngày bổ sung"
          onOpenChange={setExtraOpen}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setExtraError(undefined);
              if (!roster.data) {
                setExtraError("Chưa tải được danh sách Ban ngành.");
                return;
              }
              try {
                const next = addReceptionExtraService(
                  preview,
                  roster.data.items,
                  {
                    date: extraDate,
                    session: extraSession,
                    count: Number(extraCount),
                  },
                );
                setNames((old) => ({
                  ...old,
                  ...Object.fromEntries(
                    roster.data.items.map((person) => [
                      person.memberId,
                      person.name,
                    ]),
                  ),
                }));
                update("events", next.events);
                setExtraOpen(false);
                const added = next.events.find(
                  (item) =>
                    item.date === extraDate && item.session === extraSession,
                )!;
                const filled = added.responsibilities.reduce(
                  (sum, duty) => sum + duty.assignments.length,
                  0,
                );
                if (filled < Number(extraCount))
                  toast({
                    title: `Đã điền ${filled} người`,
                    description:
                      "Không đủ nhân sự phù hợp quy tắc tự điền. Bạn có thể điều chỉnh trực tiếp trong bảng.",
                  });
              } catch (reason) {
                setExtraError(
                  reason instanceof Error
                    ? reason.message
                    : "Không thể thêm ngày bổ sung.",
                );
              }
            }}
          >
            <label className="block text-sm font-medium">
              Ngày
              <Input
                aria-label="Ngày bổ sung"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                min={1}
                max={extraDaysInMonth}
                step={1}
                placeholder="Nhập ngày"
                className="mt-2 min-h-11 text-base"
                value={extraDay}
                onChange={(event) => setExtraDay(event.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Buổi
              <Select
                aria-label="Buổi bổ sung"
                className="mt-2 min-h-11 w-full text-base"
                value={extraSession}
                onChange={(event) =>
                  setExtraSession(event.target.value as "Sáng" | "Tối")
                }
              >
                <option value="Sáng">Sáng</option>
                <option value="Tối">Tối</option>
              </Select>
            </label>
            <label className="block text-sm font-medium">
              Số người tự điền
              <Input
                aria-label="Số người tự điền"
                type="number"
                min={1}
                max={10}
                step={1}
                required
                className="mt-2 min-h-11 text-base"
                value={extraCount}
                onChange={(event) => setExtraCount(event.target.value)}
              />
            </label>
            {roster.error && <ErrorMessage error={roster.error} />}
            {extraError && (
              <p role="alert" className="text-sm text-destructive">
                {extraError}
              </p>
            )}
            <Button
              type="submit"
              className="min-h-11 w-full"
              disabled={busy || roster.isPending || !roster.data}
            >
              Thêm vào bảng
            </Button>
          </form>
        </Dialog>
      )}
      {draft.events.length ? (
        <fieldset disabled={busy} className="min-w-0">
          <ScheduleViews
            receptionIssues={ruleIssues}
            onCellBlur={
              !locked && roster.data
                ? (date, session, position, text) => {
                    const sorted = sortReceptionCellText(
                      text,
                      roster.data!.items,
                    );
                    if (sorted !== text)
                      update(
                        "events",
                        editReceptionCell(
                          draft,
                          date,
                          session,
                          position,
                          sorted,
                        ),
                      );
                  }
                : undefined
            }
            onCellChange={
              !locked
                ? (date, session, position, text) =>
                    update(
                      "events",
                      editReceptionCell(draft, date, session, position, text),
                    )
                : undefined
            }
            schedule={preview}
            printable={autoPublish ? record?.status === "published" : !dirty}
            printSchedule={autoPublish ? record : undefined}
            showPrintButton={false}
            printActionRef={printAction}
            quarterlyIssues={quarterlyCellErrors}
            onQuarterlyCellChange={
              quarterly && !locked
                ? (eventId, column, text) => {
                    update(
                      "events",
                      draft.events.map((event) => {
                        if (event.id !== eventId) return event;
                        return {
                          ...event,
                          responsibilities: event.responsibilities.map(
                            (duty) =>
                              duty.name === column
                                ? {
                                    ...duty,
                                    displayText: text,
                                    departmentIds: [],
                                    assignments: quarterlyPersonnelColumn(
                                      column,
                                    )
                                      ? duty.assignments.filter((person) =>
                                          quarterlyTextNames(text).includes(
                                            normalizeRosterName(
                                              names[person.memberId] ?? "",
                                            ),
                                          ),
                                        )
                                      : [],
                                  }
                                : duty,
                          ),
                        };
                      }),
                    );
                  }
                : undefined
            }
            onEvent={
              !locked ? (value) => setEvent(structuredClone(value)) : undefined
            }
          />
        </fieldset>
      ) : (
        <p className="py-6 text-center text-muted-foreground">
          {reception
            ? "Chưa có lịch Chúa nhật. Quay lại danh sách để tạo lịch tháng."
            : "Chưa có chương trình. Thêm chương trình để phân công."}
        </p>
      )}
      {!locked &&
        draft.categoryId === "reception" &&
        draft.settings.layout === "reception" && (
          <p className="text-sm text-muted-foreground">
            Sửa trực tiếp trong ô rồi lưu lịch. Thống kê cập nhật theo nội dung
            bảng; thông báo vẫn gửi đến các hồ sơ đã liên kết khi tạo lịch.
          </p>
        )}
      {!locked && !reception && !quarterly && draft.events.length > 0 && (
        <details className="rounded-xl border p-4">
          <summary className="cursor-pointer font-medium">
            Danh sách chương trình
          </summary>
          <ul className="mt-3 divide-y">
            {draft.events.map((value) => (
              <li className="flex items-center gap-2 py-3" key={value.id}>
                <button
                  type="button"
                  className="min-w-0 flex-1 wrap-break-word text-left"
                  onClick={() => setEvent(structuredClone(value))}
                >
                  {displayCalendarDate(value.date)} · {value.title}
                  {value.session ? " · " + value.session : ""}
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    update(
                      "events",
                      draft.events.filter((item) => item.id !== value.id),
                    )
                  }
                >
                  Gỡ chương trình
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {reception && roster.data && (
        <ReceptionWorkloadSummary schedule={preview} team={roster.data.items} />
      )}
      {reception && roster.error && (
        <p
          role="status"
          className="rounded-lg bg-orange-100 p-3 text-sm text-amber-950"
        >
          Chưa thể kiểm tra danh sách Ban ngành. Khi lưu, cần xác nhận lưu mà
          chưa kiểm tra được quy tắc.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => void roster.refetch()}
          >
            Thử lại
          </button>
        </p>
      )}
      {(error || mutation.error) && (
        <ErrorMessage error={new Error(error ?? "Không thể xử lý lịch.")} />
      )}
      {event && (
        <ScheduleEventEditor
          value={event}
          category={category}
          departments={departments}
          settings={draft.settings}
          periodStart={draft.periodStart}
          periodEnd={draft.periodEnd}
          names={names}
          onClose={() => setEvent(null)}
          onSave={(value, updatedNames) => {
            if (quarterly) {
              const events = draft.events.map((item) =>
                item.id === value.id ? value : item,
              );
              const issues = quarterlyWorkIssues({ ...draft, events });
              if (issues.length) throw new Error(issues.slice(0, 8).join("\n"));
            }
            update(
              "events",
              draft.events.some((item) => item.id === value.id)
                ? draft.events.map((item) =>
                    item.id === value.id ? value : item,
                  )
                : [...draft.events, value],
            );
            setNames(updatedNames);
            setEvent(null);
          }}
        />
      )}
      {ruleAction && (
        <Dialog
          open
          title="Vẫn lưu phân công cần kiểm tra?"
          description="Một số tên chưa phù hợp với quy tắc. Xem lại bên dưới hoặc xác nhận giữ thay đổi. Không kiểm tra số lượt phân công trong tháng."
          closeLabel="Đóng kiểm tra phân công"
          onOpenChange={(open) => {
            if (!open && !busy) setRuleAction(null);
          }}
        >
          <div className="space-y-4">
            {roster.error && (
              <p>
                Không tải được danh sách Ban ngành để kiểm tra tên và điều kiện
                phục vụ.
              </p>
            )}
            <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
              {ruleIssues.map((issue, index) => (
                <li key={index}>
                  {displayCalendarDate(issue.date)} · {issue.session} ·{" "}
                  {issue.position}: {issue.message}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy}
                onClick={() => {
                  const action = ruleAction;
                  setRuleAction(null);
                  mutation.mutate(action);
                }}
              >
                Vẫn lưu thay đổi
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRuleAction(null)}
              >
                Quay lại chỉnh sửa
              </Button>
            </div>
          </div>
        </Dialog>
      )}
      {confirm && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setConfirm(null);
          }}
          title={
            confirm === "publish"
              ? reception
                ? "Gởi lịch tiếp tân chính thức?"
                : "Công bố lịch?"
              : confirm === "cancel"
                ? "Hủy lịch?"
                : confirm === "delete"
                  ? "Xóa bản nháp?"
                  : reception
                    ? unsubmitted
                      ? "Lịch chưa được gởi"
                      : "Thay đổi chưa được gởi"
                    : "Bỏ thay đổi chưa lưu?"
          }
          description={
            confirm === "publish"
              ? "Thành viên được phân công sẽ xem được lịch và nhận thông báo."
              : confirm === "cancel"
                ? "Lịch được giữ trong lịch sử. Nếu đã công bố, thành viên liên quan sẽ nhận thông báo hủy."
                : confirm === "leave"
                  ? reception
                    ? `${unsubmitted ? "Lịch chưa được gởi chính thức." : "Thay đổi chưa được lưu lên lịch chính thức."} Nếu rời trang, bản tạm và các thay đổi chưa lưu sẽ bị bỏ. Bạn có muốn tiếp tục?`
                    : "Các thay đổi chưa lưu sẽ bị bỏ."
                  : "Chỉ bản nháp này sẽ được xóa."
          }
          closeLabel="Đóng xác nhận lịch"
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                confirm === "leave" ? leaveEditor() : requestAction(confirm)
              }
            >
              {confirm === "leave" && reception ? "Rời trang" : "Xác nhận"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Quay lại
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
/** Canonical, key-order-independent string for a value so two equivalent drafts
 * compare equal even when their object keys were created in a different order. */
function stableKey(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stableKey).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            stableKey((value as Record<string, unknown>)[key]),
        )
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}
/** Compares the editable schedule fields, ignoring record metadata and member
 * name labels (which are never sent to the server). */
function draftKey(value: ScheduleDraftValue) {
  return stableKey({
    categoryId: value.categoryId,
    title: value.title,
    description: value.description,
    periodStart: value.periodStart,
    periodEnd: value.periodEnd,
    settings: value.settings,
    events: value.events,
  });
}
type ScheduleMenuAction = {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
};
/** Header actions menu: a popover beside the trigger on desktop and a bottom
 * sheet on phones, matching the responsive menu used for departments. */
function ScheduleMenu({ actions }: { actions: ScheduleMenuAction[] }) {
  const [mobile, setMobile] = useState(false),
    [open, setOpen] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.("(max-width: 639px)");
    if (!media) return;
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Tùy chọn lịch"
      onClick={mobile ? () => setOpen(true) : undefined}
    >
      <MoreVertical size={20} />
    </Button>
  );
  return (
    <>
      {mobile ? (
        trigger
      ) : (
        <DropdownMenu trigger={trigger} align="end">
          {actions.map((action) => (
            <MenuItem
              key={action.id}
              className="min-h-11"
              disabled={action.disabled}
              onSelect={action.onSelect}
            >
              {action.icon}
              {action.label}
            </MenuItem>
          ))}
        </DropdownMenu>
      )}
      {mobile && open && (
        <Dialog
          open
          onOpenChange={setOpen}
          title="Tùy chọn lịch"
          description=""
          closeLabel="Đóng tùy chọn lịch"
          className="left-0! top-auto! bottom-0! w-full! max-w-none! translate-x-0! translate-y-0! rounded-b-none rounded-t-2xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          {actions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant="ghost"
              className="min-h-12 w-full justify-start"
              disabled={action.disabled}
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </Dialog>
      )}
    </>
  );
}
