import { useCallback, useState } from "react";
import { Button } from "@org/ui";
import { useAutoLoadMore } from "./use-auto-load-more";
import { useDelayedLoading } from "./use-delayed-loading";
import { useAuth } from "@org/core";

export function AutoLoadMore({
  query,
  enabled = true,
}: {
  query: {
    data?: { pages: unknown[] };
    hasNextPage: boolean;
    isFetching: boolean;
    isFetchingNextPage: boolean;
    isFetchNextPageError: boolean;
    fetchNextPage: (options?: { cancelRefetch?: boolean }) => Promise<unknown>;
  };
  enabled?: boolean;
}) {
  const auth = useAuth();
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const showLoading = useDelayedLoading(query.isFetchingNextPage);
  const loadMore = useCallback(
    () => query.fetchNextPage({ cancelRefetch: false }),
    [query.fetchNextPage],
  );
  useAutoLoadMore({
    target,
    enabled:
      enabled &&
      !auth?.offline &&
      query.hasNextPage &&
      !query.isFetchNextPageError,
    isFetching: query.isFetching,
    pageCount: query.data?.pages.length ?? 0,
    loadMore,
  });
  if (!enabled) return null;
  if (auth?.offline)
    return query.hasNextPage ? (
      <p
        role="status"
        className="py-4 text-center text-xs text-muted-foreground"
      >
        Đang hiển thị các thành viên đã lưu. Kết nối Internet để tải thêm.
      </p>
    ) : null;
  return (
    <div
      ref={setTarget}
      className="flex min-h-14 items-center justify-center py-2 text-center"
      aria-live="polite"
      aria-busy={query.isFetchingNextPage}
    >
      {query.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void loadMore()}
        >
          {showLoading
            ? "Đang tải…"
            : query.isFetchNextPageError
              ? "Thử tải lại"
              : "Tải thêm"}
        </Button>
      )}
    </div>
  );
}
