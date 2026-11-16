"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api-client";
import { readCachedQuery, useLocalQueryReady, READ_CACHE_MAX_AGE } from "./query-persistence";
import type { ScheduleRecord } from "./schedules";

export function useCalendarResponsibilities(
  userId: string | undefined,
  range: { from: string; to: string },
  enabled = true,
) {
  const client = useQueryClient();
  const queryKey = ["calendar-responsibilities", userId, range];
  const localReady = useLocalQueryReady(client, queryKey);
  return useQuery({
    queryKey,
    queryFn: () => readCachedQuery(client, queryKey, () => apiRequest<{ items: ScheduleRecord[] }>(
      `/api/calendar-responsibilities?from=${range.from}&to=${range.to}`,
    )),
    enabled: (cached) => localReady && enabled && Boolean(userId) &&
      (cached.state.data === undefined || cached.state.isInvalidated),
    staleTime: Infinity,
    gcTime: READ_CACHE_MAX_AGE,
    // Invalidated inactive ranges refresh on their next visit.
    refetchOnMount: (cached) => cached.state.isInvalidated,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
