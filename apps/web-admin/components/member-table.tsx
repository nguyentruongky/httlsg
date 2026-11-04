"use client";
import { useMemo, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Download,
  Users,
} from "lucide-react";
import {
  type Member,
  type Role,
  demo,
  viewerId,
  workspaceKey,
} from "@org/core";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  DropdownMenu,
  MenuItem,
  MenuCheckbox,
  Input,
  Select,
  EmptyState,
  ErrorMessage,
  cn,
} from "@org/ui";
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
    [visibility, setVisibility] = useState<VisibilityState>({ email: false }),
    [selection, setSelection] = useState<RowSelectionState>({});
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({
      ids,
      patch,
    }: {
      ids: string[];
      patch: Partial<Pick<Member, "role" | "status">>;
    }) => demo.updateMembers(org, ids, patch),
    onSuccess: () => {
      setSelection({});
      client.invalidateQueries({ queryKey: workspaceKey(org) });
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
            aria-label="Select current page"
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
        accessorFn: (m) => m.user.name,
        header: "Member",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar name={row.original.user.name} className="size-9" />
            <div>
              <p className="font-medium">
                {row.original.user.name}
                {row.original.userId === viewerId && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    (you)
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {row.original.user.email}
              </p>
            </div>
          </div>
        ),
      },
      { id: "email", accessorFn: (m) => m.user.email, header: "Email" },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge
            className={
              row.original.role === "admin"
                ? "border-primary/15 bg-accent text-primary"
                : ""
            }
          >
            {row.original.role[0].toUpperCase() + row.original.role.slice(1)}
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
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${row.original.user.name}`}
                disabled={
                  row.original.userId === viewerId || mutation.isPending
                }
              >
                <MoreHorizontal size={17} />
              </Button>
            }
            label="Manage member"
          >
            {(["admin", "manager", "member"] as Role[]).map((role) => (
              <MenuItem
                key={role}
                onSelect={() =>
                  mutation.mutate({ ids: [row.original.id], patch: { role } })
                }
              >
                Set role: {role}
              </MenuItem>
            ))}
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
          </DropdownMenu>
        ),
      },
    ],
    [mutation.isPending],
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
    onRowSelectionChange: setSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (m) => m.id,
    enableRowSelection: (row) => row.original.userId !== viewerId,
    initialState: { pagination: { pageSize: 8 } },
    globalFilterFn: (row, _column, value) =>
      `${row.original.user.name} ${row.original.user.email ?? ""}`
        .toLowerCase()
        .includes(String(value).toLowerCase()),
  });
  const selected = table
    .getFilteredSelectedRowModel()
    .rows.map((r) => r.original.id);
  const status = (table.getColumn("status")?.getFilterValue() ??
    []) as string[];
  function exportCsv() {
    const rows = table
      .getFilteredRowModel()
      .rows.map((r) => [
        r.original.user.name,
        r.original.user.email ?? "",
        r.original.role,
        r.original.status,
      ]);
    const quote = (s: string) =>
      '"' + s.replace(/^[=+@\-\t\r]/, "'$&").replaceAll('"', '""') + '"';
    const csv = [["Name", "Email", "Role", "Status"], ...rows]
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
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">All members</h2>
          <Badge>{members.length}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download size={14} />
          Export
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 p-4">
        <div className="relative mr-auto w-full sm:max-w-72">
          <Search
            size={15}
            className="absolute left-3 top-3 text-muted-foreground"
          />
          <Input
            aria-label="Search members"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Filter by role"
          value={(table.getColumn("role")?.getFilterValue() as string) ?? ""}
          onChange={(e) =>
            table.getColumn("role")?.setFilterValue(e.target.value || undefined)
          }
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="member">Member</option>
        </Select>
        <DropdownMenu
          trigger={
            <Button variant="outline">
              <SlidersHorizontal size={14} />
              Status{status.length > 0 && <Badge>{status.length}</Badge>}
            </Button>
          }
        >
          {["active", "invited", "suspended"].map((s) => (
            <MenuCheckbox
              key={s}
              checked={status.includes(s)}
              onCheckedChange={(v) =>
                table
                  .getColumn("status")
                  ?.setFilterValue(
                    v ? [...status, s] : status.filter((x) => x !== s),
                  )
              }
            >
              {s}
            </MenuCheckbox>
          ))}
        </DropdownMenu>
        <DropdownMenu trigger={<Button variant="outline">Columns</Button>}>
          {table
            .getAllColumns()
            .filter((c) => c.getCanHide())
            .map((c) => (
              <MenuCheckbox
                key={c.id}
                checked={c.getIsVisible()}
                onCheckedChange={(v) => c.toggleVisibility(v)}
              >
                {c.id}
              </MenuCheckbox>
            ))}
        </DropdownMenu>
        {(filters.length > 0 || search) && (
          <Button
            variant="ghost"
            onClick={() => {
              setFilters([]);
              setSearch("");
            }}
          >
            Reset
          </Button>
        )}
      </div>
      {selected.length > 0 && (
        <div className="mx-4 mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-accent p-3">
          <span className="mr-auto text-sm">{selected.length} selected</span>
          <Button
            variant="outline"
            size="sm"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({ ids: selected, patch: { status: "active" } })
            }
          >
            Activate
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate({ ids: selected, patch: { status: "suspended" } })
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
      <div className="overflow-x-auto">
        <table className="w-full whitespace-nowrap text-left text-sm">
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
                  <td className="h-[76px] px-5" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-xs text-muted-foreground">
        <span aria-live="polite">
          {table.getFilteredRowModel().rows.length} members · {selected.length}{" "}
          selected
        </span>
        <div className="flex items-center gap-3">
          <Select
            aria-label="Rows per page"
            value={table.getState().pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
          >
            {[8, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </Select>
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous page"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next page"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
