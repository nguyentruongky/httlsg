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
      {!hasCriteria &&
      (state.shortcuts.pinned.length > 0 ||
        state.shortcuts.recent.length > 0) ? (
        <div className="space-y-6 py-3">
          {state.shortcuts.pinned.length > 0 && (
            <section aria-label="Đã ghim" className="space-y-3">
              <h2 className="text-base font-semibold">Đã ghim</h2>
              <DirectoryCards
                state={{ ...state, members: state.shortcuts.pinned }}
                org={org}
                onOpen={onOpen}
              />
            </section>
          )}
          {state.shortcuts.recent.length > 0 && (
            <section aria-label="Đã xem gần đây" className="space-y-3">
              <h2 className="text-base font-semibold">Đã xem gần đây</h2>
              <DirectoryCards
                state={{ ...state, members: state.shortcuts.recent }}
                org={org}
                onOpen={onOpen}
              />
            </section>
          )}
        </div>
      ) : !hasCriteria && state.shortcuts.loading ? (
        <DirectoryLoading />
      ) : !hasCriteria ? (
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
          <div className="mt-4 w-full px-4 sm:px-0">
            <Button
              type="button"
              variant="outline"
              size="touch"
              className="mx-auto flex w-full max-w-2xs rounded-xl"
              onClick={() => setOpen(true)}
            >
              <SlidersHorizontal size={18} />
              Mở bộ lọc
            </Button>
          </div>
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
