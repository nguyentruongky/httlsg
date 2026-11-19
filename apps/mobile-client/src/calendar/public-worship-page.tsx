"use client";
import { useEffect, useRef, useState } from "react";
import { createRequestId, EVENT_PRESETS, renderEventPreset } from "@org/core";
type Slot = {
  service: number;
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
      setMessage(
        "Đã lưu bản nháp. Admin hoặc Thư ký sẽ xem xét và hợp nhất vào chương trình chính.",
      );
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
      !window.confirm("Bỏ nội dung chưa gửi để chuyển Lễ?")
    )
      return;
    setSelected(item);
    setText(item.originalText);
    setRequestId("");
    setMessage("");
  }
    return (
      <>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-12px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `,
          }}
        />
        <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "32px 20px",
        fontFamily: "system-ui",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        Chương trình thờ phượng Chúa
      </h1>
      <p>Xin vui lòng bổ sung phần công tác mình chịu trách nhiệm.</p>
      {data ? (
        <>
          {data.dates.map((day) => (
            <section key={day.date}>
              <h2 style={{ marginTop: 20, fontSize: 22 }}>
                Chúa Nhật {day.date.split("-").reverse().join("/")}
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                  margin: "16px 0",
                }}
              >
                {day.items.map((item) => (
                  <div
                    key={`${day.date}-${item.service}`}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <button
                      type="button"
                      disabled={busy}
                      aria-pressed={isOpen(item)}
                      style={{
                        padding: "20px 16px",
                        textAlign: "left",
                        border: "1px solid #aaa",
                        borderRadius: 8,
                        background:
                          isOpen(item) ? "#dbeafe" : "#fff",
                        color: "#111",
                        width: "100%",
                        transition: "background 0.2s ease",
                      }}
                      onClick={() => toggleItem(item)}
                    >
                      <span style={{ display: "block", fontSize: 13 }}>
                        Chương trình thờ phượng Chúa
                      </span>
                      <strong style={{ display: "block", fontSize: 24 }}>
                        Lễ {item.service}
                      </strong>
                      <span style={{ display: "block", fontSize: 13 }}>
                        {day.date.split("-").reverse().join("/")}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: 12,
                          color: "#1d4ed8",
                        }}
                      >
                        Mở và chỉnh sửa →
                      </span>
                    </button>
                    {isOpen(item) && (
                      <form
                        onSubmit={submit}
                        style={{
                          marginTop: 12,
                          padding: 16,
                          border: "1px solid #aaa",
                          borderRadius: 8,
                          background: "#fafafa",
                          width: "100%",
                          animation: "slideDown 0.3s ease-out",
                        }}
                      >
                        <h2
                          style={{
                            fontSize: 20,
                            fontWeight: 600,
                            marginBottom: 12,
                          }}
                        >
                          Chỉnh sửa trực tuyến · Lễ {selected?.service}
                        </h2>
                        <label style={{ display: "block" }}>
                          Tên người đóng góp (không bắt buộc)
                          <input
                            value={name}
                            disabled={busy}
                            maxLength={120}
                            onChange={(e) => {
                              setName(e.target.value);
                              setRequestId("");
                            }}
                            style={{
                              display: "block",
                              border: "1px solid #aaa",
                              padding: 8,
                              width: "100%",
                              marginBottom: 16,
                            }}
                          />
                        </label>
                        <label>
                          Nội dung Lễ {selected?.service}
                          <textarea
                            required
                            maxLength={50000}
                            value={text}
                            disabled={busy}
                            onChange={(e) => {
                              setText(e.target.value);
                              setRequestId("");
                            }}
                            rows={22}
                            style={{
                              display: "block",
                              width: "100%",
                              padding: 12,
                              border: "1px solid #aaa",
                              borderRadius: 8,
                              background: "#fff",
                              color: "#111",
                            }}
                          />
                        </label>
                        <button
                          disabled={busy}
                          style={{
                            marginTop: 16,
                            padding: "12px 20px",
                            background: "#1d4ed8",
                            color: "white",
                            borderRadius: 8,
                          }}
                        >
                          {busy ? "Đang lưu…" : "Lưu"}
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          <button
            style={{
              marginTop: 20,
              padding: "14px 24px",
              background: "#1d4ed8",
              color: "white",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
              border: "none",
              cursor: showAddForm ? "default" : "pointer",
            }}
            onClick={() => setShowAddForm(!showAddForm)}
            disabled={showAddForm}
          >
            {showAddForm ? "Đang mở biểu mẫu thêm…" : "+ Thêm chương trình mới"}
          </button>
          {showAddForm && (
            <section
              style={{
                marginTop: 20,
                padding: 20,
                border: "1px solid #ddd",
                borderRadius: 8,
                background: "#fafafa",
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                Thêm chương trình mới (ví dụ: lễ Giáng Sinh)
              </h2>
              <p style={{ marginBottom: 12, fontSize: 14, color: "#555" }}>
                Chọn ngày, nội dung sẽ được điền sẵn theo mẫu Chương trình tiết
                buổi.
              </p>
              <label style={{ display: "block", marginBottom: 8 }}>
                Ngày chương trình
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: 8,
                    border: "1px solid #aaa",
                    borderRadius: 6,
                    marginBottom: 12,
                  }}
                />
              </label>
              <label style={{ display: "block" }}>
                Nội dung chương trình
                <textarea
                  required
                  maxLength={50000}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  rows={22}
                  disabled={newBusy}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: 12,
                    border: "1px solid #aaa",
                    borderRadius: 8,
                    background: "#fff",
                    color: "#111",
                  }}
                />
              </label>
              <button
                disabled={newBusy || !newText.trim()}
                style={{
                  marginTop: 16,
                  padding: "12px 20px",
                  background: "#1d4ed8",
                  color: "white",
                  borderRadius: 8,
                }}
                onClick={() => void submitNew()}
              >
                {newBusy ? "Đang gửi…" : "Gửi chương trình mới"}
              </button>
            </section>
          )}
        </>
      ) : null}
      {loading && <p role="status">Đang mở chương trình…</p>}
      {!data && !loading && (
        <button onClick={() => void load()}>Thử lại</button>
      )}
      {message && (
        <p role="status" style={{ marginTop: 16 }}>
          {message}
        </p>
      )}
      {newMessage && (
        <p role="status" style={{ marginTop: 16, color: "#15803d" }}>
          {newMessage}
        </p>
      )}
      </main>
      </>
    );
}
