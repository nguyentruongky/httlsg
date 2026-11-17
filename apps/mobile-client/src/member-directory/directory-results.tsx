import { Search, SlidersHorizontal, LoaderCircle } from "lucide-react";
import { Button, EmptyState } from "@org/ui";
import { ClientError } from "../locale";
import { DirectoryLoading } from "./directory-loading";
import { DirectoryCards } from "./directory-cards";
import { DirectoryPagination } from "./directory-pagination";
import type { MemberDirectoryState } from "./use-member-directory";
export function DirectoryResults({
  state,
  org,
  onOpen,
}: {
  state: MemberDirectoryState;
  org: string;
  onOpen: () => void;
}) {
  const {
    hasCriteria,
    query,
    total,
    search,
    updating,
    setOpen,
    members,
    reset,
  } = state;
  const filterCount = state.count;
  return (
    <div className="flex min-h-full flex-col pb-4">
      {hasCriteria && (
        <div
          className="mb-3 flex items-center justify-between gap-2 text-sm text-muted-foreground"
          aria-live="polite"
        >
          <span>
            {query.isPending && query.isFetching
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
          <div className="rounded-xl  p-4 text-center">
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
      ) : query.isPending && query.isFetching ? (
        <DirectoryLoading />
      ) : query.isPending ? null : query.isError && !query.data ? (
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
          <DirectoryCards state={state} org={org} onOpen={onOpen} />
          <DirectoryPagination state={state} />
        </>
      )}
    </div>
  );
}
