import { useMemberShortcuts } from "./use-member-shortcuts";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  departments,
  useAuth,
  hasFullMemberAccess,
  apiRequest,
  listMembersCompact,
  type CompactMember,
  type DirectoryMember,
  type DirectoryQuery,
} from "@org/core";
import { useDebouncedSearch } from "../use-debounced-search";
import { useAutoLoadMore } from "../use-auto-load-more";
import { emptyMemberFilters, type MemberFiltersValue } from "../member-filters";
type Options = MemberFiltersValue;
const defaults = emptyMemberFilters;
export function useMemberDirectory({
  org,
  active,
  team: requestedTeam = false,
  assigned: requestedAssigned = false,
}: {
  org: string;
  active: boolean;
  team?: boolean | "board";
  assigned?: boolean;
}) {
  const actor = useAuth()?.user;
  const fullDirectory = hasFullMemberAccess(actor);
  const team = fullDirectory ? false : requestedTeam;
  const assigned = fullDirectory ? false : requestedAssigned;
  const filterOptions = useQuery({
    queryKey: ["organizations", org, "directory-filter-options"],
    queryFn: ({ signal }) =>
      apiRequest<{
        departments: { id: string; name: string }[];
        areas: string[];
        locations: string[];
      }>("/api/members/filters", { signal }),
    enabled: active && assigned,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const assignedIds = new Set(actor?.departmentIds ?? []);
  const departmentOptions = assigned
    ? departments.filter((item) => assignedIds.has(item.id))
    : departments;
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Options>(defaults),
    [open, setOpen] = useState(false);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  const debounced = useDebouncedSearch(search);
  const filterCount =
    Number(Boolean(options.personnelOnly)) +
    options.departmentIds.length +
    (options.churchStatuses?.length ?? 0) +
    Number(options.area.length > 0) +
    Number(options.location.length > 0) +
    Number(
      options.ageUnknownOnly ||
        options.minAge !== null ||
        options.maxAge !== null,
    );
  const count = filterCount;
  const hasCriteria = Boolean(search.trim()) || filterCount > 0;
  const shortcuts = useMemberShortcuts({
    org,
    team,
    enabled: active && !hasCriteria,
  });
  const isDebouncing = search.trim() !== debounced;
  const query = useInfiniteQuery({
    enabled: active && hasCriteria && !isDebouncing,
    queryKey: [
      "organizations",
      org,
      assigned
        ? "assigned-directory"
        : team === "board"
          ? "board-directory"
          : team
            ? "leader-directory"
            : "directory",
      "last-word",
      { search: debounced, ...options },
    ],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      team
        ? apiRequest<{
            items: DirectoryMember[];
            total: number;
            nextPage?: number;
          }>(
            `/api/${team === "board" ? "board" : "leader"}/members?query=${encodeURIComponent(
              JSON.stringify({
                search: debounced,
                personnelOnly: options.personnelOnly,
                departmentIds: options.departmentIds,
                churchStatuses: options.churchStatuses,
                areas: options.area as DirectoryQuery["areas"],
                locations: options.location as DirectoryQuery["locations"],
                minAge: options.minAge,
                maxAge: options.maxAge,
                ageUnknownOnly: options.ageUnknownOnly,
                area: (options.area[0] ?? "all") as DirectoryQuery["area"],
                location: (options.location[0] ??
                  "all") as DirectoryQuery["location"],
                page: pageParam,
                pageSize: 12,
              }),
            )}`,
            { signal },
          )
        : listMembersCompact(
            org,
            {
              search: debounced,
              personnelOnly: options.personnelOnly,
              departmentIds: options.departmentIds,
              churchStatuses: options.churchStatuses,
              areas: options.area as DirectoryQuery["areas"],
              locations: options.location as DirectoryQuery["locations"],
              minAge: options.minAge,
              maxAge: options.maxAge,
              ageUnknownOnly: options.ageUnknownOnly,
              area: (options.area[0] ?? "all") as DirectoryQuery["area"],
              location: (options.location[0] ??
                "all") as DirectoryQuery["location"],
              page: pageParam,
              pageSize: 12,
            },
            signal,
          ),
    getNextPageParam: (page) => page.nextPage,
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { hasNextPage, isFetching, isFetchNextPageError, fetchNextPage } =
    query;
  useAutoLoadMore({
    target: sentinel,
    enabled:
      active &&
      hasCriteria &&
      !isDebouncing &&
      !open &&
      Boolean(hasNextPage) &&
      !isFetchNextPageError &&
      search.trim() === debounced,
    isFetching,
    pageCount: query.data?.pages.length ?? 0,
    loadMore: fetchNextPage,
  });
  const members = query.data?.pages.flatMap((p) => p.items) ?? [],
    total = query.data?.pages[0].total ?? 0;
  const updating = hasCriteria && query.isFetching && !query.isFetchingNextPage;
  function memberHref(id: string) {
    return team
      ? `/client/${team === "board" ? "board" : "leader"}/members/${id}`
      : `/client/members/${id}`;
  }
  function reset() {
    setSearch("");

    setOptions(defaults);
  }
  return {
    shortcuts,
    team,
    assigned,
    search,
    setSearch,
    options,
    setOptions,
    open,
    setOpen,
    count,
    departmentOptions,
    filterOptions,
    query,
    hasCriteria,
    isDebouncing,
    members,
    total,
    updating,
    memberHref,
    reset,
    setSentinel,
  };
}
export type MemberDirectoryState = ReturnType<typeof useMemberDirectory>;
