import { useState } from "react";
import {
  canManageMemberHistory,
  canReadMemberHistory,
  useAuth,
  type DirectoryMember,
} from "@org/core";
import { ClientError } from "../locale";
import { useMemberHistory as useHistory } from "./use-member-history";
import { HistoryEntryForm as EntryForm } from "./history-entry-form";
import { DeleteHistoryEntry } from "./delete-history-entry";
import { Button } from "@org/ui";
import { Clock } from "lucide-react";
import { formatVisitDate as calendarDate } from "./format-visit-date";
export function VisitHistory({
  org,
  member,
  editable,
  onUpdated,
}: {
  org: string;
  member: DirectoryMember;
  editable: boolean;
  onUpdated: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const auth = useAuth();
  const history = useHistory(
    org,
    member,
    member.canReadVisitHistory !== false &&
      (!auth?.user || canReadMemberHistory(auth.user, member.id)),
  );
  if (
    member.canReadVisitHistory === false ||
    (auth?.user && !canReadMemberHistory(auth.user, member.id))
  )
    return null;

  return (
    <div className="mt-4 border-t pt-4 pb-3">
      <div ref={history.setTarget} className="mb-4 flex items-center gap-2">
        <Clock size={18} className="text-primary" />
        <h3 className="text-base font-semibold">Lịch sử thăm viếng</h3>
        {editable &&
          (!auth?.user || canManageMemberHistory(auth.user, member.id)) &&
          !adding && (
            <button
              type="button"
              aria-label="Thêm lần thăm viếng"
              className="ml-auto inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setAdding(true)}
            >
              Thêm
            </button>
          )}
      </div>
      {adding && (
        <EntryForm
          kind="visits"
          org={org}
          memberId={member.id}
          onClose={() => setAdding(false)}
          onUpdated={onUpdated}
        />
      )}
      {history.error ? (
        <Button variant="outline" onClick={() => void history.retry()}>
          Thử tải lại lịch sử
        </Button>
      ) : history.loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải lịch sử…
        </p>
      ) : history.visitHistory.length ? (
        <ol aria-label="Các lần thăm viếng" className="divide-y">
          {history.visitHistory.map((visit) => (
            <li
              key={`${visit.source}-${visit.id}-${visit.visitedOn}`}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <time
                  dateTime={visit.visitedOn}
                  className="text-sm font-medium"
                >
                  {calendarDate(visit.visitedOn)}
                </time>
                {visit.authorName.trim() && visit.authorName.trim() !== "-" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {visit.authorName}
                  </p>
                )}
              </div>
              {editable &&
                (!auth?.user ||
                  canManageMemberHistory(auth.user, member.id)) && (
                  <DeleteHistoryEntry
                    org={org}
                    memberId={member.id}
                    kind="visits"
                    entryId={visit.id}
                    visitedOn={visit.visitedOn}
                    onUpdated={onUpdated}
                  />
                )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          Chưa có lịch sử thăm viếng.
        </p>
      )}
    </div>
  );
}
