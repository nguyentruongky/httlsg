import { withActor } from "../../../../../lib/server/session";
import { exportCalendarDocument } from "../../../../../lib/server/calendar-export";
import { assertOrigin, body, failure } from "../../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(r: Request) {
  try {
    assertOrigin(r);
    const input = await body(r, 2100000);
    return await withActor(
      r,
      async (db, a) => {
        const { buffer, filename } = await exportCalendarDocument(db, a, input);
        return new Response(new Uint8Array(buffer), {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
      false,
    );
  } catch (error) {
    return failure(error);
  }
}
