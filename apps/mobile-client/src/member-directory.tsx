import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  LoaderCircle,
  X,
} from "lucide-react";
import { departments, listDirectory } from "@org/core";
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
}: {
  org: string;
  active: boolean;
  onOpen: () => void;
}) {
  const [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState("");
  const [options, setOptions] = useState<Options>(defaults),
    [open, setOpen] = useState(false);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const filterCount =
    options.departmentIds.length +
    Number(options.area !== "all") +
    Number(options.location !== "all") +
    Number(
      options.ageUnknownOnly ||
        options.minAge !== null ||
        options.maxAge !== null,
    );
  const count = filterCount;
  const hasCriteria = Boolean(search.trim()) || filterCount > 0;
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
      "directory",
      { search: debounced, ...options },
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      listDirectory(
        org,
        { search: debounced, ...options, page: pageParam, pageSize: 12 },
        signal,
      ),
    getNextPageParam: (page) => page.nextPage,
    staleTime: 30_000,
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
    <section aria-label="Danh sách thành viên">
      <h1 className="sr-only">Danh sách thành viên</h1>
      <div className="sticky top-0 z-20 -mx-5 bg-background/95 px-5 pb-4 pt-[max(.5rem,env(safe-area-inset-top))] backdrop-blur-md">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-3.5 text-muted-foreground"
            />
            <Input
              type="search"
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
          <div className="mt-3 flex flex-wrap gap-2">
            {options.departmentIds.map((id) => (
              <button
                key={id}
                aria-label={`Bỏ lọc ${departments.find((d) => d.id === id)?.name}`}
                onClick={() =>
                  setOptions((v) => ({
                    ...v,
                    departmentIds: v.departmentIds.filter((d) => d !== id),
                  }))
                }
                className="flex min-h-11 items-center gap-2 rounded-full border border-primary/15 bg-accent px-3 text-xs text-primary"
              >
                {departments.find((d) => d.id === id)?.name}
                <X size={12} />
              </button>
            ))}
            {(["area", "location"] as const)
              .filter((key) => options[key] !== "all")
              .map((key) => (
                <button
                  key={key}
                  aria-label={`Bỏ lọc ${options[key]}`}
                  onClick={() => setOptions((v) => ({ ...v, [key]: "all" }))}
                  className="flex min-h-11 items-center gap-2 rounded-full border border-primary/15 bg-accent px-3 text-xs text-primary"
                >
                  {options[key]}
                  <X size={12} />
                </button>
              ))}
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
        <div className="py-8">
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
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
        <div className="space-y-4">
          <ClientError error={query.error} />
          <Button variant="outline" onClick={() => query.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : !members.length ? (
        <div className="space-y-4">
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
                    href={`#/members/${m.id}`}
                    onClick={onOpen}
                    className="flex min-h-28 items-center gap-3.5 px-4 py-4 transition-colors hover:bg-muted/50 focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <Avatar
                      name={m.user.name}
                      className={cn(
                        "size-12 rounded-2xl text-sm",
                        i % 3 === 1 &&
                          "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                        i % 3 === 2 &&
                          "bg-sky-500/10 text-sky-700 dark:text-sky-300",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="break-words text-lg font-semibold leading-snug">
                          {m.user.name}
                        </h2>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {m.departments.map((d) => d.name).join(", ") ||
                          "Chưa tham gia ban ngành"}
                      </p>
                      <p className="mt-1 break-words text-xs text-muted-foreground">
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
      <MemberFilters
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
