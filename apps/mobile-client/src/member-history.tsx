import { useKeyboardScrollSpace } from "./use-keyboard-scroll-space";
import { DateInput } from "./date-input";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, LoaderCircle, StickyNote, Trash2 } from "lucide-react";
import {
  demo,
  invalidateMemberReads,
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
import { Button, Card, Dialog } from "@org/ui";
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
function DeleteHistoryEntry({
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
export function MemberNoteDialog({
  org,
  memberId,
  name,
  onClose,
}: {
  org: string;
  memberId: string;
  name: string;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
      title="Thêm ghi chú"
      description={name}
      closeLabel="Đóng ghi chú"
      bottomSheet={mobile}
      className="member-note-sheet"
      onOpenAutoFocus={(event) => {
        const content = event.target;
        if (!(content instanceof HTMLElement)) return;
        const input = content.querySelector<HTMLTextAreaElement>("textarea");
        if (!input) return;
        event.preventDefault();
        input.focus({ preventScroll: true });
      }}
    >
      <EntryForm
        kind="notes"
        inDialog
        org={org}
        memberId={memberId}
        onClose={onClose}
        onSavingChange={setSaving}
        onUpdated={() => invalidateMemberReads(client, org)}
      />
    </Dialog>
  );
}
function EntryForm({
  kind,
  org,
  memberId,
  onClose,
  onUpdated,
  onSavingChange,
  inDialog = false,
}: {
  inDialog?: boolean;
  kind: "notes" | "visits";
  onSavingChange?: (saving: boolean) => void;
  org: string;
  memberId: string;
  onClose: () => void;
  onUpdated: () => Promise<void>;
}) {
  const client = useQueryClient();
  const noteInput = useKeyboardScrollSpace(kind === "notes" && !inDialog);
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [text, setText] = useState(""),
    [date, setDate] = useState(localToday),
    [error, setError] = useState<unknown>(null);
  const submitting = useRef(false);
  const mutation = useMutation({
    mutationFn: () =>
      kind === "notes"
        ? demo.addNote(org, memberId, { text, visibility })
        : demo.addVisit(org, memberId, { visitedOn: date }),
    onSuccess: async () => {
      await client.invalidateQueries({
        queryKey: ["organizations", org, "member-history", memberId],
        exact: true,
      });
      await onUpdated();
      onClose();
    },
  });
  return (
    <form
      data-member-note-editor={kind === "notes" ? memberId : undefined}
      aria-label={kind === "notes" ? "Thêm ghi chú" : "Thêm lần thăm viếng"}
      className={
        inDialog
          ? "member-note-form"
          : kind === "visits"
            ? "member-ui-enter member-field-editor mb-5 space-y-3 bg-white dark:bg-background"
            : "member-ui-enter mb-5 space-y-3 rounded-xl border bg-background p-4"
      }
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (submitting.current) return;
        const parsed =
          kind === "notes"
            ? NoteInputSchema.safeParse({ text, visibility })
            : VisitInputSchema.safeParse({ visitedOn: date });
        if (!parsed.success) {
          setError(new Error(parsed.error.issues[0].message));
          return;
        }
        setError(null);
        submitting.current = true;
        onSavingChange?.(true);
        void mutation
          .mutateAsync()
          .catch(() => {})
          .finally(() => {
            submitting.current = false;
            onSavingChange?.(false);
          });
      }}
    >
      <fieldset disabled={mutation.isPending} className="space-y-3">
        {kind === "visits" && (
          <DateInput
            inline
            autoFocus
            aria-label="Ngày thăm viếng"
            value={date}
            max={localToday()}
            onChange={setDate}
            className="block min-h-12 w-full min-w-0 appearance-none rounded-none border-0 bg-transparent px-0 py-2 font-[inherit] text-inherit max-lg:text-[max(16px,1em)] leading-relaxed shadow-none outline-none disabled:opacity-50"
          />
        )}
        {kind === "notes" && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Quyền xem</legend>
            <div className="flex gap-4">
              {(["private", "public"] as const).map((value) => (
                <label
                  key={value}
                  className="flex min-h-11 items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={value}
                    checked={visibility === value}
                    onChange={() => setVisibility(value)}
                  />
                  {value === "private" ? "Private" : "Public"}
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {visibility === "private"
                ? "Chỉ bạn có thể xem ghi chú này."
                : "Người có quyền đọc ghi chú thành viên có thể xem."}
            </p>
          </fieldset>
        )}
        {kind === "notes" && (
          <label className="block text-sm font-medium">
            Nội dung ghi chú
            <textarea
              ref={noteInput}
              aria-label={
                kind === "notes" ? "Nội dung ghi chú" : "Nội dung thăm viếng"
              }
              autoFocus
              maxLength={4000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-2 min-h-28 w-full rounded-lg border bg-card p-3text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
