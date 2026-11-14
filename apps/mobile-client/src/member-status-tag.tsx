import { ChurchStatusSchema, type DirectoryQuery } from "@org/core";
import { Badge } from "@org/ui";

const statusColors: Record<string, string> = {
  "Trung tín": "border-emerald-700 bg-emerald-700 text-white",
  "Không trung tín": "border-red-600 bg-red-600 text-white",
  "Không đi nhóm": "border-black bg-black text-white",
  "Chuyển hội":
    "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "Đi nước ngoài":
    "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

export function MemberStatusTag({
  status,
  onFilter,
}: {
  status?: string | null;
  onFilter?: (
    status: NonNullable<DirectoryQuery["churchStatuses"]>[number],
  ) => void;
}) {
  const parsed = ChurchStatusSchema.safeParse(status);
  if (onFilter && parsed.success) {
    return (
      <button
        type="button"
        aria-label={`Lọc theo tình trạng: ${status}`}
        className="inline-flex min-h-6 items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onFilter(parsed.data);
        }}
      >
        <Badge className={statusColors[parsed.data]}>{status}</Badge>
      </button>
    );
  }
  return (
    <Badge
      className={
        statusColors[status ?? ""] ??
        "border-border bg-muted text-muted-foreground"
      }
    >
      {status || "Chưa cập nhật"}
    </Badge>
  );
}
