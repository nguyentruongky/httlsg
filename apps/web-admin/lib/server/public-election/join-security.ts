import { ZodError } from "zod";
import type { DB } from "../db";
import { HttpError } from "../http";
import { joinPublicElection } from "./actions";
import { publicCredentialHash } from "./credentials";

const lockError = () =>
  new HttpError(
    429,
    "Đã nhập sai OTP 3 lần. Thiết bị bị khóa tham gia trong 15 phút. Vui lòng thử lại sau.",
    "OTP_LOCKED",
  );

async function logAttempt(
  db: DB,
  browserHash: string,
  outcome: "accepted" | "invalid" | "locked" | "duplicate_device",
  reason: string,
  failures: number,
) {
  // Never store the submitted PIN, its hash, browser credential, or request body.
  await db.query(
    `INSERT INTO church.election_public_join_attempts(browser_hash,outcome,reason,failure_count)
     VALUES($1,$2,$3,$4)`,
    [browserHash, outcome, reason, failures],
  );
}

/** Return expected errors so the caller can commit counters/logs before responding. */
export async function attemptPublicElectionJoin(
  db: DB,
  browser: string,
  input: unknown,
) {
  const hash = publicCredentialHash("voter", browser);
  await db.query(
    "INSERT INTO church.election_public_join_guards(browser_hash) VALUES($1) ON CONFLICT DO NOTHING",
    [hash],
  );
  const guard = (
    await db.query<{ failures: number; locked: boolean }>(
      `SELECT failures,COALESCE(locked_until>now(),false) AS locked
       FROM church.election_public_join_guards WHERE browser_hash=$1 FOR UPDATE`,
      [hash],
    )
  ).rows[0];
  if (guard.locked) {
    await logAttempt(db, hash, "locked", "OTP_LOCKED", guard.failures);
    return lockError();
  }
  const reset = await db.query(
    `UPDATE church.election_public_join_guards SET failures=0,locked_until=NULL,updated_at=now()
     WHERE browser_hash=$1 AND locked_until<=now()`,
    [hash],
  );
  const failures = reset.rowCount ? 0 : guard.failures;

  await db.query("SAVEPOINT public_election_join");
  let result: Awaited<ReturnType<typeof joinPublicElection>>;
  try {
    result = await joinPublicElection(db, browser, input);
  } catch (error) {
    await db.query("ROLLBACK TO SAVEPOINT public_election_join");
    await db.query("RELEASE SAVEPOINT public_election_join");
    if (error instanceof HttpError && error.code === "DEVICE_ALREADY_JOINED") {
      await logAttempt(db, hash, "duplicate_device", error.code, failures);
      return error;
    }
    const invalid =
      error instanceof ZodError ||
      (error instanceof HttpError &&
        ["SESSION_NOT_FOUND", "SESSION_CHANGED", "OTP_ALREADY_USED"].includes(
          error.code ?? "",
        ));
    if (!invalid) throw error;
    const updated = (
      await db.query<{ failures: number }>(
        `UPDATE church.election_public_join_guards
         SET failures=LEAST(3,failures+1),
             locked_until=CASE WHEN failures+1>=3 THEN now()+interval '15 minutes' ELSE NULL END,
             updated_at=now() WHERE browser_hash=$1 RETURNING failures`,
        [hash],
      )
    ).rows[0];
    const reason =
      error instanceof HttpError ? error.code! : "INVALID_OTP_FORMAT";
    await logAttempt(db, hash, "invalid", reason, updated.failures);
    if (updated.failures >= 3) return lockError();
    return new HttpError(
      error instanceof HttpError ? error.status : 400,
      `Mã OTP không hợp lệ. Còn ${3 - updated.failures} lần thử trước khi thiết bị bị khóa.`,
      "INVALID_OTP",
    );
  }
  await db.query("RELEASE SAVEPOINT public_election_join");
  await db.query(
    "UPDATE church.election_public_join_guards SET failures=0,locked_until=NULL,updated_at=now() WHERE browser_hash=$1",
    [hash],
  );
  await logAttempt(db, hash, "accepted", "OTP_ACCEPTED", 0);
  return result;
}
