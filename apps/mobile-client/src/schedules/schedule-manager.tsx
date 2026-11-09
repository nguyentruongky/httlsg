"use client";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Plus, ArrowLeft, Settings } from "lucide-react";
import {
  listLocalScheduleDrafts,
  type LocalScheduleDraft,
  apiRequest,
  hasScheduleManagement,
  displayCalendarDate,
  type ScheduleCategory,
  type ScheduleDraftValue,
  type ScheduleRecord,
} from "@org/core";
import { Button, Card, Dialog, ErrorMessage } from "@org/ui";
import { useAuth } from "@org/core";
import { ScheduleEditor } from "./schedule-editor";
import { CategorySettings } from "./category-settings";
import { ScheduleCreate } from "./schedule-create";
import { ScheduleCopy } from "./schedule-copy";
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
export function ScheduleManager({ member = false }: { member?: boolean }) {
  const auth = useAuth(),
    user = auth?.user,
    allowed = hasScheduleManagement(user);
  const [planner, setPlanner] = useState(false),
    [generationWarnings, setGenerationWarnings] = useState<string[]>([]),
    [generatedNames, setGeneratedNames] = useState<Record<string, string>>({});
  const [categoryId, setCategory] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [creating, setCreating] = useState<ScheduleDraftValue | null>(null),
    [config, setConfig] = useState(false),
    [configEditing, setConfigEditing] = useState(false),
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
  const category =
    catalog.data?.items.find((item) => item.id === categoryId) ??
    catalog.data?.items[0];
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
    enabled:
      Boolean(catalog.data?.items.some((item) => item.canManage)) &&
      !selected &&
      !creating,
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
        <a href="/client#/profile" className="text-primary underline">
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
    return (
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
    );
  }
  return (
    <section className="min-w-0 space-y-5 [&_.ui-button]:min-h-11">
      <header className="flex items-center gap-3">
        {member && (
          <Button asChild variant="ghost" size="icon">
            <a href="#/profile" aria-label="Về hồ sơ cá nhân">
              <ArrowLeft size={21} />
            </a>
          </Button>
        )}
        <h1 className="min-w-0 flex-1 text-2xl font-semibold">
          Lịch phân công
        </h1>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Cấu hình lịch phân công"
          onClick={() => setConfig(true)}
        >
          <Settings size={19} />
        </Button>
        <Button
          type="button"
          size="icon"
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
      )}
      {!catalog.data!.items.some((item) => item.canManage) ? (
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
                  {item.categoryId !== "reception" && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {displayCalendarDate(item.periodStart)} –{" "}
                      {displayCalendarDate(item.periodEnd)}
                    </p>
                  )}
                  <p className="mt-1 text-sm">
                    {item.status === "draft"
                      ? "Bản nháp"
                      : item.status === "published"
                        ? "Đã công bố"
                        : "Đã hủy"}{" "}
                    {item.categoryId !== "reception" && (
                      <>· {item.eventCount} chương trình</>
                    )}
                  </p>
                </button>
                {item.categoryId !== "reception" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCopy(item)}
                  >
                    Sao chép sang kỳ khác
                  </Button>
                )}
              </Card>
            ))}
          {!query.data?.pages[0].items.length && (
            <p className="py-6 text-muted-foreground">
              Chưa có lịch trong kỳ đã chọn.
            </p>
          )}
        </div>
      )}
      {query.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Tải thêm lịch
        </Button>
      )}
      {config && (
        <Dialog
          open
          title="Cấu hình lịch phân công"
          description="Chọn lịch để cấu hình trách nhiệm."
          closeLabel="Đóng cấu hình lịch"
          onOpenChange={setConfig}
        >
          <div className="grid gap-2">
            {catalog.data!.items.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="outline"
                onClick={() => {
                  setCategory(item.id);
                  setConfig(false);
                  setConfigEditing(true);
                }}
              >
                {item.name}
              </Button>
            ))}
          </div>
        </Dialog>
      )}
      {configEditing && (
        <CategorySettings
          category={category}
          canActivate={Boolean(
            user &&
            (user.role === "admin" ||
              user.permissions.includes("schedule.leaders.manage")),
          )}
          onClose={() => setConfigEditing(false)}
        />
      )}
      {copy && (
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
      )}
    </section>
  );
}
