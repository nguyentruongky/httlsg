import { timingSafeEqual } from "node:crypto";
import { failure, json } from "../../../../lib/server/http";
import {
  reassignChoirMemberships,
  currentChurchYear,
} from "../../../../lib/server/choir-memberships";
import { transaction } from "../../../../lib/server/db";

export const runtime = "nodejs";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !authorization.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice("Bearer ".length));
  const expected = Buffer.from(secret);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET)
    return json({ message: "CRON_SECRET is not configured." }, 503);
  if (!authorized(request)) return json({ message: "Unauthorized." }, 401);
  try {
    const year = currentChurchYear();
    const result = await transaction(async (db) => {
      await db.query("SELECT pg_advisory_xact_lock(74298331)");
      return reassignChoirMemberships(db, year);
    });
    return json({ year, ...result });
  } catch (error) {
    return failure(error);
  }
}
