import { DateInput } from "./date-input";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Clock, LoaderCircle, StickyNote } from "lucide-react";
import {
  demo,
  apiRequest,
  isApiMode,
  canManageMemberHistory,
  canReadMemberHistory,
  useAuth,
  localToday,
  NoteInputSchema,
  VisitInputSchema,
  type DirectoryMember,
} from "@org/core";
import { Button, Card } from "@org/ui";
import { ClientError } from "./locale";
function useHistory(org: string, member: DirectoryMember, allowed: boolean) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!target) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [target]);
  const query = useQuery({
    queryKey: ["organizations", org, "member-history", member.id],
    queryFn: ({ signal }) =>
      apiRequest<
        Pick<DirectoryMember, "notes" | "visitHistory" | "lastVisitDate">
      >(`/api/members/${member.id}/history`, { signal }),
    enabled:
      isApiMode() && member.historyLoaded === false && allowed && visible,
  });
  return {
    setTarget,
    loading: member.historyLoaded === false && !query.data,
    error: query.error,
    retry: query.refetch,
    notes: query.data?.notes ?? member.notes,
    visitHistory: query.data?.visitHistory ?? member.visitHistory,
  };
}
function calendarDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
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
              <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                <span>{note.authorName}</span>
                <time dateTime={note.createdAt}>
                  {new Date(note.createdAt).toLocaleDateString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </time>
              </div>
              <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
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
              className="py-3"
            >
              <time dateTime={visit.visitedOn} className="text-sm font-medium">
                {calendarDate(visit.visitedOn)}
              </time>
              {visit.authorName.trim() && visit.authorName.trim() !== "-" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {visit.authorName}
                </p>
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
function EntryForm({
  kind,
  org,
  memberId,
  onClose,
  onUpdated,
}: {
  kind: "notes" | "visits";
  org: string;
  memberId: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const [text, setText] = useState(""),
    [date, setDate] = useState(localToday),
    [error, setError] = useState<unknown>(null);
  const submitting = useRef(false);
  const mutation = useMutation({
    mutationFn: () =>
      kind === "notes"
        ? demo.addNote(org, memberId, { text })
        : demo.addVisit(org, memberId, { visitedOn: date }),
    onSuccess: async () => {
      await onUpdated();
      onClose();
    },
  });
  return (
    <form
      aria-label={kind === "notes" ? "Thêm ghi chú" : "Thêm lần thăm viếng"}
      className="member-ui-enter mb-5 space-y-3 rounded-xl border bg-background p-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current) return;
        const parsed =
          kind === "notes"
            ? NoteInputSchema.safeParse({ text })
            : VisitInputSchema.safeParse({ visitedOn: date });
        if (!parsed.success) {
          setError(new Error(parsed.error.issues[0].message));
          return;
        }
        setError(null);
        submitting.current = true;
        void mutation
          .mutateAsync()
          .catch(() => {})
          .finally(() => {
            submitting.current = false;
          });
      }}
    >
      <fieldset disabled={mutation.isPending} className="space-y-3">
        {kind === "visits" && (
          <label className="block text-sm font-medium">
            Ngày thăm viếng
            <DateInput
              aria-label="Ngày thăm viếng"
              value={date}
              max={localToday()}
              onChange={setDate}
              className="mt-2 h-12 text-base"
            />
          </label>
        )}
        {kind === "notes" && (
          <label className="block text-sm font-medium">
            Nội dung ghi chú
            <textarea
              aria-label={
                kind === "notes" ? "Nội dung ghi chú" : "Nội dung thăm viếng"
              }
              autoFocus
              maxLength={4000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-2 min-h-28 w-full rounded-lg border bg-card p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        )}
      </fieldset>
      {(error || mutation.error) && (
        <ClientError error={error ?? mutation.error} />
      )}
      <div className="flex gap-2">
        <Button type="submit" size="touch" disabled={mutation.isPending}>
          {mutation.isPending && (
            <LoaderCircle size={16} className="animate-spin" />
          )}
          {mutation.isPending ? "Đang lưu…" : "Lưu"}
        </Button>
        <Button
          type="button"
          size="touch"
          variant="outline"
          disabled={mutation.isPending}
          onClick={onClose}
        >
          Hủy
        </Button>
      </div>
    </form>
  );
}
