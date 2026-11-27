import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { readCachedListPage, useLocalQueryReady } from "@org/core";
import { getPersonnel } from "./api";

export function usePersonnel({
  search,
  term,
  roles,
  departmentIds,
  churchStatuses,
  userId,
}: {
  search: string;
  term: string;
  roles: string[];
  departmentIds: string[];
  churchStatuses?: string[];
  userId?: string;
}) {
  const client = useQueryClient();
  const params = {
    q: term,
    churchStatuses: churchStatuses?.join(",") ?? "",
    roles: roles.join(","),
    departments: departmentIds.join(","),
  };
  const queryKey = ["admin-assigned-roles", userId, params];
  const localReady = useLocalQueryReady(client, queryKey);
  const query = useInfiniteQuery({
    queryKey,
    // Let a started request populate the cache even if this page unmounts.
    queryFn: ({ pageParam }) =>
      readCachedListPage(client, queryKey, pageParam, () =>
        getPersonnel(params, pageParam),
      ),
    enabled: (cached) =>
      localReady &&
      Boolean(userId) &&
      term === search.trim() &&
      (cached.state.data === undefined || cached.state.isInvalidated),
    initialPageParam: 1,
    staleTime: Infinity,
    gcTime: 30 * 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === userId ? previous : undefined,
    getNextPageParam: (last) => last.nextPage,
  });
  return { query, params };
}
