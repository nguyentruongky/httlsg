import { useEffect, useMemo, useState } from "react";
import {
  matchEventResponsibilities,
  useLocalWorshipPeopleInCharge,
  type EventResponsibilityMatch,
} from "@org/core";
import { AlertTriangle, Pencil, UserRound } from "lucide-react";

export function EventResponsibilityBadges({
  text,
  onChange,
  disabled,
}: {
  text: string;
  onChange: (text: string) => void;
  disabled: boolean;
}) {
  const directory = useLocalWorshipPeopleInCharge();
  const [draft, setDraft] = useState(text);
  const [editing, setEditing] = useState<{
    match: EventResponsibilityMatch;
    value: string;
    source: string;
  } | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setDraft(text), 400);
    return () => window.clearTimeout(timer);
  }, [text]);
  const matches = useMemo(
    () =>
      directory.data
        ? matchEventResponsibilities(draft, directory.data.people)
        : [],
    [draft, directory.data],
  );
  const current = draft === text;
  const commit = () => {
    if (!editing || disabled || !current || editing.source !== text) return;
    onChange(
      text.slice(0, editing.match.start) +
        (editing.match.text.startsWith("@") ? "@" : "") +
        editing.value.trim().replace(/^@/, "") +
        text.slice(editing.match.end),
    );
    setEditing(null);
  };
  if (!text.trim() || !matches.length) return null;
  return (
    <section
      aria-label="Người phụ trách"
      aria-busy={!current}
      className="space-y-3 rounded-xl border p-4"
    >
      {!current ? (
        <p role="status" className="sr-only">
          Đang nhận diện tên…
        </p>
      ) : null}
      {matches.map((match) => (
        <div key={match.start} className="space-y-1 text-sm">
          <span className="mr-2 text-muted-foreground">{match.role}:</span>
          {editing?.match.start === match.start ? (
            <input
              autoFocus
              aria-label={`Sửa người phụ trách ${match.role}`}
              className="max-w-full rounded-full border border-primary bg-background px-3 py-1 outline-none focus:ring-2 focus:ring-ring"
              value={editing.value}
              disabled={disabled || !current || editing.source !== text}
              onChange={(e) =>
                setEditing({ ...editing, value: e.target.value })
              }
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditing(null);
                }
              }}
            />
          ) : (
            <button
              type="button"
              disabled={disabled || !current}
              onClick={() =>
                setEditing({
                  match,
                  value: match.person?.name ?? match.text,
                  source: text,
                })
              }
              className={
                match.person
                  ? "inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-primary"
                  : "inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-amber-900"
              }
              aria-label={`Sửa ${match.role}: ${match.person?.name ?? match.text}`}
            >
              {match.person ? (
                <UserRound size={14} aria-hidden="true" />
              ) : (
                <AlertTriangle size={14} aria-hidden="true" />
              )}
              {match.person?.name ?? match.text}
              <Pencil size={12} aria-hidden="true" />
            </button>
          )}
          {!match.person ? (
            <p className="text-xs text-amber-800" role="status">
              {match.candidates.length
                ? `Có nhiều người trùng tên (${match.candidates.map((p) => p.name).join(", ")}). Nhập họ tên đầy đủ; chưa thể xác định người nhận thông báo.`
                : "Không xác định được người phụ trách. Kiểm tra lại họ tên; chưa thể gửi thông báo cho người này."}
            </p>
          ) : !match.person.hasAccount || !match.person.pushEnabled ? (
            <p className="text-xs text-amber-800">
              {!match.person.hasAccount
                ? "Nhân sự này chưa có tài khoản để nhận thông báo."
                : "Nhân sự này chưa có thiết bị bật thông báo."}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
