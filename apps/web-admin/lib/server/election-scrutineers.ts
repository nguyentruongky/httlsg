import { randomUUID } from "node:crypto";
import { z } from "zod";
import { primaryAccessRole, type AccessRole, type AuthUser } from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { requireElection, electionLog } from "./elections";
const personColumns = `p.id,p.full_name,COALESCE(u.email,p.email) email,COALESCE(u.phone,p.phone) phone,
 u.id IS NOT NULL has_account,u.password_hash IS NOT NULL can_login,p.enabled,
 COALESCE(u.role_id='election_scrutineer',false) OR EXISTS(SELECT 1 FROM church.member_roles mr WHERE mr.member_id=p.id AND mr.role_id='election_scrutineer') has_role,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',d.id,'name',d.name) ORDER BY d.name,d.id) FROM church.department_members dm JOIN church.departments d ON d.id=dm.department_id WHERE dm.user_id=p.id),'[]') departments,
 EXISTS(SELECT 1 FROM church.election_scrutineers s JOIN church.election_rounds r ON r.id=s.round_id WHERE s.user_id=p.id AND r.status='open') active_assignment`;
async function readRoster(db: DB, electionId: number, search = "") {
  const teams = (
    await db.query(
      "SELECT t.id::uuid id,t.name,t.sort_order FROM church.election_contests e CROSS JOIN LATERAL jsonb_to_recordset(e.scrutineer_teams) t(id text,name text,sort_order int) WHERE e.id=$1 ORDER BY t.sort_order,t.id",
      [electionId],
    )
  ).rows;
  const scrutineers = (
    await db.query(
      `SELECT ${personColumns},m.team_id,m.position,m.team_name
 FROM church.election_scrutineers m JOIN church.member_profiles p ON p.id=m.user_id
 LEFT JOIN church.users u ON u.id=p.id AND u.deleted_at IS NULL

 WHERE m.election_id=$1 AND m.round_id IS NULL AND p.deleted_at IS NULL
 ORDER BY CASE WHEN m.team_id IS NULL THEN 1 ELSE 0 END,m.team_sort_order,m.position NULLS LAST,m.added_at,m.user_id`,
      [electionId],
    )
  ).rows;
  const candidates = search
    ? (
        await db.query(
          `SELECT ${personColumns},m.team_id,m.team_name
 FROM church.member_profiles p LEFT JOIN church.users u ON u.id=p.id AND u.deleted_at IS NULL
 LEFT JOIN church.election_scrutineers m ON m.user_id=p.id AND m.election_id=$1 AND m.round_id IS NULL

 WHERE p.deleted_at IS NULL AND p.enabled AND public.unaccent(lower(concat_ws(' ',p.full_name,p.email,p.phone,u.email,u.phone))) ILIKE '%'||public.unaccent(lower($2))||'%'
 ORDER BY p.full_name,p.id LIMIT 30`,
          [electionId, search.replace(/[\\%_]/g, "\\$&")],
        )
      ).rows
    : [];
  return {
    teams: teams.map((team) => ({
      ...team,
      members: scrutineers.filter((person) => person.team_id === team.id),
    })),
    unassigned: scrutineers.filter((person) => !person.team_id),
    scrutineers,
    candidates,
  };
}
async function grantScrutineerRole(db: DB, actor: AuthUser, profile: any) {
  const held = (
    await db.query(
      "SELECT role_id FROM church.member_roles WHERE member_id=$1",
      [profile.id],
    )
  ).rows.map((r) => r.role_id as AccessRole);
  const {
    rows: [account],
  } = await db.query(
    "SELECT role_id FROM church.users WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
    [profile.id],
  );
  const roles = new Set<AccessRole>([
    ...held,
    profile.role_id,
    ...(account ? [account.role_id] : []),
  ]);
  if (roles.has("election_scrutineer")) return;
  await db.query(
    "INSERT INTO church.member_roles(member_id,role_id) VALUES($1,'election_scrutineer') ON CONFLICT DO NOTHING",
    [profile.id],
  );
  roles.add("election_scrutineer");
  await db.query("UPDATE church.member_profiles SET role_id=$2 WHERE id=$1", [
    profile.id,
    primaryAccessRole([...roles]),
  ]);
  if (account && profile.id !== actor.id) {
    await db.query(
      "UPDATE church.users SET auth_version=auth_version+1 WHERE id=$1",
      [profile.id],
    );
    await db.query(
      "UPDATE church.sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
      [profile.id],
    );
  }
}
export async function manageElectionScrutineers(
  db: DB,
  actor: AuthUser,
  election: any,
  input: unknown,
  method: string,
  request: Request,
) {
  requireElection(actor, true);
  if (method === "GET") {
    const { search } = z
      .object({ search: z.string().trim().max(200).default("") })
      .parse(input);
    return readRoster(db, election.id, search);
  }
  const data = z
    .object({
      action: z
        .enum(["grant", "revoke", "create_team", "reorder"])
        .default("grant"),
      memberId: z.uuid().optional(),
      teamId: z.uuid().optional(),
      name: z.string().trim().min(1).max(100).optional(),
      memberIds: z.array(z.uuid()).max(10000).optional(),
    })
    .strict()
    .parse(input);
  if (data.action === "create_team") {
    const roster = await readRoster(db, election.id);
    const position = Math.max(0, ...roster.teams.map((t) => t.sort_order)) + 1;
    const team = {
      id: randomUUID(),
      name: data.name ?? `Tổ ${position}`,
      sort_order: position,
      created_at: new Date().toISOString(),
    };
    if (roster.teams.some((t) => t.name === team.name))
      throw new HttpError(409, "Tên tổ đã tồn tại.");
    await db.query(
      "UPDATE church.election_contests SET scrutineer_teams=scrutineer_teams || $2::jsonb WHERE id=$1",
      [election.id, JSON.stringify([team])],
    );
    await electionLog(
      db,
      actor,
      election.id,
      null,
      "scrutineer_team_created",
      { teamId: team.id, teamName: team.name },
      request,
    );
    return {
      ok: true,
      createdTeamId: team.id,
      ...(await readRoster(db, election.id)),
    };
  }
  if (!data.teamId || (data.action !== "reorder" && !data.memberId))
    throw new HttpError(
      400,
      "Cần chọn chính xác tổ và thành viên. Không tự động chia tổ.",
    );
  const {
    rows: [team],
  } = await db.query(
    "SELECT t.id::uuid id,t.name,t.sort_order FROM church.election_contests e CROSS JOIN LATERAL jsonb_to_recordset(e.scrutineer_teams) t(id text,name text,sort_order int) WHERE e.id=$1 AND t.id=$2::text",
    [election.id, data.teamId],
  );
  if (!team) throw new HttpError(404, "Tổ không thuộc cuộc bầu cử này.");
  if (data.action === "reorder") {
    const ids = data.memberIds ?? [];
    const current = (
      await db.query(
        "SELECT user_id FROM church.election_scrutineers WHERE election_id=$1 AND round_id IS NULL AND team_id=$2",
        [election.id, team.id],
      )
    ).rows;
    if (
      new Set(ids).size !== ids.length ||
      ids.length !== current.length ||
      current.some((m) => !ids.includes(m.user_id))
    )
      throw new HttpError(
        409,
        "Danh sách tổ đã thay đổi. Tải lại trước khi sắp xếp.",
      );
    // Shift positions out of the final range to avoid transient unique conflicts.
    await db.query(
      "UPDATE church.election_scrutineers SET position=position+(SELECT COALESCE(max(position),0)+1 FROM church.election_scrutineers WHERE election_id=$1 AND round_id IS NULL AND team_id=$2) WHERE election_id=$1 AND round_id IS NULL AND team_id=$2",
      [election.id, team.id],
    );
    await db.query(
      "UPDATE church.election_scrutineers s SET position=ordered.position::int-1 FROM unnest($3::uuid[]) WITH ORDINALITY ordered(user_id,position) WHERE s.election_id=$1 AND s.team_id=$2 AND s.round_id IS NULL AND s.user_id=ordered.user_id",
      [election.id, team.id, ids],
    );
    await electionLog(
      db,
      actor,
      election.id,
      null,
      "scrutineer_team_reordered",
      { teamId: team.id, memberIds: ids },
      request,
    );
    return { ok: true, ...(await readRoster(db, election.id)) };
  }
  const {
    rows: [profile],
  } = await db.query(
    "SELECT id,role_id,enabled FROM church.member_profiles WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
    [data.memberId],
  );
  if (!profile) throw new HttpError(404, "Không tìm thấy thành viên.");
  const {
    rows: [membership],
  } = await db.query(
    "SELECT * FROM church.election_scrutineers WHERE election_id=$1 AND user_id=$2 AND round_id IS NULL FOR UPDATE",
    [election.id, data.memberId],
  );
  if (data.action === "grant") {
    if (membership?.team_id && membership.team_id !== team.id)
      throw new HttpError(
        409,
        `Thành viên đã thuộc ${membership.team_name}. Hãy xóa khỏi tổ hiện tại trước khi chuyển; hệ thống không tự chuyển tổ.`,
      );
    if (membership?.team_id === team.id)
      return { ok: true, ...(await readRoster(db, election.id)) };
    const {
      rows: [next],
    } = await db.query(
      "SELECT COALESCE(max(position),-1)+1 position FROM church.election_scrutineers WHERE team_id=$1 AND round_id IS NULL",
      [team.id],
    );
    const saved = await db.query(
      "INSERT INTO church.election_scrutineers(election_id,user_id,team_id,position,added_by,team_name,team_sort_order) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(election_id,user_id) WHERE round_id IS NULL DO UPDATE SET team_id=EXCLUDED.team_id,team_name=EXCLUDED.team_name,team_sort_order=EXCLUDED.team_sort_order,position=EXCLUDED.position,added_by=EXCLUDED.added_by WHERE church.election_scrutineers.team_id IS NULL",
      [
        election.id,
        profile.id,
        team.id,
        next.position,
        actor.id,
        team.name,
        team.sort_order,
      ],
    );
    if (!saved.rowCount)
      throw new HttpError(
        409,
        "Phân công vừa thay đổi. Tải lại danh sách; không tự động chuyển tổ.",
      );
    await grantScrutineerRole(db, actor, profile);
    await electionLog(
      db,
      actor,
      election.id,
      null,
      "scrutineer_team_member_added",
      {
        memberId: profile.id,
        teamId: team.id,
        teamName: team.name,
        position: next.position,
      },
      request,
    );
  } else {
    if (!membership)
      return { ok: true, ...(await readRoster(db, election.id)) };
    if (membership.team_id !== team.id)
      throw new HttpError(
        409,
        "Phân công tổ đã thay đổi. Tải lại danh sách trước khi xóa.",
      );
    if (
      (
        await db.query(
          "SELECT 1 FROM church.election_scrutineers s JOIN church.election_rounds r ON r.id=s.round_id WHERE s.user_id=$1 AND r.status='open'",
          [profile.id],
        )
      ).rowCount
    )
      throw new HttpError(
        409,
        "Thành viên đang kiểm phiếu trong vòng đang mở. Kết thúc bầu cử trước khi xóa khỏi tổ.",
      );
    await db.query(
      "DELETE FROM church.election_scrutineers WHERE election_id=$1 AND user_id=$2 AND team_id=$3 AND round_id IS NULL",
      [election.id, profile.id, team.id],
    );
    await electionLog(
      db,
      actor,
      election.id,
      null,
      "scrutineer_team_member_removed",
      {
        memberId: profile.id,
        teamId: team.id,
        teamName: team.name,
        position: membership.position,
      },
      request,
    );
  }
  return { ok: true, ...(await readRoster(db, election.id)) };
}
