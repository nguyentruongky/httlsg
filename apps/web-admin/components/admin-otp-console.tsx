"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, RefreshCw, Search } from "lucide-react";
import {
  apiRequest,
  canOpenTeamOtpConsole,
  useAuth,
  useLeaderLiveSync,
  type AdminOtpPage,
  type AdminOtpStatus,
} from "@org/core";
import { Badge, Button, Card, ErrorMessage, Input, Select } from "@org/ui";
const statusLabels: Record<AdminOtpStatus, string> = {
  pending: "Đang chờ",
  closed: "Đã dùng / vô hiệu hóa",
  expired: "Hết hạn",
  unavailable: "Không còn hiệu lực",
};
function date(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}
export function AdminOtpConsole() {
  const auth = useAuth(),
    enabled = Boolean(auth?.user && canOpenTeamOtpConsole(auth.user));
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [q, setQ] = useState(""),
    [clock, setClock] = useState(() => Date.now()),
    [copied, setCopied] = useState<string | null>(null),
    [copyError, setCopyError] = useState(false);
  const connected = useLeaderLiveSync(enabled);
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [enabled]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useQuery({
    queryKey: ["admin-otps", auth?.user?.id, { page, q, validOnly: true }],
    queryFn: ({ signal }) =>
      apiRequest<AdminOtpPage>(
        `/api/admin/otps?${new URLSearchParams({ page: String(page), q, status: "pending", type: "all" })}`,
        { signal },
      ),
    enabled,
    gcTime: 0,
    retry: false,
    refetchInterval: connected ? false : 5000,
  });
  useEffect(() => {
    if (query.data && page > Math.max(1, Math.ceil(query.data.total / 20)))
      setPage(Math.max(1, Math.ceil(query.data.total / 20)));
  }, [query.data, page]);
  if (auth?.loading) return <p role="status">Đang tải…</p>;
  if (!enabled)
    return (
      <section>
        <h1 className="text-2xl font-semibold">Bạn không có quyền truy cập</h1>
        <p className="mt-3">Chỉ Admin có quyền xem mã OTP.</p>
      </section>
    );
  return (
    <section aria-label="Quản lý mã OTP" className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mã OTP</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Chỉ các OTP chưa sử dụng và còn hiệu lực. Xác minh đúng thành viên
            trước khi cung cấp mã. Mã email tự động đã được gửi tới hộp thư.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => {
            void query.refetch();
          }}
        >
          <RefreshCw
            size={16}
            className={query.isFetching ? "animate-spin" : ""}
          />
          Làm mới
        </Button>
      </header>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b p-4">
          <div className="relative min-w-48 flex-1">
            <Search
              size={17}
              className="absolute left-3 top-3 text-muted-foreground"
            />
            <Input
              className="pl-10"
              type="search"
              aria-label="Tìm yêu cầu OTP"
              placeholder="Tìm tên, email, số điện thoại…"
              value={search}
              maxLength={200}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {query.isPending && (
          <p className="p-6" role="status">
            Đang tải yêu cầu OTP…
          </p>
        )}
        {query.error && (
          <div className="p-5">
            <ErrorMessage error={query.error} />
          </div>
        )}
        {!query.isError && query.data && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Tất cả yêu cầu OTP</caption>
                <thead className="border-b bg-muted/40 text-muted-foreground">
                  <tr>
                    {[
                      "Thành viên",
                      "Ban ngành",
                      "Loại",
                      "Mã OTP",
                      "Trạng thái",
                      "Ngày tạo",
                      "Hết hạn",
                    ].map((label) => (
                      <th
                        key={label}
                        className="whitespace-nowrap px-4 py-3 font-medium"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {query.data.items
                    .filter(
                      (item) =>
                        item.status === "pending" &&
                        Date.parse(item.expires_at) > clock,
                    )
                    .map((item) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="min-w-52 px-4 py-4">
                          <a
                            className="font-medium text-primary underline-offset-4 hover:underline"
                            href={`/client#/members/${item.user_id}`}
                          >
                            {item.full_name}
                          </a>
                          <p className="mt-1 break-all text-xs text-muted-foreground">
                            {item.type === "EMAIL" ? item.email : item.phone}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {item.department_name ?? "Chưa phân công"}
                        </td>
                        <td className="px-4 py-4">
                          {item.type === "EMAIL"
                            ? item.delivery === "ADMIN"
                              ? "Email (Admin cấp)"
                              : "Email"
                            : "Điện thoại"}
                        </td>
                        <td className="min-w-40 px-4 py-4">
                          {item.otp_code ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-lg font-semibold tracking-widest">
                                {item.otp_code}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Sao chép mã OTP của ${item.full_name}`}
                                onClick={() => {
                                  setCopyError(false);
                                  if (!navigator.clipboard) {
                                    setCopyError(true);
                                    return;
                                  }
                                  void navigator.clipboard
                                    .writeText(item.otp_code!)
                                    .then(() => setCopied(item.id))
                                    .catch(() => setCopyError(true));
                                }}
                              >
                                <Copy size={15} />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {item.code_state === "email"
                                ? "Đã gửi qua email"
                                : "Không hiển thị mã"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            className={
                              item.status === "pending"
                                ? "border-primary/20 text-primary"
                                : ""
                            }
                          >
                            {statusLabels[item.status]}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {date(item.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          {date(item.expires_at)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!query.data.items.some(
              (item) =>
                item.status === "pending" &&
                Date.parse(item.expires_at) > clock,
            ) && (
              <p className="p-8 text-center text-muted-foreground">
                Không có yêu cầu OTP phù hợp.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm">
              <span>{query.data.total} yêu cầu</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  disabled={page === 1 || query.isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Trước
                </Button>
                <span>
                  Trang {page} / {Math.max(1, Math.ceil(query.data.total / 20))}
                </span>
                <Button
                  variant="outline"
                  disabled={page * 20 >= query.data.total || query.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Tiếp
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
      {copied && (
        <p role="status" className="text-sm text-primary">
          Đã sao chép mã OTP.
        </p>
      )}
      {copyError && (
        <p role="alert" className="text-sm text-destructive">
          Không thể sao chép mã. Vui lòng thử lại.
        </p>
      )}
    </section>
  );
}
