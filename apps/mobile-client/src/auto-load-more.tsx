import { useCallback, useState } from "react";
import { Button } from "@org/ui";
import { useAutoLoadMore } from "./use-auto-load-more";
import { useDelayedLoading } from "./use-delayed-loading";

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
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const showLoading = useDelayedLoading(query.isFetchingNextPage);
  const loadMore = useCallback(
    () => query.fetchNextPage({ cancelRefetch: false }),
    [query.fetchNextPage],
  );
  useAutoLoadMore({
    target,
    enabled: enabled && query.hasNextPage && !query.isFetchNextPageError,
    isFetching: query.isFetching,
    pageCount: query.data?.pages.length ?? 0,
    loadMore,
  });
  if (!enabled) return null;
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
