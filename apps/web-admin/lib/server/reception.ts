import { createHash } from "node:crypto";
import {
  ReceptionMonthInput,
  generateReceptionSchedule,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { requireScheduleCategory } from "./schedules";
import { HttpError } from "./http";
import { audit } from "./members";
async function snapshot(db: DB) {
  const rows = (
    await db.query(`
    SELECT p.id AS "memberId",p.full_name name,
      COALESCE(NULLIF(btrim(p.gender),''),p.source->>'gender','') gender,
      bool_or(regexp_replace(lower(public.unaccent(d.name)),'[^a-z0-9]','','g')='banchapsu') AS "isDeacon",
      array_agg(DISTINCT d.name ORDER BY d.name) AS "sourceDepartments"
    FROM church.department_members dm
    JOIN church.departments d ON d.id=dm.department_id
    JOIN church.member_profiles p ON p.id=dm.user_id
    WHERE regexp_replace(lower(public.unaccent(d.name)),'[^a-z0-9]','','g') IN ('banchapsu','bantieptantrattu')
      AND p.enabled AND p.deleted_at IS NULL AND NOT p.is_test_account
    GROUP BY p.id,p.full_name,p.gender,p.source ORDER BY p.id
  `)
  ).rows;
  const token = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
  const items = rows.map(({ gender, isDeacon, ...person }) => {
    const normalized = String(gender)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
    const eligibility = ["nam", "male", "m"].includes(normalized)
      ? isDeacon
        ? ("male_deacon" as const)
        : ("male" as const)
      : ["nu", "female", "f"].includes(normalized)
        ? ("female" as const)
        : ("" as const);
    return { ...person, eligibility, available: true };
  });
  return { items, token };
}
export async function receptionTeam(db: DB, actor: AuthUser) {
  await requireScheduleCategory(db, actor, "reception");
  return snapshot(db);
}
export async function saveReceptionTeam(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  await requireScheduleCategory(db, actor, "reception");
  throw new HttpError(
    400,
    "Đội tiếp tân được lấy tự động từ Ban Chấp sự và Ban Tiếp tân - Trật tự. Vui lòng cập nhật thành viên và giới tính trong hồ sơ/Ban ngành.",
  );
}
export async function previewReceptionMonth(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  await requireScheduleCategory(db, actor, "reception");
  const fields = ReceptionMonthInput.parse(input),
    team = await snapshot(db);
  if (team.token !== fields.token)
    throw new HttpError(
      409,
      "Đội tiếp tân đã thay đổi. Vui lòng mở lại trước khi tạo lịch.",
    );
  if (!team.items.length)
    throw new HttpError(
      400,
      "Chưa có thành viên trong Ban Chấp sự và Ban Tiếp tân - Trật tự.",
    );
  const eligible = team.items
    .filter((person) => person.eligibility !== "")
    .map((person) => ({
      ...person,
      eligibility: person.eligibility as "male_deacon" | "male" | "female",
    }));
  if (!eligible.length)
    throw new HttpError(
      400,
      "Chưa có thành viên có dữ liệu giới tính hợp lệ. Vui lòng cập nhật hồ sơ trước khi tạo lịch.",
    );
  const result = generateReceptionSchedule(fields.month, eligible);
  result.warnings.unshift(
    ...team.items
      .filter((person) => !person.eligibility)
      .map(
        (person) =>
          `${person.name}: chưa có dữ liệu giới tính hợp lệ, chưa được tự động phân công.`,
      ),
  );
  await audit(
    db,
    actor,
    actor.id,
    `Xem trước lịch tiếp tân ${fields.month}: ${result.filled}/${result.required} phân công; chưa lưu hoặc thông báo`,
  );
  return result;
}
