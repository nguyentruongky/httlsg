import { z } from "zod";
import { compactDecrypt } from "jose";
import {
  normalizeIdentifier,
  type AuthUser,
  type AdminOtpPage,
} from "@org/core";
import { otpSecret as secret } from "./otp-secret";
import type { DB } from "./db";
import { HttpError } from "./http";
import { requirePermission, isAdministrativeRead } from "./session";
export async function listAdminOtps(
  db: DB,
  actor: AuthUser,
  input: unknown,
): Promise<AdminOtpPage> {
  if (
    (actor.role !== "admin" && !isAdministrativeRead(actor)) ||
    actor.requiresPasswordSetup
  )
    throw new HttpError(403, "Chỉ Admin có quyền xem mã OTP.");
  requirePermission(actor, "leader.otps.read");
  await db.query("SET LOCAL statement_timeout = '8s'");
  await db.query("SET LOCAL lock_timeout = '3s'");
  const q = z
    .object({
      page: z.coerce.number().int().min(1).max(10000).default(1),
      q: z.string().trim().max(200).default(""),
      type: z.enum(["all", "EMAIL", "PHONE_LEADER"]).default("all"),
      status: z
        .enum(["all", "pending", "closed", "expired", "unavailable"])
        .default("pending"),
    })
    .strict()
    .parse(input);
  const identifier = `COALESCE(o.identifier,CASE WHEN o.type='EMAIL' THEN u.email ELSE u.phone END)`;
  const channel = `CASE WHEN position('@' IN ${identifier})>0 THEN 'EMAIL' ELSE 'PHONE_LEADER' END`;
  const state = `CASE WHEN o.is_used OR o.attempts>=5 THEN 'closed' WHEN o.expires_at<=now() THEN 'expired' WHEN NOT u.enabled OR u.deleted_at IS NOT NULL OR (o.type='PHONE_LEADER' AND (o.department_id IS DISTINCT FROM u.department_id)) THEN 'unavailable' ELSE 'pending' END`;
  const values: unknown[] = [],
    conditions: string[] = [`(${state})='pending'`];
  const bind = (value: unknown) => {
    values.push(value);
    return `$${values.length}`;
  };
  if (q.type !== "all") conditions.push(`(${channel})=${bind(q.type)}`);
  if (q.status !== "all") conditions.push(`(${state})=${bind(q.status)}`);
  if (q.q) {
    const text = `public.unaccent(lower(concat_ws(' ',u.full_name,u.email,u.phone,${identifier},d.name))) ILIKE '%'||public.unaccent(lower(${bind(q.q.replace(/[\\%_]/g, "\\$&"))}::text))||'%'`;
    const phone = normalizeIdentifier(q.q);
    conditions.push(
      `(${text}${phone?.startsWith("+") ? ` OR u.phone=${bind(phone)}` : ""})`,
    );
  }
  const from = `FROM church.otps o JOIN church.users u ON u.id=o.user_id LEFT JOIN church.departments d ON d.id=COALESCE(o.department_id,u.department_id)`;
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = (
    await db.query(`SELECT count(*)::int total ${from} ${where}`, values)
  ).rows[0].total;
  const offset = bind((q.page - 1) * 20);
  const rows = (
    await db.query(
      `SELECT o.id,o.user_id,u.full_name,u.email,u.phone,d.name department_name,o.type actual_type,${channel} type,${identifier} identifier,o.otp_ciphertext,o.created_at,o.expires_at,${state} status ${from} ${where} ORDER BY o.created_at DESC,o.id LIMIT 20 OFFSET ${offset}`,
      values,
    )
  ).rows;
  const items: AdminOtpPage["items"] = [];
  for (const row of rows) {
    let code: string | null = null;
    if (row.status === "pending" && row.actual_type === "PHONE_LEADER") {
      try {
        const decrypted = await compactDecrypt(
          row.otp_ciphertext,
          secret("leader-otp-display"),
          {
            keyManagementAlgorithms: ["dir"],
            contentEncryptionAlgorithms: ["A256GCM"],
          },
        );
        const value = new TextDecoder().decode(decrypted.plaintext);
        if (/^[0-9]{6}$/.test(value)) code = value;
      } catch {
        /* Old/invalid ciphertext must not hide the other requests. */
      }
    }
    items.push({
      id: row.id,
      user_id: row.user_id,
      full_name: row.full_name,
      email: row.identifier?.includes("@") ? row.identifier : row.email,
      phone: row.identifier?.startsWith("+") ? row.identifier : row.phone,
      department_name: row.department_name,
      type: row.type,
      status: row.status,
      otp_code: code,
      delivery: row.actual_type === "EMAIL" ? "EMAIL" : "ADMIN",
      code_state: code
        ? "available"
        : row.actual_type === "EMAIL" && row.status === "pending"
          ? "email"
          : "unavailable",
      created_at: new Date(row.created_at).toISOString(),
      expires_at: row.expires_at
        ? new Date(row.expires_at).toISOString()
        : null,
    });
  }
  return { items, total, page: q.page, pageSize: 20 };
}
