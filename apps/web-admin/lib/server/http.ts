import { addTiming } from "./performance";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { networkInterfaces } from "node:os";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
export function json(value: unknown, status = 200) {
  const started = performance.now();
  const response = NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
  addTiming("serialize", performance.now() - started);
  return response;
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json(
      { message: error.message, ...(error.code ? { code: error.code } : {}) },
      error.status,
    );
  if (error instanceof ZodError)
    return json(
      { message: error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
      400,
    );
  const code = (error as { code?: string })?.code;
  if (code === "23505")
    return json({ message: "Email hoặc tên đã được sử dụng." }, 409);
  if (code === "23503")
    return json({ message: "Dữ liệu liên kết không hợp lệ." }, 400);
  if (code === "23514") return json({ message: "Dữ liệu không hợp lệ." }, 400);
  // Never return queries, hashes, credentials, or driver errors.
  console.error(
    "Request failed",
    error instanceof Error ? error.name : "UnknownError",
    typeof code === "string" && /^[A-Z0-9_]{2,40}$/.test(code)
      ? code
      : "UNKNOWN",
  );
  return json({ message: "Không thể xử lý yêu cầu. Vui lòng thử lại." }, 503);
}
/** Attachment header that keeps non-ASCII (Vietnamese) filenames intact while
 * still offering an ASCII fallback for clients that ignore RFC 5987. */
export function attachmentDisposition(filename: string) {
  const ascii = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/["\\]/g, "");
  return `attachment; filename="${ascii || "download.docx"}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configured = process.env.APP_ORIGIN;
  if (process.env.NODE_ENV === "production" && !configured)
    throw new HttpError(503, "Máy chủ chưa được cấu hình.");
  const allowed = new Set([configured ?? new URL(request.url).origin]);
  if (process.env.NODE_ENV !== "production") {
    const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
    for (const addresses of Object.values(networkInterfaces())) {
      for (const address of addresses ?? []) {
        if (address.family === "IPv4") localHosts.add(address.address);
      }
    }
    for (const host of localHosts) {
      allowed.add(`http://${host}:3000`);
      allowed.add(`http://${host}:5173`);
    }
    if (configured) {
      const client = new URL(configured);
      client.port = "5173";
      allowed.add(client.origin);
    }
  }
  if (!origin || !allowed.has(origin))
    throw new HttpError(403, "Nguồn yêu cầu không hợp lệ.");
}
export async function body(request: Request, maxBytes = 32768) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Yêu cầu cần dùng JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Thiếu dữ liệu.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Dữ liệu quá lớn.");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON không hợp lệ.");
  }
}
