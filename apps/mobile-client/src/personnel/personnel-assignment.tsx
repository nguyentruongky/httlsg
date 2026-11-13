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
  return (
    <div className="space-y-1.5 wrap-break-word">
      {assignments.map((item, index) => (
        <p
          key={`${item.role}-${item.departmentName}-${index}`}
          className="text-sm font-normal leading-relaxed"
        >
          {item.role}
          {item.departmentName
            ? ` ${item.departmentName.replace(/^ban\s/i, "")}`
            : ""}
        </p>
      ))}
      {otherDepartments.length > 0 && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {otherDepartments.join(", ")}
        </p>
      )}
      {!assignments.length && !otherDepartments.length && (
        <p className="text-sm text-muted-foreground">Chưa gán ban ngành</p>
      )}
    </div>
  );
}
