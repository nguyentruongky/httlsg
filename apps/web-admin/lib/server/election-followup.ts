import type { DB } from "./db";
import type { AuthUser } from "@org/core";
import { HttpError } from "./http";
export async function createFollowupElection(
  db: DB,
  actor: AuthUser,
  source: any,
  ids: number[],
  rule: string,
  value: number,
) {
  if (
    (
      await db.query(
        "SELECT 1 FROM church.election_round_candidates WHERE carried_from_round=$1 LIMIT 1",
        [source.id],
      )
    ).rowCount
  )
    throw new HttpError(409, "Đã tạo cuộc bầu cử tiếp theo từ danh sách này.");
  const election = (
    await db.query(
      "INSERT INTO church.election_contests(name,description,created_by,scrutineer_teams,next_candidate_no) SELECT name,description,$2,scrutineer_teams,next_candidate_no FROM church.election_contests WHERE id=$1 RETURNING *",
      [source.election_id, actor.id],
    )
  ).rows[0];
  await db.query(
    "INSERT INTO church.election_scrutineers(election_id,user_id,team_id,team_name,team_sort_order,position,added_by) SELECT $2,user_id,team_id,team_name,team_sort_order,position,$3 FROM church.election_scrutineers WHERE election_id=$1 AND round_id IS NULL",
    [source.election_id, election.id, actor.id],
  );
  await db.query(
    "INSERT INTO church.election_nominees(election_id,member_id,candidate_no,full_name,name_search,extra) SELECT $2,member_id,candidate_no,full_name,name_search,extra FROM church.election_nominees WHERE election_id=$1 AND id=ANY($3::int[])",
    [source.election_id, election.id, ids],
  );
  const session = (
    await db.query(
      "INSERT INTO church.election_rounds(election_id,round_no) VALUES($1,1) RETURNING *",
      [election.id],
    )
  ).rows[0];
  await db.query(
    "INSERT INTO church.election_round_candidates(round_id,candidate_id,source,carried_from_round,carry_rule) SELECT $1,id,$2,$3,$4 FROM church.election_nominees WHERE election_id=$5",
    [
      session.id,
      rule === "manual" ? "manual" : "carry_over",
      source.id,
      JSON.stringify({ rule, value }),
      election.id,
    ],
  );
  await db.query(
    "INSERT INTO church.election_scrutineers(election_id,round_id,user_id,code,team_id,team_name,team_sort_order,position,added_by) SELECT $2,$3,user_id,user_id::text,team_id,team_name,team_sort_order,position,$4 FROM church.election_scrutineers WHERE round_id=$1",
    [source.id, election.id, session.id, actor.id],
  );
  return session;
}
