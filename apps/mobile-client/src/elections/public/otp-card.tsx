import {
  PUBLIC_OTP_CARD_HEADER,
  PUBLIC_OTP_CARD_INSTRUCTIONS,
} from "@org/core";
import { Badge, cn } from "@org/ui";
export type ElectionOtp = {
  id: string;
  order: number;
  pin: string;
  batchId: string;
  usedAt: string | null;
};
export function OtpCard({
  item,
  electionName,
}: {
  item: ElectionOtp;
  electionName: string;
}) {
  const used = Boolean(item.usedAt);
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border p-5 text-center shadow-none",
        used ? "border-[#d2d3d0] bg-[#f1f1ef]" : "border-[#d5e3da] bg-white",
      )}
      aria-label={`Mã tham gia số ${item.order}`}
    >
      <p
        className={cn(
          "mb-2 text-xs font-medium leading-relaxed",
          used ? "text-[#686a65]" : "text-[#5e5c55]",
        )}
      >
        {PUBLIC_OTP_CARD_HEADER}
      </p>
      <h4
        className={cn(
          "border-b pb-4 text-base font-semibold leading-relaxed",
          used
            ? "border-[#d2d3d0] text-[#686a65]"
            : "border-[#e6e4dd] text-[#215e3d]",
        )}
      >
        {electionName}
      </h4>
      <p
        className={cn(
          "my-5 font-mono text-3xl font-bold tracking-[.2em]",
          used ? "text-[#686a65]" : "text-[#1a1a17]",
        )}
      >
        {item.pin}
      </p>
      <p
        className={cn(
          "flex-1 text-sm leading-relaxed",
          used ? "text-[#686a65]" : "text-[#5e5c55]",
        )}
      >
        {PUBLIC_OTP_CARD_INSTRUCTIONS}
      </p>
      <div
        className={cn(
          "mt-5 flex items-center justify-between gap-2 text-xs",
          used ? "text-[#686a65]" : "text-[#777368]",
        )}
      >
        <span>#{item.order}</span>
        <Badge
          className={
            item.usedAt
              ? "border-stone-200 bg-stone-100 text-stone-600"
              : "border-[#d5e3da] bg-[#f1f6ef] text-[#215e3d]"
          }
        >
          {item.usedAt ? "Đã sử dụng" : "Chưa sử dụng"}
        </Badge>
      </div>
    </article>
  );
}
