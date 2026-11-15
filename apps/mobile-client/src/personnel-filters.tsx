import { useMemo } from "react";
import {
  accessRoleLabels,
  managementRoles,
  ChurchStatusSchema,
} from "@org/core";
import {
  MemberFilters,
  emptyMemberFilters,
  type MemberFiltersValue,
} from "./member-filters";

const roleOptions = [
  ...managementRoles
    .filter((id) => id !== "admin")
    .map((id) => ({ id, name: accessRoleLabels[id] })),
  { id: "specialist", name: "Đặc trách" },
];

export function PersonnelFilters({
  open,
  onOpenChange,
  roles,
  departmentIds,
  churchStatuses,
  departments,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: string[];
  departmentIds: string[];
  churchStatuses?: string[];
  departments: { id: string; name: string }[];
  onApply: (roles: string[], departments: string[], statuses: string[]) => void;
}) {
  const value = useMemo<MemberFiltersValue>(
    () => ({
      ...emptyMemberFilters,
      roleIds: roles,
      departmentIds,
      churchStatuses: (churchStatuses ?? []).flatMap((status) => {
        const parsed = ChurchStatusSchema.safeParse(status);
        return parsed.success ? [parsed.data] : [];
      }),
    }),
    [roles, departmentIds, churchStatuses],
  );
  return (
    <MemberFilters
      open={open}
      onOpenChange={onOpenChange}
      value={value}
      roleOptions={roleOptions}
      departmentOptions={departments}
      sections={["role", "status", "department"]}
      placement="responsive"
      onApply={(next) =>
        onApply(
          next.roleIds ?? [],
          next.departmentIds,
          next.churchStatuses ?? [],
        )
      }
    />
  );
}
