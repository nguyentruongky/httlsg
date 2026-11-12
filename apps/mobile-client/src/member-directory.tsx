import { ProfileBackButton } from "./profile-back-button";
import { useEffect, useState, type Ref } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  LoaderCircle,
  X,
} from "lucide-react";
import {
  departments,
  listDirectory,
  apiRequest,
  type DirectoryMember,
  type DirectoryQuery,
} from "@org/core";
import { Avatar, Button, Card, Input, EmptyState, cn } from "@org/ui";
import { ClientError } from "./locale";
import { useAutoLoadMore } from "./use-auto-load-more";
import {
  MemberFilters,
  emptyMemberFilters,
  ageRangeLabel,
  type MemberFiltersValue,
} from "./member-filters";
type Options = MemberFiltersValue;
const defaults = emptyMemberFilters;
export function MemberDirectory({
  org,
  active,
  onOpen,
  scrollRef,
  team = false,
  assigned = false,
}: {
  org: string;
  active: boolean;
  onOpen: () => void;
  scrollRef?: Ref<HTMLDivElement>;
  team?: boolean | "board";
  assigned?: boolean;
}) {
  const filterOptions = useQuery({
    queryKey: ["organizations", org, "directory-filter-options"],
    queryFn: ({ signal }) =>
      apiRequest<{
        departments: { id: string; name: string }[];
        areas: string[];
        locations: string[];
      }>("/api/members/filters", { signal }),
    enabled: active && assigned,
    staleTime: 0,
  });
  const departmentOptions = assigned
    ? (filterOptions.data?.departments ?? [])
    : departments;
  const [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState("");
  const [options, setOptions] = useState<Options>(defaults),
    [open, setOpen] = useState(false);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const filterCount =
    options.departmentIds.length +
    Number(options.area.length > 0) +
    Number(options.location.length > 0) +
    Number(
      options.ageUnknownOnly ||
        options.minAge !== null ||
        options.maxAge !== null,
    );
  const count = filterCount;
  const hasCriteria =
    assigned || team || Boolean(search.trim()) || filterCount > 0;
  const isDebouncing = search.trim() !== debounced;
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const query = useInfiniteQuery({
    enabled: active && hasCriteria && !isDebouncing,
    queryKey: [
      "organizations",
      org,
      assigned
        ? "assigned-directory"
        : team === "board"
          ? "board-directory"
          : team
            ? "leader-directory"
            : "directory",
      "last-word",
      { search: debounced, ...options },
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      team
        ? apiRequest<{
            items: DirectoryMember[];
            total: number;
            nextPage?: number;
          }>(
            `/api/${team === "board" ? "board" : "leader"}/members?query=${encodeURIComponent(JSON.stringify({
              search: debounced,
              departmentIds: options.departmentIds,
              minAge: options.minAge,
              maxAge: options.maxAge,
              ageUnknownOnly: options.ageUnknownOnly,
              area: (options.area[0] ?? "all") as DirectoryQuery["area"],
              location: (options.location[0] ?? "all") as DirectoryQuery["location"],
              page: pageParam,
              pageSize: 12,
            }))}`,
            { signal },
          )
        : listDirectory(
            org,
            {
              search: debounced,
              departmentIds: options.departmentIds,
              minAge: options.minAge,
              maxAge: options.maxAge,
              ageUnknownOnly: options.ageUnknownOnly,
              area: (options.area[0] ?? "all") as DirectoryQuery["area"],
              location: (options.location[0] ?? "all") as DirectoryQuery["location"],
              page: pageParam,
              pageSize: 12,
            },
            signal,
          ),
    getNextPageParam: (page) => page.nextPage,
    staleTime: assigned || team ? 0 : 30_000,
  });
  const { hasNextPage, isFetching, isFetchNextPageError, fetchNextPage } =
    query;
  useAutoLoadMore({
    target: sentinel,
    enabled:
      active &&
      hasCriteria &&
      !isDebouncing &&
      !open &&
      Boolean(hasNextPage) &&
      !isFetchNextPageError &&
      search === debounced,
    isFetching,
    pageCount: query.data?.pages.length ?? 0,
    loadMore: fetchNextPage,
  });
  const members = query.data?.pages.flatMap((p) => p.items) ?? [],
    total = query.data?.pages[0].total ?? 0;
  const updating =
    hasCriteria &&
    (isDebouncing || (query.isFetching && !query.isFetchingNextPage));
  function reset() {
    setSearch("");
    setDebounced("");
    setOptions(defaults);
  }
  return (
    <section
      aria-label={team ? "Thành viên trong Ban ngành" : "Danh sách thành viên"}
      className="flex h-full min-h-0 flex-col overflow-hidden"
    >
      <h1 className="sr-only">
        {team ? "Thành viên trong Ban ngành" : "Danh sách thành viên"}
      </h1>
      <div className="z-20 shrink-0 bg-background px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {team && (
          <div className="mb-2">
            <ProfileBackButton />
          </div>
        )}
        <div className="mb-3 flex items-center gap-2">
          <img
            src="/pwa/icon-192.png"
            alt=""
            className="size-8 rounded-full bg-white object-contain"
          />
          <span className="text-sm font-semibold text-foreground">
            Hội Thánh Tin Lành Sài Gòn
          </span>
        </div>
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-3.5 text-muted-foreground"
            />
            <Input
              type="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-label="Tìm thành viên"
              placeholder="Tìm tên, gia đình, ban ngành…"
              maxLength={200}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 rounded-xl bg-card pl-11 pr-10 text-base"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setDebounced("");
                }}
                aria-label="Xóa nội dung tìm kiếm"
                className="absolute right-0 top-0 flex size-12 items-center justify-center text-muted-foreground"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="relative size-12 shrink-0 rounded-xl bg-card"
            disabled={
              assigned && (filterOptions.isPending || filterOptions.isError)
            }
            aria-label={`Bộ lọc${count ? `, ${count} tùy chọn đang áp dụng` : ""}`}
            onClick={() => {
              setOpen(true);
            }}
          >
            <SlidersHorizontal size={19} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {count}
              </span>
            )}
          </Button>
        </div>
        {filterCount > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto overscroll-x-contain [&>button]:shrink-0 [&>button]:whitespace-nowrap">
            {options.departmentIds.map((id) => (
              <button
                key={id}
                aria-label={`Bỏ lọc ${departmentOptions.find((d) => d.id === id)?.name}`}
                onClick={() =>
                  setOptions((v) => ({
                    ...v,
                    departmentIds: v.departmentIds.filter((d) => d !== id),
                  }))
                }
                className="flex min-h-11 items-center gap-2 rounded-full border border-primary/15 bg-accent px-3 text-xs text-primary"
              >
                {departmentOptions.find((d) => d.id === id)?.name}
                <X size={12} />
              </button>
            ))}
            {options.area.length > 0 && (
              <button
                key="area"
                aria-label={`Bỏ lọc khu vực ${options.area.join(", ")}`}
                onClick={() => setOptions((v) => ({ ...v, area: [] }))}
                className="flex min-h-11 items-center gap-2 rounded-full border border-primary/15 bg-accent px-3 text-xs text-primary"
              >
                {options.area.join(", ")}
                <X size={12} />
              </button>
            )}
            {options.location.length > 0 && (
              <button
                key="location"
                aria-label={`Bỏ lọc phường/xã ${options.location.join(", ")}`}
                onClick={() => setOptions((v) => ({ ...v, location: [] }))}
                className="flex min-h-11 items-center gap-2 rounded-full border border-primary/15 bg-accent px-3 text-xs text-primary"
              >
                {options.location.join(", ")}
                <X size={12} />
              </button>
            )}
            {(options.ageUnknownOnly ||
              options.minAge !== null ||
              options.maxAge !== null) && (
              <button
                type="button"
                aria-label="Bỏ lọc khoảng tuổi"
                onClick={() =>
                  setOptions((v) => ({
                    ...v,
                    minAge: null,
                    maxAge: null,
                    ageUnknownOnly: false,
                  }))
                }
                className="flex min-h-11 items-center gap-2 rounded-full border border-primary/15 bg-accent px-3 text-xs text-primary"
              >
                {ageRangeLabel(
                  options.minAge,
                  options.maxAge,
                  options.ageUnknownOnly,
                )}
                <X size={12} />
              </button>
            )}
            <button
              className="min-h-11 px-1 text-xs text-muted-foreground underline"
              onClick={reset}
            >
              Xóa tất cả
            </button>
          </div>
        )}
      </div>
      <div
        ref={scrollRef}
        role="region"
        aria-label="Kết quả danh sách"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto overscroll-none px-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="flex min-h-full flex-col pb-4">
          {hasCriteria && (
            <div
              className="mb-3 flex items-center justify-between gap-2 text-sm text-muted-foreground"
              aria-live="polite"
            >
              <span>
                {query.isPending || isDebouncing
                  ? "Đang tìm thành viên…"
                  : `${total} thành viên${search || filterCount ? " phù hợp" : ""}`}
              </span>
              {updating && (
                <span className="flex items-center gap-1">
                  <LoaderCircle size={12} className="animate-spin" />
                  Đang cập nhật
                </span>
              )}
            </div>
          )}
          {!hasCriteria ? (
            <div className="my-auto w-full py-6">
              <div className="rounded-xl  p-10 text-center">
                <Search
                  size={40}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="mx-auto text-muted-foreground"
                />
                <p className="mt-4 text-sm text-muted-foreground">
                  Tìm kiếm hoặc lọc để xem danh sách.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="touch"
                className="mt-4 w-full rounded-xl"
                onClick={() => setOpen(true)}
              >
                <SlidersHorizontal size={18} />
                Mở bộ lọc
              </Button>
            </div>
          ) : query.isPending || isDebouncing ? (
            <DirectoryLoading />
          ) : query.isError && !query.data ? (
            <div className="my-auto w-full space-y-4 py-6">
              <ClientError error={query.error} />
              <Button variant="outline" onClick={() => query.refetch()}>
                Thử lại
              </Button>
            </div>
          ) : !members.length ? (
            <div className="my-auto w-full space-y-4 py-6">
              <EmptyState
                title="Không tìm thấy thành viên"
                description="Thử tên khác hoặc thay đổi bộ lọc."
              />
              <Button variant="outline" className="w-full" onClick={reset}>
                Xóa tìm kiếm và bộ lọc
              </Button>
            </div>
          ) : (
            <>
              <Card className="overflow-hidden">
                <ul className="divide-y">
                  {members.map((m, i) => (
                    <li key={m.id}>
                      <a
                        href={
                          team
                            ? `/client/${team === "board" ? "board" : "leader"}/members/${m.id}`
                            : `/client/members/${m.id}`
                        }
                        onClick={onOpen}
                        className="flex min-h-28 items-center gap-3.5 px-4 py-4 transition-colors hover:bg-muted/50 focus-visible:bg-accent focus-visible:outline-none"
                      >
                        <Avatar
                          name={m.user.name}
                          variant="member"
                          colorIndex={i}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h2 className="wrap-break-word text-lg font-semibold leading-snug">
                              {m.user.name}
                            </h2>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {m.departments.map((d) => d.name).join(", ") ||
                              "Chưa tham gia ban ngành"}
                          </p>
                          <p className="mt-1 wrap-break-word text-xs text-muted-foreground">
                            {[m.area, m.location].filter(Boolean).join(" · ") ||
                              "Chưa cập nhật khu vực"}
                          </p>
                        </div>
                        <ChevronRight
                          size={17}
                          className="shrink-0 text-muted-foreground/60"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
              <div ref={setSentinel} className="min-h-20 pt-5 text-center">
                <p className="mb-3 text-xs text-muted-foreground">
                  Đã hiển thị {members.length} / {total} thành viên
                </p>
                {query.isFetchNextPageError ? (
                  <div className="space-y-3">
                    <ClientError error={query.error} />
                    <Button
                      variant="outline"
                      size="touch"
                      className="w-full"
                      onClick={() => query.fetchNextPage()}
                    >
                      Thử tải lại
                    </Button>
                  </div>
                ) : query.hasNextPage ? (
                  <>
                    <p
                      role="status"
                      className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground"
                    >
                      {query.isFetchingNextPage ? (
                        <>
                          <LoaderCircle size={15} className="animate-spin" />
                          Đang tải thêm thành viên…
                        </>
                      ) : (
                        "Cuộn xuống để xem thêm"
                      )}
                    </p>
                    <Button
                      variant="outline"
                      size="touch"
                      className="w-full rounded-xl"
                      disabled={query.isFetchingNextPage}
                      onClick={() => query.fetchNextPage()}
                    >
                      Tải thêm thành viên
                    </Button>
                  </>
                ) : (
                  <p className="py-2 text-xs text-muted-foreground">
                    Bạn đã xem hết danh sách.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {assigned && filterOptions.isError && (
        <div className="px-5 py-3">
          <ClientError error={filterOptions.error} />
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => {
              void filterOptions.refetch();
            }}
          >
            Thử tải bộ lọc
          </Button>
        </div>
      )}
      <MemberFilters
        departmentOptions={departmentOptions}
        areaOptions={assigned ? (filterOptions.data?.areas ?? []) : undefined}
        locationOptions={
          assigned ? (filterOptions.data?.locations ?? []) : undefined
        }
        open={open}
        onOpenChange={setOpen}
        value={options}
        onApply={setOptions}
      />
    </section>
  );
}
export function DirectoryLoading() {
  return (
    <div role="status" aria-label="Đang tải thành viên" className="space-y-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="flex items-center gap-4 rounded-xl border bg-card p-4"
        >
          <div className="size-12 animate-pulse rounded-2xl bg-muted" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-2 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
