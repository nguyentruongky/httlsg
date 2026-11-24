import { randomInt } from "node:crypto";
import { z } from "zod";
import type { AuthUser } from "@org/core";
import type { DB } from "../db";
import { HttpError } from "../http";
import { electionLog, requireElection } from "../elections";
import { publicCredentialHash } from "./credentials";
import { encryptElectionOtp, decryptElectionOtp } from "./otp-crypto";

const BatchInput = z
  .object({ count: z.number().int().min(1).max(1000), requestId: z.uuid() })
  .strict();

export async function publicElectionOtps(
  db: DB,
  actor: AuthUser,
  election: any,
  input: any,
  method: string,
  request: Request,
) {
  requireElection(actor, true);
  const session = (
    await db.query(
      "SELECT * FROM church.election_public_sessions WHERE election_id=$1 FOR UPDATE",
      [election.id],
    )
  ).rows[0];
  if (!session)
    throw new HttpError(
      409,
      "Lưu địa điểm và cấu hình phiên trước khi tạo OTP.",
    );
  let batchId: string | undefined;
  if (method === "POST") {
    if (
      election.status === "archived" ||
      !election.online_voting_enabled ||
      !session.enabled
    )
      throw new HttpError(409, "Bật bầu cử trực tuyến trước khi tạo OTP.");
    const data = BatchInput.parse(input);
    batchId = data.requestId;
    await db.query("SELECT pg_advisory_xact_lock(74298355)");
    // Same request can be retried without issuing another batch.
    const existing = await db.query(
      "SELECT session_id,count(*)::int count FROM church.election_public_otps WHERE batch_id=$1 GROUP BY session_id",
      [batchId],
    );
    if (
      existing.rowCount &&
      (existing.rows[0].session_id !== session.id ||
        existing.rows[0].count !== data.count)
    )
      throw new HttpError(409, "Yêu cầu tạo OTP đã được sử dụng.");
    if (!existing.rowCount) {
      const hashes = new Set<string>();
      const encrypted: string[] = [];
      for (
        let attempt = 0;
        hashes.size < data.count && attempt < 30;
        attempt++
      ) {
        const candidates = new Map<string, string>();
        for (let i = 0; i < (data.count - hashes.size) * 2; i++) {
          const pin = String(randomInt(1000000)).padStart(6, "0");
          if (pin === "123456") continue; // Reserved for development entry.
          const hash = publicCredentialHash("pin", pin);
          if (!hashes.has(hash)) candidates.set(hash, pin);
        }
        const occupied = await db.query(
          "SELECT pin_hash FROM church.election_public_otps WHERE pin_hash=ANY($1::text[]) UNION ALL SELECT pin_hash FROM church.election_public_sessions WHERE pin_hash=ANY($1::text[])",
          [[...candidates.keys()]],
        );
        const unavailable = new Set(occupied.rows.map((row) => row.pin_hash));
        for (const [hash, pin] of candidates) {
          if (unavailable.has(hash)) continue;
          hashes.add(hash);
          encrypted.push(encryptElectionOtp(pin, session.id));
          if (hashes.size === data.count) break;
        }
      }
      if (hashes.size !== data.count)
        throw new HttpError(503, "Không đủ mã OTP khả dụng. Vui lòng thử lại.");
      await db.query(
        `INSERT INTO church.election_public_otps(session_id,batch_id,pin_hash,encrypted_pin,created_by)
        SELECT $1,$2,h.hash,p.pin,$5 FROM unnest($3::text[]) WITH ORDINALITY h(hash,n)
        JOIN unnest($4::text[]) WITH ORDINALITY p(pin,n) USING(n)`,
        [session.id, batchId, [...hashes], encrypted, actor.id],
      );
      await electionLog(
        db,
        actor,
        election.id,
        null,
        "public_otps_generated",
        { batchId, count: data.count },
        request,
      );
    }
  }
  const rows = (
    await db.query(
      "SELECT id,batch_id,encrypted_pin,created_at,consumed_at FROM church.election_public_otps WHERE session_id=$1 ORDER BY created_at,id",
      [session.id],
    )
  ).rows;
  const items = rows.map((row, index) => ({
    id: row.id,
    order: index + 1,
    batchId: row.batch_id,
    pin: decryptElectionOtp(row.encrypted_pin, session.id),
    createdAt: new Date(row.created_at).toISOString(),
    usedAt: row.consumed_at ? new Date(row.consumed_at).toISOString() : null,
  }));
  if (method === "GET" && input.download === "1") {
    const { electionOtpDocument } = await import("./otp-document");
    await electionLog(
      db,
      actor,
      election.id,
      null,
      "public_otps_downloaded",
      { count: items.length, format: "pdf" },
      request,
    );
    return {
      bytes: await electionOtpDocument(election.name, items),
      format: "pdf",
      filename: `E${election.id}_danh-sach-ma.pdf`,
    };
  }
  return { items, batchId, electionName: election.name };
}
