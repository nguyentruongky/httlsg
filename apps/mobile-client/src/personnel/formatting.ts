import {
  DEPARTMENT_DISPLAY_ORDER,
  prioritizePersonnelAssignments,
} from "@org/core";
import { formatCsv } from "../csv-export";
import type { AssignedMember } from "./types";

const personnelCollator = new Intl.Collator("vi", {
  sensitivity: "base",
  numeric: true,
});
export function sortPersonnelDepartments(
  departments: { id: string; name: string }[],
) {
  return [...departments].sort((a, b) => {
    const aIndex = DEPARTMENT_DISPLAY_ORDER.indexOf(
      a.name as (typeof DEPARTMENT_DISPLAY_ORDER)[number],
    );
    const bIndex = DEPARTMENT_DISPLAY_ORDER.indexOf(
      b.name as (typeof DEPARTMENT_DISPLAY_ORDER)[number],
    );
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return (
      personnelCollator.compare(a.name, b.name) || a.name.localeCompare(b.name)
    );
  });
}
export function personnelCsv(items: AssignedMember[]) {
  const rows = items.map((member) => [
    member.name,
    member.phone ?? "",
    member.email ?? "",
    prioritizePersonnelAssignments(
      member.personnelAssignments ??
        member.personnelRoles.map((role) => ({ role, departmentName: null })),
    )
      .map((item) => [item.role, item.departmentName].filter(Boolean).join(" "))
      .join("; "),
    member.departmentNames.join(", "),
  ]);
  return formatCsv([
    ["Họ tên", "Số điện thoại", "Email", "Công tác", "Ban ngành"],
    ...rows,
  ]);
}
