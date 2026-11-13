import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { demo, type Snapshot } from "./demo";
import { apiRequest, isApiMode } from "./api-client";
import { listMembersCompact, type DirectoryQuery } from "./directory";
export const workspaceKey = (org: string) =>
  ["organizations", org, "workspace"] as const;
export const organizationMembersKey = (org: string) =>
  ["organizations", org, "members"] as const;
export const organizationActivityKey = (org: string) =>
  ["organizations", org, "activity"] as const;
const emptyDirectoryQuery: DirectoryQuery = {
  search: "",
  departmentIds: [],
  area: "all",
  location: "all",
  ageUnknownOnly: false,
  minAge: null,
  maxAge: null,
  page: 1,
  pageSize: 24,
};
export function useOrganization(org: string) {
  return useQuery({
    queryKey: workspaceKey(org),
    queryFn: () => demo.get(org),
    staleTime: 30_000,
    refetchInterval: false,
  });
}
export function useOrganizationMembers(
  org: string,
  pageSize = 24,
  filters: Partial<Omit<DirectoryQuery, "page" | "pageSize">> = {},
  enabled = true,
) {
  const criteria = {
    ...emptyDirectoryQuery,
    ...filters,
    areas: filters.areas ?? [],
    locations: filters.locations ?? [],
    page: 1,
    pageSize,
  };
  const query = useInfiniteQuery({
    queryKey: [...organizationMembersKey(org), criteria],
    enabled,
    queryFn: ({ pageParam = 1, signal }) =>
      listMembersCompact(
        org,
        { ...criteria, page: pageParam as number },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.nextPage ? last.nextPage : undefined),
    staleTime: 30_000,
  });
  const members = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data?.pages],
  );
  const fetchNextPage = useCallback(
    () => query.fetchNextPage({ cancelRefetch: false }),
    [query.fetchNextPage],
  );
  const total = query.data?.pages[0]?.total ?? 0;
  return {
    members,
    total,
    activeCount: query.data?.pages[0]?.activeCount ?? 0,
    adminCount: query.data?.pages[0]?.adminCount ?? 0,
    hasNextPage: query.hasNextPage,
    fetchNextPage,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    isPending: query.isPending,
    isError: query.isError && !query.data,
    error: query.error,
    refetch: query.refetch,
  };
}
export function useOrganizationActivity(org: string) {
  return useQuery({
    queryKey: organizationActivityKey(org),
    queryFn: async () => {
      if (isApiMode()) {
        return apiRequest<{ items: Snapshot["activity"] }>(
          "/api/admin/workspace/activity",
        );
      }
      return { items: (await demo.get(org)).activity };
    },
    staleTime: 30_000,
    refetchInterval: false,
  });
}
export function useCompleteTask(org: string) {
  const client = useQueryClient();
  const key = workspaceKey(org);
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      demo.complete(org, id, version),
    onMutate: async ({ id }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Snapshot>(key);
      client.setQueryData<Snapshot>(key, (s) =>
        s
          ? {
              ...s,
              tasks: s.tasks.map((t) =>
                t.id === id
                  ? {
                      ...t,
                      status: "completed",
                      completedAt: new Date().toISOString(),
                    }
                  : t,
              ),
            }
          : s,
      );
      return { previousTask: previous?.tasks.find((t) => t.id === id) };
    },
    onError: (_error, input, context) => {
      if (context?.previousTask)
        client.setQueryData<Snapshot>(key, (s) =>
          s
            ? {
                ...s,
                tasks: s.tasks.map((t) =>
                  t.id === input.id ? context.previousTask! : t,
                ),
              }
            : s,
        );
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  });
}
