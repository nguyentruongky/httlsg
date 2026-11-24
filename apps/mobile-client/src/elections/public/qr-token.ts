export function publicQrCredential(
  value: string,
): { pin: string } | { token: string } {
  const raw = value.trim();
  if (/^\d{6}$/.test(raw)) return { pin: raw };
  if (/^[A-Za-z0-9_-]{43}$/.test(raw)) return { token: raw };
  try {
    const url = new URL(raw, window.location.origin);
    if (
      url.origin !== window.location.origin ||
      !/^\/vote\/?$/.test(url.pathname)
    )
      throw new Error();
    const token =
      new URLSearchParams(url.hash.slice(1)).get("join") ??
      url.searchParams.get("token");
    if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) return { token };
  } catch {
    /* Only this application's signed-invite format is accepted. */
  }
  throw new Error(
    "Mã QR không phải mã tham gia bầu cử hợp lệ. Vui lòng dùng QR hoặc PIN do Ban kiểm phiếu cung cấp.",
  );
}
