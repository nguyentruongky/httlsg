"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api-client";
import { useAuth } from "./auth-session";
import { canCalendar } from "./calendar";
import { authorizationScope, useLocalQueryReady } from "./query-persistence";
import { useWorkspace } from "./state";
import type { WorshipPersonInCharge } from "./worship-workers";

export type LocalWorshipPeopleInCharge = {
  people: WorshipPersonInCharge[];
  syncedAt: string;
};

/** Restore the device directory first; fetch only when no local snapshot exists. */
function useLocalDirectory<T>(root: string, endpoint: string) {
  const user = useAuth()?.user;
  const organization = useWorkspace((state) => state.organizationId);
  const client = useQueryClient();
  const scope = user ? authorizationScope(user, organization) : null;
  const queryKey = [root, scope, 2] as const;
  const localReady = useLocalQueryReady(client, queryKey);
  const localData = client.getQueryData<T>(queryKey);
  const query = useQuery<T>({
    queryKey,
    queryFn: ({ signal }) =>
      apiRequest<T>(endpoint, {
        signal,
      }),
    enabled: localReady && canCalendar(user) && !localData,
    staleTime: Infinity,
    gcTime: 30 * 24 * 60 * 60 * 1000,
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  return {
    data: query.data,
    ready: localReady && !query.isFetching,
    syncing: query.isFetching,
    error: query.error,
  };
}

export function useLocalWorshipPeopleInCharge() {
  return useLocalDirectory<LocalWorshipPeopleInCharge>(
    "worship-people-in-charge",
    "/api/events/people-in-charge",
  );
}
