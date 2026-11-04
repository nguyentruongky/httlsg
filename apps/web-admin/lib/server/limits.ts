import { pool } from "./db";
import { tokenHash } from "./session";
import { HttpError } from "./http";
export async function rateLimit(key: string, max: number) {
  const result = await pool().query(
    `INSERT INTO church.login_limits(key_hash,attempts,window_start) VALUES($1,1,now()) ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN church.login_limits.window_start<now()-interval '15 minutes' THEN 1 ELSE church.login_limits.attempts+1 END,window_start=CASE WHEN church.login_limits.window_start<now()-interval '15 minutes' THEN now() ELSE church.login_limits.window_start END RETURNING attempts`,
    [tokenHash(key)],
  );
  if (result.rows[0].attempts > max)
    throw new HttpError(
      429,
      "Đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút.",
    );
}
