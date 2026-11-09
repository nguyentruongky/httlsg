import { withActor } from "../../../../lib/server/session";
import {
  assertOrigin,
  attachmentDisposition,
  body,
  failure,
} from "../../../../lib/server/http";
import { exportReceptionPreview } from "../../../../lib/server/schedule-export";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const input = await body(request, 1100000);
    const result = await withActor(request, (db, actor) =>
      exportReceptionPreview(db, actor, input),
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
