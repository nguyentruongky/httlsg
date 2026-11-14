import { prioritizePersonnelAssignments } from "@org/core";
import type { AssignedMember } from "./types";

export function PersonnelAssignment({ member }: { member: AssignedMember }) {
  const assignments = prioritizePersonnelAssignments(
    member.personnelAssignments ??
      member.personnelRoles.map((role) => ({ role, departmentName: null })),
  );
  const assignedDepartments = new Set(
    assignments.map((item) => item.departmentName).filter(Boolean),
  );
  const otherDepartments = member.departmentNames.filter(
    (name) => !assignedDepartments.has(name),
  );
  const labels = [
    ...assignments.map((item) =>
      item.departmentName
        ? `${item.role} ${item.departmentName.replace(/^ban\s/i, "")}`
        : item.role,
    ),
    ...otherDepartments,
  ];
  return <span>{labels.join(" · ") || "Chưa gán ban ngành"}</span>;
}
