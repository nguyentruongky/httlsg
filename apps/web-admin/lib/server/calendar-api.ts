import type { AuthUser } from "@org/core";
import type { DB } from "./db";
import { withActor } from "./session";
import { assertOrigin, body, failure, json } from "./http";
export async function calendarApi<T>(
  request: Request,
  fn: (db: DB, actor: AuthUser, input: unknown) => Promise<T>,
  write = false,
  afterCommit?: (result: T) => Promise<unknown>,
) {
  try {
    if (write) assertOrigin(request);
    const input = write
      ? await body(request, 200000)
      : Object.fromEntries(new URL(request.url).searchParams);
    const result = await withActor(
      request,
      (db, actor) => fn(db, actor, input),
      write,
    );
    return json(afterCommit ? await afterCommit(result) : result);
  } catch (error) {
    return failure(error);
  }
}
