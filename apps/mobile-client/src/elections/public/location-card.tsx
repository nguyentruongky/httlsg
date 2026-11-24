import type { PublicElectionSession } from "@org/core";
import { Button } from "@org/ui";
import { MapPin } from "lucide-react";
export function PublicLocationCard({
  session,
  busy,
  attempt,
  onVerify,
}: {
  session: PublicElectionSession;
  busy: boolean;
  attempt: { distance: number; accuracy: number } | null;
  onVerify: () => void;
}) {
  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-[#e6e4dd] bg-white p-6 text-center">
      <MapPin className="mx-auto text-[#215e3d]" size={36} />
      <h2 className="mt-4 text-xl font-bold">Xác thực vị trí</h2>
      <p className="mt-3 text-sm leading-relaxed text-[#777368]">
        Bạn cần ở trong phạm vi {session.radiusMeters} m tính từ địa điểm bầu
        cử. Vui lòng bật GPS và cho phép truy cập vị trí.
      </p>
      {attempt && (
        <div className="my-5 rounded-xl bg-[#f8f7f3] p-4 text-sm">
          <p>
            Khoảng cách: <strong>{Math.round(attempt.distance)} m</strong>
          </p>
          <p className="mt-1 text-[#777368]">
            Sai số GPS: ±{Math.round(attempt.accuracy)} m
          </p>
        </div>
      )}
      {attempt && attempt.distance > session.radiusMeters && (
        <p className="mt-3 text-sm text-red-700">
          Bạn ở quá xa địa điểm bầu cử và không đủ điều kiện tham gia. Hãy đến
          đúng địa điểm rồi thử lại.
        </p>
      )}
      <Button
        className="mt-5 min-h-12 w-full rounded-xl bg-[#215e3d] text-white hover:bg-[#19492f]"
        disabled={busy}
        onClick={onVerify}
      >
        {busy ? "Đang xác thực GPS…" : "Xác thực vị trí của tôi"}
      </Button>
    </section>
  );
}
