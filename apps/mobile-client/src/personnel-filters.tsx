import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { accessRoleLabels, managementRoles } from "@org/core";
import { Button, NavigationDialog } from "@org/ui";

export function PersonnelFilters({
  open,
  onOpenChange,
  roles,
  departmentIds,
  departments,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: string[];
  departmentIds: string[];
  departments: { id: string; name: string }[];
  onApply: (roles: string[], departments: string[]) => void;
}) {
  const [draftRoles, setDraftRoles] = useState(roles);
  const [draftDepartments, setDraftDepartments] = useState(departmentIds);
  useEffect(() => {
    if (open) {
      setDraftRoles(roles);
      setDraftDepartments(departmentIds);
    }
  }, [open, roles, departmentIds]);
  function toggle(items: string[], value: string) {
    return items.includes(value)
      ? items.filter((item) => item !== value)
      : [...items, value];
  }
  return (
    <NavigationDialog.Root open={open} onOpenChange={onOpenChange}>
      <NavigationDialog.Portal>
        <NavigationDialog.Overlay className="fixed inset-0 z-50 bg-black/15" />
        <NavigationDialog.Content
          data-placement="right"
          className="filter-navigation personnel-filter-navigation fixed inset-y-0 right-0 z-[60] flex h-dvh w-full max-w-md flex-col overflow-hidden border-l bg-background outline-none"
        >
          <header className="shrink-0 border-b bg-card px-3 pt-[max(.5rem,env(safe-area-inset-top))]">
            <div className="flex min-h-16 items-center gap-2">
              <NavigationDialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Đóng bộ lọc">
                  <ArrowLeft size={21} />
                </Button>
              </NavigationDialog.Close>
              <NavigationDialog.Title className="flex-1 text-lg font-semibold">
                Bộ lọc nhân sự
              </NavigationDialog.Title>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraftRoles([]);
                  setDraftDepartments([]);
                }}
              >
                Xóa bộ lọc
              </Button>
            </div>
            <NavigationDialog.Description className="sr-only">
              Chọn nhiều vai trò và Ban ngành. Hiển thị nhân sự khớp bất kỳ lựa
              chọn nào.
            </NavigationDialog.Description>
          </header>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4">
            <details open className="rounded-xl border bg-white text-slate-950">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-medium">
                Vai trò <ChevronDown size={18} />
              </summary>
              <fieldset className="border-t px-4 pb-3">
                <legend className="sr-only">Vai trò</legend>
                {[
                  ...managementRoles.map((role) => ({
                    id: role,
                    name: accessRoleLabels[role],
                  })),
                  { id: "specialist", name: "Đặc trách" },
                ].map((role) => (
                  <label
                    key={role.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={draftRoles.includes(role.id)}
                      onChange={() =>
                        setDraftRoles((items) => toggle(items, role.id))
                      }
                    />
                    {role.name}
                  </label>
                ))}
              </fieldset>
            </details>
            <details open className="rounded-xl border bg-white text-slate-950">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-medium">
                Ban ngành <ChevronDown size={18} />
              </summary>
              <fieldset className="border-t px-4 pb-3">
                <legend className="sr-only">Ban ngành</legend>
                {departments.map((department) => (
                  <label
                    key={department.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3"
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 accent-primary"
                      checked={draftDepartments.includes(department.id)}
                      onChange={() =>
                        setDraftDepartments((items) =>
                          toggle(items, department.id),
                        )
                      }
                    />
                    {department.name}
                  </label>
                ))}
              </fieldset>
            </details>
          </div>
          <footer className="shrink-0 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              className="min-h-11 w-full"
              onClick={() => {
                onApply(draftRoles, draftDepartments);
                onOpenChange(false);
              }}
            >
              Áp dụng
            </Button>
          </footer>
        </NavigationDialog.Content>
      </NavigationDialog.Portal>
    </NavigationDialog.Root>
  );
}
