import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { demo } from "@org/core";
import { Button } from "@org/ui";
import { LoaderCircle, Trash2 } from "lucide-react";
import { ClientError } from "../locale";
import { formatVisitDate as calendarDate } from "./format-visit-date";
export function DeleteHistoryEntry({
  org,
  memberId,
  kind,
  entryId,
  visitedOn,
  onUpdated,
}: {
  org: string;
  memberId: string;
  kind: "notes" | "visits";
  entryId: string;
  visitedOn?: string;
  onUpdated: () => Promise<void>;
}) {
  const client = useQueryClient();
  const deleting = useRef(false);
  const mutation = useMutation({
    mutationFn: () =>
      demo.deleteHistory(org, memberId, kind, entryId, visitedOn),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["organizations", org, "member-history", memberId],
        exact: true,
      });
      await onUpdated();
    },
  });
  const label =
    kind === "notes"
      ? "Xóa ghi chú"
      : `Xóa lần thăm viếng ${calendarDate(visitedOn!)}`;
  return (
    <div className="ml-auto shrink-0">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 text-destructive"
        aria-label={label}
        title={label}
        disabled={mutation.isPending}
        onClick={() => {
          if (deleting.current) return;
          deleting.current = true;
          void mutation
            .mutateAsync()
            .catch(() => {})
            .finally(() => {
              deleting.current = false;
            });
        }}
      >
        {mutation.isPending ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : (
          <Trash2 size={17} />
        )}
      </Button>
      {mutation.error && <ClientError error={mutation.error} />}
    </div>
  );
}
