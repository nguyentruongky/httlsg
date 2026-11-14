"use client";
import { PersonCard } from "./person-card";
import { MemberCardMenu } from "./member-card-menu";
import { memberFilterChips } from "./filter-chips";
import { formatCsv, downloadCsv } from "./csv-export";
import {
  ListSearchToolbar,
  ListResultsSummary,
  ListControls,
} from "./list-controls";
import { useDebouncedSearch } from "./use-debounced-search";

import { useDelayedLoading } from "./use-delayed-loading";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { Button, Card, EmptyState, ErrorMessage } from "@org/ui";
import { useAutoLoadMore } from "../../mobile-client/src/use-auto-load-more";
import { MergeProfilesDialog } from "./merge-profiles-dialog";
import {
  MemberFilters,
  MemberFiltersValue,
  emptyMemberFilters,
} from "./member-filters";

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
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]),
    [merging, setMerging] = useState<string[] | null>(null);
  const client = useQueryClient();
  const actor = useAuth()?.user;
  const actorId = actor?.id;
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
      if (
        memberFiltersValue.churchStatuses?.length &&
        !memberFiltersValue.churchStatuses.some(
          (status) => status === member.churchStatus,
        )
      )
        return false;
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
  const columns = useMemo<ColumnDef<CompactMember>[]>(
    () => [
      {
        id: "name",
        accessorFn: (member) => member.user.name,
        sortingFn: (a, b) =>
          compareNamesByLastWord(a.original.user.name, b.original.user.name) ||
          a.original.id.localeCompare(b.original.id),
      },
      {
        id: "department",
        accessorFn: (member) =>
          member.departments?.map((item) => item.name).join(", ") ?? "",
        filterFn: (row, _id, value: string[]) =>
          !value.length ||
          Boolean(
            row.original.departments?.some((item) => value.includes(item.id)),
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
            chips={memberFilterChips(
              memberFiltersValue,
              (value) => {
                setMemberFiltersValue(value);
                table
                  .getColumn("department")
                  ?.setFilterValue(value.departmentIds);
              },
              departments,
            )}
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
        <ul className="space-y-2 py-2" aria-label="Danh sách thành viên">
          {table.getRowModel().rows.map((row) => {
            const member = row.original;
            return (
              <li key={member.id}>
                <PersonCard
                  name={member.user.name}
                  href={`/client/members/${member.id}`}
                  status={member.churchStatus ?? null}
                  onFilterStatus={(status) =>
                    setMemberFiltersValue((value) => ({
                      ...value,
                      churchStatuses: [status],
                    }))
                  }
                  departments={
                    member.departments?.map((item) => item.name).join(", ") ||
                    "Chưa tham gia ban ngành"
                  }
                  phone={member.phone}
                  email={member.user.email}
                  colorIndex={row.index}
                  selected={row.getIsSelected()}
                  onAvatarClick={
                    row.getCanSelect() ? () => row.toggleSelected() : undefined
                  }
                  actions={
                    <MemberCardMenu
                      org={org}
                      member={{
                        id: member.id,
                        userId: member.userId,
                        name: member.user.name,
                        phone: member.phone,
                        email: member.user.email,
                        accountStatus: member.status,
                      }}
                    />
                  }
                />
              </li>
            );
          })}
        </ul>
        {!table.getRowModel().rows.length && !searching && !server.isError && (
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
    </>
  );
}
