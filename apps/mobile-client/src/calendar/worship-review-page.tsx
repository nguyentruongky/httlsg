import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  apiRequest,
  createRequestId,
  applyWorshipReviewDecision,
  type WorshipReviewDecision,
  calendarKey,
  useAuth,
  worshipMerge,
  type WorshipMergePart,
} from "@org/core";
import { Button } from "@org/ui";
import { navigateClient } from "../client-router";
import {
  useWorshipContributions,
  type WorshipDraft,
} from "./worship-contributions";
type ReviewChange = {
  key: string;
  draft: WorshipDraft;
  parts: WorshipMergePart[];
  changeIds: number[];
  originalText: string;
};
type LocalSession = {
  requestId: string;
  items: WorshipDraft[];
  decisions: WorshipReviewDecision[];
  submitted?: boolean;
};
function projectSession(session: LocalSession): WorshipDraft[] {
  let items = session.items.map((item) => ({
    ...item,
    current: { ...item.current },
    change_reviews: [...(item.change_reviews ?? [])],
  }));
  for (const decision of session.decisions) {
    const draft = items.find((item) => item.id === decision.id);
    if (!draft) throw new Error("Bản duyệt trên thiết bị không hợp lệ.");
    const result = applyWorshipReviewDecision(
      draft,
      draft.current.originalText,
      decision,
    );
    for (const item of items)
      if (
        item.event_date === draft.event_date &&
        item.service_number === draft.service_number
      )
        item.current.originalText = result.text;
    draft.change_reviews.push({
      changeIds: result.changeIds,
      action: decision.action,
    });
    if (!result.remaining) items = items.filter((item) => item.id !== draft.id);
  }
  return items;
}
type Edit = { text: string; editing: boolean; snapshot: string };
function changes(items: WorshipDraft[]): ReviewChange[] {
  return items.flatMap((draft) => {
    const resolved = (draft.change_reviews ?? []).flatMap(
      (review) => review.changeIds,
    );
    const parts = worshipMerge(
      draft.base_text,
      draft.proposed_text,
      draft.current.originalText,
      resolved,
    );
    const changeIds = parts.flatMap((part) => part.changeIds);
    if (!changeIds.length) return [];
    return [
      {
        key: draft.id,
        draft,
        parts,
        changeIds,
        originalText: parts
          .flatMap((part) => (part.afterLines ? part.after.split("\n") : []))
          .join("\n"),
      },
    ];
  });
}
export function WorshipReviewPage() {
  const { user } = useAuth() ?? {};
  if (!user || !["admin", "secretary"].includes(user.role))
    return <p role="alert">Chỉ Admin và Thư ký được duyệt bản nháp.</p>;
  return <ReviewQueue userId={user.id} />;
}
function ReviewQueue({ userId }: { userId: string }) {
  const storageKey = `worship-review-session:${userId}`;
  const [session, setSession] = useState<LocalSession | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const attempted = useRef("");
  const query = useWorshipContributions();
  const client = useQueryClient();
  const queue = useMemo(
    () =>
      changes(session ? projectSession(session) : (query.data?.items ?? [])),
    [session, query.data],
  );
  const [selected, setSelected] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const found = queue.findIndex((item) => item.key === selected);
  const index = found < 0 ? 0 : found;
  const active = queue[index];
  const snapshot = active
    ? JSON.stringify([
        active.draft.current.eventId,
        active.draft.current.version,
        active.draft.current.originalText,
        active.changeIds,
      ])
    : "";
  const edit = active ? edits[active.key] : undefined;
  const stale = Boolean(edit && edit.snapshot !== snapshot);
  const text = edit && !stale ? edit.text : (active?.originalText ?? "");
  const editing = Boolean(edit && !stale && edit.editing);
  const dirty = Object.keys(edits).length > 0;
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(patch: Partial<Edit>) {
    if (active)
      setEdits((previous) => ({
        ...previous,
        [active.key]: { text, editing, snapshot, ...patch },
      }));
  }
  async function finish(leave = false) {
    if (busy) return;
    if (!session?.decisions.length) {
      if (leave) navigateClient("/client/calendar", false, "back");
      return;
    }
    attempted.current = session.requestId + ":" + session.decisions.length;
    setBusy(true);
    setMessage("");
    try {
      const submitting = { ...session, submitted: true };
      localStorage.setItem(storageKey, JSON.stringify(submitting));
      setSession(submitting);
      await apiRequest("/api/worship-contributions/session", {
        method: "POST",
        body: JSON.stringify({
          requestId: session.requestId,
          decisions: session.decisions,
        }),
      });
      localStorage.removeItem(storageKey);
      setSession(null);
      setEdits({});
      setMessage("Đã lưu các thay đổi đã duyệt và cập nhật thông báo.");
      await query.refetch();
      await client.invalidateQueries({ queryKey: calendarKey });
      if (leave) navigateClient("/client/calendar", false, "back");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Chưa lưu được. Quyết định vẫn được giữ trên thiết bị; hãy thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (
      session?.decisions.length &&
      queue.length === 0 &&
      !busy &&
      attempted.current !== session.requestId + ":" + session.decisions.length
    )
      void finish();
  }, [session, queue.length, busy]);
  function back() {
    if (
      dirty &&
      !window.confirm(
        "Bỏ phần văn bản đang sửa nhưng chưa duyệt? Các quyết định đã duyệt sẽ được lưu.",
      )
    )
      return;
    void finish(true);
  }
  function save(action: "approve-change" | "discard-change" | "reject") {
    if (!active || busy || session?.submitted) return;
    if (
      action === "reject" &&
      !window.confirm("Bỏ toàn bộ thay đổi còn lại của bản nháp này?")
    )
      return;
    const decision: WorshipReviewDecision = {
      id: active.draft.id,
      scope: "submission",
      action,
      eventId: active.draft.current.eventId,
      version: active.draft.current.version,
      ...(action !== "reject"
        ? { changeIds: active.changeIds, changeText: text }
        : {}),
    };
    try {
      const next: LocalSession = session
        ? { ...session, decisions: [...session.decisions, decision] }
        : {
            requestId: createRequestId(),
            items: query.data?.items ?? [],
            decisions: [decision],
          };
      const remaining = changes(projectSession(next));
      // Persist before dismissing so a reload never loses an approved decision.
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSession(next);
      setSelected(
        remaining[Math.min(index, remaining.length - 1)]?.key ?? null,
      );
      setEdits((previous) => {
        const updated = { ...previous };
        delete updated[active.key];
        return updated;
      });
      setMessage("");
    } catch (reason) {
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Không thể lưu tạm trên thiết bị.",
      );
    }
  }
  return (
    <section className="mx-auto max-w-4xl space-y-5 pb-8">
      <header className="sticky top-0 z-20 space-y-3 border-b bg-background py-3">
        <Button variant="ghost" onClick={back} disabled={busy}>
          <ArrowLeft size={18} />
          Lịch sinh hoạt
        </Button>
        {active && (
          <nav
            aria-label="Điều hướng thay đổi"
            className="flex items-center justify-between gap-3"
          >
            <Button
              variant="outline"
              aria-label="Thay đổi trước"
              disabled={busy || index === 0}
              onClick={() => setSelected(queue[index - 1].key)}
            >
              <ChevronLeft size={20} />
            </Button>
            <span className="text-sm font-medium">
              Thay đổi {index + 1} / {queue.length}
            </span>
            <Button
              variant="outline"
              aria-label="Thay đổi tiếp theo"
              disabled={busy || index === queue.length - 1}
              onClick={() => setSelected(queue[index + 1].key)}
            >
              <ChevronRight size={20} />
            </Button>
          </nav>
        )}
      </header>
      {message && (
        <p role="status" className="rounded-lg border p-3">
          {message}
        </p>
      )}
      {(busy || query.isPending) && (
        <p role="status">
          {busy
            ? "Đang lưu chương trình và gửi cập nhật…"
            : "Đang mở thay đổi…"}
        </p>
      )}
      {query.isError && (
        <p role="alert">
          Không thể tải nội dung mới nhất. Vui lòng tải lại trước khi duyệt.
        </p>
      )}
      {!busy && !query.isPending && !query.isError && !active && (
        <p>Không còn thay đổi chờ duyệt.</p>
      )}
      {!busy && !query.isError && active && (
        <>
          <div>
            <h2 className="text-xl font-semibold">
              Lễ {active.draft.service_number} ·{" "}
              {active.draft.event_date.split("-").reverse().join("/")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {active.draft.contributor_name
                ? `Cập nhật bởi ${active.draft.contributor_name}`
                : "Không rõ người cập nhật"}
            </p>
          </div>
          {stale && (
            <p role="alert" className="rounded-lg border border-amber-400 p-3">
              Chương trình đã thay đổi. Nội dung bên dưới đã được so sánh lại
              với bản mới nhất; hãy xem lại trước khi duyệt.
            </p>
          )}
          {editing ? (
            <label className="block text-sm">
              Chỉnh sửa toàn bộ bản cập nhật
              <textarea
                aria-label="Nội dung bản cập nhật"
                className="mt-2 block w-full rounded-lg border bg-background p-3 text-foreground"
                rows={24}
                maxLength={50000}
                value={text}
                disabled={session?.submitted}
                onChange={(event) => update({ text: event.target.value })}
              />
            </label>
          ) : (
            <article
              aria-label="Chương trình sau khi hợp nhất bản cập nhật"
              className="space-y-1 rounded-xl border bg-background p-4 sm:p-6"
            >
              {(edit && !stale
                ? worshipMerge(
                    active.draft.current.originalText,
                    text,
                    active.draft.current.originalText,
                  )
                : active.parts
              ).map((part, i) => {
                if (!part.changed)
                  return part.afterLines ? (
                    <div
                      key={i}
                      className="whitespace-pre-wrap break-words py-1"
                    >
                      {part.after}
                    </div>
                  ) : null;
                return (
                  <section
                    key={i}
                    className={`my-3 space-y-3 rounded-lg border-l-4 p-3 ${part.conflict ? "border-amber-500 bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100" : "border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100"}`}
                  >
                    <p className="text-xs font-semibold">
                      {part.conflict
                        ? "Thay đổi trùng với nội dung đã cập nhật · kiểm tra trước khi duyệt"
                        : "Nội dung cập nhật"}
                    </p>
                    {part.before && (
                      <div className="whitespace-pre-wrap wrap-break-word text-sm opacity-70">
                        <del>{part.before}</del>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap wrap-break-word">
                      {part.after || "(Xóa nội dung này)"}
                    </div>
                  </section>
                );
              })}
            </article>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={session?.submitted}
              onClick={() => save("approve-change")}
            >
              <Check size={15} />
              Lưu
            </Button>
            <Button
              variant="outline"
              disabled={session?.submitted}
              onClick={() => update({ editing: !editing })}
            >
              <Pencil size={15} />
              {editing ? "Xem trước" : "Sửa"}
            </Button>
            <Button
              variant="outline"
              disabled={session?.submitted}
              onClick={() => save("discard-change")}
            >
              <Trash2 size={15} />
              Xóa
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
