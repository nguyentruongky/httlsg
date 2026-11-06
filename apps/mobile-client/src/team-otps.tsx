import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { ProfileBackButton } from "./profile-back-button";
import { useAutoLoadMore } from "./use-auto-load-more";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest, useAuth, canOpenTeamOtpConsole } from "@org/core";
import { Button, Card } from "@org/ui";
import { ClientError } from "./locale";
type Otp = {
  id: string;
  full_name: string;
  phone: string;
  department_name: string;
  otp_code: string;
  created_at: string;
  expires_at: string;
  status: "pending";
  purpose: string;
};
export function TeamOtps() {
  const auth = useAuth();
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const enabled = Boolean(auth?.user && canOpenTeamOtpConsole(auth.user));
  const query = useInfiniteQuery({
    queryKey: ["team-otps", auth?.user?.id],
    initialPageParam: 1,
    queryFn: ({ signal, pageParam }) =>
      apiRequest<{ items: Otp[]; total: number; page: number }>(
        `/api/leader/otps?page=${pageParam}`,
        { signal },
      ),
    getNextPageParam: (lastPage, pages) =>
      pages.reduce((count, page) => count + page.items.length, 0) <
        lastPage.total && lastPage.items.length
        ? lastPage.page + 1
        : undefined,
    enabled,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  useAutoLoadMore({
    target: sentinel,
    enabled:
      enabled && Boolean(query.hasNextPage) && !query.isFetchNextPageError,
    isFetching: query.isFetching,
    pageCount: query.data?.pages.length ?? 0,
    loadMore: query.fetchNextPage,
  });
  const items = [
    ...new Map(
      query.data?.pages
        .flatMap((page) => page.items)
        .map((item) => [item.id, item]),
    ).values(),
  ];
  if (!enabled) return <LeaderDenied otp />;
  return (
    <section aria-label="Mã OTP của Ban ngành">
      <header className="sticky top-0 z-20 -mx-5 bg-background/95 px-5 pb-3 pt-[max(.25rem,env(safe-area-inset-top))] backdrop-blur-md">
        <ProfileBackButton />
        <h1 className="mt-2 text-2xl font-semibold">Mã OTP của Ban ngành</h1>
      </header>
      <p className="mt-2 text-sm text-muted-foreground">
        Xác nhận đúng thành viên trước khi chia sẻ mã OTP.
      </p>
      {query.isPending && (
        <p role="status" className="py-8">
          Đang tải yêu cầu…
        </p>
      )}
      {query.isLoadingError && (
        <div className="my-4">
          <ClientError error={query.error} />
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => {
              void query.refetch();
            }}
          >
            Thử lại
          </Button>
        </div>
      )}
      <ul className="mt-4 space-y-4">
        {items.map((item) => (
          <li key={item.id}>
            <Card className="p-5">
              <h2 className="text-lg font-semibold">{item.full_name}</h2>
              <p className="mt-1 text-sm">{item.phone}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.department_name} · Đang chờ xác thực
              </p>
              <p
                aria-label={`Mã OTP của ${item.full_name}`}
                className="my-4 font-mono text-3xl font-semibold tracking-[.25em] text-primary"
              >
                {item.otp_code}
              </p>
              <p className="text-sm">{item.purpose}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Ngày yêu cầu: {formatDate(item.created_at)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ngày hết hạn: {formatDate(item.expires_at)}
              </p>
            </Card>
          </li>
        ))}
      </ul>
      {query.data && !items.length && (
        <Card className="mt-6 p-8 text-center text-sm text-muted-foreground">
          Không có yêu cầu OTP đang chờ.
        </Card>
      )}
      <div ref={setSentinel} className="h-px" aria-hidden="true" />
      {query.isFetchingNextPage && (
        <p
          role="status"
          className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
        >
          <LoaderCircle size={18} className="animate-spin" /> Đang tải thêm…
        </p>
      )}
      {query.isFetchNextPageError && (
        <div className="py-5">
          <ClientError error={query.error} />
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => {
              void query.fetchNextPage();
            }}
          >
            Thử tải thêm
          </Button>
        </div>
      )}
    </section>
  );
}
function formatDate(date: string) {
  return new Date(date).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}
export function LeaderDenied({
  board = false,
  otp = false,
}: {
  board?: boolean;
  otp?: boolean;
}) {
  return (
    <div className="space-y-4 py-8">
      <ProfileBackButton />
      <h1 className="text-xl font-semibold">Bạn không có quyền truy cập</h1>
      <p className="text-sm text-muted-foreground">
        {otp
          ? "Chỉ Admin có quyền xem mã OTP."
          : board
            ? "Tính năng này dành cho Ban điều hành được phân công."
            : "Tính năng này dành cho người quản lý Ban ngành được phân công."}
      </p>
    </div>
  );
}
