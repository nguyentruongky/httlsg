import { createHash } from "node:crypto";
import { z } from "zod";
import {
  electionAccess,
  electionAdmin,
  ticketOutcome,
  canCheckElection,
  electionPhase,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { electionBallotsSql } from "./election-ballots";

export function requireElection(actor: AuthUser, admin = false) {
  if (!(admin ? electionAdmin(actor) : electionAccess(actor)))
    throw new HttpError(403, "Bạn không có quyền bầu cử.");
}
export async function electionLog(
  db: DB,
  actor: AuthUser,
  election: number,
  round: number | null,
  action: string,
  payload: unknown = {},
  request?: Request,
) {
  await db.query(
    "INSERT INTO church.election_action_log(election_id,round_id,user_id,action,payload,ip,user_agent) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      election,
      round,
      actor.id,
      action,
      JSON.stringify(payload),
      request?.headers.get("x-forwarded-for")?.slice(0, 200),
      request?.headers.get("user-agent")?.slice(0, 500),
    ],
  );
}
export async function getRound(
  db: DB,
  actor: AuthUser,
  id: number,
  admin = false,
  writeLock = true,
) {
  requireElection(actor, admin);
  // Readers can share a consistent election view; mutations remain exclusive.
  const found = await db.query(
    "SELECT r.election_id FROM church.election_rounds r JOIN church.election_contests e ON e.id=r.election_id WHERE r.id=$1 AND e.deleted_at IS NULL",
    [id],
  );
  if (!found.rowCount) throw new HttpError(404, "Không tìm thấy cuộc bầu cử.");
  const available = await db.query(
    `SELECT id FROM church.election_contests WHERE id=$1 AND deleted_at IS NULL ${writeLock ? "FOR UPDATE" : "FOR SHARE"}`,
    [found.rows[0].election_id],
  );
  if (!available.rowCount)
    throw new HttpError(404, "Không tìm thấy cuộc bầu cử.");
  const {
    rows: [round],
  } = await db.query(
    "SELECT r.*, e.name election_name,e.code election_code,e.status election_status,e.online_voting_enabled FROM church.election_rounds r JOIN church.election_contests e ON e.id=r.election_id WHERE r.id=$1",
    [id],
  );
  const {
    rows: [assignment],
  } = await db.query(
    "SELECT * FROM church.election_scrutineers WHERE round_id=$1 AND user_id=$2",
    [id, actor.id],
  );
  if (!electionAdmin(actor) && !assignment)
    throw new HttpError(403, "Bạn chưa được phân công cuộc bầu cử này.");
  return { ...round, assignment };
}
export async function roundCandidates(db: DB, id: number) {
  return (
    await db.query(
      "SELECT c.*,rc.source,rc.carry_rule,rc.carried_from_round FROM church.election_round_candidates rc JOIN church.election_nominees c ON c.id=rc.candidate_id WHERE rc.round_id=$1 ORDER BY c.candidate_no",
      [id],
    )
  ).rows;
}
export async function roundTickets(db: DB, actor: AuthUser, id: number) {
  const paper = (
    await db.query(
      `SELECT t.*,'paper'::text source,s.team_name,s.team_sort_order,u.full_name scrutineer_name,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'candidate_no',c.candidate_no,'full_name',c.full_name) ORDER BY c.candidate_no) FROM church.election_nominees c WHERE c.id=ANY(t.candidate_ids)),'[]') candidates FROM church.election_tickets t JOIN church.users u ON u.id=t.scrutineer_id LEFT JOIN church.election_scrutineers s ON s.round_id=t.round_id AND s.user_id=t.scrutineer_id WHERE t.round_id=$1 AND ($2::boolean OR t.scrutineer_id=$3) ORDER BY t.received_at DESC,t.id DESC`,
      [id, electionAdmin(actor), actor.id],
    )
  ).rows;
  if (!electionAdmin(actor)) return paper;
  const online = (
    await db.query(
      `SELECT v.id,'online:'||v.id::text client_uuid,
      'E'||r.election_id::text||'-ONLINE-'||v.id::text ticket_code,
      r.id round_id,r.election_id,NULL::uuid scrutineer_id,
      row_number() OVER(ORDER BY v.submitted_at,v.id)::int seq_no,
      CASE WHEN x.vote_id IS NOT NULL THEN 'void' WHEN cardinality(v.candidate_ids)=0 THEN 'invalid' ELSE 'valid' END status,
      x.reason void_reason,x.voided_by,
      CASE WHEN cardinality(v.candidate_ids)=0 THEN 'blank' ELSE NULL END invalid_reason,
      v.submitted_at created_at,v.submitted_at received_at,v.candidate_ids,
      'online'::text source,'Người bỏ phiếu trực tuyến'::text scrutineer_name,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'candidate_no',c.candidate_no,'full_name',c.full_name) ORDER BY c.candidate_no)
        FROM church.election_nominees c WHERE c.id=ANY(v.candidate_ids)),'[]') candidates
     FROM church.election_public_votes v
     LEFT JOIN church.election_public_vote_voids x ON x.vote_id=v.id
     JOIN church.election_public_admissions a ON a.id=v.admission_id
     JOIN church.election_public_sessions s ON s.id=a.session_id
     JOIN church.election_rounds r ON r.election_id=s.election_id WHERE r.id=$1`,
      [id],
    )
  ).rows;
  return [...paper, ...online].sort(
    (a, b) =>
      new Date(b.received_at).getTime() - new Date(a.received_at).getTime() ||
      String(b.id).localeCompare(String(a.id)),
  );
}
export async function roundResults(db: DB, id: number) {
  const {
    rows: [readiness],
  } = await db.query(
    `SELECT count(*)::int scrutineer_count FROM (
      SELECT s.user_id FROM church.election_scrutineers s
      JOIN church.member_profiles p ON p.id=s.user_id AND p.deleted_at IS NULL
      JOIN church.election_rounds r ON r.election_id=s.election_id
      WHERE r.id=$1 AND (s.round_id IS NULL OR s.round_id=r.id)
      GROUP BY s.user_id
    ) people`,
    [id],
  );
  const {
    rows: [summary],
  } = await db.query(
    `WITH ballots AS (${electionBallotsSql}), totals AS (
      SELECT count(*)::int received,
        count(*) FILTER(WHERE status='valid')::int valid,
        count(*) FILTER(WHERE status='invalid')::int invalid,
        count(*) FILTER(WHERE status='invalid' AND invalid_reason='over_limit')::int over_limit,
        count(*) FILTER(WHERE status='invalid' AND invalid_reason='blank')::int blank,
        count(*) FILTER(WHERE status='void')::int void,
        count(*) FILTER(WHERE source='online')::int online,
        count(*) FILTER(WHERE source='paper')::int paper
      FROM ballots
    ), selections AS (
      SELECT COALESCE(sum(cardinality(candidate_ids)),0)::float total
      FROM ballots WHERE status='valid'
    ) SELECT totals.*,(SELECT e.counted_ballots FROM church.election_contests e JOIN church.election_rounds r ON r.election_id=e.id WHERE r.id=$1) counted_ballots,COALESCE(selections.total/NULLIF(totals.valid,0),0)::float average
      FROM totals CROSS JOIN selections`,
    [id],
  );
  const { rows: results } = await db.query(
    `WITH ballots AS (${electionBallotsSql}), counts AS (
      SELECT s.candidate_id,count(*)::int votes
      FROM ballots t
      CROSS JOIN LATERAL unnest(t.candidate_ids) s(candidate_id)
      WHERE t.status='valid' GROUP BY s.candidate_id
    ), votes AS (
      SELECT c.id,c.candidate_no,c.full_name,COALESCE(counts.votes,0)::int votes
      FROM church.election_round_candidates rc
      JOIN church.election_nominees c ON c.id=rc.candidate_id
      LEFT JOIN counts ON counts.candidate_id=c.id WHERE rc.round_id=$1
    ) SELECT *,rank() OVER(ORDER BY votes DESC)::int rank,
      (count(*) OVER(PARTITION BY votes)>1) tie
      FROM votes ORDER BY votes DESC,candidate_no`,
    [id],
  );
  const { rows: progress } = await db.query(
    `SELECT s.user_id,s.code,u.full_name,s.pending_count,s.heartbeat_at,count(t.id)::int tickets,count(t.id) FILTER(WHERE t.status='invalid')::int invalid,max(t.received_at) last_submission FROM church.election_scrutineers s JOIN church.users u ON u.id=s.user_id LEFT JOIN church.election_tickets t ON t.round_id=s.round_id AND t.scrutineer_id=s.user_id WHERE s.round_id=$1 GROUP BY s.id,u.full_name ORDER BY s.code`,
    [id],
  );
  return {
    readiness,
    summary,
    results: results.map((r) => ({
      ...r,
      percent: summary.valid ? (100 * r.votes) / summary.valid : 0,
    })),
    progress,
  };
}
async function assignRosterToRound(db: DB, round: any, actor: AuthUser) {
  // Keep existing codes and exact roster grouping; append missing account assignments.
  await db.query(
    `WITH missing AS (
      SELECT s.*
      FROM church.election_scrutineers s JOIN church.users u ON u.id=s.user_id
      JOIN church.member_profiles p ON p.id=s.user_id
      WHERE s.election_id=$2 AND s.round_id IS NULL
        AND s.team_id IS NOT NULL AND u.enabled AND u.deleted_at IS NULL AND p.enabled AND p.deleted_at IS NULL
        AND (u.role_id='election_scrutineer' OR EXISTS(
          SELECT 1 FROM church.member_roles m WHERE m.member_id=u.id AND m.role_id='election_scrutineer'))
        AND NOT EXISTS(SELECT 1 FROM church.election_scrutineers a WHERE a.round_id=$1 AND a.user_id=s.user_id)
    ) INSERT INTO church.election_scrutineers(election_id,round_id,user_id,code,team_id,team_name,team_sort_order,position,added_by)
      SELECT $2,$1,m.user_id,m.user_id::text,
        m.team_id,m.team_name,m.team_sort_order,m.position,$3
      FROM missing m`,
    [round.id, round.election_id, actor.id],
  );
}
const number = z.coerce.number().int().positive();
const reason = z.string().trim().min(1, "Cần nhập lý do.").max(2000);
async function assignments(db: DB, round: number, users: string[]) {
  const eligible = await db.query(
    `SELECT u.id FROM church.users u WHERE u.id=ANY($1::uuid[]) AND u.enabled AND u.deleted_at IS NULL AND (u.role_id='election_scrutineer' OR EXISTS(SELECT 1 FROM church.member_roles m WHERE m.member_id=u.id AND m.role_id='election_scrutineer'))`,
    [users],
  );
  if (eligible.rowCount !== users.length)
    throw new HttpError(400, "Kiểm phiếu viên không hợp lệ hoặc bị trùng.");
  await db.query("DELETE FROM church.election_scrutineers WHERE round_id=$1", [
    round,
  ]);
  for (const user of users)
    await db.query(
      "INSERT INTO church.election_scrutineers(election_id,round_id,user_id,code,team_id,team_name,team_sort_order,position) SELECT r.election_id,r.id,$2,$3,m.team_id,m.team_name,COALESCE(m.team_sort_order,0),m.position FROM church.election_rounds r LEFT JOIN church.election_scrutineers m ON m.election_id=r.election_id AND m.user_id=$2 AND m.round_id IS NULL WHERE r.id=$1",
      [round, user, user],
    );
}
export async function electionDispatch(
  db: DB,
  actor: AuthUser,
  path: string[],
  method: string,
  input: any,
  request: Request,
): Promise<any> {
  requireElection(actor);
  const [resource, rawId, action] = path;
  if (resource === "rounds" && rawId === "assigned" && method === "GET") {
    const rounds = (
      await db.query(
        `SELECT r.id,r.election_id,r.round_no,CASE WHEN e.status='archived' THEN 'closed' ELSE r.status END AS status,r.phase,r.opened_at,r.closed_at,
      e.name election_name,e.code election_code,
      jsonb_build_object('round_id',r.id,'user_id',s.user_id,'team_id',s.team_id,'team_name',s.team_name) assignment
      FROM church.election_scrutineers s
      JOIN church.election_rounds r ON r.id=s.round_id
      JOIN church.election_contests e ON e.id=r.election_id
      WHERE s.user_id=$1 AND e.deleted_at IS NULL
      ORDER BY CASE r.status WHEN 'open' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
        r.opened_at DESC NULLS LAST,r.election_id DESC,r.round_no DESC`,
        [actor.id],
      )
    ).rows;
    return { rounds };
  }
  const id = rawId ? number.parse(rawId) : 0;
  if (resource === "elections" && !rawId) {
    if (method === "POST") {
      requireElection(actor, true);
      const data = z
        .object({
          name: z.string().trim().min(1).max(200),
          description: z.string().max(5000).default(""),
        })
        .parse(input);
      const {
        rows: [e],
      } = await db.query(
        "INSERT INTO church.election_contests(name,description,created_by) VALUES($1,$2,$3) RETURNING *",
        [data.name, data.description, actor.id],
      );
      await db.query(
        "UPDATE church.election_contests SET scrutineer_teams=(SELECT jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'name','Tổ '||n,'sort_order',n,'created_at',now()) ORDER BY n) FROM generate_series(1,4) n) WHERE id=$1",
        [e.id],
      );
      await electionLog(db, actor, e.id, null, "election_created", {}, request);
      return e;
    }
    return {
      elections: (
        await db.query(
          `SELECT e.*,
          (SELECT r.closed_at FROM church.election_rounds r WHERE r.election_id=e.id ORDER BY r.round_no DESC LIMIT 1) AS ended_at,
          COALESCE((SELECT r.phase FROM church.election_rounds r WHERE r.election_id=e.id ORDER BY r.round_no DESC LIMIT 1),'draft') AS phase,
          (SELECT count(*)::int FROM church.election_tickets t JOIN church.election_rounds r ON r.id=t.round_id WHERE r.election_id=e.id) AS ticket_count
          FROM church.election_contests e WHERE e.deleted_at IS NULL AND ($1::boolean OR EXISTS(SELECT 1 FROM church.election_rounds r JOIN church.election_scrutineers s ON s.round_id=r.id WHERE r.election_id=e.id AND s.user_id=$2 AND r.status='open')) ORDER BY e.id DESC`,
          [electionAdmin(actor), actor.id],
        )
      ).rows,
    };
  }
  if (resource === "elections") {
    const {
      rows: [election],
    } = await db.query(
      `SELECT * FROM church.election_contests WHERE id=$1 AND deleted_at IS NULL ${method === "GET" ? "FOR SHARE" : "FOR UPDATE"}`,
      [id],
    );
    if (!election) throw new HttpError(404, "Không tìm thấy cuộc bầu cử.");
    if (!action) {
      const rounds = (
        await db.query(
          `SELECT r.*,s.code scrutineer_code FROM church.election_rounds r LEFT JOIN church.election_scrutineers s ON s.round_id=r.id AND s.user_id=$2 WHERE r.election_id=$1 AND ($3::boolean OR (s.user_id IS NOT NULL AND r.status='open')) ORDER BY round_no`,
          [id, actor.id, electionAdmin(actor)],
        )
      ).rows;
      if (!electionAdmin(actor) && !rounds.length)
        throw new HttpError(403, "Bạn chưa được phân công.");
      const scrutineers = electionAdmin(actor)
        ? (
            await db.query(
              `SELECT u.id,u.full_name FROM church.users u WHERE u.enabled AND u.deleted_at IS NULL AND (u.role_id='election_scrutineer' OR EXISTS(SELECT 1 FROM church.member_roles m WHERE m.member_id=u.id AND m.role_id='election_scrutineer')) ORDER BY u.full_name`,
            )
          ).rows
        : [];
      return { election, rounds, scrutineers };
    }
    requireElection(actor, true);
    if (action === "edit" || action === "delete") {
      const { editElection, deleteElection } =
        await import("./election-management");
      return action === "edit"
        ? editElection(db, actor, election, input, request)
        : deleteElection(db, actor, election, input, request);
    }
    if (action === "counted-ballots" && method === "POST") {
      const data = z
        .object({
          count: z.number().int().min(0).max(2147483647),
          previous: z.number().int().min(0).max(2147483647),
        })
        .strict()
        .parse(input);
      if (election.counted_ballots !== data.previous)
        throw new HttpError(
          409,
          "Số phiếu đã được người khác cập nhật. Tải lại trang trước khi sửa.",
        );
      await db.query(
        "UPDATE church.election_contests SET counted_ballots=$2 WHERE id=$1",
        [election.id, data.count],
      );
      await electionLog(
        db,
        actor,
        election.id,
        null,
        "counted_ballots_updated",
        { previous: data.previous, count: data.count },
        request,
      );
      return { counted_ballots: data.count };
    }
    if (action === "public-otps") {
      const { publicElectionOtps } = await import("./public-election/otps");
      return publicElectionOtps(db, actor, election, input, method, request);
    }
    if (action === "public-session") {
      const { publicElectionSettings } =
        await import("./public-election/settings");
      return publicElectionSettings(
        db,
        actor,
        election,
        input,
        method,
        request,
      );
    }
    if (action === "audit") {
      const { electionConnectionAudit } =
        await import("./election-connection-audit");
      const { electionSubmissionAudit } =
        await import("./election-submission-audit");
      const polling =
        election.status !== "archived" &&
        Boolean(
          (
            await db.query(
              "SELECT 1 FROM church.election_rounds WHERE election_id=$1 AND status='open' LIMIT 1",
              [id],
            )
          ).rowCount,
        );
      return {
        polling,
        connections: await electionConnectionAudit(db, id),
        submissions: await electionSubmissionAudit(db, id),
        items: (
          await db.query(
            "SELECT l.*,u.full_name FROM church.election_action_log l LEFT JOIN church.users u ON u.id=l.user_id WHERE election_id=$1 AND action NOT IN ('results_viewed','ticket_submitted') ORDER BY l.id DESC LIMIT 1000",
            [id],
          )
        ).rows,
      };
    }
    if (action === "candidate-search" && method === "GET") {
      const { search, limit } = z
        .object({
          search: z.string().trim().max(100).optional(),
          limit: z.coerce.number().int().min(1).max(100).optional(),
        })
        .parse(input);
      if (!search || !search.trim()) return { members: [] };
      const query = `%${search.trim()}%`;
      const rows = (
        await db.query(
          `SELECT m.id, m.full_name, 
              COALESCE((
                SELECT jsonb_agg(d.name ORDER BY d.name)
                FROM church.department_members dm
                JOIN church.departments d ON d.id = dm.department_id
                WHERE dm.user_id = m.id
              ), '[]'::jsonb) as departments
             FROM church.member_profiles m
             WHERE m.deleted_at IS NULL 
               AND m.enabled 
               AND (m.full_name ILIKE $1 OR unaccent(m.full_name) ILIKE unaccent($1))
             ORDER BY m.full_name
             LIMIT $2`,
          [query, limit ?? 5],
        )
      ).rows;
      return {
        members: rows.map((r) => ({
          id: r.id,
          name: r.full_name,
          departments: r.departments,
        })),
      };
    }
    if (action === "archive" && method === "POST") {
      if (
        (
          await db.query(
            "SELECT 1 FROM church.election_rounds WHERE election_id=$1 AND status='open'",
            [id],
          )
        ).rowCount
      )
        throw new HttpError(409, "Hãy kết thúc bầu cử đang mở.");
      await db.query(
        "UPDATE church.election_contests SET status='archived',version=version+1 WHERE id=$1",
        [id],
      );
      await electionLog(db, actor, id, null, "election_archived", {}, request);
      return { ok: true };
    }
    if (action === "rounds" && method === "POST") {
      if (
        (
          await db.query(
            "SELECT 1 FROM church.election_rounds WHERE election_id=$1",
            [id],
          )
        ).rowCount
      )
        throw new HttpError(
          409,
          "Vòng đầu đã tồn tại; dùng chuyển vòng để tạo vòng tiếp theo.",
        );
      if (election.status === "archived")
        throw new HttpError(409, "Cuộc bầu cử đã lưu trữ.");
      const {
        rows: [round],
      } = await db.query(
        "INSERT INTO church.election_rounds(election_id,round_no) VALUES($1,1) RETURNING *",
        [id],
      );
      await db.query(
        "INSERT INTO church.election_round_candidates(round_id,candidate_id,source) SELECT $1,id,'initial' FROM church.election_nominees WHERE election_id=$2 AND included AND NOT retired",
        [round.id, id],
      );
      await electionLog(db, actor, id, round.id, "round_prepared", {}, request);
      return round;
    }
    if (action === "candidates") {
      if (path[3] === "import")
        return importCandidates(db, actor, election, input, request);
      const { candidateList, saveCandidateList, addSingleCandidate } =
        await import("./election-candidates");
      if (method === "GET") return candidateList(db, actor, election);
      if (method === "PUT")
        return addSingleCandidate(db, actor, election, input, request);
      return saveCandidateList(db, actor, election, input, request);
    }
    if (action === "scrutineers") {
      const { manageElectionScrutineers } =
        await import("./election-scrutineers");
      return manageElectionScrutineers(
        db,
        actor,
        election,
        input,
        method,
        request,
      );
    }
  }
  if (resource === "rounds") {
    const round = await getRound(db, actor, id, false, method !== "GET");
    if (action === "candidates") {
      if (!electionAdmin(actor) && round.status !== "open")
        throw new HttpError(409, "Cuộc bầu cử đã đóng.");
      return {
        round,
        candidates: await roundCandidates(db, id),
        availableCandidates:
          electionAdmin(actor) && round.status === "draft"
            ? (
                await db.query(
                  "SELECT * FROM church.election_nominees WHERE election_id=$1 AND NOT retired ORDER BY candidate_no",
                  [round.election_id],
                )
              ).rows
            : undefined,
        assignment: round.assignment,
      };
    }
    if (action === "tickets") {
      if (method === "GET")
        return {
          items: await roundTickets(db, actor, id),
          status: round.status,
          polling:
            round.status === "open" && round.election_status !== "archived",
        };
      return submitTicket(db, actor, round, input, request);
    }
    if (action === "heartbeat") {
      const pending = z.number().int().min(0).max(100000).parse(input.pending);
      const polling =
        round.status === "open" && round.election_status !== "archived";
      if (polling)
        await db.query(
          "UPDATE church.election_scrutineers SET pending_count=$3,heartbeat_at=now() WHERE round_id=$1 AND user_id=$2",
          [id, actor.id, pending],
        );
      return { status: round.status, phase: round.phase, polling };
    }
    if (action === "results") {
      requireElection(actor, true);
      return {
        ...(await roundResults(db, id)),
        round,
        candidates: await roundCandidates(db, id),
      };
    }
    requireElection(actor, true);
    if (action === "configure") {
      if (round.status !== "draft")
        throw new HttpError(409, "Danh sách đã được khóa.");
      const data = z
        .object({
          userIds: z.array(z.uuid()).max(100),
          candidateIds: z.array(number).max(5000).optional(),
        })
        .parse(input);
      await assignments(db, id, data.userIds);
      if (data.candidateIds) {
        const valid = await db.query(
          "SELECT id FROM church.election_nominees WHERE election_id=$1 AND id=ANY($2::int[]) AND NOT retired",
          [round.election_id, data.candidateIds],
        );
        if (valid.rowCount !== data.candidateIds.length)
          throw new HttpError(400, "Ứng viên không hợp lệ.");
        await db.query(
          "DELETE FROM church.election_round_candidates WHERE round_id=$1 AND NOT (candidate_id=ANY($2::int[]))",
          [id, data.candidateIds],
        );
        for (const candidate of data.candidateIds)
          await db.query(
            "INSERT INTO church.election_round_candidates(round_id,candidate_id,source) VALUES($1,$2,'manual') ON CONFLICT DO NOTHING",
            [id, candidate],
          );
      }
      await electionLog(
        db,
        actor,
        round.election_id,
        id,
        "round_configured",
        data,
        request,
      );
      return { ok: true };
    }
    if (["start", "manual-checking", "stop", "reopen"].includes(action)) {
      const expected =
        action === "start"
          ? "draft"
          : ["stop", "manual-checking"].includes(action)
            ? "open"
            : "closed";
      if (round.status !== expected)
        throw new HttpError(409, "Trạng thái bầu cử không phù hợp.");
      if (action === "manual-checking" && round.phase !== "online")
        throw new HttpError(
          409,
          "Chỉ chuyển sang kiểm phiếu thủ công sau khi nhận phiếu trực tuyến.",
        );
      if (action === "stop" && !canCheckElection(round))
        throw new HttpError(
          409,
          "Chuyển sang kiểm phiếu thủ công trước khi đóng bầu cử.",
        );
      const phase =
        action === "start"
          ? z.enum(["online", "checking"]).default("online").parse(input.phase)
          : action === "stop"
            ? "closed"
            : "checking";
      if (phase === "online") {
        const configured = await db.query(
          "SELECT 1 FROM church.election_public_sessions WHERE election_id=$1 AND enabled",
          [round.election_id],
        );
        if (!round.online_voting_enabled || !configured.rowCount)
          throw new HttpError(
            400,
            "Bật bầu cử trực tuyến và lưu địa điểm trong Cài đặt trước khi nhận phiếu trực tuyến.",
          );
      }
      let why = null;
      if (action === "reopen") {
        why = reason.parse(input.reason);
      }
      if (action === "start" || action === "reopen") {
        if (
          (
            await db.query(
              "SELECT 1 FROM church.election_rounds WHERE election_id=$1 AND status='open'",
              [round.election_id],
            )
          ).rowCount
        )
          throw new HttpError(409, "Đã có vòng đang mở.");
        if (
          !(await roundCandidates(db, id)).length ||
          !(
            await db.query(
              "SELECT 1 FROM church.election_scrutineers s JOIN church.member_profiles p ON p.id=s.user_id WHERE s.election_id=$2 AND (s.round_id=$1 OR s.round_id IS NULL) AND p.deleted_at IS NULL LIMIT 1",
              [id, round.election_id],
            )
          ).rowCount
        )
          throw new HttpError(400, "Cần có ứng viên và kiểm phiếu viên.");
      }
      if (action === "start") await assignRosterToRound(db, round, actor);
      await db.query(
        `UPDATE church.election_rounds SET status=$2,opened_at=CASE WHEN $2='open' THEN COALESCE(opened_at,now()) ELSE opened_at END,closed_at=CASE WHEN $2='closed' THEN now() ELSE NULL END,phase=$3 WHERE id=$1`,
        [id, action === "stop" ? "closed" : "open", phase],
      );
      await db.query(
        "UPDATE church.election_contests SET status='active',version=version+1 WHERE id=$1",
        [round.election_id],
      );
      await electionLog(
        db,
        actor,
        round.election_id,
        id,
        action === "start"
          ? "round_started"
          : action === "stop"
            ? "round_stopped"
            : action === "manual-checking"
              ? "round_manual_checking_started"
              : "round_reopened",
        {
          reason: why,
          phase,
          fromPhase: electionPhase(round),
          toPhase: phase,
          fromStatus: round.status,
          toStatus: action === "stop" ? "closed" : "open",
        },
        request,
      );
      return { ok: true };
    }
    if (action === "prepare-next") {
      if (round.status !== "closed")
        throw new HttpError(409, "Cần kết thúc bầu cử trước.");
      const data = z
        .object({
          rule: z.enum(["top", "minimum", "manual"]),
          value: z.number().int().nonnegative().default(0),
          candidateIds: z.array(number).optional(),
          dryRun: z.boolean().default(true),
        })
        .parse(input);
      const { results } = await roundResults(db, id);
      const ids =
        data.candidateIds ??
        results
          .filter((r, i) =>
            data.rule === "top"
              ? i < data.value
              : data.rule === "minimum"
                ? r.votes >= data.value
                : false,
          )
          .map((r) => r.id);
      if (
        new Set(ids).size !== ids.length ||
        ids.some((id) => !results.some((r) => r.id === id))
      )
        throw new HttpError(400, "Ứng viên không hợp lệ.");
      const tie =
        data.rule === "top" &&
        data.value > 0 &&
        data.value < results.length &&
        results[data.value - 1].votes === results[data.value].votes;
      if (data.dryRun) return { results, selected: ids, tie };
      if (!ids.length) throw new HttpError(400, "Cần chọn ứng viên.");
      const { createFollowupElection } = await import("./election-followup");
      const next = await createFollowupElection(
        db,
        actor,
        round,
        ids,
        data.rule,
        data.value,
      );
      await electionLog(
        db,
        actor,
        next.election_id,
        next.id,
        "round_prepared",
        { ...data, tie },
        request,
      );
      return next;
    }
  }
  if (resource === "tickets" && action === "void" && method === "POST") {
    const {
      rows: [ticket],
    } = await db.query("SELECT * FROM church.election_tickets WHERE id=$1", [
      id,
    ]);
    if (!ticket) throw new HttpError(404, "Không tìm thấy phiếu.");
    const round = await getRound(db, actor, ticket.round_id);
    const why = reason.parse(input.reason);
    if (ticket.status === "void") throw new HttpError(409, "Phiếu đã hủy.");
    if (!electionAdmin(actor)) {
      if (ticket.scrutineer_id !== actor.id)
        throw new HttpError(403, "Không thể hủy phiếu của người khác.");
      if (input.requestOnly) {
        await db.query(
          "UPDATE church.election_tickets SET void_requested_reason=$2 WHERE id=$1",
          [id, why],
        );
        await electionLog(
          db,
          actor,
          round.election_id,
          round.id,
          "ticket_void_requested",
          { ticketId: id, reason: why },
          request,
        );
        return { ok: true };
      }
      const window = Math.max(
        0,
        Math.min(
          3600,
          Number(process.env.ELECTION_SELF_VOID_SECONDS ?? 60) || 0,
        ),
      );
      const {
        rows: [latest],
      } = await db.query(
        "SELECT id,extract(epoch FROM now()-received_at)::float age FROM church.election_tickets WHERE round_id=$1 AND scrutineer_id=$2 ORDER BY received_at DESC,id DESC LIMIT 1",
        [round.id, actor.id],
      );
      if (
        round.status !== "open" ||
        String(latest?.id) !== String(id) ||
        latest.age > window
      )
        throw new HttpError(403, "Đã hết thời gian tự hủy; hãy gửi yêu cầu.");
    }
    const voided = await db.query(
      "UPDATE church.election_tickets SET status='void',void_reason=$2,voided_by=$3 WHERE id=$1 AND status<>'void' RETURNING id",
      [id, why, actor.id],
    );
    if (!voided.rowCount) throw new HttpError(409, "Phiếu đã hủy.");
    await electionLog(
      db,
      actor,
      round.election_id,
      round.id,
      "ticket_voided",
      { ticketId: id, source: "paper", reason: why },
      request,
    );
    return { ok: true };
  }
  throw new HttpError(404, "Không tìm thấy chức năng.");
}
async function submitTicket(
  db: DB,
  actor: AuthUser,
  round: any,
  input: unknown,
  request: Request,
) {
  const data = z
    .object({
      client_uuid: z.uuid(),
      seq_no: number,
      candidate_ids: z.array(number).max(5000),
      entry_kind: z.enum(["normal", "blank", "invalid"]).default("normal"),
      created_at: z.iso.datetime({ offset: true }),
      election_id: number.optional(),
      team_id: z.uuid().optional(),
    })
    .refine(
      (value) =>
        value.entry_kind === "normal" || value.candidate_ids.length === 0,
      "Phiếu trắng hoặc bất hợp lệ không có lựa chọn ứng viên.",
    )
    .parse(input);
  const outcome = ticketOutcome(data.candidate_ids, data.entry_kind);
  if (data.election_id !== undefined && data.election_id !== round.election_id)
    throw new HttpError(409, "Phiếu thuộc cuộc bầu cử khác.");
  if (data.team_id !== undefined && data.team_id !== round.assignment?.team_id)
    throw new HttpError(
      409,
      "Tổ kiểm phiếu đã thay đổi. Kiểm tra bản sao lưu trước khi đồng bộ.",
    );
  if (!round.assignment)
    throw new HttpError(403, "Bạn chưa được phân công kiểm phiếu.");
  const {
    rows: [duplicate],
  } = await db.query(
    "SELECT * FROM church.election_tickets WHERE client_uuid=$1",
    [data.client_uuid],
  );
  if (duplicate) {
    const oldIds = duplicate.candidate_ids;
    if (
      duplicate.scrutineer_id !== actor.id ||
      duplicate.round_id !== round.id ||
      duplicate.seq_no !== data.seq_no ||
      duplicate.invalid_reason !== outcome.invalid_reason ||
      JSON.stringify(oldIds) !==
        JSON.stringify([...data.candidate_ids].sort((a, b) => a - b))
    )
      throw new HttpError(409, "Mã yêu cầu đã được dùng cho phiếu khác.");
    return { state: "duplicate", ticket: duplicate };
  }
  if (!canCheckElection(round))
    return {
      state: "rejected",
      reason: "Chỉ nhận phiếu giấy trong giai đoạn kiểm phiếu thủ công.",
    };
  const candidates = await roundCandidates(db, round.id);
  if (
    new Set(data.candidate_ids).size !== data.candidate_ids.length ||
    data.candidate_ids.some((id) => !candidates.some((c) => c.id === id))
  )
    return {
      state: "rejected",
      reason: "Ứng viên không có trong vòng hoặc bị trùng.",
    };
  const recent = await db.query(
    "SELECT count(*)::int n FROM church.election_tickets WHERE scrutineer_id=$1 AND received_at>now()-interval '1 minute'",
    [actor.id],
  );
  if (recent.rows[0].n >= 120)
    throw new HttpError(429, "Gửi quá nhanh, vui lòng chờ.");
  if (!round.assignment.team_id)
    throw new HttpError(
      409,
      "Cần lưu đúng tổ kiểm phiếu trước khi nhập phiếu.",
    );
  if (
    (
      await db.query(
        "SELECT 1 FROM church.election_tickets WHERE round_id=$1 AND scrutineer_id=$2 AND seq_no=$3",
        [round.id, actor.id, data.seq_no],
      )
    ).rowCount
  )
    return {
      state: "rejected",
      reason: "Số phiếu trên thiết bị đã được dùng. Xuất bản sao để đối chiếu.",
    };
  const teamNumber = (
    await db.query(
      "SELECT COALESCE(max(team_ticket_no),0)+1 n FROM church.election_tickets WHERE election_id=$1 AND team_id=$2",
      [round.election_id, round.assignment.team_id],
    )
  ).rows[0].n;
  const code = `E${round.election_id}-T${round.assignment.team_id}-${String(teamNumber).padStart(4, "0")}`;
  if (
    (
      await db.query(
        "SELECT 1 FROM church.election_tickets WHERE ticket_code=$1",
        [code],
      )
    ).rowCount
  )
    return {
      state: "rejected",
      reason: "Số phiếu đã được dùng. Hãy xuất bản sao để đối chiếu.",
    };
  const {
    rows: [ticket],
  } = await db.query(
    "INSERT INTO church.election_tickets(ticket_code,client_uuid,round_id,scrutineer_id,seq_no,status,invalid_reason,created_at,candidate_ids,election_id,team_id,team_ticket_no) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *",
    [
      code,
      data.client_uuid,
      round.id,
      actor.id,
      data.seq_no,
      outcome.status,
      outcome.invalid_reason,
      data.created_at,
      [...data.candidate_ids].sort((a, b) => a - b),
      round.election_id,
      round.assignment.team_id,
      teamNumber,
    ],
  );
  await electionLog(
    db,
    actor,
    round.election_id,
    round.id,
    "ticket_submitted",
    { ticketId: ticket.id, client_uuid: data.client_uuid, ...outcome },
    request,
  );
  return { state: "ok", ticket };
}
export const fileHash = (data: Buffer | string) =>
  createHash("sha256").update(data).digest("hex");
async function importCandidates(
  db: DB,
  actor: AuthUser,
  election: any,
  input: any,
  request: Request,
) {
  // Keep import parsing in the report module to share the workbook implementation.
  const { previewCandidateImport } = await import("./election-reports");
  return previewCandidateImport(db, actor, election, input, request);
}

// Session events are recorded only for elections this operator can access.
export async function electionSessionLog(
  db: DB,
  actor: AuthUser,
  action: "login" | "logout",
  request?: Request,
) {
  if (!electionAccess(actor)) return;
  // A rollout may deploy code before migration 047. Do not interrupt existing authentication.
  const installed = await db.query(
    "SELECT to_regclass('church.election_contests') AS installed",
  );
  if (!installed.rows[0].installed) return;
  const elections = await db.query(
    `SELECT e.id FROM church.election_contests e WHERE e.status<>'archived' AND ($1::boolean OR EXISTS(SELECT 1 FROM church.election_rounds r JOIN church.election_scrutineers s ON s.round_id=r.id WHERE r.election_id=e.id AND s.user_id=$2))`,
    [electionAdmin(actor), actor.id],
  );
  for (const e of elections.rows)
    await electionLog(db, actor, e.id, null, action, {}, request);
}
