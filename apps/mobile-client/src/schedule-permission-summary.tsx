import type { AccessRole } from "@org/core";
import { Card } from "@org/ui";

const scheduleRules = [
  {
    role: "admin",
    label: "Admin",
    description: "Được tạo và chỉnh sửa tất cả loại lịch.",
  },
  {
    role: "secretary",
    label: "Thư ký",
    description: "Được tạo và chỉnh sửa toàn bộ Lịch phân công công tác.",
  },
  {
    role: "leader",
    department: "tiep-tan-trat-tu",
    label: "Trưởng ban tiếp tân",
    description: "Được tạo và chỉnh sửa Lịch tiếp tân.",
  },
  {
    role: "leader",
    department: "am-nhac",
    label: "Trưởng ban âm nhạc",
    description:
      "Chỉ được sửa Người hướng dẫn hát, Ban hát, Ban đàn (Ban nhạc) và Nhóm hát trong Lịch phân công công tác.",
  },
  {
    role: "leader",
    department: "giu-xe",
    label: "Trưởng ban giữ xe",
    description: "Chỉ được sửa Giữ xe trong Lịch phân công công tác.",
  },
] as const;

export function ScheduleAssignmentHint({
  role,
  departmentId,
}: {
  role: AccessRole | "";
  departmentId: string | null;
}) {
  const rule = scheduleRules.find(
    (item) =>
      item.role === role &&
      (!("department" in item) || item.department === departmentId),
  );
  if (!rule) return null;
  return (
    <p className="text-sm leading-relaxed text-muted-foreground sm:ml-40">
      Quyền lịch: {rule.description}
    </p>
  );
}

export function SchedulePermissionSummary() {
  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-semibold">Quyền lịch phân công</h2>
      <dl className="divide-y">
        {scheduleRules.map((rule) => (
          <div
            key={rule.label}
            className="space-y-1 py-3 first:pt-0 last:pb-0 sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4 sm:space-y-0"
          >
            <dt className="text-sm font-medium">{rule.label}</dt>
            <dd className="text-sm leading-relaxed text-muted-foreground">
              {rule.description}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Quyền của Trưởng ban được áp dụng theo vai trò Trưởng ban ngành và Ban
        ngành đã phân công. Thành viên có nhiều vai trò được kết hợp các quyền
        tương ứng. Phân công một người vào lịch không cấp quyền quản lý lịch.
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Nút + chỉ xuất hiện khi có quyền tạo lịch. Trưởng ban âm nhạc và Trưởng
        ban giữ xe chỉ được sửa các mục nêu trên trong lịch đã có; không được
        tạo, sao chép, công bố, hủy hoặc xóa lịch.
      </p>
    </Card>
  );
}
