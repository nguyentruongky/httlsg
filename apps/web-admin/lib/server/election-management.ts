import { z } from "zod";
import type { AuthUser } from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { electionLog, requireElection } from "./elections";

type Election = {
  id: number;
  name: string;
  description: string;
  status: string;
  version: number;
};
const Version = z.number().int().nonnegative();
const conflict = () =>
  new HttpError(
    409,
    "Cuộc bầu cử đã thay đổi. Vui lòng tải lại trước khi tiếp tục.",
  );

/** Caller holds the election row lock and owns the transaction. */
export async function editElection(
  db: DB,
  actor: AuthUser,
  election: Election,
  input: unknown,
  request: Request,
) {
  requireElection(actor, true);
  const data = z
    .object({
      name: z.string().trim().min(1).max(200),
      description: z.string().trim().max(5000).default(""),
      version: Version,
    })
    .strict()
    .parse(input);
  if (data.version !== election.version) throw conflict();
  const started = await db.query(
    "SELECT 1 FROM church.election_rounds WHERE election_id=$1 AND (status<>'draft' OR phase<>'draft' OR opened_at IS NOT NULL) LIMIT 1",
    [election.id],
  );
  if (election.status !== "draft" || started.rowCount)
    throw new HttpError(
      409,
      "Chỉ được sửa cuộc bầu cử ở trạng thái Chưa bắt đầu.",
    );
  const result = await db.query(
    "UPDATE church.election_contests SET name=$2,description=$3,version=version+1 WHERE id=$1 AND version=$4 AND deleted_at IS NULL RETURNING *",
    [election.id, data.name, data.description, data.version],
  );
  if (!result.rowCount) throw conflict();
  await electionLog(
    db,
    actor,
    election.id,
    null,
    "election_edited",
    {
      previous: { name: election.name, description: election.description },
      current: { name: data.name, description: data.description },
      version: result.rows[0].version,
    },
    request,
  );
  return result.rows[0];
}

export async function deleteElection(
  db: DB,
  actor: AuthUser,
  election: Election,
  input: unknown,
  request: Request,
) {
  requireElection(actor, true);
  const data = z.object({ version: Version }).strict().parse(input);
  if (data.version !== election.version) throw conflict();
  const running = await db.query(
    "SELECT 1 FROM church.election_rounds WHERE election_id=$1 AND status='open' LIMIT 1",
    [election.id],
  );
  if (running.rowCount)
    throw new HttpError(409, "Đóng cuộc bầu cử đang diễn ra trước khi xóa.");
  const result = await db.query(
    "UPDATE church.election_contests SET deleted_at=now(),deleted_by=$2,version=version+1 WHERE id=$1 AND version=$3 AND deleted_at IS NULL RETURNING id",
    [election.id, actor.id, data.version],
  );
  if (!result.rowCount) throw conflict();
  await electionLog(
    db,
    actor,
    election.id,
    null,
    "election_deleted",
    {
      name: election.name,
      previousStatus: election.status,
      version: data.version + 1,
    },
    request,
  );
  return { deleted: true, id: election.id };
}
