import { z } from "zod";
import {
  PushSubscribeInput,
  PushUnsubscribeInput,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { requestToken, tokenHash } from "./session";
import { rateLimit } from "./limits";
import { endpointHash, encryptSubscription, pushConfig } from "./push-config";
// Refresh families remain stable across access/refresh rotation, and stop at logout/revocation.
export const LIVE_PUSH = `s.revoked_at IS NULL AND u.enabled AND u.deleted_at IS NULL AND NOT u.must_reset_password AND u.is_password_set AND EXISTS(SELECT 1 FROM church.refresh_tokens r WHERE r.family_id=s.refresh_family AND r.user_id=s.user_id AND NOT r.revoked AND r.auth_version=u.auth_version AND r.purpose='access' AND (r.expires_at IS NULL OR r.expires_at>now()))`;
async function family(db: DB, actor: AuthUser, request: Request) {
  const row = (
    await db.query(
      "SELECT refresh_family FROM church.sessions WHERE token_hash=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at>now()",
      [tokenHash(requestToken(request)), actor.id],
    )
  ).rows[0];
  if (!row?.refresh_family)
    throw new HttpError(401, "Vui lòng đăng nhập lại để bật thông báo.");
  return row.refresh_family as string;
}
export async function subscribePush(
  db: DB,
  actor: AuthUser,
  request: Request,
  input: unknown,
) {
  const value = PushSubscribeInput.parse(input);
  await rateLimit("push-subscribe:" + actor.id, 30);
  if (!pushConfig())
    throw new HttpError(503, "Thông báo trên thiết bị chưa sẵn sàng.");
  const bound = await family(db, actor, request),
    hash = endpointHash(value.endpoint);
  const count = (
    await db.query(
      `SELECT count(*)::int n FROM church.push_subscriptions s JOIN church.users u ON u.id=s.user_id WHERE s.user_id=$1 AND ${LIVE_PUSH}`,
      [actor.id],
    )
  ).rows[0].n;
  if (
    count >= 20 &&
    !(
      await db.query(
        `SELECT 1 FROM church.push_subscriptions s JOIN church.users u ON u.id=s.user_id WHERE s.user_id=$1 AND s.endpoint_hash=$2 AND ${LIVE_PUSH}`,
        [actor.id, hash],
      )
    ).rowCount
  )
    throw new HttpError(400, "Tối đa 20 thiết bị nhận thông báo.");
  const result = await db.query(
    `INSERT INTO church.push_subscriptions(user_id,endpoint_hash,subscription_ciphertext,refresh_family,user_agent,device_label) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(endpoint_hash) DO UPDATE SET subscription_ciphertext=EXCLUDED.subscription_ciphertext,refresh_family=EXCLUDED.refresh_family,user_agent=EXCLUDED.user_agent,device_label=EXCLUDED.device_label,revoked_at=NULL,updated_at=now() WHERE push_subscriptions.user_id=EXCLUDED.user_id RETURNING id`,
    [
      actor.id,
      hash,
      encryptSubscription({ endpoint: value.endpoint, keys: value.keys }),
      bound,
      (request.headers.get("user-agent") ?? "").slice(0, 500),
      value.deviceLabel ?? "",
    ],
  );
  if (!result.rowCount)
    throw new HttpError(
      409,
      "Thiết bị đã liên kết với tài khoản khác. Tắt đăng ký trên trình duyệt rồi bật lại.",
    );
  return { success: true };
}
export async function unsubscribePush(db: DB, actor: AuthUser, input: unknown) {
  const value = PushUnsubscribeInput.parse(input);
  await rateLimit("push-unsubscribe:" + actor.id, 30);
  await db.query(
    "UPDATE church.push_subscriptions SET revoked_at=now(),updated_at=now() WHERE user_id=$1 AND endpoint_hash=$2 AND revoked_at IS NULL",
    [actor.id, endpointHash(value.endpoint)],
  );
  return { success: true };
}
export async function pushStatus(db: DB, actor: AuthUser, input: unknown) {
  const value = z
      .object({
        fingerprint: z
          .string()
          .regex(/^[0-9a-f]{64}$/)
          .optional(),
      })
      .strict()
      .parse(input),
    config = pushConfig();
  const result = (
    await db.query(
      `SELECT count(*)::int n,COALESCE(bool_or(s.endpoint_hash=$2),false) active FROM church.push_subscriptions s JOIN church.users u ON u.id=s.user_id WHERE s.user_id=$1 AND ${LIVE_PUSH}`,
      [actor.id, value.fingerprint ?? ""],
    )
  ).rows[0];
  return {
    configured: Boolean(config),
    publicKey: config?.publicKey ?? null,
    activeCount: result.n,
    active: result.active,
  };
}
