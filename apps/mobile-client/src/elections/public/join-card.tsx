import { useState } from "react";
import { Input } from "@org/ui";
import type { PublicElectionJoin } from "@org/core";
export function PublicJoinCard({
  busy,
  onJoin,
  silent = false,
}: {
  busy: boolean;
  onJoin: (credential: PublicElectionJoin) => Promise<boolean>;
  silent?: boolean;
}) {
  const [pin, setPin] = useState("");
  const changePin = (value: string) => {
    if (busy) return;
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setPin(digits);
    if (digits.length === 6)
      void onJoin({ pin: digits }).then((ok) => {
        if (!ok) setPin("");
      });
  };
  return (
    <section
      aria-busy={busy}
      className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-[#e6e4dd] bg-white p-5 sm:p-7"
    >
      <div>
        <h1 className="text-2xl font-bold">Tham gia bầu cử</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#777368]">
          Nhập mã OTP gồm 6 chữ số do Ban kiểm phiếu cung cấp. Không cần tài
          khoản đăng nhập.
        </p>
      </div>
      <label className="block space-y-2">
        <span className="text-sm font-medium">Mã OTP 6 chữ số</span>
        <Input
          value={pin}
          onChange={(event) => changePin(event.target.value)}
          disabled={busy}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          aria-label="Mã OTP 6 chữ số"
          aria-describedby="public-pin-help"
          placeholder="000000"
          className="h-16 rounded-xl border-[#e6e4dd] bg-[#f8f7f3] text-center font-mono text-3xl tracking-[.35em] shadow-none mt-2"
        />
      </label>
      <p
        id="public-pin-help"
        role={busy ? "status" : undefined}
        className={silent ? "sr-only" : "text-center text-sm text-[#777368]"}
      >
        {busy ? "Đang kiểm tra phiên bầu cử…" : ""}
      </p>
    </section>
  );
}
