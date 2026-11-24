"use client";
import { useEffect, useRef, useState } from "react";
import { createRequestId, EVENT_PRESETS, renderEventPreset } from "@org/core";
type Slot = {
  service: number;
  title?: string;
  eventId: string | null;
  version: number | null;
  originalText: string;
};
export function PublicWorshipPage() {
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(false);
  const [data, setData] = useState<{
    dates: Array<{ date: string; items: Slot[] }>;
  } | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newText, setNewText] = useState("");
  const [newBusy, setNewBusy] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  async function load() {
    if (loadRef.current) return;
    loadRef.current = true;
    setLoading(true);
    try {
      const response = await fetch("/api/public/worship", {
        cache: "no-store",
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.message);
      setData(value);
      if (!newDate && value.dates.length) setNewDate(value.dates[0].date);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể tải chương trình.",
      );
    } finally {
      setLoading(false);
      loadRef.current = false;
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!data || !newDate) return;
    const preset = EVENT_PRESETS.find((p) => p.id === "worship-program");
    setNewText(
      preset
        ? renderEventPreset(preset, { date: newDate, service_number: "1" })
        : "",
    );
  }, [data, newDate]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !data || busy) return;
    const day = data.dates.find((d) =>
      d.items.some(
        (i) => i.service === selected.service && i.eventId === selected.eventId,
      ),
    );
    if (!day) return;
    setBusy(true);
    setMessage("");
    try {
      const id = requestId || createRequestId();
      setRequestId(id);
      const response = await fetch("/api/public/worship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: id,
          date: day.date,
          service: selected.service,
          eventId: selected.eventId,
          version: selected.version,
          originalText: text,
          name,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setRequestId("");
        throw new Error(result.message);
      }
      setSelected(null);
      setRequestId("");
      setMessage("Đã lưu thông tin");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể gửi. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submitNew() {
    if (!data || newBusy || !newText.trim()) return;
    setNewBusy(true);
    setNewMessage("");
    try {
      const id = createRequestId();
      const response = await fetch("/api/public/worship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: id,
          date: newDate,
          service: 1,
          eventId: null,
          version: null,
          originalText: newText,
          name,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setNewText("");
      setNewMessage(
        "Đã gửi chương trình mới. Admin hoặc Thư ký sẽ xem xét và hợp nhất.",
      );
    } catch (error) {
      setNewMessage(
        error instanceof Error
          ? error.message
          : "Không thể gửi chương trình mới. Vui lòng thử lại.",
      );
    } finally {
      setNewBusy(false);
    }
  }
  const isOpen = (item: Slot) =>
    !!selected &&
    selected.service === item.service &&
    selected.eventId === item.eventId;
  function toggleItem(item: Slot) {
    if (isOpen(item)) {
      setSelected(null);
      return;
    }
    if (
      selected &&
      text !== selected.originalText &&
      !window.confirm("Bỏ nội dung chưa gửi để chuyển chương trình?")
    )
      return;
    setSelected(item);
    setText(item.originalText);
    setRequestId("");
    setMessage("");
  }
  return (
    <main className="public-worship">
      <style>{`
        html:has(.public-worship), body:has(.public-worship) { background: #f8fafc; color-scheme: light; }
        .public-worship { max-width: 800px; min-height: 100dvh; margin: 0 auto; padding: 40px 20px 64px; background: #f8fafc; color: #1e293b; color-scheme: light; font: 16px/1.6 system-ui, sans-serif; }
        .public-worship, .public-worship * { box-sizing: border-box; }
        .public-worship h1 { margin: 0; font-size: clamp(24px, 5vw, 30px); font-weight: 700; letter-spacing: -.025em; }
        .public-worship header p { margin: 8px 0 28px; color: #64748b; }
        .public-worship h2 { margin: 0; font-size: 16px; font-weight: 600; }
        .public-worship .day { margin-top: 28px; }
        .public-worship .day h2 { margin-bottom: 10px; color: #475569; }
        .public-worship .events { display: grid; gap: 10px; }
        .public-worship .event { overflow: hidden; border: 1.5px solid #94a3b8; border-radius: 12px; background: #fff; }
        .public-worship button { font: inherit; cursor: pointer; }
        .public-worship .event-toggle { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; padding: 18px 20px; border: 0; background: transparent; color: inherit; text-align: left; }
        .public-worship .event-toggle:hover { background: #f8fafc; }
        .public-worship .event-toggle[aria-expanded="true"] { background: #eff6ff; color: #1e40af; }
        .public-worship .event-toggle strong { font-size: 17px; font-weight: 600; overflow-wrap: anywhere; }
        .public-worship .chevron { flex-shrink: 0; width: 18px; height: 18px; transition: transform .15s; }
        .public-worship .event-toggle[aria-expanded="true"] .chevron { transform: rotate(180deg); }
        .public-worship .editor { padding: 20px; border-top: 1px solid #e2e8f0; }
        .public-worship label { display: block; margin-bottom: 18px; font-size: 14px; font-weight: 500; }
        .public-worship input, .public-worship textarea { display: block; width: 100%; margin-top: 6px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; font: inherit; font-size: 16px; }
        .public-worship textarea { min-height: 280px; resize: vertical; line-height: 1.7; }
        .public-worship :is(button, input, textarea):focus-visible { outline: 3px solid #93c5fd; outline-offset: 3px; }
        .public-worship .primary, .public-worship .secondary { min-height: 44px; padding: 10px 18px; border: 1px solid transparent; border-radius: 8px; font-weight: 600; }
        .public-worship .primary { background: #1d4ed8; color: #fff; }
        .public-worship .primary:hover { background: #1e40af; }
        .public-worship .secondary { background: #fff; border-color: #cbd5e1; color: #334155; }
        .public-worship .secondary:hover { background: #f8fafc; }
        .public-worship button:disabled { opacity: .6; cursor: wait; }
        .public-worship .add-section { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0; }
        .public-worship .new-editor { margin-top: 16px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
        .public-worship .hint { margin: 0 0 18px; font-size: 14px; color: #64748b; }
        .public-worship .notice { margin: 20px 0 0; padding: 12px 16px; border-radius: 8px; background: #f1f5f9; overflow-wrap: anywhere; }
        @media (max-width: 480px) { .public-worship { padding: 24px 16px 40px; } .public-worship .event-toggle, .public-worship .editor, .public-worship .new-editor { padding: 16px; } }
        @media (prefers-reduced-motion: reduce) { .public-worship .chevron { transition: none; } }
      `}</style>
      <header>
        <h1>Chương trình thờ phượng</h1>
        <p>Chọn chương trình để bổ sung phần công tác của bạn.</p>
      </header>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {loading && <p role="status">Đang tải chương trình…</p>}
      {!data && !loading && (
        <button className="secondary" onClick={() => void load()}>
          Thử lại
        </button>
      )}
      {data && (
        <>
          {!data.dates.length && (
            <p className="notice">
              Chưa có chương trình trong khoảng thời gian này.
            </p>
          )}
          {data.dates.map((day) => (
            <section className="day" key={day.date}>
              <h2>
                {new Intl.DateTimeFormat("vi-VN", {
                  weekday: "long",
                  timeZone: "Asia/Ho_Chi_Minh",
                }).format(new Date(`${day.date}T00:00:00+07:00`))}
                {" · "}
                {day.date.split("-").reverse().join("/")}
              </h2>
              <div className="events">
                {day.items.map((item) => {
                  const editorId = `worship-${day.date}-${item.service}`;
                  const title =
                    item.title?.trim() ||
                    item.originalText
                      .split(/\r?\n/)
                      .find((line) => line.trim())
                      ?.trim() ||
                    "Chương trình";
                  return (
                    <article className="event" key={item.eventId ?? editorId}>
                      <button
                        className="event-toggle"
                        type="button"
                        disabled={busy}
                        aria-expanded={isOpen(item)}
                        aria-controls={isOpen(item) ? editorId : undefined}
                        onClick={() => toggleItem(item)}
                      >
                        <strong>{title}</strong>
                        <svg
                          className="chevron"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          aria-hidden="true"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      {isOpen(item) && (
                        <form
                          id={editorId}
                          className="editor"
                          onSubmit={submit}
                        >
                          <label>
                            Nội dung
                            <textarea
                              required
                              maxLength={50000}
                              value={text}
                              disabled={busy}
                              onChange={(e) => {
                                setText(e.target.value);
                                setRequestId("");
                              }}
                              rows={18}
                            />
                          </label>
                          <label>
                            Tên của bạn (không bắt buộc)
                            <input
                              value={name}
                              disabled={busy}
                              maxLength={120}
                              autoComplete="name"
                              onChange={(e) => {
                                setName(e.target.value);
                                setRequestId("");
                              }}
                            />
                          </label>
                          <button className="primary" disabled={busy}>
                            {busy ? "Đang gửi…" : "Gửi bản nháp"}
                          </button>
                        </form>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
          <section className="add-section">
            <button
              className="secondary"
              type="button"
              aria-expanded={showAddForm}
              aria-controls={showAddForm ? "new-worship-editor" : undefined}
              disabled={newBusy}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? "Đóng biểu mẫu" : "+ Thêm chương trình"}
            </button>
            {showAddForm && (
              <form
                id="new-worship-editor"
                className="new-editor"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitNew();
                }}
              >
                <p className="hint">Chọn ngày để điền sẵn nội dung theo mẫu.</p>
                <label>
                  Ngày chương trình
                  <input
                    type="date"
                    required
                    value={newDate}
                    disabled={newBusy}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </label>
                <label>
                  Nội dung
                  <textarea
                    required
                    maxLength={50000}
                    value={newText}
                    rows={18}
                    disabled={newBusy}
                    onChange={(e) => setNewText(e.target.value)}
                  />
                </label>
                <label>
                  Tên của bạn (không bắt buộc)
                  <input
                    value={name}
                    disabled={newBusy}
                    maxLength={120}
                    autoComplete="name"
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <button
                  className="primary"
                  disabled={newBusy || !newText.trim()}
                >
                  {newBusy ? "Đang gửi…" : "Gửi bản nháp"}
                </button>
              </form>
            )}
            {newMessage && (
              <p className="notice" role="status">
                {newMessage}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
