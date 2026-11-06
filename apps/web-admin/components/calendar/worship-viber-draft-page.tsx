"use client";
import { useQuery } from "@tanstack/react-query";
import {
  apiRequest,
  canCalendar,
  createWorshipViberDraftLink,
  getWorshipViberDiagnostics,
  useAuth,
} from "@org/core";
import { Card, ErrorMessage, WorshipNotificationPanel } from "@org/ui";
import { ClientAuthGate } from "../../../mobile-client/src/login-form";
type Draft = {
  message: string;
  viberLink: string;
  missingFields: { label: string }[];
  version: number;
};
export function WorshipViberDraftPage({ requestId }: { requestId: string }) {
  // Login happens at this same URL, so opening the email on a new phone does
  // not lose the draft destination. No token or event content appears in its URL.
  return (
    <ClientAuthGate>
      <SavedDraft requestId={requestId} />
    </ClientAuthGate>
  );
}
function SavedDraft({ requestId }: { requestId: string }) {
  const user = useAuth()?.user;
  const allowed =
    user?.role === "admin" && canCalendar(user, "calendar.notify");
  const query = useQuery({
    queryKey: ["worship-viber-draft", user?.id, requestId],
    queryFn: () =>
      apiRequest<Draft>(
        `/api/worship-viber-drafts/${encodeURIComponent(requestId)}?latest=1`,
      ),
    enabled: allowed,
    staleTime: 0,
    gcTime: 0,
  });
  async function loadMessage() {
    const result = await query.refetch();
    if (result.error || !result.data)
      throw result.error ?? new Error("Không thể tải bản nháp.");
    return result.data.message;
  }
  function reportLinkDiagnostics() {
    if (process.env.NODE_ENV === "development" && query.data)
      console.debug(
        "Viber direct-link diagnostics (counts only)",
        getWorshipViberDiagnostics(query.data.message),
      );
  }
  return (
    <main className="mx-auto min-h-dvh max-w-2xl space-y-5 px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] [overflow-wrap:anywhere]">
      <a
        href="/dashboard/calendar"
        className="inline-flex min-h-11 items-center text-primary underline"
      >
        Về lịch sinh hoạt
      </a>
      <h1 className="text-2xl font-semibold">Bản nháp Viber</h1>
      {!allowed ? (
        <p role="alert">Chỉ Admin có quyền xem bản nháp này.</p>
      ) : query.isPending ? (
        <p role="status">Đang tải bản nháp…</p>
      ) : query.error ? (
        <ErrorMessage error={query.error} />
      ) : (
        query.data && (
          <>
            <p className="text-sm text-muted-foreground">
              Nội dung mới nhất đã lưu được giữ đầy đủ bên dưới. Chọn mở Viber
              để xem toàn bộ bản nháp, kiểm tra và gửi trong Viber.
            </p>
            <WorshipNotificationPanel
              missingFields={query.data.missingFields}
              message={query.data.message}
              viberLink={createWorshipViberDraftLink(query.data.message)}
              onOpen={reportLinkDiagnostics}
              loadMessage={loadMessage}
            />
            <Card className="p-4">
              <label className="block text-sm font-medium">
                Nội dung đầy đủ
                <textarea
                  aria-label="Nội dung đầy đủ"
                  readOnly
                  value={query.data.message}
                  onFocus={(event) => event.currentTarget.select()}
                  className="mt-3 min-h-80 w-full rounded-lg border bg-background p-3 text-base leading-relaxed"
                />
              </label>
            </Card>
          </>
        )
      )}
    </main>
  );
}
