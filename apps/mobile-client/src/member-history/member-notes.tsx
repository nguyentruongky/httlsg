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
import { Button, Card } from "@org/ui";
import { StickyNote } from "lucide-react";
export function MemberNotes({
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
    member.canReadNotes !== false &&
      (!auth?.user || canReadMemberHistory(auth.user, member.id)),
  );
  if (
    member.canReadNotes === false ||
    (auth?.user && !canReadMemberHistory(auth.user, member.id))
  )
    return null;
  return (
    <Card className="p-5">
      <div ref={history.setTarget} className="mb-4 flex items-center gap-3">
        <StickyNote size={20} className="text-primary" />
        <h2 className="font-semibold">Ghi chú</h2>
        {editable &&
          (!auth?.user || canManageMemberHistory(auth.user, member.id)) &&
          !adding && (
            <button
              type="button"
              aria-label="Thêm ghi chú"
              className="ml-auto inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setAdding(true)}
            >
              Thêm
            </button>
          )}
      </div>
      {adding && (
        <EntryForm
          kind="notes"
          org={org}
          memberId={member.id}
          onClose={() => setAdding(false)}
          onUpdated={onUpdated}
        />
      )}
      {history.error ? (
        <Button variant="outline" onClick={() => void history.retry()}>
          Thử tải lại ghi chú
        </Button>
      ) : history.loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Đang tải ghi chú…
        </p>
      ) : history.notes.length ? (
        <ol aria-label="Danh sách ghi chú" className="space-y-3">
          {history.notes.map((note) => (
            <li key={note.id} className="rounded-xl border bg-background p-4">
              <div className="mb-2 flex items-start gap-2">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{note.authorName}</span>
                  <span className="rounded-full border px-2 py-0.5">
                    {note.visibility === "private" ? "Private" : "Public"}
                  </span>
                  <time dateTime={note.createdAt}>
                    {new Date(note.createdAt).toLocaleDateString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </time>
                </div>
                {editable &&
                  (!auth?.user ||
                    canManageMemberHistory(auth.user, member.id)) && (
                    <DeleteHistoryEntry
                      org={org}
                      memberId={member.id}
                      kind="notes"
                      entryId={note.id}
                      onUpdated={onUpdated}
                    />
                  )}
              </div>
              <p className="whitespace-pre-wrap wrap-break-word text-base leading-relaxed">
                {note.text}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">Chưa có ghi chú.</p>
      )}
    </Card>
  );
}
