import { useAuth } from "@org/core";

export function DirectoryLoading() {
  const auth = useAuth();
  if (auth?.offline)
    return (
      <p
        role="status"
        className="p-6 text-center text-sm leading-relaxed text-muted-foreground"
      >
        Thông tin này chưa được lưu trên thiết bị. Hãy kết nối Internet để tải
        lần đầu, hoặc quay lại danh sách đã xem.
      </p>
    );
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
