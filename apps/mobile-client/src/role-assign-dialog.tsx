"use client";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import {
  accessRoleLabels,
  apiRequest,
  managementRoles,
  roleRequiresDepartment,
  type AccessRole,
} from "@org/core";
import { Button, Dialog, Dropdown, ErrorMessage, cn, useToast } from "@org/ui";
export type AssignRoleEntry = {
  roleId: AccessRole;
  departmentId: string | null;
};
export type AssignTarget = {
  id: string;
  name: string;
  role: AccessRole;
  departmentId: string | null;
  hasAccount: boolean;
  roles?: AssignRoleEntry[];
  allDepartments?: string[];
};
type Department = { id: string; name: string };
function initialRoles(target: AssignTarget) {
  const held = target.roles?.length
    ? target.roles.map((entry) => entry.roleId)
    : target.role === "user"
      ? []
      : [target.role];
  return managementRoles.filter((role) => held.includes(role));
}
function initialDepartments(target: AssignTarget) {
  const chosen: Partial<Record<AccessRole, string>> = {};
  for (const entry of target.roles ?? [])
    if (entry.departmentId) chosen[entry.roleId] = entry.departmentId;
  if (!target.roles?.length && target.departmentId)
    chosen[target.role] = target.departmentId;
  return chosen;
}
// Label and control share a row on wide screens and stack on phones.
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <span
        aria-hidden={label ? undefined : true}
        className={cn(
          "shrink-0 items-center text-sm font-medium sm:h-10 sm:w-36",
          label ? "flex" : "hidden sm:flex",
        )}
      >
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
export function RoleAssignForm({
  target,
  departments,
  onSaved,
  onPendingChange,
}: {
  target: AssignTarget;
  departments: Department[];
  onSaved: () => void;
  onCancel?: () => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<
    {
      roleId: AccessRole | "";
      departmentId: string | null;
      key: number;
      isRoleOpen?: boolean;
      isDeptOpen?: boolean;
    }[]
  >(() => {
    const initial = target.roles?.length
      ? target.roles.map((r, i) => ({
          roleId: r.roleId,
          departmentId: r.departmentId,
          key: i,
        }))
      : target.role !== "user"
        ? [{ roleId: target.role, departmentId: target.departmentId, key: 0 }]
        : [{ roleId: "" as const, departmentId: null, key: 0 }];
    return initial;
  });

  useEffect(() => {
    const initial = target.roles?.length
      ? target.roles.map((r, i) => ({
          roleId: r.roleId,
          departmentId: r.departmentId,
          key: i,
        }))
      : target.role !== "user"
        ? [{ roleId: target.role, departmentId: target.departmentId, key: 0 }]
        : [{ roleId: "" as const, departmentId: null, key: 0 }];
    setEntries(initial);
  }, [target.id, target.role, target.departmentId, target.roles]);

  const incomplete = entries.some(
    (e) => !e.roleId || (roleRequiresDepartment(e.roleId) && !e.departmentId),
  );

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/admin/roles/assign-user", {
        method: "PUT",
        body: JSON.stringify({
          user_id: target.id,
          roles: entries
            .filter((e) => e.roleId && e.roleId !== "user")
            .map((e) => ({
              role_id: e.roleId,
              department_id: roleRequiresDepartment(e.roleId as AccessRole)
                ? e.departmentId
                : null,
            })),
        }),
      }),
    onSuccess: () => {
      toast({
        title: "Đã phân công vai trò",
        description: `${target.name} đã được cập nhật.`,
        variant: "success",
      });
      onSaved();
    },
    onError: (error) =>
      toast({
        title: "Không thể phân công vai trò",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      }),
  });

  useEffect(() => {
    onPendingChange?.(mutation.isPending);
  }, [mutation.isPending, onPendingChange]);

  function addEntry() {
    setEntries((prev) => [
      ...prev,
      { roleId: "", departmentId: null, key: Date.now(), isRoleOpen: true },
    ]);
  }

  function removeEntry(key: number) {
    setEntries((prev) => {
      const filtered = prev.filter((e) => e.key !== key);
      return filtered.length
        ? filtered
        : [
            {
              roleId: "",
              departmentId: null,
              key: Date.now(),
              isRoleOpen: true,
            },
          ];
    });
  }

  function updateEntry(
    key: number,
    patch: Partial<{
      roleId: AccessRole | "";
      departmentId: string | null;
      isRoleOpen: boolean;
      isDeptOpen: boolean;
    }>,
  ) {
    setEntries((prev) =>
      prev.map((e) => (e.key === key ? { ...e, ...patch } : e)),
    );
  }

  const hasDepartmentRoles = entries.some(
    (e) => e.roleId && roleRequiresDepartment(e.roleId as AccessRole),
  );

  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div key={entry.key} className="space-y-2">
            <Field label={index === 0 ? "Vai trò" : ""}>
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Dropdown.Trigger
                    aria-expanded={Boolean(entry.isRoleOpen)}
                    aria-controls={`role-${target.id}-${entry.key}`}
                    onClick={() =>
                      updateEntry(entry.key, { isRoleOpen: !entry.isRoleOpen })
                    }
                  >
                    {entry.roleId
                      ? accessRoleLabels[entry.roleId]
                      : "Chọn vai trò quản trị"}
                  </Dropdown.Trigger>
                  <div className="flex w-10 shrink-0 items-center justify-center">
                    {entries.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeEntry(entry.key)}
                      >
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                </div>

                {entry.isRoleOpen && (
                  <div
                    id={`role-${target.id}-${entry.key}`}
                    className="mt-1.5 overflow-hidden rounded-xl border border-border bg-popover p-1.5 shadow-lg"
                  >
                    {managementRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                          entry.roleId === role && "text-primary font-medium",
                        )}
                        onClick={() =>
                          updateEntry(entry.key, {
                            roleId: role,
                            departmentId: null,
                            isRoleOpen: false,
                            isDeptOpen: roleRequiresDepartment(role),
                          })
                        }
                      >
                        {accessRoleLabels[role]}
                        {entry.roleId === role && (
                          <Check size={14} className="shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            {entry.roleId &&
              roleRequiresDepartment(entry.roleId as AccessRole) && (
                <Field label="">
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <Dropdown.Trigger
                        aria-expanded={Boolean(entry.isDeptOpen)}
                        aria-controls={`department-${target.id}-${entry.key}`}
                        onClick={() =>
                          updateEntry(entry.key, {
                            isDeptOpen: !entry.isDeptOpen,
                          })
                        }
                      >
                        {departments.find((d) => d.id === entry.departmentId)
                          ?.name ?? "Chọn Ban ngành"}
                      </Dropdown.Trigger>
                      <div className="w-10 shrink-0" />
                    </div>

                    {entry.isDeptOpen && (
                      <div className="mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg">
                        {departments.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                              entry.departmentId === d.id &&
                                "text-primary font-medium",
                            )}
                            onClick={() =>
                              updateEntry(entry.key, {
                                departmentId: d.id,
                                isDeptOpen: false,
                              })
                            }
                          >
                            {d.name}
                            {entry.departmentId === d.id && (
                              <Check size={14} className="shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>
              )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit text-primary hover:bg-primary/5 hover:text-primary"
          onClick={addEntry}
        >
          + Thêm vai trò
        </Button>
      </div>

      {mutation.error && <ErrorMessage error={mutation.error} />}

      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={incomplete || mutation.isPending}
      >
        {mutation.isPending ? "Đang lưu…" : "Lưu phân công"}
      </Button>
    </form>
  );
}
export function RoleAssignDialog({
  open,
  onOpenChange,
  target,
  departments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: AssignTarget | null;
  departments: Department[];
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  if (!target) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
      title="Phân công"
      description={`Chọn vai trò quản trị cho ${target.name}.`}
      fullScreenOnMobile
    >
      <RoleAssignForm
        target={target}
        departments={departments}
        onPendingChange={setPending}
        onCancel={() => onOpenChange(false)}
        onSaved={() => {
          onSaved();
          onOpenChange(false);
        }}
      />
    </Dialog>
  );
}
