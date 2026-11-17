import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiRequest, readCachedListPage, useLocalQueryReady } from "@org/core";
import { useLoadingTiming } from "../use-loading-timing";
import type { MemberFiltersValue } from "../member-filters";
import type { BoardYear } from "../department-board";
import type { DepartmentMember } from "./types";
type Page = {
  items: DepartmentMember[];
  total?: number;
  nextPage: number | null;
};
export function useDepartmentRoster({
  departmentId,
  boardYear,
  showYears,
  term,
  search,
  filterStatuses,
  searchAll,
}: {
  departmentId: string;
  boardYear: number | null;
  showYears: boolean;
  term: string;
  search: string;
  filterStatuses: NonNullable<MemberFiltersValue["churchStatuses"]>;
  searchAll: boolean;
}) {
  const client = useQueryClient();
  const path =
    "/api/admin/departments/" + encodeURIComponent(departmentId) + "/members";
  const board = useQuery({
    queryKey: ["department-board-history", departmentId],
    staleTime: Infinity,
    refetchOnMount: false,
    queryFn: () =>
      apiRequest<{ items: BoardYear[] }>(
        "/api/admin/departments/" + encodeURIComponent(departmentId) + "/board",
      ),
    enabled: boardYear !== null || showYears,
  });
  const boardSnapshot = board.data?.items.find(
    (item) => item.year === boardYear,
  );
  const queryKey = [
    "admin-department-members",
    departmentId,
    boardYear !== null ? "board" : searchAll ? "all" : "members",
    boardYear,
    term,
    filterStatuses,
    "department-memberships",
  ];
  const localReady = useLocalQueryReady(client, queryKey);
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      readCachedListPage(client, queryKey, pageParam, () =>
        apiRequest<Page>(
          path +
            "?" +
            new URLSearchParams({
              mode:
                boardYear !== null ? "board" : searchAll ? "all" : "members",
              ...(boardYear !== null ? { year: String(boardYear) } : {}),
              q: term,
              ...(filterStatuses.length
                ? { churchStatuses: filterStatuses.join(",") }
                : {}),
              page: String(pageParam),
              summary: pageParam === 1 ? "1" : "0",
            }),
        ),
      ),
    getNextPageParam: (page) => page.nextPage ?? undefined,
    staleTime: Infinity,
    gcTime: 30 * 24 * 60 * 60 * 1000,
    refetchOnMount: (cached) => cached.state.isInvalidated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: (cached) =>
      localReady &&
      (!searchAll || Boolean(term)) &&
      term === search.trim() &&
      (cached.state.data === undefined || cached.state.isInvalidated),
  });
  useLoadingTiming("department", query.isPending);
  return { board, boardSnapshot, query };
}
