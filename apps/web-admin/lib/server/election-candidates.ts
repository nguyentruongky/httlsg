import { z } from "zod";
import { electionSearch, type AuthUser } from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { requireElection, electionLog, fileHash } from "./elections";
const rowSchema = z.object({
  candidate_no: z.number().int().positive().nullable(),
  full_name: z.string().trim().max(200),
  member_id: z.string().max(200).nullable().default(null),
  included: z.boolean().default(true),
  extra: z.record(z.string(), z.unknown()).default({}),
});
export async function candidateSnapshot(db: DB, electionId: number) {
  const existing = (
    await db.query(
      "SELECT * FROM church.election_nominees WHERE election_id=$1 ORDER BY candidate_no",
      [electionId],
    )
  ).rows;
  return { existing, revision: fileHash(JSON.stringify(existing)) };
}
export async function candidateList(db: DB, actor: AuthUser, election: any) {
  requireElection(actor, true);
  const { existing, revision } = await candidateSnapshot(db, election.id);
  const locked = Boolean(
    (
      await db.query(
        "SELECT 1 FROM church.election_rounds WHERE election_id=$1 AND opened_at IS NOT NULL",
        [election.id],
      )
    ).rowCount,
  );
  const memberIds = existing
    .filter((c) => c.member_id && !c.retired)
    .map((c) => c.member_id);
  let departmentMap: Map<string, string[]> = new Map();
  if (memberIds.length > 0) {
    const deptRows = await db.query(
      `SELECT dm.user_id, array_agg(d.name ORDER BY d.name) as departments
       FROM church.department_members dm
       JOIN church.departments d ON d.id = dm.department_id
       WHERE dm.user_id = ANY($1::uuid[])
       GROUP BY dm.user_id`,
      [memberIds],
    );
    for (const row of deptRows.rows) {
      departmentMap.set(row.user_id, row.departments ?? []);
    }
  }
  return {
    rows: existing
      .filter((c) => !c.retired)
      .map((c) => ({
        ...c,
        departments: departmentMap.get(c.member_id ?? "") ?? [],
      })),
    revision,
    locked,
  };
}
export async function saveCandidateList(
  db: DB,
  actor: AuthUser,
  election: any,
  input: unknown,
  request: Request,
) {
  requireElection(actor, true);
  const data = z
    .object({
      rows: z.array(rowSchema).max(10000),
      revision: z.string().min(1),
      sourceFileHash: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
    })
    .parse(input);
  if (election.status === "archived")
    throw new HttpError(409, "Cuộc bầu cử đã lưu trữ.");
  if (
    (
      await db.query(
        "SELECT 1 FROM church.election_rounds WHERE election_id=$1 AND opened_at IS NOT NULL",
        [election.id],
      )
    ).rowCount
  )
    throw new HttpError(409, "Danh sách đã khóa vì có vòng đã mở.");
  const { existing, revision } = await candidateSnapshot(db, election.id);
  if (data.revision !== revision)
    throw new HttpError(
      409,
      "Danh sách đã thay đổi. Tải lại trước khi lưu để tránh ghi đè.",
    );
  const warnings: string[] = [];
  const numbers = new Set<number>();
  const names = new Set<string>();
  const rows: any[] = [];
  const memberIds = data.rows
    .map((r) => r.member_id)
    .filter(
      (id): id is string => Boolean(id) && z.uuid().safeParse(id).success,
    );
  const known = new Set(
    (
      await db.query(
        "SELECT id FROM church.member_profiles WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL",
        [memberIds],
      )
    ).rows.map((r) => r.id),
  );
  for (const [i, row] of data.rows.entries()) {
    if (!row.full_name)
      throw new HttpError(400, `Dòng ${i + 1}: vui lòng nhập họ tên.`);
    if (row.candidate_no !== null) {
      if (
        numbers.has(row.candidate_no) ||
        !existing.some((c) => c.candidate_no === row.candidate_no)
      )
        throw new HttpError(
          400,
          `Dòng ${i + 1}: số ứng viên trùng hoặc không tồn tại; ứng viên mới cần để trống số.`,
        );
      numbers.add(row.candidate_no);
    }
    const name_search = electionSearch(row.full_name);
    if (names.has(name_search))
      warnings.push(`Dòng ${i + 1}: trùng tên ${row.full_name}.`);
    names.add(name_search);
    let member_id = row.member_id?.toLowerCase() || null;
    if (member_id && !known.has(member_id)) {
      warnings.push(
        `Dòng ${i + 1}: không tìm thấy thành viên liên kết; lưu dưới dạng ứng viên độc lập.`,
      );
      member_id = null;
    }
    rows.push({ ...row, member_id, name_search });
  }
  const added = rows.filter((r) => r.candidate_no === null).length;
  const removed = existing.filter(
    (c) => !c.retired && !numbers.has(c.candidate_no),
  ).length;
  await db.query(
    "UPDATE church.election_nominees SET retired=true WHERE election_id=$1",
    [election.id],
  );
  let next = election.next_candidate_no;
  for (const row of rows) {
    if (row.candidate_no !== null)
      await db.query(
        "UPDATE church.election_nominees SET full_name=$3,name_search=$4,member_id=$5,extra=$6,included=$7,retired=false WHERE election_id=$1 AND candidate_no=$2",
        [
          election.id,
          row.candidate_no,
          row.full_name,
          row.name_search,
          row.member_id,
          JSON.stringify(row.extra),
          row.included,
        ],
      );
    else
      await db.query(
        "INSERT INTO church.election_nominees(election_id,candidate_no,full_name,name_search,member_id,extra,included) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          election.id,
          next++,
          row.full_name,
          row.name_search,
          row.member_id,
          JSON.stringify(row.extra),
          row.included,
        ],
      );
  }
  await db.query(
    "UPDATE church.election_contests SET next_candidate_no=$2 WHERE id=$1",
    [election.id, next],
  );
  const {
    rows: [round],
  } = await db.query(
    "INSERT INTO church.election_rounds(election_id,round_no) VALUES($1,1) ON CONFLICT(election_id,round_no) DO UPDATE SET election_id=EXCLUDED.election_id RETURNING *",
    [election.id],
  );
  await db.query(
    "DELETE FROM church.election_round_candidates WHERE round_id=$1",
    [round.id],
  );
  await db.query(
    "INSERT INTO church.election_round_candidates(round_id,candidate_id,source) SELECT $1,id,'initial' FROM church.election_nominees WHERE election_id=$2 AND included AND NOT retired",
    [round.id, election.id],
  );
  await electionLog(
    db,
    actor,
    election.id,
    round.id,
    data.sourceFileHash ? "candidate_list_imported" : "candidate_list_saved",
    {
      hash: data.sourceFileHash ?? fileHash(JSON.stringify(rows)),
      listHash: fileHash(JSON.stringify(rows)),
      added,
      removed,
      count: rows.length,
      warnings,
    },
    request,
  );
  return {
    ok: true,
    round,
    warnings,
    ...(await candidateList(db, actor, election)),
  };
}

export async function addSingleCandidate(
  db: DB,
  actor: AuthUser,
  election: any,
  input: unknown,
  request: Request,
) {
  requireElection(actor, true);
  const data = z
    .object({
      member_id: z.string().uuid(),
    })
    .parse(input);
  if (election.status === "archived")
    throw new HttpError(409, "Cuộc bầu cử đã lưu trữ.");
  if (
    (
      await db.query(
        "SELECT 1 FROM church.election_rounds WHERE election_id=$1 AND opened_at IS NOT NULL",
        [election.id],
      )
    ).rowCount
  )
    throw new HttpError(409, "Danh sách đã khóa vì có vòng đã mở.");
  const { existing } = await candidateSnapshot(db, election.id);
  const {
    rows: [member],
  } = await db.query<{ full_name: string }>(
    "SELECT full_name FROM church.member_profiles WHERE id=$1 AND deleted_at IS NULL",
    [data.member_id],
  );
  if (!member) throw new HttpError(400, "Không tìm thấy thành viên.");
  const duplicate = existing.find(
    (c) => c.member_id === data.member_id && !c.retired,
  );
  if (duplicate)
    throw new HttpError(400, "Thành viên này đã có trong danh sách ứng viên.");
  const name_search = electionSearch(member.full_name);
  const nextNo = election.next_candidate_no;
  const {
    rows: [newCandidate],
  } = await db.query(
    "INSERT INTO church.election_nominees(election_id,candidate_no,full_name,name_search,member_id,extra,included) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [
      election.id,
      nextNo,
      member.full_name,
      name_search,
      data.member_id,
      JSON.stringify({}),
      true,
    ],
  );
  await db.query(
    "UPDATE church.election_contests SET next_candidate_no=$2 WHERE id=$1",
    [election.id, nextNo + 1],
  );
  const {
    rows: [round],
  } = await db.query(
    "INSERT INTO church.election_rounds(election_id,round_no) VALUES($1,1) ON CONFLICT(election_id,round_no) DO UPDATE SET election_id=EXCLUDED.election_id RETURNING *",
    [election.id],
  );
  await db.query(
    "INSERT INTO church.election_round_candidates(round_id,candidate_id,source) VALUES($1,$2,'manual') ON CONFLICT DO NOTHING",
    [round.id, newCandidate.id],
  );
  await electionLog(
    db,
    actor,
    election.id,
    round.id,
    "candidate_added",
    {
      candidateId: newCandidate.id,
      memberId: data.member_id,
      name: member.full_name,
    },
    request,
  );
  return {
    ok: true,
    candidate: newCandidate,
    ...(await candidateList(db, actor, election)),
  };
}
