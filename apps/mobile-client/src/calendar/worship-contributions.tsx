import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@org/core";
import { MenuItem } from "@org/ui";
import { FilePenLine } from "lucide-react";
import { navigateClient } from "../client-router";
export type WorshipDraft = {
  id: string;
  event_date: string;
  service_number: number;
  contributor_name: string;
  base_text: string;
  proposed_text: string;
  change_reviews: { changeIds: number[]; action: string }[];
  current: {
    eventId: string | null;
    version: number | null;
    originalText: string;
  };
};
export const worshipContributionsKey = ["worship-contributions"];
export function useWorshipContributions() {
  return useQuery({
    queryKey: worshipContributionsKey,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: () =>
      apiRequest<{ items: WorshipDraft[] }>("/api/worship-contributions"),
    refetchOnWindowFocus: false,
  });
}
export function WorshipContributionsBadge() {
  const query = useWorshipContributions();
  const count = query.data?.items.length ?? 0;
  if (!count) return null;
  return (
    <span
      role="status"
      aria-label={`${count} bản nháp thờ phượng chờ duyệt`}
      className="pointer-events-none absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
export function WorshipContributions() {
  const query = useWorshipContributions();
  const count = query.data?.items.length ?? 0;
  if (!count) return null;
  return (
    <MenuItem onSelect={() => navigateClient("/client/worship-review")}>
      <FilePenLine size={16} />
      <span>Xem thông tin cập nhật</span>
      <span className="ml-auto rounded-full bg-muted px-2 text-xs tabular-nums">
        {count}
      </span>
    </MenuItem>
  );
}
