"use client";
import { useDebouncedSearch } from "./use-debounced-search";
import { useEffect, useState } from "react";
import {
  EmailOtpRequestSchema,
  PhoneOtpRequestSchema,
  VerifyOtpSchema,
  apiRequest,
  advanceAuthEpoch,
  useAuth,
  type AuthUser,
} from "@org/core";
import { Button, Dropdown, Input, Popover } from "@org/ui";
import { Check, ChevronDown, LoaderCircle, Search } from "lucide-react";
import { AuthFrame } from "./auth-frame";
export function OtpOnboarding({
  onBack,
  onSuccess,
  initialIdentifier = "",
  initialMessage,
  initialDelivery,
}: {
  initialIdentifier?: string;
  initialMessage?: string;
  initialDelivery?: "ADMIN" | "EMAIL";
  onBack: () => void;
  onSuccess: (user: AuthUser) => void;
}) {
  const auth = useAuth();
  const [delivery, setDelivery] = useState(
    initialDelivery ?? (initialIdentifier.includes("@") ? "EMAIL" : "ADMIN"),
  );
  const [method, setMethod] = useState<"phone" | "email">(
      initialIdentifier.includes("@") ? "email" : "phone",
    ),
    [step, setStep] = useState<"request" | "verify">(
      initialMessage ? "verify" : "request",
    );
  const [identifier, setIdentifier] = useState(initialIdentifier),
    [name, setName] = useState(""),
    [department, setDepartment] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [message, setMessage] = useState(initialMessage ?? "");
  const [options, setOptions] = useState<{ id: string; name: string }[]>([]),
    [search, setSearch] = useState(""),
    [open, setOpen] = useState(false),
    [catalogError, setCatalogError] = useState(false);
  const debouncedSearch = useDebouncedSearch(search);
  useEffect(() => {
    if (method === "email" || step === "verify") return;
    const controller = new AbortController();
    void apiRequest<{ departments: { id: string; name: string }[] }>(
      "/api/auth/access-options",
      { signal: controller.signal },
    )
      .then((data) => setOptions(data.departments))
      .catch((e) => {
        if (e.name !== "AbortError") setCatalogError(true);
      });
    return () => controller.abort();
  }, [method, step]);
  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (step === "request") {
        const parsed =
          method === "phone"
            ? PhoneOtpRequestSchema.safeParse({
                phone: identifier,
                full_name: name,
                department_id: department,
              })
            : EmailOtpRequestSchema.safeParse({ email: identifier });
        if (!parsed.success)
          throw new Error(
            parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra thông tin.",
          );
        if (method === "phone" && !department)
          throw new Error("Vui lòng chọn Ban ngành.");
        const result = await apiRequest<{
          message: string;
          delivery?: "ADMIN" | "EMAIL";
        }>(
          method === "phone"
            ? "/api/auth/request-phone-otp"
            : "/api/auth/request-email-otp",
          { method: "POST", body: JSON.stringify(parsed.data) },
        );
        setMessage(result.message);
        setDelivery(
          result.delivery ?? (method === "phone" ? "ADMIN" : "EMAIL"),
        );
        setStep("verify");
      } else {
        const parsed = VerifyOtpSchema.safeParse({
          identifier,
          otp_code: code,
        });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const result = await apiRequest<{ user: AuthUser }>(
          "/api/auth/verify-otp",
          { method: "POST", body: JSON.stringify(parsed.data) },
        );
        advanceAuthEpoch();
        await auth?.refresh();
        onSuccess(result.user);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xử lý yêu cầu.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title={step === "verify" ? "Nhập mã OTP" : "Yêu cầu truy cập"}
      description={
        step === "verify"
          ? delivery === "ADMIN"
            ? "Liên hệ Admin để xác minh danh tính và nhận mã OTP, sau đó nhập mã bên dưới."
            : "Kiểm tra email và nhập mã OTP gồm 6 chữ số."
          : "Sử dụng số điện thoại hoặc email để bắt đầu."
      }
    >
      <form
        className="mt-7 space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) void submit();
        }}
      >
        {step === "request" ? (
          <>
            {initialIdentifier ? (
              <p className="break-all rounded-xl bg-muted/60 px-4 py-3 text-[16px]">
                {identifier}
              </p>
            ) : (
              <>
                <div
                  className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
                  aria-label="Phương thức xác thực"
                >
                  {(["phone", "email"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={method === value}
                      className={`min-h-11 rounded-lg text-[15px] font-medium ${method === value ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                      disabled={busy}
                      onClick={() => {
                        setMethod(value);
                        setIdentifier("");
                        setError(null);
                      }}
                    >
                      {value === "phone" ? "Số điện thoại" : "Email"}
                    </button>
                  ))}
                </div>
                <label className="block text-[15px] font-medium">
                  {method === "phone" ? "Số điện thoại" : "Email"}
                  <Input
                    type={method === "email" ? "email" : "tel"}
                    autoComplete={method === "email" ? "email" : "tel"}
                    className="mt-2 h-13 rounded-xl px-4 text-[17px]"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                </label>
              </>
            )}
            {method === "phone" && (
              <>
                <label className="block text-[15px] font-medium">
                  Họ và tên
                  <Input
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 h-13 rounded-xl px-4 text-[17px]"
                  />
                </label>
                <div>
                  <p
                    id="request-department-label"
                    className="mb-2 text-[15px] font-medium"
                  >
                    Ban ngành
                  </p>
                  <Popover.Root open={open} onOpenChange={setOpen}>
                    <Popover.Trigger asChild>
                      <Dropdown.Trigger
                        indicator={false}
                        aria-labelledby="request-department-label request-department-value"
                        aria-haspopup="listbox"
                        className="h-13 w-full justify-between rounded-xl text-left text-[16px]"
                        disabled={busy || catalogError}
                      >
                        <span
                          id="request-department-value"
                          className="truncate"
                        >
                          {options.find((d) => d.id === department)?.name ??
                            "Chọn Ban ngành"}
                        </span>
                        <ChevronDown size={18} />
                      </Dropdown.Trigger>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content
                        align="start"
                        sideOffset={8}
                        className="z-50 w-(--radix-popover-trigger-width) rounded-xl border bg-popover p-3 shadow-lg"
                      >
                        <div className="relative mb-2">
                          <Search size={17} className="absolute left-3 top-3" />
                          <Input
                            autoFocus
                            aria-label="Tìm Ban ngành"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="min-h-11 pl-10"
                          />
                        </div>
                        <div
                          role="listbox"
                          aria-label="Ban ngành"
                          className="max-h-60 overflow-y-auto"
                        >
                          {options
                            .filter((d) =>
                              d.name
                                .toLocaleLowerCase("vi")
                                .includes(
                                  debouncedSearch.toLocaleLowerCase("vi"),
                                ),
                            )
                            .map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                role="option"
                                aria-selected={d.id === department}
                                className="flex min-h-12 w-full items-center justify-between rounded-lg px-2 text-left text-[16px]"
                                onClick={() => {
                                  setDepartment(d.id);
                                  setOpen(false);
                                  setSearch("");
                                }}
                              >
                                {d.name}
                                {d.id === department && <Check size={18} />}
                              </button>
                            ))}
                        </div>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                  {catalogError && (
                    <p role="alert" className="mt-2 text-sm text-destructive">
                      Không thể tải Ban ngành. Vui lòng tải lại trang.
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <p
              role="status"
              className="rounded-xl bg-accent p-4 text-[15px] leading-relaxed text-primary"
            >
              {message}
            </p>
            <label className="block text-[15px] font-medium">
              Mã OTP
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="mt-2 h-14 rounded-xl text-center text-[24px] tracking-[.35em]"
              />
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="touch"
          className="h-13 w-full rounded-xl"
          disabled={
            busy ||
            (step === "request" &&
              method === "phone" &&
              (!department || catalogError))
          }
        >
          {busy && <LoaderCircle size={18} className="animate-spin" />}
          {busy
            ? "Đang xử lý…"
            : step === "verify"
              ? "Xác thực mã OTP"
              : method === "phone"
                ? "Gửi yêu cầu"
                : "Gửi mã qua email"}
        </Button>
        {step === "verify" && (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={() => {
              setStep("request");
              setCode("");
              setError(null);
            }}
          >
            Thay đổi thông tin hoặc gửi lại mã
          </Button>
        )}
        <button
          type="button"
          disabled={busy}
          className="min-h-11 w-full text-center text-[15px] text-primary underline underline-offset-4"
          onClick={onBack}
        >
          Về đăng nhập
        </button>
      </form>
    </AuthFrame>
  );
}
