"use client";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  accessRoleLabels,
  apiRequest,
  type AccessRole,
} from "@org/core";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorMessage,
  Input,
  cn,
} from "@org/ui";
import { RoleAssignForm } from "./role-assign-dialog";
type MemberRole = { roleId: AccessRole; departmentId: string | null };
type SearchMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: AccessRole;
  hasAccount: boolean;
  departmentId: string | null;
  roles: MemberRole[];
  allDepartments: string[];
};
type SearchResult = {
  items: SearchMember[];
  total: number;
  page: number;
  pageSize: number;
  nextPage?: number;
};
type AssignedData = {
  departments: { id: string; name: string }[];
};
const contactLine = (member: { email: string | null; phone: string | null }) =>
  [member.email, member.phone].filter(Boolean).join(" · ") ||
  "Chưa có thông tin liên hệ";
export function RoleAssign() {
  const client = useQueryClient();
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<SearchMember | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);
  const assigned = useQuery({
    queryKey: ["admin-assigned-roles"],
    queryFn: () => apiRequest<AssignedData>("/api/admin/roles/assigned"),
  });
  const search = useQuery({
    queryKey: ["admin-member-search", debounced],
    queryFn: () =>
      apiRequest<SearchResult>(
        `/api/admin/members/search?q=${encodeURIComponent(debounced)}&pageSize=50`,
      ),
    enabled: debounced.length > 0,
  });
  // Keep the detail panel in sync with the freshest role/Ban ngành for the
  // selected member after a save without dropping the selection.
  useEffect(() => {
    if (!selected) return;
    const fresh = search.data?.items.find((item) => item.id === selected.id);
    if (
      fresh &&
      (fresh.role !== selected.role ||
        fresh.departmentId !== selected.departmentId ||
        fresh.hasAccount !== selected.hasAccount ||
        JSON.stringify(fresh.roles) !== JSON.stringify(selected.roles))
    )
      setSelected(fresh);
  }, [search.data, selected]);
  const departments = assigned.data?.departments ?? [];
  const items = search.data?.items ?? [];
  const open = Boolean(selected);
  const selectedDepartments = selected?.allDepartments ?? [];

  return (
    <div className="flex h-[calc(100dvh-11rem)] flex-col space-y-6 lg:h-[calc(100dvh-14rem)]">
      <div className="shrink-0">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
          Roles &amp; permissions
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Phân công vai trò
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tìm thành viên theo tên, số điện thoại hoặc email rồi phân công vai trò
          quản trị.
        </p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Master: search and results. Independent scrolling. */}
        <section
          aria-label="Danh sách thành viên"
          className={cn(
            "flex min-h-0 flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:col-span-5 lg:translate-x-0 lg:transition-none",
            open ? "-translate-x-1/4" : "translate-x-0",
          )}
        >
          <Card className="flex h-full flex-col overflow-hidden p-0">
            <div className="shrink-0 border-b p-5 sm:p-6">
              <label className="block text-sm">
                Tìm thành viên
                <Input
                  className="mt-2 w-full"
                  type="search"
                  placeholder="Nhập tên, số điện thoại hoặc email"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {assigned.error && <ErrorMessage error={assigned.error} />}
              {!debounced ? (
                <EmptyState
                  title="Bắt đầu tìm kiếm"
                  description="Nhập tên, số điện thoại hoặc email để tìm thành viên cần phân công."
                />
              ) : search.isPending ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Đang tìm kiếm…
                </p>
              ) : search.error ? (
                <ErrorMessage error={search.error} />
              ) : !items.length ? (
                <EmptyState
                  title="Không tìm thấy thành viên"
                  description="Thử lại với từ khoá khác."
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    {search.data!.total} kết quả
                  </p>
                  <div className="divide-y overflow-hidden rounded-xl border">
                    {items.map((member) => {
                      const active = selected?.id === member.id;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelected(member)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 p-4 text-left transition-colors",
                            active ? "bg-accent" : "hover:bg-muted/60",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {member.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {contactLine(member)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            {member.role !== "user" && (
                              <Badge className="bg-background border-primary/20 text-primary">
                                {accessRoleLabels[member.role]}
                              </Badge>
                            )}
                            <ChevronRight
                              size={16}
                              aria-hidden
                              className="text-muted-foreground"
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Detail: pushed in over the list on mobile, always visible beside it
            from the lg breakpoint up. Independent scrolling. */}
        <section
          aria-label="Chi tiết phân công"
          className={cn(
            "fixed inset-0 z-40 bg-background transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:static lg:z-auto lg:col-span-7 lg:col-start-6 lg:bg-transparent lg:transition-none",
            open
              ? "translate-x-0"
              : "pointer-events-none translate-x-full lg:pointer-events-auto lg:translate-x-0",
          )}
        >
          <Card className="flex h-full flex-col overflow-hidden p-0">
            <div className="flex shrink-0 items-center justify-between border-b p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Quay lại danh sách"
                  onClick={() => setSelected(null)}
                >
                  <ChevronLeft size={20} />
                </Button>
                <h2 className="text-lg font-semibold">Phân công</h2>
              </div>
              {selected && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden lg:inline-flex"
                  aria-label="Bỏ chọn thành viên"
                  onClick={() => setSelected(null)}
                >
                  <X size={18} />
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {!selected ? (
                <EmptyState
                  title="Chọn thành viên để phân quyền"
                  description="Chọn một thành viên ở danh sách bên trái để xem chi tiết và phân công vai trò."
                />
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-primary">
                      Thành viên
                    </p>
                    <p className="mt-1 text-lg font-semibold">
                      {selected.name}
                    </p>
                  </div>

                  <dl className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Ban ngành
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        {selectedDepartments.join(", ") || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Trạng thái
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        {selected.hasAccount
                          ? "Đã có tài khoản"
                          : "Chưa có tài khoản"}
                      </dd>
                    </div>
                  </dl>

                  <RoleAssignForm
                    target={selected}
                    departments={departments}
                    onSaved={() => {
                      client.invalidateQueries({
                        queryKey: ["admin-assigned-roles"],
                      });
                      client.invalidateQueries({
                        queryKey: ["admin-member-search"],
                      });
                    }}
                  />
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
