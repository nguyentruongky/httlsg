import { CalendarFileEventSchema, calendarFile } from "@org/core";
import { assertOrigin, failure, HttpError } from "../../../lib/server/http";
export const runtime = "nodejs";

// Form navigation lets iOS open a real calendar response instead of a blob download.
// This converts only the submitted event and reads no private server records.
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    if (
      !request.headers
        .get("content-type")
        ?.startsWith("application/x-www-form-urlencoded")
    )
      throw new HttpError(415, "Định dạng không hợp lệ.");
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, "Thiếu dữ liệu.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.byteLength;
        if (size > 256 * 1024) {
          await reader.cancel();
          throw new HttpError(413, "Dữ liệu quá lớn.");
        }
        chunks.push(next.value);
      }
    } finally {
      reader.releaseLock();
    }
    const value = new URLSearchParams(
      Buffer.concat(chunks).toString("utf8"),
    ).get("event");
    let input: unknown;
    try {
      input = JSON.parse(value ?? "");
    } catch {
      throw new HttpError(400, "Dữ liệu không hợp lệ.");
    }
    const event = CalendarFileEventSchema.parse(input);
    return new Response(calendarFile(event), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="lich-phuc-vu.ics"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
