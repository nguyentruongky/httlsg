import { useInfiniteQuery } from "@tanstack/react-query";
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
  const params = {
    q: term,
    churchStatuses: churchStatuses?.join(",") ?? "",
    roles: roles.join(","),
    departments: departmentIds.join(","),
  };
  const query = useInfiniteQuery({
    queryKey: ["admin-assigned-roles", userId, params],
    queryFn: ({ pageParam, signal }) => getPersonnel(params, pageParam, signal),
    enabled: term === search.trim(),
    initialPageParam: 1,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === userId ? previous : undefined,
    getNextPageParam: (last) => last.nextPage,
  });
  return { query, params };
}
