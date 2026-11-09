import { withActor } from "../../../../../lib/server/session";
import {
  assertOrigin,
  attachmentDisposition,
  body,
  failure,
} from "../../../../../lib/server/http";
import { exportSchedule } from "../../../../../lib/server/schedule-export";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertOrigin(request);
    const input = await body(request);
    const result = await withActor(request, async (db, actor) =>
      exportSchedule(db, actor, (await context.params).id, input),
    );
    return new Response(new Uint8Array(result.data), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": attachmentDisposition(result.filename),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
