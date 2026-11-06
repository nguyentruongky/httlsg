import pg from "pg";
import { transaction } from "../../../../lib/server/db";
import { authenticate, requestToken } from "../../../../lib/server/session";
import { otpDepartments } from "../../../../lib/server/leader-access";
import { failure, HttpError } from "../../../../lib/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const token = requestToken(request);
  async function authorize() {
    return transaction(async (db) => {
      const actor = await authenticate(db, token);
      if (actor.requiresPasswordSetup)
        throw new HttpError(403, "Vui lòng đặt mật khẩu trước.");
      return {
        actor,
        departments: await otpDepartments(db, actor),
      };
    });
  }
  let scope: Awaited<ReturnType<typeof authorize>>;
  try {
    scope = await authorize();
  } catch (error) {
    return failure(error);
  }
  const listener = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  try {
    await listener.connect();
    await listener.query("LISTEN church_team_events");
    await listener.query("LISTEN church_auth_events");
  } catch (error) {
    await listener.end().catch(() => {});
    return failure(error);
  }
  const encoder = new TextEncoder();
  let stopped = false,
    timer: ReturnType<typeof setInterval> | undefined,
    queue = Promise.resolve();
  let controller: ReadableStreamDefaultController<Uint8Array>;
  function stop() {
    if (stopped) return;
    stopped = true;
    if (timer) clearInterval(timer);
    request.signal.removeEventListener("abort", stop);
    void listener.end().catch(() => {});
    try {
      controller?.close();
    } catch {}
  }
  function send(event: string, data: unknown) {
    if (!stopped)
      controller.enqueue(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
      );
  }
  async function check(event?: { channel: string; payload?: string }) {
    if (stopped) return;
    try {
      let payload: any = {};
      if (event?.payload) {
        try {
          payload = JSON.parse(event.payload);
        } catch {
          return;
        }
      }
      if (
        event?.channel === "church_auth_events" &&
        payload.user_id !== scope.actor.id
      )
        return;
      scope = await authorize();
      if (event?.channel === "church_team_events")
        send("team-change", {
          kind: payload.kind,
          id: payload.id,
          removed: payload.removed,
        });
      else if (!event) send("resync", {});
    } catch (error) {
      if (error instanceof HttpError && [401, 403].includes(error.status))
        send("access-revoked", { status: error.status });
      stop();
    }
  }
  const stream = new ReadableStream<Uint8Array>({
    start(current) {
      controller = current;
      controller.enqueue(encoder.encode("retry: 2000\n\n"));
      send("resync", {});
      listener.on("notification", (event) => {
        queue = queue.then(() => check(event)).catch(() => stop());
      });
      listener.on("error", stop);
      request.signal.addEventListener("abort", stop, { once: true });
      timer = setInterval(() => {
        queue = queue.then(() => check()).catch(() => stop());
      }, 15000);
      timer.unref?.();
      if (request.signal.aborted) stop();
    },
    cancel() {
      stop();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
