import { NextResponse } from "next/server";
import { ZodError } from "zod";
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
  return NextResponse.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
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
  );
  return json({ message: "Không thể xử lý yêu cầu. Vui lòng thử lại." }, 503);
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configured = process.env.APP_ORIGIN;
  if (process.env.NODE_ENV === "production" && !configured)
    throw new HttpError(503, "Máy chủ chưa được cấu hình.");
  const allowed = new Set([configured ?? new URL(request.url).origin]);
  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://127.0.0.1:5173");
    allowed.add("http://localhost:5173");
  }
  if (!origin || !allowed.has(origin))
    throw new HttpError(403, "Nguồn yêu cầu không hợp lệ.");
}
export async function body(request: Request) {
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
      if (total > 32768) {
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
