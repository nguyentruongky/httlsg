"use client";
import { ScheduleViews } from "./schedule-views";
import { AutoLoadMore } from "../auto-load-more";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Plus, ArrowLeft, PlusIcon, PlusCircleIcon } from "lucide-react";
import {
  listLocalScheduleDrafts,
  type LocalScheduleDraft,
  apiRequest,
  hasScheduleManagement,
  canViewSchedules,
  displayCalendarDate,
  type ScheduleCategory,
  type ScheduleDraftValue,
  type ScheduleRecord,
} from "@org/core";
import { Button, Card, ErrorMessage } from "@org/ui";
import { useAuth } from "@org/core";
const ScheduleEditor = lazy(() =>
  import("./schedule-editor").then((module) => ({
    default: module.ScheduleEditor,
  })),
);
const ScheduleCreate = lazy(() =>
  import("./schedule-create").then((module) => ({
    default: module.ScheduleCreate,
  })),
);
const ScheduleCopy = lazy(() =>
  import("./schedule-copy").then((module) => ({
    default: module.ScheduleCopy,
  })),
);
type Summary = {
  id: string;
  title: string;
  categoryId: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  version: number;
  eventCount: number;
};
export function ScheduleManager({
  member = false,
  initialCreate = false,
}: {
  member?: boolean;
  initialCreate?: boolean;
}) {
  const auth = useAuth(),
    user = auth?.user,
    allowed = canViewSchedules(user);
  const [planner, setPlanner] = useState(
      initialCreate && hasScheduleManagement(user),
    ),
    [generationWarnings, setGenerationWarnings] = useState<string[]>([]),
    [generatedNames, setGeneratedNames] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null),
    [creating, setCreating] = useState<ScheduleDraftValue | null>(null),
    [copy, setCopy] = useState<Summary | null>(null);
  const [resuming, setResuming] = useState<LocalScheduleDraft | null>(null),
    [owner, setOwner] = useState(user?.id);
  useEffect(() => {
    if (owner !== user?.id) {
      setCreating(null);
      setSelected(null);
      setGeneratedNames({});
      setGenerationWarnings([]);
      setResuming(null);
      setOwner(user?.id);
    }
  }, [owner, user?.id]);
  const currentOwner = useRef(user?.id);
  currentOwner.current = user?.id;
  async function openPeriod(
    categoryId: string,
    period: { from: string; to: string },
  ) {
    const ownerId = user?.id;
    if (!ownerId) return false;
    const { from, to } = period;
    const cached = listLocalScheduleDrafts(ownerId, user.authVersion);
    for (const status of ["published", "draft"]) {
      let page: number | null = 1;
      while (page) {
        const data: { items: Summary[]; nextPage: number | null } =
          await apiRequest<{
            items: Summary[];
            nextPage: number | null;
          }>(
            "/api/schedules?" +
              new URLSearchParams({
                categoryId,
                from,
                to,
                status,
                page: String(page),
              }),
          );
        if (currentOwner.current !== ownerId)
          throw new Error("Phiên đăng nhập đã thay đổi.");
        const saved = data.items.find(
          (item) => item.periodStart === from && item.periodEnd === to,
        );
        if (saved) {
          setResuming(
            cached.find((item) => item.recordId === saved.id) ?? null,
          );
          setSelected(saved.id);
          setPlanner(false);
          return true;
        }
        page = data.nextPage;
      }
      if (status === "published") {
        const local = cached.find(
          (item) =>
            !item.recordId &&
            item.draft.categoryId === categoryId &&
            item.draft.periodStart === from &&
            item.draft.periodEnd === to,
        );
        if (local) {
          setResuming(local);
          setGeneratedNames(local.names);
          setCreating(local.draft);
          setPlanner(false);
          return true;
        }
      }
    }
    return false;
  }
  const catalog = useQuery({
    queryKey: ["schedule-categories"],
    queryFn: () =>
      apiRequest<{
        items: ScheduleCategory[];
        departments: { id: string; name: string }[];
      }>("/api/schedule-categories"),
    enabled: allowed,
  });
  const category = catalog.data?.items[0];
  const query = useInfiniteQuery({
    queryKey: ["schedules", user?.id],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      apiRequest<{ items: Summary[]; nextPage: number | null }>(
        "/api/schedules?" +
          new URLSearchParams({
            page: String(pageParam),
          }),
      ),
    getNextPageParam: (page) => page.nextPage ?? undefined,
    enabled: Boolean(catalog.data?.items.length) && !selected && !creating,
  });
  const detail = useQuery({
    queryKey: ["schedules", "detail", selected],
    queryFn: () => apiRequest<ScheduleRecord>("/api/schedules/" + selected),
    enabled: Boolean(selected),
  });
  if (owner !== user?.id) return <p role="status">Đang tải…</p>;
  if (auth?.loading) return <p role="status">Đang tải…</p>;
  if (!allowed)
    return (
      <div role="alert" className="space-y-3">
        <p>Bạn chưa được giao quản lý lịch phân công.</p>
        <a href="/client/profile" className="text-primary underline">
          Về hồ sơ cá nhân
        </a>
      </div>
    );
  if (catalog.isPending) return <p role="status">Đang tải loại lịch…</p>;
  if (catalog.error) return <ErrorMessage error={catalog.error} />;
  if (!category)
    return <p>Không có loại lịch được giao hoặc các loại lịch đã tắt.</p>;
  if (selected && detail.isPending) return <p role="status">Đang tải lịch…</p>;
  if (selected && detail.error)
    return (
      <div className="space-y-3">
        <Button type="button" variant="ghost" onClick={() => setSelected(null)}>
          Về danh sách lịch
        </Button>
        <ErrorMessage error={detail.error} />
      </div>
    );
  const plan = creating ?? detail.data;
  if ((creating || selected) && plan) {
    const ownCategory = catalog.data!.items.find(
      (item) => item.id === plan.categoryId,
    );
    if (!ownCategory)
      return <p role="alert">Bạn không còn được quản lý loại lịch này.</p>;
    if (!ownCategory.canManage && detail.data)
      return (
        <section className="space-y-5">
          <Button variant="ghost" onClick={() => setSelected(null)}>
            <ArrowLeft size={21} />
            Về danh sách lịch
          </Button>
          <h1 className="text-xl font-semibold">{detail.data.title}</h1>
          <ScheduleViews schedule={detail.data} />
        </section>
      );
    return (
      <Suspense fallback={<p role="status">Đang tải trình chỉnh sửa…</p>}>
        <ScheduleEditor
          key={`${user?.id}:${resuming?.scope ?? (creating ? "new" : selected!)}`}
          initial={plan}
          localDraft={resuming ?? undefined}
          draftOwnerId={user?.id}
          initialNames={creating ? generatedNames : undefined}
          initialWarnings={creating ? generationWarnings : undefined}
          category={ownCategory}
          departments={catalog.data!.departments}
          onBack={() => {
            setSelected(null);
            setCreating(null);
            setResuming(null);
          }}
          onSaved={(saved) => {
            setResuming(null);
            if (creating) {
              setCreating(null);
              setSelected(saved.id);
            }
          }}
        />
      </Suspense>
    );
  }
  return (
    <section className="min-w-0 space-y-5 [&_.ui-button]:min-h-11">
      <header className="flex items-center gap-3">
        {member && (
          <Button asChild variant="ghost" size="icon">
            <a href="/client/profile" aria-label="Về hồ sơ cá nhân">
              <ArrowLeft size={21} />
            </a>
          </Button>
        )}
        <h1 className="min-w-0 flex-1 text-2xl font-semibold">
          Lịch phân công
        </h1>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Tạo lịch phân công"
          disabled={!catalog.data!.items.some((item) => item.canManage)}
          onClick={() => {
            setResuming(null);
            setGenerationWarnings([]);
            setPlanner(true);
          }}
        >
          <Plus size={21} />
        </Button>
      </header>
      {planner && (
        <Suspense fallback={<p role="status">Đang tải trình chỉnh sửa…</p>}>
          <ScheduleCreate
            categories={catalog.data!.items}
            onOpenPeriod={openPeriod}
            onClose={() => setPlanner(false)}
            onQuarterGenerated={(result) => {
              setResuming(null);
              setGeneratedNames(result.memberNames);
              setGenerationWarnings(result.warnings);
              setCreating(result.draft);
              setPlanner(false);
            }}
            onGenerated={(result) => {
              setResuming(null);
              setGeneratedNames(result.memberNames);
              setGenerationWarnings(result.warnings);
              setCreating(result.draft);
              setPlanner(false);
            }}
          />
        </Suspense>
      )}
      {!catalog.data!.items.length ? (
        <p>Loại lịch đã tắt. Bật lại trong cấu hình để tiếp tục.</p>
      ) : query.isPending ? (
        <p role="status">Đang tải lịch…</p>
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {query.data?.pages
            .flatMap((page) => page.items)
            .map((item) => (
              <Card key={item.id} className="space-y-3 p-4">
                <button
                  type="button"
                  className="block w-full text-left"
                  onClick={() => setSelected(item.id)}
                >
                  <h2 className="wrap-break-word font-semibold">
                    {item.categoryId === "reception"
                      ? `Lịch tiếp tân tháng ${item.periodStart.slice(5, 7)}/${item.periodStart.slice(0, 4)}`
                      : item.title}
                  </h2>
                  <p className="mt-1 text-sm">
                    {item.status === "draft"
                      ? "Bản nháp"
                      : item.status === "published"
                        ? "Đã công bố"
                        : "Đã hủy"}{" "}
                  </p>
                </button>
              </Card>
            ))}
          {!query.data?.pages[0].items.length && (
            <p className="py-6 text-muted-foreground">
              Chưa có lịch trong kỳ đã chọn.
            </p>
          )}
        </div>
      )}
      <AutoLoadMore query={query} />
      {copy && (
        <Suspense fallback={<p role="status">Đang tải trình chỉnh sửa…</p>}>
          <ScheduleCopy
            source={copy}
            onLocalCopied={(draft, names) => {
              setCopy(null);
              setResuming(null);
              setGeneratedNames(names);
              setCreating(draft);
            }}
            onClose={() => setCopy(null)}
            onCopied={(saved) => {
              setCopy(null);
              setSelected(saved.id);
            }}
          />
        </Suspense>
      )}
    </section>
  );
}
