import type { AccessRole } from "@org/core";
export type AssignRoleEntry = {
  roleId: AccessRole;
  departmentId: string | null;
};

export type AssignedMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AccessRole;
  hasAccount: boolean;
  departmentId: string | null;
  roles: AssignRoleEntry[];
  allDepartments: string[];
  departmentIds: string[];
  departmentNames: string[];
  departmental: boolean;
  personnelRoles: string[];
  personnelAssignments?: { role: string; departmentName: string | null }[];
};
export type AssignedData = {
  total?: number;
  nextPage?: number;
  items: AssignedMember[];
  departments: { id: string; name: string }[];
};
export type PersonnelQueryParams = {
  churchStatuses?: string;
  q: string;
  roles: string;
  departments: string;
};
