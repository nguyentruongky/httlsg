export type DepartmentMember = {
  id: string;
  version: number;
  accountStatus?: "active" | "suspended";
  name: string;
  phone: string | null;
  email: string | null;
  position: string;
  isMember: boolean;
  departmentIds?: string[];
  departmentNames?: string[];
  isBoardMember?: boolean;
  churchStatus?: string | null;
};

export type DepartmentBulkAction =
  | "add"
  | "remove"
  | { action: "move"; targetDepartmentId: string }
  | { action: "status"; status: string; destination?: string };
export type DepartmentBulkMutation = {
  mutate: (input: DepartmentBulkAction) => void;
  error: Error | null;
  isPending: boolean;
};
