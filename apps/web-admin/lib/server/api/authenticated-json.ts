import type { AuthUser } from "@org/core";
import type { DB } from "../db";
import { assertOrigin, body, failure, json } from "../http";
import { measureRequest } from "../performance";
import { withActor } from "../session";

export type AuthenticatedOperation<T> = (
  db: DB,
  actor: AuthUser,
  input: unknown,
) => Promise<T>;

/** All modes use a transaction; only command acquires the shared advisory write lock. */
export type JsonRequestMode = "query" | "body-query" | "command";

type JsonRequestOptions<T> = {
  mode: JsonRequestMode;
  maxBodyBytes: number;
  /** Runs after withActor has committed. A rejection cannot roll back the operation. */
  afterCommit?: (result: T) => Promise<unknown>;
  mapError?: (error: unknown) => unknown;
};

/** Shared request lifecycle. Domain adapters own policy; services own authorization. */
export function authenticatedJsonApi<T>(
  request: Request,
  operation: AuthenticatedOperation<T>,
  options: JsonRequestOptions<T>,
) {
  return measureRequest(request, async () => {
    try {
      const readsBody = options.mode !== "query";
      if (readsBody) assertOrigin(request);
      const input = readsBody
        ? await body(request, options.maxBodyBytes)
        : Object.fromEntries(new URL(request.url).searchParams);
      const result = await withActor(
        request,
        (db, actor) => operation(db, actor, input),
        options.mode === "command",
      );
      return json(
        options.afterCommit ? await options.afterCommit(result) : result,
      );
    } catch (error) {
      return failure(options.mapError ? options.mapError(error) : error);
    }
  });
}
