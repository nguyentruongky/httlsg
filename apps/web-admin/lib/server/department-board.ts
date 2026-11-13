import { z } from "zod";
import type { AuthUser } from "@org/core";
import type { DB } from "./db";
import { requirePermission, isAdministrativeRead } from "./session";
import { HttpError } from "./http";
import { audit, canonicalMemberId } from "./members";
import { LEGACY_BOARD, MEMBERSHIP_TITLE } from "./department-board-sql";
const Position = z.string().trim().min(1).max(100);
const Year = z.number().int().min(1900).max(2200);
const Input = z
  .object({
    year: Year,
    revision: z.number().int().min(0),
    members: z
      .array(z.object({ id: z.uuid(), position: Position }).strict())
      .max(100)
      .refine(
        (items) =>
          new Set(items.map((item) => item.id.toLowerCase())).size ===
          items.length,
        "Thành viên bị trùng.",
      ),
  })
  .strict();
type BoardMember = { id: string; name: string; position: string };
function currentYear() {
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
    }).format(new Date()),
  );
}
async function authorize(db: DB, actor: AuthUser, id: string) {
  if (
    !isAdministrativeRead(actor) &&
    !["admin", "secretary"].includes(actor.role)
  )
    throw new HttpError(403, "Bạn không có quyền quản lý Ban điều hành.");
  requirePermission(actor, "departments.manage");
  z.string()
    .regex(/^[a-z0-9-]+$/)
    .max(100)
    .parse(id);
  const row = (
    await db.query("SELECT name FROM church.departments WHERE id=$1", [id])
  ).rows[0];
  if (!row) throw new HttpError(404, "Không tìm thấy Ban ngành.");
  return row.name as string;
}
async function yearBoard(db: DB, id: string, year: number) {
  const saved = (
    await db.query(
      'SELECT year,revision,members,created_at AS "createdAt" FROM church.department_board_history WHERE department_id=$1 AND year=$2 ORDER BY revision DESC LIMIT 1',
      [id, year],
    )
  ).rows[0];
  if (saved)
    return saved as {
      year: number;
      revision: number;
      members: BoardMember[];
      createdAt?: string;
    };
  const members: BoardMember[] =
    year === currentYear() &&
    !(
      await db.query(
        "SELECT 1 FROM church.department_board_history WHERE department_id=$1 LIMIT 1",
        [id],
      )
    ).rowCount
      ? (
          await db.query(
            `SELECT p.id,p.full_name name,COALESCE(${MEMBERSHIP_TITLE},'Ban điều hành') position FROM church.member_profiles p JOIN church.department_members dm ON dm.user_id=p.id AND dm.department_id=$1 WHERE p.deleted_at IS NULL AND NOT p.is_test_account AND ${LEGACY_BOARD} ORDER BY p.full_name,p.id`,
            [id],
          )
        ).rows
      : [];
  return { year, revision: 0, members };
}
export async function listDepartmentBoard(db: DB, actor: AuthUser, id: string) {
  await authorize(db, actor, id);
  const items = (
    await db.query(
      `SELECT DISTINCT ON (h.year) h.year,h.revision,h.members,h.created_at AS "createdAt" FROM church.department_board_history h WHERE h.department_id=$1 ORDER BY h.year DESC,h.revision DESC`,
      [id],
    )
  ).rows;
  if (!items.some((item) => item.year === currentYear()))
    items.push(await yearBoard(db, id, currentYear()));
  return { items: items.sort((a, b) => b.year - a.year) };
}
async function validMember(
  db: DB,
  id: string,
  memberId: string,
  position: string,
): Promise<BoardMember> {
  if ((await canonicalMemberId(db, memberId)) !== memberId.toLowerCase())
    throw new HttpError(409, "Hồ sơ đã được gộp. Vui lòng tải lại.");
  const profile = (
    await db.query(
      "SELECT p.full_name name FROM church.member_profiles p JOIN church.department_members dm ON dm.user_id=p.id AND dm.department_id=$2 WHERE p.id=$1 AND p.deleted_at IS NULL AND NOT p.is_test_account",
      [memberId, id],
    )
  ).rows[0];
  if (!profile)
    throw new HttpError(400, "Chỉ chọn thành viên hiện thuộc Ban ngành.");
  return { id: memberId.toLowerCase(), name: profile.name, position };
}
function canonical(members: BoardMember[]) {
  return JSON.stringify(
    members
      .map((item) => ({
        id: item.id,
        name: item.name,
        position: item.position,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}
async function persist(
  db: DB,
  actor: AuthUser,
  id: string,
  name: string,
  year: number,
  revision: number,
  members: BoardMember[],
) {
  if (members.length > 100)
    throw new HttpError(400, "Ban điều hành tối đa 100 thành viên.");
  const previous = await yearBoard(db, id, year);
  if (previous.revision !== revision)
    throw new HttpError(
      409,
      "Ban điều hành đã thay đổi. Vui lòng tải lại danh sách.",
    );
  if (
    previous.revision > 0 &&
    canonical(previous.members) === canonical(members)
  )
    return { revision };
  await db.query(
    "INSERT INTO church.department_board_history(department_id,department_name,year,revision,members,created_by) VALUES($1,$2,$3,$4,$5::jsonb,$6)",
    [id, name, year, revision + 1, canonical(members), actor.id],
  );
  await audit(
    db,
    actor,
    actor.id,
    `Cập nhật Ban điều hành ${name} năm ${year}`,
  );
  return { revision: revision + 1 };
}
export async function saveDepartmentBoard(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  const name = await authorize(db, actor, id);
  const fields = Input.parse(input);
  await db.query("SELECT id FROM church.departments WHERE id=$1 FOR UPDATE", [
    id,
  ]);
  const members = [];
  for (const member of fields.members)
    members.push(await validMember(db, id, member.id, member.position));
  return persist(db, actor, id, name, fields.year, fields.revision, members);
}
export async function changeDepartmentBoardMember(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  const name = await authorize(db, actor, id);
  const fields = z
    .object({
      year: Year,
      revision: z.number().int().min(0),
      id: z.uuid(),
      position: Position.nullable(),
    })
    .strict()
    .parse(input);
  await db.query("SELECT id FROM church.departments WHERE id=$1 FOR UPDATE", [
    id,
  ]);
  const current = await yearBoard(db, id, fields.year);
  if (current.revision !== fields.revision)
    throw new HttpError(
      409,
      "Ban điều hành đã thay đổi. Vui lòng tải lại danh sách.",
    );
  const members = current.members.filter(
    (item) => item.id !== fields.id.toLowerCase(),
  );
  if (fields.position !== null)
    members.push(await validMember(db, id, fields.id, fields.position));
  return persist(db, actor, id, name, fields.year, fields.revision, members);
}
