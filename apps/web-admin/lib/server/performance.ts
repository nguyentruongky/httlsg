import { AsyncLocalStorage } from "node:async_hooks";

type Metrics = {
  started: number;
  route: string;
  method: string;
  sql: number;
  queries: number;
  pool: number;
  auth: number;
  serialize: number;
};
const context = new AsyncLocalStorage<Metrics>();
export function addTiming(
  kind: "sql" | "pool" | "auth" | "serialize",
  milliseconds: number,
) {
  const metrics = context.getStore();
  if (!metrics) return;
  metrics[kind] += milliseconds;
  if (kind === "sql") metrics.queries++;
}
export async function measureRequest<T>(
  request: Request,
  run: () => Promise<T>,
): Promise<T> {
  if (context.getStore()) return run();
  const metrics: Metrics = {
    started: performance.now(),
    method: request.method,
    route: new URL(request.url).pathname
      .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")
      .replace(/\/departments\/[^/]+/g, "/departments/:id"),
    sql: 0,
    queries: 0,
    pool: 0,
    auth: 0,
    serialize: 0,
  };
  return context.run(metrics, async () => {
    let status = 500;
    try {
      const result = await run();
      status = result instanceof Response ? result.status : 200;
      if (result instanceof Response)
        result.headers.set(
          "Server-Timing",
          [
            `pool;dur=${metrics.pool.toFixed(1)}`,
            `auth;dur=${metrics.auth.toFixed(1)}`,
            `sql;dur=${metrics.sql.toFixed(1)}`,
            `serialize;dur=${metrics.serialize.toFixed(1)}`,
            `total;dur=${(performance.now() - metrics.started).toFixed(1)}`,
          ].join(", "),
        );
      return result;
    } catch (error) {
      const code = (error as { status?: number })?.status;
      if (typeof code === "number") status = code;
      throw error;
    } finally {
      if (process.env.PERFORMANCE_LOGGING === "true")
        console.info("request-performance", {
          route: metrics.route,
          method: metrics.method,
          status,
          queries: metrics.queries,
          poolMs: Math.round(metrics.pool),
          authMs: Math.round(metrics.auth),
          sqlMs: Math.round(metrics.sql),
          serializeMs: Math.round(metrics.serialize),
          totalMs: Math.round(performance.now() - metrics.started),
        });
    }
  });
}
