"use client";
import { useEffect, useState } from "react";
import { createRequestId } from "@org/core";
type Slot = {
  service: number;
  eventId: string | null;
  version: number | null;
  originalText: string;
};
export function PublicWorshipPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ date: string; items: Slot[] } | null>(
    null,
  );
  const [selected, setSelected] = useState<Slot | null>(null);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState("");
  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/public/worship", {
        cache: "no-store",
      });
      const value = await response.json();
      if (!response.ok) throw new Error(value.message);
      setData(value);
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể tải chương trình.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || !data || busy) return;
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
          date: data.date,
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
  return (
    <main
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: "32px 20px",
        fontFamily: "system-ui",
        lineHeight: 1.6,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Chương trình thờ phượng</h1>
      <p>
        Bổ sung phần việc của bạn. Nội dung gửi được lưu dưới dạng bản nháp chờ
        duyệt.
      </p>
      {data && (
        <>
          <h2 style={{ marginTop: 20, fontSize: 22 }}>
            Chúa Nhật {data.date.split("-").reverse().join("/")}
          </h2>
          <p>Chọn một Lễ để xem và bổ sung nội dung trực tuyến.</p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              margin: "16px 0",
            }}
          >
            {data.items.map((item) => (
              <button
                type="button"
                key={item.service}
                disabled={busy}
                aria-pressed={selected?.service === item.service}
                style={{
                  padding: "20px 16px",
                  textAlign: "left",
                  border: "1px solid #aaa",
                  borderRadius: 8,
                  background:
                    selected?.service === item.service ? "#dbeafe" : "#fff",
                  color: "#111",
                }}
                onClick={() => {
                  if (selected?.service === item.service) return;
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
                }}
              >
                <span style={{ display: "block", fontSize: 13 }}>
                  Chương trình thờ phượng
                </span>
                <strong style={{ display: "block", fontSize: 24 }}>
                  Lễ {item.service}
                </strong>
                <span style={{ display: "block", fontSize: 13 }}>
                  {data.date.split("-").reverse().join("/")}
                </span>
                <span
                  style={{ display: "block", marginTop: 12, color: "#1d4ed8" }}
                >
                  Mở và chỉnh sửa →
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {loading && <p role="status">Đang mở chương trình…</p>}
      {!data && !loading && (
        <button onClick={() => void load()}>Thử lại</button>
      )}
      {selected && (
        <form onSubmit={submit}>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 16 }}>
            Chỉnh sửa trực tuyến · Lễ {selected.service}
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
            Nội dung Lễ {selected.service}
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
            {busy ? "Đang lưu…" : "Lưu bản nháp chờ duyệt"}
          </button>
        </form>
      )}
      {message && (
        <p role="status" style={{ marginTop: 16 }}>
          {message}
        </p>
      )}
    </main>
  );
}
