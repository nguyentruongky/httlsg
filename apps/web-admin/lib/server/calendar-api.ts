import {
  authenticatedJsonApi,
  type AuthenticatedOperation,
} from "./api/authenticated-json";

/** Calendar policy adapter; existing route signatures remain supported. */
export function calendarApi<T>(
  request: Request,
  fn: AuthenticatedOperation<T>,
  write: boolean | "read-body" = false,
  afterCommit?: (result: T) => Promise<unknown>,
) {
  return authenticatedJsonApi(request, fn, {
    mode:
      write === true
        ? "command"
        : write === "read-body"
          ? "body-query"
          : "query",
    maxBodyBytes: 200000,
    afterCommit,
  });
}
