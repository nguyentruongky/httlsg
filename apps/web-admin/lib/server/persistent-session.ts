import { randomBytes, randomUUID } from "node:crypto";
import type { AuthUser } from "@org/core";
import { type DB, transaction } from "./db";
import {
  actorById,
  createSession,
  SESSION_SECONDS,
  SETUP_SESSION_SECONDS,
  tokenHash,
  cookieName,
  cookieOptions,
} from "./session";
import { assertOrigin, HttpError, json } from "./http";
export const refreshCookieName = () =>
  process.env.NODE_ENV === "production"
    ? "__Host-church-refresh"
    : "church-refresh";
// Browsers cap persistent cookies (commonly 400 days). Rotation renews the cookie;
// database expiry is NULL for full sessions, never an arbitrarily long JWT.
export const refreshCookieOptions = (setup = false) => ({
  ...cookieOptions(setup ? SETUP_SESSION_SECONDS : 400 * 86400),
  sameSite: "strict" as const,
});
export function refreshFrom(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(refreshCookieName() + "="))
      ?.slice(refreshCookieName().length + 1) ?? ""
  );
}
export function protectRefresh(request: Request) {
  assertOrigin(request);
  if (
    request.headers.get("x-church-csrf") !== "1" ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new HttpError(403, "Nguồn yêu cầu không hợp lệ.");
}
function clearCookies(response: ReturnType<typeof json>) {
  response.cookies.set(refreshCookieName(), "", {
    ...refreshCookieOptions(),
    maxAge: 0,
  });
  response.cookies.set(cookieName(), "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
export async function newRefresh(
  db: DB,
  user: AuthUser,
  request: Request,
  family = randomUUID(),
  expires?: string | Date | null,
) {
  const token = randomBytes(32).toString("base64url");
  const expiry =
    expires === undefined
      ? user.requiresPasswordSetup
        ? new Date(Date.now() + SETUP_SESSION_SECONDS * 1000)
        : null
      : expires;
  await db.query(
    "INSERT INTO church.refresh_tokens(user_id,family_id,token_hash,user_agent,expires_at,auth_version,purpose) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      user.id,
      family,
      tokenHash(token),
      (request.headers.get("user-agent") ?? "").slice(0, 512),
      expiry,
      user.authVersion,
      user.requiresPasswordSetup ? "password_setup" : "access",
    ],
  );
  return { token, family };
}
function reply(user: AuthUser, accessToken: string, refresh: string) {
  const response = json({
    user,
    accessToken,
    expiresIn: SESSION_SECONDS,
    requires_password_setup: user.requiresPasswordSetup,
    redirectTo: user.requiresPasswordSetup ? "/set-password" : "/client",
  });
  response.cookies.set(
    refreshCookieName(),
    refresh,
    refreshCookieOptions(user.requiresPasswordSetup),
  );
  // Remove the retired access cookie without ever putting an access token in one.
  response.cookies.set(cookieName(), "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
export async function browserSession(
  user: AuthUser,
  accessToken: string,
  request: Request,
  db?: DB,
) {
  const run = async (connection: DB) => {
    await connection.query("SELECT pg_advisory_xact_lock(74298331)");
    const current = await actorById(connection, user.id);
    if (!current || current.authVersion !== user.authVersion)
      throw new HttpError(
        401,
        "Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.",
      );
    const previous = (
      await connection.query(
        "SELECT family_id FROM church.refresh_tokens WHERE token_hash=$1",
        [tokenHash(refreshFrom(request))],
      )
    ).rows[0];
    if (previous) {
      await connection.query(
        "UPDATE church.refresh_tokens SET revoked=true,revoked_reason='logout' WHERE family_id=$1 AND NOT revoked",
        [previous.family_id],
      );
      await connection.query(
        "UPDATE church.sessions SET revoked_at=now() WHERE refresh_family=$1 AND revoked_at IS NULL",
        [previous.family_id],
      );
    }
    const { token, family } = await newRefresh(connection, user, request);
    const bound = await connection.query(
      "UPDATE church.sessions SET refresh_family=$2 WHERE token_hash=$1 AND revoked_at IS NULL AND auth_version=$3 RETURNING id",
      [tokenHash(accessToken), family, user.authVersion],
    );
    if (!bound.rowCount)
      throw new HttpError(401, "Phiên đăng nhập không hợp lệ.");
    return reply(user, accessToken, token);
  };
  return db ? run(db) : transaction(run);
}
export async function refreshSession(request: Request) {
  protectRefresh(request);
  const token = refreshFrom(request);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    return clearCookies(json({ message: "Vui lòng đăng nhập." }, 401));
  // Return failures after committing revocation. Throwing inside this transaction
  // would roll back replay detection and silently keep the stolen session alive.
  let replayDetected = false;
  const result = await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(74298331)");
    const row = (
      await db.query(
        "SELECT * FROM church.refresh_tokens WHERE token_hash=$1 FOR UPDATE",
        [tokenHash(token)],
      )
    ).rows[0];
    if (!row) return null;
    if (row.revoked) {
      replayDetected = true;
      await db.query(
        "UPDATE church.refresh_tokens SET revoked=true,revoked_reason='replay' WHERE family_id=$1 AND NOT revoked",
        [row.family_id],
      );
      await db.query(
        "UPDATE church.sessions SET revoked_at=now() WHERE refresh_family=$1 AND revoked_at IS NULL",
        [row.family_id],
      );
      // One event per replayed credential, rather than an unbounded alert stream.
      if (row.revoked_reason !== "replay") {
        await db.query(
          "INSERT INTO church.security_events(user_id,kind) VALUES($1,'refresh_replay')",
          [row.user_id],
        );
        await db.query(
          "UPDATE church.refresh_tokens SET revoked_reason='replay' WHERE id=$1",
          [row.id],
        );
      }
      return null;
    }
    const user = await actorById(db, row.user_id);
    if (
      !user ||
      user.authVersion !== row.auth_version ||
      user.requiresPasswordSetup !== (row.purpose === "password_setup") ||
      (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())
    ) {
      await db.query(
        "UPDATE church.refresh_tokens SET revoked=true,revoked_reason='security_change' WHERE id=$1",
        [row.id],
      );
      return null;
    }
    await db.query(
      "UPDATE church.refresh_tokens SET revoked=true,revoked_reason='rotated',last_used_at=now() WHERE id=$1",
      [row.id],
    );
    const rotated = await newRefresh(
      db,
      user,
      request,
      row.family_id,
      row.expires_at,
    );
    const access = await createSession(db, user);
    await db.query(
      "UPDATE church.sessions SET refresh_family=$2 WHERE token_hash=$1",
      [tokenHash(access), row.family_id],
    );
    return reply(user, access, rotated.token);
  });
  return (
    result ??
    clearCookies(
      json(
        {
          message: "Phiên đăng nhập đã bị thu hồi. Vui lòng đăng nhập lại.",
          ...(replayDetected ? { code: "REFRESH_REPLAY" } : {}),
        },
        401,
      ),
    )
  );
}
export async function logoutSession(request: Request, all = false) {
  protectRefresh(request);
  const token = refreshFrom(request);
  await transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(74298331)");
    const row = (
      await db.query(
        "SELECT user_id,family_id FROM church.refresh_tokens WHERE token_hash=$1 FOR UPDATE",
        [tokenHash(token)],
      )
    ).rows[0];
    if (!row) return;
    // All-device logout requires an active credential, not a stolen retired one.
    if (all) {
      const active = await db.query(
        "SELECT 1 FROM church.refresh_tokens WHERE token_hash=$1 AND NOT revoked AND (expires_at IS NULL OR expires_at>now())",
        [tokenHash(token)],
      );
      if (!active.rowCount) throw new HttpError(401, "Vui lòng đăng nhập lại.");
      await db.query(
        "UPDATE church.users SET auth_version=auth_version+1,updated_at=now() WHERE id=$1",
        [row.user_id],
      );
    }
    await db.query(
      `UPDATE church.refresh_tokens SET revoked=true,revoked_reason=$2 WHERE ${all ? "user_id" : "family_id"}=$1 AND NOT revoked`,
      [all ? row.user_id : row.family_id, all ? "all_devices" : "logout"],
    );
    await db.query(
      `UPDATE church.push_subscriptions SET revoked_at=now(),updated_at=now() WHERE ${all ? "user_id" : "refresh_family"}=$1 AND revoked_at IS NULL`,
      [all ? row.user_id : row.family_id],
    );
    await db.query(
      `UPDATE church.sessions SET revoked_at=now() WHERE ${all ? "user_id" : "refresh_family"}=$1 AND revoked_at IS NULL`,
      [all ? row.user_id : row.family_id],
    );
  });
  return clearCookies(json({ ok: true }));
}
