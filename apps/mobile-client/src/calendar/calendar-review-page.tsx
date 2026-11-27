"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Trash2, Edit3 } from "lucide-react";
import { apiRequest, useAuth, calendarKey } from "@org/core";
import { Button, Card, ErrorMessage, Badge } from "@org/ui";
import { navigateClient } from "../client-router";

type CalendarContribution = {
  id: string;
  requestId: string;
  eventId: string | null;
  eventDate: string;
  baseEventId: string | null;
  baseVersion: number | null;
  baseText: string;
  proposedText: string;
  contributorName: string;
  contributorFullName: string;
  contributorEmail: string;
  status: string;
  createdAt: string;
};

export function CalendarReviewPage() {
  const { user } = useAuth() ?? {};
  if (!user || !["admin", "secretary"].includes(user.role))
    return (
      <p role="alert">Chỉ Admin và Thư ký được duyệt bản đóng góp lịch.</p>
    );

  const query = useQuery({
    queryKey: [...calendarKey, "contributions"],
    queryFn: () =>
      apiRequest<{ items: CalendarContribution[] }>(
        "/api/events/contributions",
      ),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [action, setAction] = useState<"merge" | "reject" | null>(null);
  const [reviewText, setReviewText] = useState("");

  const pending = query.data?.items.filter((i) => i.status === "pending") ?? [];
  const item = pending.find((i) => i.id === selectedId);

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!item || !action) return;
      return apiRequest<{ saved: boolean }>(
        "/api/events/contributions/review",
        {
          method: "POST",
          body: JSON.stringify({
            id: item.id,
            action,
            ...(action === "merge" && reviewText ? { reviewText } : {}),
          }),
        },
      );
    },
    onSuccess: () => {
      setSelectedId(null);
      setAction(null);
      setReviewText("");
      void query.refetch();
      void client.invalidateQueries({ queryKey: calendarKey });
    },
  });

  const busy = reviewMutation.isPending;
  const canReview = Boolean(item) && !busy;

  return (
    <section className="mx-auto max-w-4xl space-y-5 pb-8">
      <header className="sticky top-0 z-20 space-y-3 border-b bg-background py-3">
        <Button
          variant="ghost"
          onClick={() => navigateClient("/client/calendar", false, "back")}
        >
          <ArrowLeft size={18} />
          Lịch sinh hoạt
        </Button>
        <h1 className="text-xl font-semibold">Duyệt đóng góp chỉnh sửa lịch</h1>
        <p className="text-sm text-muted-foreground">
          {pending.length} bản đóng góp chờ duyệt
        </p>
      </header>

      {query.isError && <ErrorMessage error={query.error} />}

      {query.isPending && <p role="status">Đang tải bản đóng góp…</p>}

      {!query.isPending && !query.isError && pending.length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">
            Không có bản đóng góp chờ duyệt.
          </p>
        </div>
      )}

      {!query.isPending && !query.isError && pending.length > 0 && (
        <div className="space-y-3">
          {pending.map((c) => (
            <Card
              key={c.id}
              className={selectedId === c.id ? "ring-2 ring-primary" : ""}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-medium">{c.contributorFullName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {c.contributorEmail} ·{" "}
                      {new Date(c.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <Badge
                    className={
                      c.status === "pending"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {c.status === "pending"
                      ? "Chờ duyệt"
                      : c.status === "merged"
                        ? "Đã hợp nhất"
                        : "Từ chối"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Ngày: {c.eventDate}
                  {c.eventId
                    ? " · Cập nhật chương trình tồn tại"
                    : " · Tạo chương trình mới"}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground">
                      Nội dung gốc
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {c.baseText || "(trống)"}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <p className="text-xs font-medium text-blue-900">
                      Nội dung đề xuất
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {c.proposedText}
                    </p>
                  </div>
                </div>

                {selectedId === c.id ? (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Hành động duyệt</p>
                    <label className="block mb-2">
                      <input
                        type="radio"
                        checked={action === "merge"}
                        onChange={() => setAction("merge")}
                        className="sr-only peer"
                      />
                      <div className="peer-checked:text-primary flex items-center gap-2">
                        <Check
                          size={14}
                          className="peer-checked:text-primary"
                        />
                        Hợp nhất vào lịch chính
                      </div>
                    </label>
                    <label className="block mb-2">
                      <input
                        type="radio"
                        checked={action === "reject"}
                        onChange={() => setAction("reject")}
                        className="sr-only peer"
                      />
                      <div className="peer-checked:text-destructive flex items-center gap-2">
                        <Trash2
                          size={14}
                          className="peer-checked:text-destructive"
                        />
                        Từ chối
                      </div>
                    </label>
                    {action === "merge" && (
                      <label className="block mb-3">
                        <span className="text-xs text-muted-foreground block mb-1">
                          Nội dung hợp nhất (để trống để dùng bản đề xuất)
                        </span>
                        <textarea
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          rows={3}
                          className="w-full rounded-xl border bg-background p-2 text-base outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Nhập toàn bộ nội dung chương trình nếu cần điều chỉnh…"
                        />
                      </label>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={!action || busy}
                        onClick={() => {
                          setSelectedId(null);
                          setAction(null);
                          setReviewText("");
                        }}
                      >
                        Hủy
                      </Button>
                      <Button
                        disabled={!action || busy}
                        onClick={() => void reviewMutation.mutate()}
                      >
                        {busy
                          ? "Đang xử lý…"
                          : action === "merge"
                            ? "Hợp nhất"
                            : "Từ chối"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedId(c.id)}
                    >
                      <Edit3 size={14} />
                      Xem chi tiết
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
