"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  Download,
  Users,
  Mail,
  Phone,
} from "lucide-react";
import {
  type Member,
  AccessRoleSchema,
  compareNamesByLastWord,
  accessRoleLabels,
  type AccessRole,
  apiRequest,
  useAuth,
  workspaceKey,
} from "@org/core";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  DropdownMenu,
  Dialog,
  MenuItem,
  MenuCheckbox,
  Input,
  EmptyState,
  ErrorMessage,
  cn,
} from "@org/ui";
import { useAutoLoadMore } from "../../mobile-client/src/use-auto-load-more";
import { MergeProfilesDialog } from "./merge-profiles-dialog";
import { AccountCredentials } from "./account-credentials";
import { MemberRoleAssignment } from "./member-role-assignment";
const mobileColumnLabels: Record<string, string> = {
  name: "Thành viên",
  contact: "Liên hệ",
  department: "Ban ngành/Ban hát lễ",
  actions: "Thao tác",
};
export function MemberTable({
  org,
  members,
}: {
  org: string;
  members: Member[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]),
    [filters, setFilters] = useState<ColumnFiltersState>([]),
    [search, setSearch] = useState(""),
    [visibility, setVisibility] = useState<VisibilityState>({
      select: false,
      email: false,
      role: false,
      status: false,
      joinedAt: false,
      actions: false,
    }),
    [selection, setSelection] = useState<RowSelectionState>({});
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const [credentials, setCredentials] = useState<Member | null>(null),
    [deleting, setDeleting] = useState<Member | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]),
    [merging, setMerging] = useState<string[] | null>(null);
  const client = useQueryClient();
  const actor = useAuth()?.user;
  const actorId = actor?.id;
  const mergeIds = selectionOrder.filter(
    (id) => selection[id] && members.some((m) => m.id === id),
  );
  const mutation = useMutation({
    mutationFn: ({
      ids,
      patch,
    }: {
      ids: string[];
      patch: { accessRole?: AccessRole; status?: "active" | "suspended" };
    }) =>
      apiRequest("/api/admin/users/access", {
        method: "POST",
        body: JSON.stringify({ ids, ...patch }),
      }),
    onSuccess: () => {
      setSelection({});
      client.invalidateQueries({ queryKey: workspaceKey(org) });
    },
  });
  const deletion = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/members/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleting(null);
      void client.invalidateQueries({ queryKey: workspaceKey(org) });
    },
  });
  const columns = useMemo<ColumnDef<Member>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            aria-label="Chọn danh sách đang hiển thị"
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select ${row.original.user.name}`}
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(v) => row.toggleSelected(v === true)}
          />
        ),
      },
      {
        id: "name",
        sortingFn: (a, b) =>
          compareNamesByLastWord(a.original.user.name, b.original.user.name) ||
          a.original.id.localeCompare(b.original.id),
        accessorFn: (m) => m.user.name,
        header: "Thành viên",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              name={row.original.user.name}
              variant="member"
              colorIndex={row.index}
            />
            <div className="min-w-0 flex-1 whitespace-normal wrap-break-word">
              <p className="font-medium">
                <a
                  href={`/client/members/${row.original.id}`}
                  className="underline-offset-4 hover:underline"
                >
                  {row.original.user.name}
                </a>
                {row.original.userId === actorId && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (you)
                  </span>
                )}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "contact",
        header: "Liên hệ",
        enableHiding: false,
        cell: ({ row }) => {
          const { phone, user } = row.original;
          return (
            <div className="min-w-0 space-y-1">
              {phone && (
                <a
                  href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
                  className="flex min-h-11 min-w-0 items-center gap-2 text-sm text-muted-foreground"
                >
                  <span>{phone}</span>
                </a>
              )}
              {user.email && (
                <a
                  href={`mailto:${user.email}`}
                  className="flex min-h-11 min-w-0 items-center gap-2 text-sm text-muted-foreground break-all"
                >
                  <Mail size={15} className="shrink-0" />
                  <span className="break-all">{user.email}</span>
                </a>
              )}
              {!phone && !user.email && (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          );
        },
      },
      {
        id: "department",
        header: "Ban ngành/Ban hát lễ",
        enableHiding: false,
        accessorFn: (member) =>
          member.departments?.map((item) => item.name).join(", ") ?? "",
        cell: ({ row }) => {
          const action = row
            .getAllCells()
            .find((cell) => cell.column.id === "actions");
          return (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1 space-y-1 whitespace-normal wrap-break-word">
                {row.original.departments?.length ? (
                  row.original.departments.map((item) => (
                    <p key={item.id}>{item.name}</p>
                  ))
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </div>
              {action &&
                flexRender(action.column.columnDef.cell, action.getContext())}
            </div>
          );
        },
      },
      { id: "email", accessorFn: (m) => m.user.email, header: "Email" },
      {
        id: "role",
        accessorFn: (m) => m.accessRole ?? "user",
        header: "Role",
        cell: ({ row }) => (
          <Badge
            className={
              row.original.role === "admin"
                ? "border-primary/15 bg-accent text-primary"
                : ""
            }
          >
            {accessRoleLabels[row.original.accessRole ?? "user"]}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: (row, id, value: string[]) =>
          !value.length || value.includes(row.getValue(id)),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 capitalize">
            <span
              className={cn(
                "size-1.5 rounded-full",
                row.original.status === "active"
                  ? "bg-emerald-500"
                  : row.original.status === "invited"
                    ? "bg-amber-500"
                    : "bg-muted-foreground",
              )}
            />
            {row.original.status}
          </span>
        ),
      },
      {
        accessorKey: "joinedAt",
        header: "Date added",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.joinedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DropdownMenu
            animateOnMobile
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${row.original.user.name}`}
                disabled={row.original.userId === actorId || mutation.isPending}
              >
                <MoreHorizontal size={17} />
              </Button>
            }
          >
            <MenuItem onSelect={() => setCredentials(row.original)}>
              Thông tin đăng nhập
            </MenuItem>
            <MenuItem onSelect={() => setAssigning(row.original.id)}>
              Phân quyền
            </MenuItem>
            <MenuItem
              className={
                row.original.status === "suspended" ? "" : "text-destructive"
              }
              onSelect={() =>
                mutation.mutate({
                  ids: [row.original.id],
                  patch: {
                    status:
                      row.original.status === "suspended"
                        ? "active"
                        : "suspended",
                  },
                })
              }
            >
              {row.original.status === "suspended"
                ? "Activate member"
                : "Suspend member"}
            </MenuItem>
            <MenuItem
              className="text-destructive"
              onSelect={() => {
                deletion.reset();
                setDeleting(row.original);
              }}
            >
              Xóa thành viên
            </MenuItem>
          </DropdownMenu>
        ),
      },
    ],
    [mutation.isPending, actorId],
  );
  const table = useReactTable({
    data: members,
    columns,
    state: {
      sorting,
      columnFilters: filters,
      globalFilter: search,
      columnVisibility: visibility,
      rowSelection: selection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    onGlobalFilterChange: setSearch,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(selection) : updater;
      setSelection(next);
      setSelectionOrder((previous) => [
        ...previous.filter((id) => next[id]),
        ...Object.keys(next).filter((id) => next[id] && !previous.includes(id)),
      ]);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (m) => m.id,
    enableRowSelection: (row) =>
      actor?.role === "admin" || row.original.userId !== actorId,
    initialState: { pagination: { pageSize: 20 } },
    globalFilterFn: (row, _column, value) =>
      `${row.original.user.name} ${row.original.user.email ?? ""} ${row.original.phone ?? ""}`
        .toLowerCase()
        .includes(String(value).toLowerCase()),
  });
  const shownCount = table.getRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const loadMore = useCallback(async () => {
    table.setPageSize((size) => size + 20);
  }, [table]);
  useAutoLoadMore({
    target: sentinel,
    enabled: shownCount < totalCount,
    isFetching: false,
    pageCount: shownCount,
    loadMore,
  });
  useEffect(() => {
    table.setPageSize(20);
  }, [filters, search, sorting, table]);
  const selected = table
    .getFilteredSelectedRowModel()
    .rows.filter((r) => r.original.userId !== actorId)
    .map((r) => r.original.id);
  const status = (table.getColumn("status")?.getFilterValue() ??
    []) as string[];
  function exportCsv() {
    const rows = table
      .getFilteredRowModel()
      .rows.map((r) => [
        r.original.user.name,
        r.original.user.email ?? "",
        r.original.phone ?? "",
        r.original.departments?.map((item) => item.name).join(", ") ?? "",
        accessRoleLabels[r.original.accessRole ?? "user"],
        r.original.status,
      ]);
    const quote = (s: string) =>
      '"' + s.replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
    const csv = [
      ["Name", "Email", "Phone", "Ban ngành/Ban hát lễ", "Role", "Status"],
      ...rows,
    ]
      .map((row) => row.map(quote).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "members.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <Card className="overflow-hidden border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-xs">
        <div className="flex items-center gap-2 p-4">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="absolute left-3 top-3 text-muted-foreground"
            />
            <Input
              aria-label="Search members"
              placeholder="Tìm theo tên, email hoặc số điện thoại…"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <DropdownMenu
            label="Bộ lọc"
            trigger={
              <Button
                variant="outline"
                className="shrink-0"
                aria-label="Bộ lọc vai trò và trạng thái"
              >
                <SlidersHorizontal size={16} />
                <span className="hidden sm:inline">Bộ lọc</span>
                {filters.length > 0 && <Badge>{filters.length}</Badge>}
              </Button>
            }
          >
            <p className="px-2 pt-2 pb-1 text-xs text-muted-foreground">
              Vai trò
            </p>
            {AccessRoleSchema.options.map((role) => (
              <MenuCheckbox
                key={role}
                checked={table.getColumn("role")?.getFilterValue() === role}
                onCheckedChange={(checked) =>
                  table
                    .getColumn("role")
                    ?.setFilterValue(checked === true ? role : undefined)
                }
              >
                {accessRoleLabels[role]}
              </MenuCheckbox>
            ))}
            <div className="my-2 border-t" />
            <p className="px-2 pb-1 text-xs text-muted-foreground">
              Trạng thái
            </p>
            {[
              { value: "active", label: "Đang hoạt động" },
              { value: "invited", label: "Chờ tham gia" },
              { value: "suspended", label: "Đã khóa" },
            ].map((item) => (
              <MenuCheckbox
                key={item.value}
                checked={status.includes(item.value)}
                onCheckedChange={(checked) =>
                  table
                    .getColumn("status")
                    ?.setFilterValue(
                      checked === true
                        ? [...status, item.value]
                        : status.filter((value) => value !== item.value),
                    )
                }
              >
                {item.label}
              </MenuCheckbox>
            ))}
            {(filters.length > 0 || search) && (
              <MenuItem
                onSelect={() => {
                  setFilters([]);
                  setSearch("");
                }}
              >
                Xóa tìm kiếm và bộ lọc
              </MenuItem>
            )}
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download size={14} />
            Tải danh sách
          </Button>
        </div>
        {(selected.length > 0 ||
          (actor?.role === "admin" && mergeIds.length > 0)) && (
          <div className="mx-4 mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-accent p-3">
            <span className="mr-auto text-sm">{selected.length} selected</span>
            {actor?.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                disabled={
                  mergeIds.length < 2 ||
                  mergeIds.length > 20 ||
                  mutation.isPending
                }
                onClick={() => setMerging([...mergeIds])}
              >
                Hợp nhất {mergeIds.length} hồ sơ
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={mutation.isPending || !selected.length}
              onClick={() =>
                mutation.mutate({ ids: selected, patch: { status: "active" } })
              }
            >
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={mutation.isPending || !selected.length}
              onClick={() =>
                mutation.mutate({
                  ids: selected,
                  patch: { status: "suspended" },
                })
              }
            >
              Suspend
            </Button>
          </div>
        )}
        {mutation.isError && (
          <div className="px-4 pb-3">
            <ErrorMessage error={mutation.error} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 border-y px-4 md:hidden">
          {(["name", "department"] as const).map((id) => (
            <button
              key={id}
              type="button"
              className="flex min-h-11 items-center gap-2 text-left text-xs text-muted-foreground"
              onClick={table.getColumn(id)?.getToggleSortingHandler()}
            >
              {mobileColumnLabels[id]}
              {table.getColumn(id)?.getIsSorted() === "asc" ? (
                <ArrowUp size={12} />
              ) : table.getColumn(id)?.getIsSorted() === "desc" ? (
                <ArrowDown size={12} />
              ) : (
                <ArrowUpDown size={12} />
              )}
            </button>
          ))}
        </div>
        <ul
          className="space-y-3 py-3 md:hidden"
          aria-label="Danh sách thành viên"
        >
          {table.getRowModel().rows.map((row) => {
            const member = row.original;
            const action = row
              .getAllCells()
              .find((cell) => cell.column.id === "actions");
            return (
              <li key={row.id}>
                <Card
                  className={cn(
                    "min-w-0 p-4",
                    row.getIsSelected() && "border-primary/40 bg-accent/20",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={member.user.name}
                      variant="member"
                      colorIndex={row.index}
                    />
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base leading-snug font-semibold wrap-break-word">
                        <a href={`/client/members/${member.id}`}>
                          {member.user.name}
                        </a>
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground wrap-break-word">
                        {member.departments
                          ?.map((item) => item.name)
                          .join(", ") || "Chưa tham gia ban ngành"}
                      </p>
                    </div>
                    {action &&
                      flexRender(
                        action.column.columnDef.cell,
                        action.getContext(),
                      )}
                  </div>
                  {(member.phone || member.user.email) && (
                    <div className="mt-3 grid gap-1 border-t pt-2">
                      {member.phone && (
                        <a
                          href={`tel:${member.phone.replace(/[^+0-9]/g, "")}`}
                          className="flex min-h-11 min-w-0 items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Phone size={15} className="shrink-0" />
                          <span>{member.phone}</span>
                        </a>
                      )}
                      {member.user.email && (
                        <a
                          href={`mailto:${member.user.email}`}
                          className="flex min-h-11 min-w-0 items-center gap-2 text-sm text-muted-foreground"
                        >
                          <Mail size={15} className="shrink-0" />
                          <span className="break-all">{member.user.email}</span>
                        </a>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
        {!shownCount && (
          <div className="p-4 md:hidden">
            <EmptyState
              title="Không có thành viên phù hợp"
              description="Thử tìm kiếm khác hoặc xóa bộ lọc."
            />
          </div>
        )}
        <div className="hidden overflow-x-auto md:block">
          <table role="table" className="w-full table-fixed text-left text-sm">
            <caption className="sr-only">
              Members. Shift-click column headings to sort by multiple columns.
            </caption>
            <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      aria-sort={
                        header.column.getIsSorted() === "asc"
                          ? "ascending"
                          : header.column.getIsSorted() === "desc"
                            ? "descending"
                            : undefined
                      }
                      className="h-11 px-5 font-medium"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          className="flex min-h-11 items-center gap-2"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getIsSorted() === "asc" ? (
                            <ArrowUp size={12} />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} className="opacity-40" />
                          )}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className="border-b last:border-0 hover:bg-muted/30 data-[state=selected]:bg-accent/40"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      className="h-19 px-5"
                      key={cell.id}
                      data-label={
                        mobileColumnLabels[cell.column.id] ?? cell.column.id
                      }
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {table.getRowModel().rows.length === 0 && (
            <div className="p-6">
              <EmptyState
                title="No members found"
                description="Try another search or clear your filters."
              />
            </div>
          )}
        </div>
        <div ref={setSentinel} className="h-px w-full" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-xs text-muted-foreground">
          <span aria-live="polite">
            Đang hiển thị {shownCount} / {totalCount} thành viên ·{" "}
            {selected.length} đã chọn
          </span>
        </div>
      </Card>
      {merging && (
        <MergeProfilesDialog
          members={members}
          initialIds={merging}
          onClose={() => setMerging(null)}
          onMerged={() => {
            setSelection({});
            setSelectionOrder([]);
          }}
        />
      )}
      {assigning && (
        <MemberRoleAssignment
          memberId={assigning}
          org={org}
          onClose={() => setAssigning(null)}
        />
      )}
      {credentials && (
        <AccountCredentials
          member={credentials}
          org={org}
          onClose={() => setCredentials(null)}
        />
      )}
      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !deletion.isPending) setDeleting(null);
        }}
        title="Xóa thành viên"
        description={`Xóa ${deleting?.user.name ?? ""} khỏi danh sách và vô hiệu hóa đăng nhập?`}
      >
        {deletion.error && <ErrorMessage error={deletion.error} />}
        <div className="flex gap-2">
          <Button
            disabled={deletion.isPending}
            onClick={() => {
              if (deleting) deletion.mutate(deleting.id);
            }}
          >
            Xác nhận xóa
          </Button>
          <Button
            variant="outline"
            disabled={deletion.isPending}
            onClick={() => setDeleting(null)}
          >
            Hủy
          </Button>
        </div>
      </Dialog>
    </>
  );
}
