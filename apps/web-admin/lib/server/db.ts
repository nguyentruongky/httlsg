import pg, { type PoolClient } from "pg";
pg.types.setTypeParser(1082, (value) => value);
// No connections are opened during build; DATABASE_URL is server-only.
const shared = globalThis as typeof globalThis & { churchPool?: pg.Pool };
export function pool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return (shared.churchPool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    options: "-c timezone=Asia/Ho_Chi_Minh",
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  }));
}
export async function transaction<T>(fn: (db: PoolClient) => Promise<T>) {
  const db = await pool().connect();
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
