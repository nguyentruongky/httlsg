import { createHash } from "node:crypto";
import { z } from "zod";
import {
  PersonnelMissionsInput,
  PERSONNEL_MINISTRY_NAMES,
  PERSONNEL_CHOIR_NAMES,
  personnelDepartmentKey,
  type PersonnelMissionValue,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { requirePermission } from "./session";
import { HttpError } from "./http";
import { assignUserRole } from "./roles";
import { audit, canonicalMemberId } from "./members";
import { LEGACY_BOARD, MEMBERSHIP_TITLE } from "./department-board-sql";

type Membership = { department_id: string; position: string };
type BoardMember = { id: string; name: string; position: string };
type Board = {
  department_id: string;
  department_name: string;
  revision: number;
  members: BoardMember[];
};
function authorize(actor: AuthUser) {
  if (!["admin", "secretary"].includes(actor.role))
    throw new HttpError(403, "Bạn không có quyền thay đổi công tác.");
  requirePermission(actor, "access.manage");
  requirePermission(actor, "departments.manage");
}
function positionKind(
  position: string,
): "board" | "leader" | "specialist" | undefined {
  const value = position.trim().toLocaleLowerCase("vi");
  if (value.startsWith("trưởng ban")) return "leader";
  if (value.startsWith("đặc trách")) return "specialist";
  if (
    [
      "ban điều hành",
      "phó ban",
      "thư ký",
      "thủ quỹ",
      "ủy viên",
      "uỷ viên",
    ].some((title) => value.startsWith(title))
  )
    return "board";
}
function missionKey(item: PersonnelMissionValue) {
  return `${item.kind}:${item.departmentId ?? ""}`;
}
function ordered(missions: PersonnelMissionValue[]) {
  return [...missions].sort((a, b) =>
    missionKey(a).localeCompare(missionKey(b)),
  );
}
async function state(db: DB, id: string) {
  z.uuid().parse(id);
  if ((await canonicalMemberId(db, id)) !== id.toLowerCase())
    throw new HttpError(409, "Hồ sơ đã được hợp nhất. Vui lòng tải lại.");
  const profile = (
    await db.query(
      "SELECT id,full_name,role_id,version FROM church.member_profiles WHERE id=$1 AND deleted_at IS NULL",
      [id],
    )
  ).rows[0];
  if (!profile) throw new HttpError(404, "Không tìm thấy thành viên.");
  const memberships = (
    await db.query(
      "SELECT department_id,position FROM church.department_members WHERE user_id=$1 ORDER BY department_id",
      [id],
    )
  ).rows as Membership[];
  const roles = (
    await db.query(
      "SELECT role_id,department_id FROM church.member_roles WHERE member_id=$1 ORDER BY role_id,department_id",
      [id],
    )
  ).rows as { role_id: string; department_id: string | null }[];
  const account = (
    await db.query("SELECT department_id FROM church.users WHERE id=$1", [id])
  ).rows[0];
  if (!roles.length && profile.role_id !== "user")
    roles.push({
      role_id: profile.role_id,
      department_id: ["board", "leader"].includes(profile.role_id)
        ? (account?.department_id ?? null)
        : null,
    });
  const year = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
    }).format(new Date()),
  );
  const boards = (
    await db.query(
      "SELECT DISTINCT ON (department_id) department_id,department_name,revision,members FROM church.department_board_history WHERE year=$1 AND department_id IS NOT NULL ORDER BY department_id,revision DESC",
      [year],
    )
  ).rows as Board[];
  const legacy = (
    await db.query(`SELECT d.id department_id,d.name department_name,0 revision,
    jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name,'position',COALESCE(${MEMBERSHIP_TITLE.replaceAll("$1", "d.id")},'Ban điều hành')) ORDER BY p.id) members
    FROM church.departments d JOIN church.department_members dm ON dm.department_id=d.id JOIN church.member_profiles p ON p.id=dm.user_id
    WHERE p.deleted_at IS NULL AND NOT p.is_test_account AND NOT EXISTS(SELECT 1 FROM church.department_board_history h WHERE h.department_id=d.id)
    AND ${LEGACY_BOARD.replaceAll("$1", "d.id")} GROUP BY d.id,d.name`)
  ).rows as Board[];
  boards.push(...legacy);
  const specialists = (
    await db.query(
      "SELECT department_id FROM church.personnel_missions WHERE member_id=$1 AND kind='specialist' ORDER BY department_id",
      [id],
    )
  ).rows as { department_id: string }[];
  const missions: PersonnelMissionValue[] = roles.map((entry) => ({
    kind: entry.role_id as PersonnelMissionValue["kind"],
    departmentId: entry.department_id,
  }));
  for (const board of boards) {
    const member = board.members.find(
      (item) => item.id.toLowerCase() === id.toLowerCase(),
    );
    if (member)
      missions.push({
        kind: positionKind(member.position) ?? "board",
        departmentId: board.department_id,
      });
  }
  const managers = (
    await db.query(
      "SELECT department_id,'board' kind FROM church.department_managers WHERE user_id=$1 UNION SELECT department_id,'leader' kind FROM church.department_leaders WHERE user_id=$1",
      [id],
    )
  ).rows as { department_id: string; kind: "board" | "leader" }[];
  for (const entry of managers)
    missions.push({ kind: entry.kind, departmentId: entry.department_id });
  for (const entry of specialists)
    missions.push({ kind: "specialist", departmentId: entry.department_id });
  for (const entry of memberships) {
    const kind = positionKind(entry.position);
    if (kind) missions.push({ kind, departmentId: entry.department_id });
    else if (
      !missions.some((item) => item.departmentId === entry.department_id)
    )
      missions.push({ kind: "department", departmentId: entry.department_id });
  }
  const unique = ordered([
    ...new Map(missions.map((item) => [missionKey(item), item])).values(),
  ]);
  const revision = createHash("sha256")
    .update(
      JSON.stringify({
        version: profile.version,
        roles,
        memberships,
        missions: unique,
      }),
    )
    .digest("hex");
  const departments = (
    await db.query("SELECT id,name FROM church.departments ORDER BY name")
  ).rows as { id: string; name: string }[];
  return {
    profile,
    memberships,
    roles,
    boards,
    year,
    revision,
    missions: unique,
    departments,
  };
}
function retainedChoirMission(
  mission: PersonnelMissionValue,
  departments: { id: string; name: string }[],
) {
  const name = departments.find(
    (item) => item.id === mission.departmentId,
  )?.name;
  return Boolean(
    name &&
    PERSONNEL_CHOIR_NAMES.some(
      (choir) => personnelDepartmentKey(choir) === personnelDepartmentKey(name),
    ) &&
    !["board", "specialist"].includes(mission.kind),
  );
}
export async function getPersonnelMissions(
  db: DB,
  actor: AuthUser,
  id: string,
) {
  authorize(actor);
  const current = await state(db, id);
  return {
    revision: current.revision,
    missions: current.missions.filter(
      (mission) => !retainedChoirMission(mission, current.departments),
    ),
    departments: current.departments,
  };
}
export async function savePersonnelMissions(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  authorize(actor);
  const submitted = PersonnelMissionsInput.parse(input);
  await db.query(
    "SELECT id FROM church.member_profiles WHERE id=$1 FOR UPDATE",
    [z.uuid().parse(id)],
  );
  const current = await state(db, id);
  if (
    submitted.missions.some((mission) =>
      retainedChoirMission(mission, current.departments),
    )
  )
    throw new HttpError(
      400,
      "Ban hát chỉ là công tác khi phân công Ban điều hành hoặc Đặc trách.",
    );
  const fields = {
    ...submitted,
    missions: [
      ...submitted.missions,
      ...current.missions.filter((mission) =>
        retainedChoirMission(mission, current.departments),
      ),
    ],
  };
  if (fields.revision !== current.revision)
    throw new HttpError(
      409,
      "Công tác đã thay đổi. Vui lòng đóng và mở lại để tải dữ liệu mới.",
    );
  if (
    JSON.stringify(ordered(fields.missions)) ===
    JSON.stringify(ordered(current.missions))
  )
    return { ok: true };
  const allowed = new Set(
    [...PERSONNEL_MINISTRY_NAMES, ...PERSONNEL_CHOIR_NAMES].map(
      personnelDepartmentKey,
    ),
  );
  const oldDepartments = new Set(
    current.missions.map((item) => item.departmentId),
  );
  for (const mission of fields.missions) {
    if (!mission.departmentId) continue;
    const department = current.departments.find(
      (item) => item.id === mission.departmentId,
    );
    if (
      !department ||
      (!allowed.has(personnelDepartmentKey(department.name)) &&
        !oldDepartments.has(department.id))
    )
      throw new HttpError(
        400,
        "Vui lòng chọn Ban hát hoặc Ban ngành trong danh sách công tác.",
      );
  }
  const accessRoles = fields.missions
    .filter(
      (item) =>
        !["department", "specialist"].includes(item.kind) &&
        (current.roles.some((role) => role.role_id === item.kind) ||
          !current.missions.some(
            (old) => missionKey(old) === missionKey(item),
          )),
    )
    .map((item) => ({ role_id: item.kind, department_id: item.departmentId }));
  const accessKey = (
    items: { role_id: string; department_id: string | null }[],
  ) =>
    JSON.stringify(
      [...items].sort((a, b) =>
        `${a.role_id}:${a.department_id ?? ""}`.localeCompare(
          `${b.role_id}:${b.department_id ?? ""}`,
        ),
      ),
    );
  if (accessKey(accessRoles) !== accessKey(current.roles))
    await assignUserRole(db, actor, { user_id: id, roles: accessRoles });
  const departments = [
    ...new Set(
      fields.missions
        .map((item) => item.departmentId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  await db.query(
    "DELETE FROM church.department_managers WHERE user_id=$1 AND NOT(department_id=ANY($2::text[]))",
    [
      id,
      fields.missions
        .filter((item) => item.kind === "board")
        .map((item) => item.departmentId),
    ],
  );
  await db.query(
    "DELETE FROM church.department_leaders WHERE user_id=$1 AND NOT(department_id=ANY($2::text[]))",
    [
      id,
      fields.missions
        .filter((item) => item.kind === "leader")
        .map((item) => item.departmentId),
    ],
  );
  await db.query(
    "DELETE FROM church.department_members WHERE user_id=$1 AND NOT(department_id=ANY($2::text[]))",
    [id, departments],
  );
  for (const department of departments) {
    const missions = fields.missions.filter(
      (item) => item.departmentId === department,
    );
    const old = current.memberships.find(
      (item) => item.department_id === department,
    );
    const position = missions.some((item) => item.kind === "leader")
      ? "Trưởng Ban"
      : missions.some((item) => item.kind === "board")
        ? old && positionKind(old.position) === "board"
          ? old.position
          : "Ban điều hành"
        : missions.some((item) => item.kind === "specialist")
          ? "Đặc trách"
          : old && !positionKind(old.position)
            ? old.position
            : "Ban viên";
    await db.query(
      "INSERT INTO church.department_members(user_id,department_id,position) VALUES($1,$2,$3) ON CONFLICT(user_id,department_id) DO UPDATE SET position=EXCLUDED.position",
      [id, department, position],
    );
  }
  await db.query("DELETE FROM church.personnel_missions WHERE member_id=$1", [
    id,
  ]);
  for (const mission of fields.missions.filter(
    (item) => item.kind === "specialist",
  ))
    await db.query(
      "INSERT INTO church.personnel_missions(member_id,kind,department_id) VALUES($1,'specialist',$2)",
      [id, mission.departmentId],
    );
  // Append current-year board revisions; preserve historical snapshots and all other members.
  const boardDepartments = new Set([
    ...current.boards
      .filter((board) =>
        board.members.some(
          (member) => member.id.toLowerCase() === id.toLowerCase(),
        ),
      )
      .map((board) => board.department_id),
    ...fields.missions
      .filter((item) => ["board", "leader"].includes(item.kind))
      .map((item) => item.departmentId!),
  ]);
  for (const departmentId of boardDepartments) {
    const board = current.boards.find(
      (item) => item.department_id === departmentId,
    );
    const members = (board?.members ?? []).filter(
      (member) => member.id.toLowerCase() !== id.toLowerCase(),
    );
    const mission = fields.missions.find(
      (item) =>
        item.departmentId === departmentId &&
        (["board", "leader"].includes(item.kind) ||
          (item.kind === "specialist" &&
            board?.members.some(
              (member) =>
                member.id.toLowerCase() === id.toLowerCase() &&
                positionKind(member.position) === "specialist",
            ))),
    );
    if (mission) {
      const previous = board?.members.find(
        (member) => member.id.toLowerCase() === id.toLowerCase(),
      );
      const unchanged = current.missions.some(
        (item) => missionKey(item) === missionKey(mission),
      );
      members.push({
        id,
        name: current.profile.full_name,
        position:
          unchanged && previous
            ? previous.position
            : mission.kind === "leader"
              ? "Trưởng Ban"
              : "Ban điều hành",
      });
    }
    const sorted = (items: BoardMember[]) =>
      JSON.stringify([...items].sort((a, b) => a.id.localeCompare(b.id)));
    if (sorted(members) === sorted(board?.members ?? [])) continue;
    await db.query(
      "INSERT INTO church.department_board_history(department_id,department_name,year,revision,members,created_by) VALUES($1,$2,$3,$4,$5::jsonb,$6)",
      [
        departmentId,
        current.departments.find((item) => item.id === departmentId)!.name,
        current.year,
        (board?.revision ?? 0) + 1,
        sorted(members),
        actor.id,
      ],
    );
  }
  await db.query(
    "UPDATE church.member_profiles SET version=version+1 WHERE id=$1",
    [id],
  );
  for (const departmentId of new Set([
    ...departments,
    ...current.memberships.map((item) => item.department_id),
  ]))
    await db.query("SELECT pg_notify('church_team_events',$1)", [
      JSON.stringify({ department_id: departmentId, kind: "members" }),
    ]);
  await audit(db, actor, id, "Đã thay đổi công tác, Ban hát và Ban ngành");
  return { ok: true };
}
