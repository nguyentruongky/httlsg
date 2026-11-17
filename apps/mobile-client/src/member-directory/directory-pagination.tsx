import { Button } from "@org/ui";
import { LoaderCircle } from "lucide-react";
import { ClientError } from "../locale";
import type { MemberDirectoryState } from "./use-member-directory";
export function DirectoryPagination({
  state,
}: {
  state: Pick<
    MemberDirectoryState,
    "query" | "members" | "total" | "setSentinel"
  >;
}) {
  const { query, members, total, setSentinel } = state;
  return (
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
      ) : null}
    </div>
  );
}
