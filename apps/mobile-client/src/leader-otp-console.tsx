"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, useAuth, canOpenTeamOtpConsole } from "@org/core";
import { Button, Card, ErrorMessage } from "@org/ui";
import { navigateClient } from "./client-router";
type Otp = {
  id: string;
  full_name: string;
  phone: string;
  department_name: string;
  otp_code: string;
  expires_at: string | null;
};
export function LeaderOtpConsole() {
  const auth = useAuth(),
    [page, setPage] = useState(1),
    [copied, setCopied] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["leader-otps", auth?.user?.id, page],
    queryFn: ({ signal }) =>
      apiRequest<{ items: Otp[]; total: number; page: number }>(
        `/api/leader/otps?page=${page}`,
        { signal },
      ),
    enabled: Boolean(auth?.user && canOpenTeamOtpConsole(auth.user)),
    gcTime: 0,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
  if (auth?.loading)
    return (
      <p role="status" className="p-8">
        Đang tải…
      </p>
    );
  if (!auth?.user || !canOpenTeamOtpConsole(auth.user))
    return <p className="p-8">Bạn không có quyền xem mã OTP.</p>;
  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 py-8 sm:p-10">
      <a
        href="/client/profile"
        onClick={(e) => {
          e.preventDefault();
          navigateClient("/client/profile");
        }}
        className="mb-6 inline-block min-h-11 text-primary underline"
      >
        Về hồ sơ cá nhân
      </a>
      <h1 className="text-2xl font-semibold">Mã OTP của Ban ngành</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
        Xác nhận đúng thành viên trước khi đọc mã OTP. Chỉ các yêu cầu còn hiệu
        lực của Ban ngành bạn phụ trách được hiển thị.
      </p>
      <div className="mt-6 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {query.data?.total ?? 0} yêu cầu đang chờ
        </p>
        <Button
          variant="outline"
          onClick={() => {
            void query.refetch();
          }}
          disabled={query.isFetching}
        >
          Làm mới
        </Button>
      </div>
      {query.error && <ErrorMessage error={query.error} />}
      {query.isPending && (
        <p role="status" className="py-8">
          Đang tải…
        </p>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {query.data?.items.map((item) => (
          <Card key={item.id} className="p-5">
            <h2 className="text-lg font-semibold">{item.full_name}</h2>
            <p className="mt-1 text-base">{item.phone}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {item.department_name}
            </p>
            <p
              aria-label={`Mã OTP của ${item.full_name}`}
              className="my-5 font-mono text-3xl font-semibold tracking-[.28em] text-primary"
            >
              {item.otp_code}
            </p>
            <p className="text-sm text-muted-foreground">
              Hết hạn:{" "}
              {item.expires_at
                ? new Date(item.expires_at).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    timeZone: "Asia/Ho_Chi_Minh",
                  })
                : "Không hết hạn"}
            </p>
            <Button
              variant="outline"
              className="mt-4 min-h-11 w-full"
              onClick={() => {
                void navigator.clipboard
                  .writeText(item.otp_code)
                  .then(() => setCopied(item.id))
                  .catch(() => setCopied(null));
              }}
            >
              {copied === item.id ? "Đã sao chép" : "Sao chép mã"}
            </Button>
          </Card>
        ))}
      </div>
      {query.data && !query.data.items.length && (
        <Card className="mt-4 p-8 text-center text-muted-foreground">
          Chưa có yêu cầu OTP đang chờ.
        </Card>
      )}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          disabled={page === 1 || query.isFetching}
          onClick={() => setPage((p) => p - 1)}
        >
          Trước
        </Button>
        <span className="text-sm">Trang {page}</span>
        <Button
          variant="outline"
          disabled={
            !query.data || page * 20 >= query.data.total || query.isFetching
          }
          onClick={() => setPage((p) => p + 1)}
        >
          Tiếp
        </Button>
      </div>
    </main>
  );
}
