"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api-client";
import { useLocalQueryReady, READ_CACHE_MAX_AGE } from "./query-persistence";
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
    // Cached boards render immediately, but cancellation on another device must
    // be reconciled with the server when this calendar is opened again.
    queryFn: ({ signal }) =>
      apiRequest<{ items: ScheduleRecord[] }>(
        `/api/calendar-responsibilities?from=${range.from}&to=${range.to}`,
        { signal },
      ),
    enabled: localReady && enabled && Boolean(userId),
    staleTime: 0,
    gcTime: READ_CACHE_MAX_AGE,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    select: (data) => ({
      ...data,
      items: data.items.filter((schedule) => schedule.status === "published"),
    }),
  });
}
