import { MemberChoirSheet } from "./member-choir-sheet";
import { formatCsv, downloadCsv } from "./csv-export";
import { MemberStatusSheet } from "./member-status-sheet";
("use client");
import {
  ListSearchToolbar,
  ListResultsSummary,
  ListControls,
} from "./list-controls";
import { useDebouncedSearch } from "./use-debounced-search";

import { navigateClient } from "./client-router";
import { useDelayedLoading } from "./use-delayed-loading";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  MoreHorizontal,
  Users,
  Mail,
  Phone,
} from "lucide-react";
import {
  type Member,
  compareNamesByLastWord,
  getAge,
  accessRoleLabels,
  type AccessRole,
  departments,
  areas,
  locations,
  type CompactMember,
  apiRequest,
  useAuth,
  workspaceKey,
  useOrganizationMembers,
  type DirectoryQuery,
} from "@org/core";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DropdownMenu,
  MenuItem,
  EmptyState,
  ErrorMessage,
  cn,
} from "@org/ui";
import { useAutoLoadMore } from "../../mobile-client/src/use-auto-load-more";
import { MergeProfilesDialog } from "./merge-profiles-dialog";
import { AccountCredentials } from "./account-credentials";
import { MemberRoleAssignment } from "./member-role-assignment";
import {
  MemberFilters,
  MemberFiltersValue,
  emptyMemberFilters,
  ageRangeLabel,
} from "./member-filters";
const mobileColumnLabels: Record<string, string> = {
  name: "Thành viên",
  contact: "Liên hệ",
  department: "Ban ngành/Ban hát lễ",
  actions: "Thao tác",
};

const normalizeSearch = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi");
export function MemberTable({
  org,
  members: providedMembers,
  loadMoreServer: providedLoadMoreServer,
  hasNextPage: providedHasNextPage,
  total: providedTotal,
  isFetchingNextPage: providedIsFetchingNextPage = false,
  isFetchNextPageError: providedIsFetchNextPageError = false,
}: {
  org: string;
  members: CompactMember[];
  loadMoreServer?: () => Promise<unknown>;
  hasNextPage?: boolean;
  total: number;
  isFetchingNextPage?: boolean;
  isFetchNextPageError?: boolean;
}) {
  const [sorting, setSorting] = useState<SortingState>([]),
    [filters, setFilters] = useState<ColumnFiltersState>([]),
    [search, setSearch] = useState(""),
    [memberFiltersValue, setMemberFiltersValue] =
      useState<MemberFiltersValue>(emptyMemberFilters),
    [memberFiltersOpen, setMemberFiltersOpen] = useState(false),
    [desktopFilter, setDesktopFilter] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    setDesktopFilter(mq.matches);
    const handler = (e: MediaQueryListEvent) => setDesktopFilter(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const term = useDebouncedSearch(search);
  const serverSearch = Boolean(providedLoadMoreServer);
  const server = useOrganizationMembers(
    org,
    24,
    {
      search: term,
      departmentIds: memberFiltersValue.departmentIds,
      churchStatuses: memberFiltersValue.churchStatuses,
      areas: memberFiltersValue.area as DirectoryQuery["areas"],
      locations: memberFiltersValue.location as DirectoryQuery["locations"],
      minAge: memberFiltersValue.minAge,
      maxAge: memberFiltersValue.maxAge,
      ageUnknownOnly: memberFiltersValue.ageUnknownOnly,
    },
    serverSearch && term === search.trim(),
  );
  const members = serverSearch ? server.members : providedMembers;
  const total = serverSearch ? server.total : providedTotal;
  const hasNextPage = serverSearch ? server.hasNextPage : providedHasNextPage;
  const isFetchingNextPage = serverSearch
    ? server.isFetchingNextPage
    : providedIsFetchingNextPage;
  const isFetchNextPageError = serverSearch
    ? server.isFetchNextPageError
    : providedIsFetchNextPageError;
  const loadMoreServer = serverSearch
    ? server.fetchNextPage
    : providedLoadMoreServer;
  const searching =
    serverSearch && (search.trim() !== term || server.isPending);
  const [visibility, setVisibility] = useState<VisibilityState>({
      select: false,
      email: false,
      role: false,
      status: false,
      joinedAt: false,
      actions: false,
    }),
    [selection, setSelection] = useState<RowSelectionState>({});
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const showLoading = useDelayedLoading(isFetchingNextPage);
  const [credentials, setCredentials] = useState<Member | null>(null),
    [deleting, setDeleting] = useState<Member | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]),
    [merging, setMerging] = useState<string[] | null>(null);
  const client = useQueryClient();
  const actor = useAuth()?.user;
  const actorId = actor?.id;
  const [statusMember, setStatusMember] = useState<CompactMember | null>(null);
  const pendingStatus = useRef<CompactMember | null>(null);
  const [choirMember, setChoirMember] = useState<CompactMember | null>(null);
  const pendingChoir = useRef<CompactMember | null>(null);
  const mergeIds = selectionOrder.filter(
    (id) => selection[id] && members.some((m) => m.id === id),
  );
  const filteredMembers = useMemo(() => {
    if (serverSearch) return members;
    const { departmentIds, area, location, minAge, maxAge, ageUnknownOnly } =
      memberFiltersValue;
    const deptIds = new Set(departmentIds);
    const areaIds = new Set(area);
    const locationIds = new Set(location);
    const now = new Date();
    return members.filter((member) => {
      if (deptIds.size && !member.departments?.some((d) => deptIds.has(d.id)))
        return false;
      if (areaIds.size && member.area && !areaIds.has(member.area))
        return false;
      if (
        locationIds.size &&
        member.location &&
        !locationIds.has(member.location)
      )
        return false;
      if (ageUnknownOnly || minAge !== null || maxAge !== null) {
        const age = getAge(member.dateOfBirth ?? null, now);
        if (ageUnknownOnly) return age === null;
        return (
          age !== null &&
          (minAge === null || age >= minAge) &&
          (maxAge === null || age <= maxAge)
        );
      }
      return true;
    });
  }, [members, memberFiltersValue, serverSearch]);
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
  const columns = useMemo<ColumnDef<CompactMember>[]>(
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
                  className="inline-flex w-fit max-w-full min-h-11 min-w-0 items-center gap-2 text-sm text-muted-foreground"
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
        filterFn: (row, _id, value: string[]) => {
          if (!value.length) return true;
          return (
            row.original.departments?.some((d) => value.includes(d.id)) ?? false
          );
        },
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
            {
              accessRoleLabels[
                (row.original.accessRole ??
                  "user") as keyof typeof accessRoleLabels
              ]
            }
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
            onCloseAutoFocus={(event) => {
              if (pendingChoir.current) {
                event.preventDefault();
                setChoirMember(pendingChoir.current);
                pendingChoir.current = null;
                return;
              }
              if (!pendingStatus.current) return;
              event.preventDefault();
              setStatusMember(pendingStatus.current);
              pendingStatus.current = null;
            }}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for ${row.original.user.name}`}
                disabled={mutation.isPending}
              >
                <MoreHorizontal size={17} />
              </Button>
            }
          >
            <MenuItem
              onSelect={() => {
                pendingStatus.current = row.original;
              }}
            >
              Cập nhật trạng thái
            </MenuItem>
            {["admin", "secretary"].includes(actor?.role ?? "") && (
              <MenuItem
                onSelect={() => {
                  pendingChoir.current = row.original;
                }}
              >
                Đổi ban hát lễ
              </MenuItem>
            )}
            {actor?.role !== "deacon" && row.original.userId !== actorId && (
              <>
                <MenuItem
                  onSelect={() =>
                    setCredentials(row.original as unknown as Member)
                  }
                >
                  Thông tin đăng nhập
                </MenuItem>
                <MenuItem onSelect={() => setAssigning(row.original.id)}>
                  Phân quyền
                </MenuItem>
                <MenuItem
                  className={
                    row.original.status === "suspended"
                      ? ""
                      : "text-destructive"
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
                    setDeleting(row.original as unknown as Member);
                  }}
                >
                  Xóa thành viên
                </MenuItem>
              </>
            )}
          </DropdownMenu>
        ),
      },
    ],
    [mutation.isPending, actorId, actor?.role],
  );
  const table = useReactTable({
    data: filteredMembers,
    manualFiltering: serverSearch,
    columns,
    state: {
      sorting,
      columnFilters: filters,
      globalFilter: term,
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
    manualPagination: Boolean(loadMoreServer),
    autoResetPageIndex: false,
    getRowId: (m) => m.id,
    enableRowSelection: (row) =>
      actor?.role !== "deacon" &&
      (actor?.role === "admin" || row.original.userId !== actorId),
    initialState: { pagination: { pageSize: 20 } },
    globalFilterFn: (row, _column, value) => {
      const search = normalizeSearch(String(value));
      const haystack = [
        row.original.user.name,
        row.original.user.email ?? "",
        row.original.phone ?? "",
      ]
        .map(normalizeSearch)
        .join(" ");
      return haystack.includes(search);
    },
  });
  const shownCount = table.getRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const loadMore = useCallback(async () => {
    if (shownCount < totalCount) table.setPageSize((size) => size + 20);
    else if (loadMoreServer) await loadMoreServer();
  }, [table, shownCount, totalCount, loadMoreServer]);
  useAutoLoadMore({
    target: sentinel,
    enabled:
      !searching &&
      !server.isError &&
      (shownCount < totalCount ||
        Boolean(hasNextPage && !isFetchNextPageError)),
    isFetching: serverSearch ? server.isFetching : isFetchingNextPage,
    pageCount: shownCount,
    loadMore,
  });
  const selected = table
    .getFilteredSelectedRowModel()
    .rows.filter((r) => r.original.userId !== actorId)
    .map((r) => r.original.id);
  const status = (table.getColumn("status")?.getFilterValue() ??
    []) as string[];
  const memberFilterCount =
    memberFiltersValue.departmentIds.length +
    (memberFiltersValue.churchStatuses?.length ?? 0) +
    (memberFiltersValue.area.length > 0 ? 1 : 0) +
    (memberFiltersValue.location.length > 0 ? 1 : 0) +
    (memberFiltersValue.minAge !== null ||
    memberFiltersValue.maxAge !== null ||
    memberFiltersValue.ageUnknownOnly
      ? 1
      : 0);
  function exportCsv() {
    const rows = table
      .getFilteredRowModel()
      .rows.map((r) => [
        r.original.user.name,
        r.original.user.email ?? "",
        r.original.phone ?? "",
        r.original.departments?.map((item) => item.name).join(", ") ?? "",
        accessRoleLabels[
          (r.original.accessRole ?? "user") as keyof typeof accessRoleLabels
        ],
        r.original.status,
      ]);
    const csv = formatCsv([
      ["Name", "Email", "Phone", "Ban ngành/Ban hát lễ", "Role", "Status"],
      ...rows,
    ]);
    downloadCsv(csv, "members.csv");
  }
  return (
    <>
      <Card className="overflow-hidden border-0 bg-transparent shadow-none md:border md:bg-card md:shadow-xs">
        <ListControls>
          <ListSearchToolbar
            value={search}
            onChange={setSearch}
            label="Tìm thành viên"
            onFilter={() => setMemberFiltersOpen(true)}
            filterCount={memberFilterCount}
          />
          <ListResultsSummary onDownload={exportCsv}>
            {searching ? "Đang tìm thành viên…" : `${total} thành viên`}
          </ListResultsSummary>
        </ListControls>
        <MemberFilters
          open={memberFiltersOpen}
          onOpenChange={setMemberFiltersOpen}
          value={memberFiltersValue}
          departmentOptions={departments}
          areaOptions={areas}
          locationOptions={locations}
          placement={desktopFilter ? "right" : "left"}
          onApply={(value) => {
            setMemberFiltersValue(value);
            table.getColumn("department")?.setFilterValue(value.departmentIds);
          }}
        />
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
              <li
                key={row.id}
                onClick={(event) => {
                  if (
                    event.target instanceof Element &&
                    event.currentTarget.contains(event.target) &&
                    !event.target.closest(
                      'a,button,input,select,textarea,[role="button"],[role="checkbox"],[role="menuitem"]',
                    )
                  )
                    navigateClient(`/client/members/${member.id}`);
                }}
              >
                <Card
                  className={cn(
                    "min-w-0 cursor-pointer p-4",
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
                          className="inline-flex w-fit max-w-full min-h-11 min-w-0 items-center gap-2 text-sm text-muted-foreground"
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
        </div>
        {table.getRowModel().rows.length === 0 &&
          !searching &&
          !server.isError && (
            <div className="p-6">
              <EmptyState
                title="Không tìm thấy thành viên"
                description="Thử từ khóa khác hoặc xóa bộ lọc."
              />
            </div>
          )}
        {serverSearch && server.isError && (
          <div className="p-4">
            <ErrorMessage error={server.error} />
            <Button variant="outline" onClick={() => void server.refetch()}>
              Thử lại
            </Button>
          </div>
        )}
        <div ref={setSentinel} className="h-px w-full" aria-hidden="true" />
        <div
          className="flex min-h-14 items-center justify-center px-4"
          aria-live="polite"
          aria-busy={isFetchingNextPage}
        >
          {showLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Đang tải thêm thành viên…
            </p>
          ) : hasNextPage && isFetchNextPageError ? (
            <Button variant="outline" onClick={() => void loadMoreServer?.()}>
              Thử tải lại
            </Button>
          ) : null}
        </div>
      </Card>
      {merging && (
        <MergeProfilesDialog
          members={members as unknown as Member[]}
          initialIds={merging}
          onClose={() => setMerging(null)}
          onMerged={() => {
            setSelection({});
            setSelectionOrder([]);
          }}
        />
      )}
      {choirMember && (
        <MemberChoirSheet
          key={choirMember.id}
          org={org}
          memberId={choirMember.id}
          name={choirMember.user.name}
          onClose={() => setChoirMember(null)}
        />
      )}
      {statusMember && (
        <MemberStatusSheet
          key={statusMember.id}
          org={org}
          memberId={statusMember.id}
          name={statusMember.user.name}
          onClose={() => setStatusMember(null)}
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
