import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@org/core";
import { Button } from "@org/ui";
import { ClipboardList } from "lucide-react";

export function CountedBallotsCard({
  electionId,
  value,
  editable,
  onSaved,
}: {
  electionId: number;
  value: number;
  editable: boolean;
  onSaved: (count: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const baseline = useRef(value);
  const pending = useRef(false);
  useEffect(() => {
    if (!dirty) {
      setDraft(String(value));
      baseline.current = value;
    }
  }, [value, dirty]);
  const save = async () => {
    if (!editable || !dirty || pending.current) return;
    const count = Number(draft);
    if (!draft || !Number.isInteger(count) || count < 0 || count > 2147483647) {
      setError("Nhập số nguyên không âm hợp lệ.");
      return;
    }
    pending.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiRequest(`/api/elections/${electionId}/counted-ballots`, {
        method: "POST",
        body: JSON.stringify({ count, previous: baseline.current }),
      });
      baseline.current = count;
      onSaved(count);
      setDirty(false);
      setMessage("Đã lưu");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thể lưu số phiếu.",
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  };
  return (
    <div className="flex min-h-40 flex-col justify-between gap-3 rounded-2xl border-2 border-[#cfd2c9] bg-white p-4 shadow-none sm:p-5">
      <dt className="flex items-start justify-between gap-2 text-sm font-medium leading-relaxed text-[#60635b] sm:text-base">
        <label htmlFor={`counted-ballots-${electionId}`}>
          Tổng số phiếu đếm được
        </label>
        <span className="flex size-8 shrink-0 items-center justify-center text-[#216e4a]">
          <ClipboardList size={24} aria-hidden="true" />
        </span>
      </dt>
      <dd className="text-3xl font-bold leading-none tracking-tight text-[#1e211c] tabular-nums sm:text-[2.125rem]">
        {editable ? (
          <input
            id={`counted-ballots-${electionId}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            disabled={saving}
            onChange={(event) => {
              if (!/^\d*$/.test(event.target.value)) return;
              setDraft(event.target.value);
              setDirty(true);
              setError("");
              setMessage("");
            }}
            onBlur={() => void save()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void save();
              }
            }}
            aria-describedby={`counted-ballots-help-${electionId}`}
            className="w-full min-w-0 rounded-md py-1 text-inherit font-inherit outline-none "
          />
        ) : (
          value
        )}
      </dd>
      <div
        id={`counted-ballots-help-${electionId}`}
        className="text-xs leading-relaxed text-[#8b8f85]"
      >
        <p>Vui lòng nhập tay</p>
        {saving && <p role="status">Đang lưu…</p>}
        {message && <p role="status">{message}</p>}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        {dirty && !saving && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void save()}
            className="mt-1"
          >
            Lưu
          </Button>
        )}
      </div>
    </div>
  );
}
