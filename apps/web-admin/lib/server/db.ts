import { addTiming } from "./performance";
import pg, { type PoolClient } from "pg";
pg.types.setTypeParser(1082, (value) => value);
// No connections are opened during build; DATABASE_URL is server-only.
const shared = globalThis as typeof globalThis & { churchPool?: pg.Pool };
function setting(name: string, fallback: number, maximum: number) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 && value <= maximum
    ? value
    : fallback;
}
export function pool() {
  if (!process.env.DATABASE_URL)
    throw Object.assign(new Error("DATABASE_URL is required"), {
      code: "DATABASE_URL_MISSING",
    });
  return (shared.churchPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    options: "-c timezone=Asia/Ho_Chi_Minh",
    max: setting("DB_POOL_MAX", 10, 50),
    connectionTimeoutMillis: setting("DB_CONNECT_TIMEOUT_MS", 5000, 60000),
    idleTimeoutMillis: setting("DB_IDLE_TIMEOUT_MS", 10000, 300000),
  }));
}
export async function transaction<T>(fn: (db: PoolClient) => Promise<T>) {
  const started = performance.now();
  const connection = await pool()
    .connect()
    .finally(() => addTiming("pool", performance.now() - started));
  const db = new Proxy(connection, {
    get(target, property) {
      if (property === "query")
        return (...args: unknown[]) => {
          const started = performance.now();
          const result = Reflect.apply(target.query, target, args);
          if (result && typeof result.finally === "function")
            return result.finally(() =>
              addTiming("sql", performance.now() - started),
            );
          return result;
        };
      const value = Reflect.get(target, property);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  try {
    await db.query("BEGIN");
    const value = await fn(db);
    await db.query("COMMIT");
    return value;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
}
export type DB = Pick<PoolClient, "query">;
