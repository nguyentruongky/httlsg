import { validateQuarterlyConflicts } from "./quarterly-conflicts";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  normalizeQuarterlySchedule,
  ScheduleCategoryId,
  ScheduleSettings,
  ScheduleCreate,
  ScheduleUpdate,
  ScheduleTransition,
  ScheduleCopyInput,
  copyScheduleDraft,
  assignmentSignatures,
  affectedAssignments,
  sortDepartments,
  type AuthUser,
  type ScheduleRecord,
  type ScheduleDraftValue,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { audit, canonicalMemberId } from "./members";
import { queueScheduleNotifications } from "./schedule-notifications";
const Id = z.uuid();
const manager = (actor: AuthUser, category: string) =>
  actor.role === "admin" ||
  actor.permissions.includes(`schedule.${category}.manage`);
function administrators(actor: AuthUser) {
  if (
    !["admin", "secretary"].includes(actor.role) ||
    actor.requiresPasswordSetup ||
    !(
      actor.role === "admin" ||
      actor.permissions.includes("schedule.leaders.manage")
    )
  )
    throw new HttpError(
      403,
      "Bạn không có quyền quản lý người phụ trách lịch.",
    );
}
export async function requireScheduleCategory(
  db: DB,
  actor: AuthUser,
  category: string,
  configure = false,
) {
  ScheduleCategoryId.parse(category);
  const row = (
    await db.query(
      'SELECT id,name,description,is_active AS "isActive",settings,version FROM church.schedule_categories WHERE id=$1',
      [category],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Không tìm thấy loại lịch.");
  if (
    !manager(actor, category) ||
    (!row.isActive &&
      !(
        configure &&
        (actor.role === "admin" ||
          actor.permissions.includes("schedule.leaders.manage"))
      ))
  )
    throw new HttpError(
      403,
      "Bạn không được quản lý loại lịch này hoặc loại lịch đã tắt.",
    );
  return row;
}
export async function scheduleCategories(db: DB, actor: AuthUser) {
  const rows = (
    await db.query(
      'SELECT id,name,description,is_active AS "isActive",settings,version FROM church.schedule_categories ORDER BY CASE id WHEN $$reception$$ THEN 1 WHEN $$prayer_guidance$$ THEN 2 WHEN $$program_guidance$$ THEN 3 ELSE 4 END',
    )
  ).rows;
  const definitions = (
    await db.query(
      'SELECT id,category_id,name,description,is_active AS "isActive",sort_order AS "sortOrder" FROM church.schedule_responsibility_definitions ORDER BY sort_order,id',
    )
  ).rows;
  const admin =
    actor.role === "admin" ||
    actor.permissions.includes("schedule.leaders.manage");
  return {
    items: rows
      .filter((row) => admin || (row.isActive && manager(actor, row.id)))
      .map((row) => ({
        ...row,
        canManage: row.isActive && manager(actor, row.id),
        definitions: definitions.filter((item) => item.category_id === row.id),
      })),
    departments: managerAny(actor)
      ? sortDepartments(
          (await db.query("SELECT id,name FROM church.departments")).rows,
        )
      : [],
  };
}
export function managerAny(actor: AuthUser) {
  return (
    actor.role === "admin" ||
    actor.permissions.some((permission) =>
      /^schedule\.(reception|prayer_guidance|program_guidance|communion_duty)\.manage$/.test(
        permission,
      ),
    )
  );
}
export async function configureScheduleCategory(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  const f = z
    .object({
      categoryId: ScheduleCategoryId,
      version: z.number().int().min(0),
      settings: ScheduleSettings,
      isActive: z.boolean().optional(),
      definitions: z
        .array(
          z
            .object({
              id: Id,
              name: z.string().trim().min(1).max(100),
              description: z.string().trim().max(500),
              isActive: z.boolean(),
              sortOrder: z.number().int().min(0).max(100),
            })
            .strict(),
        )
        .max(20)
        .refine(
          (items) =>
            new Set(items.map((item) => item.id)).size === items.length &&
            new Set(items.map((item) => item.name.toLocaleLowerCase("vi")))
              .size === items.length,
        ),
    })
    .strict()
    .parse(input);
  const before = await requireScheduleCategory(db, actor, f.categoryId, true);
  if (f.isActive !== undefined) administrators(actor);
  const result = await db.query(
    "UPDATE church.schedule_categories SET settings=$3::jsonb,is_active=$4,version=version+1,updated_at=now() WHERE id=$1 AND version=$2 RETURNING id",
    [
      f.categoryId,
      f.version,
      JSON.stringify(f.settings),
      f.isActive ?? before.isActive,
    ],
  );
  if (!result.rowCount)
    throw new HttpError(409, "Cấu hình đã thay đổi. Vui lòng tải lại.");
  await db.query(
    "DELETE FROM church.schedule_responsibility_definitions WHERE category_id=$1",
    [f.categoryId],
  );
  for (const item of f.definitions)
    await db.query(
      "INSERT INTO church.schedule_responsibility_definitions(id,category_id,name,description,is_active,sort_order) VALUES($1,$2,$3,$4,$5,$6)",
      [
        item.id,
        f.categoryId,
        item.name,
        item.description,
        item.isActive,
        item.sortOrder,
      ],
    );
  await audit(
    db,
    actor,
    actor.id,
    `Cập nhật mẫu trách nhiệm và cấu hình lịch ${f.categoryId}`,
  );
  return scheduleCategories(db, actor);
}
async function header(db: DB, id: string, lock = false) {
  Id.parse(id);
  const row = (
    await db.query(
      `SELECT * FROM church.schedules WHERE id=$1 AND deleted_at IS NULL${lock ? " FOR UPDATE" : ""}`,
      [id],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Không tìm thấy lịch phân công.");
  return row;
}
async function hydrate(db: DB, row: any): Promise<ScheduleRecord> {
  const events = (
    await db.query(
      "SELECT id,event_date date,to_char(start_time,'HH24:MI') AS \"startTime\",to_char(end_time,'HH24:MI') AS \"endTime\",title,description,location,session FROM church.schedule_events WHERE schedule_id=$1 ORDER BY event_date,start_time NULLS LAST,sort_order,id",
      [row.id],
    )
  ).rows;
  const duties = (
    await db.query(
      "SELECT r.id,r.event_id,r.name,r.description,r.display_text FROM church.schedule_responsibilities r JOIN church.schedule_events e ON e.id=r.event_id WHERE e.schedule_id=$1 ORDER BY r.sort_order,r.id",
      [row.id],
    )
  ).rows;
  const assignments = (
    await db.query(
      'SELECT a.responsibility_id,a.member_id AS "memberId",a.notes,p.full_name name FROM church.schedule_assignments a JOIN church.schedule_responsibilities r ON r.id=a.responsibility_id JOIN church.schedule_events e ON e.id=r.event_id JOIN church.member_profiles p ON p.id=a.member_id WHERE e.schedule_id=$1 ORDER BY p.full_name,p.id',
      [row.id],
    )
  ).rows;
  const teams = (
    await db.query(
      "SELECT a.responsibility_id,a.department_key,a.department_name FROM church.schedule_department_assignments a JOIN church.schedule_responsibilities r ON r.id=a.responsibility_id JOIN church.schedule_events e ON e.id=r.event_id WHERE e.schedule_id=$1 ORDER BY a.department_name",
      [row.id],
    )
  ).rows;
  return normalizeQuarterlySchedule({
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    settings: row.settings,
    status: row.status,
    version: row.version,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    publishedAt: row.published_at
      ? new Date(row.published_at).toISOString()
      : null,
    cancelledAt: row.cancelled_at
      ? new Date(row.cancelled_at).toISOString()
      : null,
    memberNames: Object.fromEntries(
      assignments.map((item) => [item.memberId, item.name]),
    ),
    departmentNames: Object.fromEntries(
      teams.map((item) => [item.department_key, item.department_name]),
    ),
    events: events.map((event) => ({
      ...event,
      responsibilities: duties
        .filter((duty) => duty.event_id === event.id)
        .map((duty) => ({
          id: duty.id,
          name: duty.name,
          description: duty.description,
          ...(duty.display_text !== null
            ? { displayText: duty.display_text }
            : {}),
          assignments: assignments
            .filter((item) => item.responsibility_id === duty.id)
            .map(({ memberId, notes }) => ({ memberId, notes })),
          departmentIds: teams
            .filter((item) => item.responsibility_id === duty.id)
            .map((item) => item.department_key),
        })),
    })),
  } as ScheduleRecord);
}
export async function getAssignedSchedule(db: DB, actor: AuthUser, id: string) {
  const row = await header(db, id);
  const assignment = await db.query(
    `SELECT 1 FROM church.schedule_responsibilities r
     JOIN church.schedule_events e ON e.id=r.event_id
     WHERE e.schedule_id=$1 AND (
       EXISTS(SELECT 1 FROM church.schedule_assignments a WHERE a.responsibility_id=r.id AND a.member_id=$2)
       OR EXISTS(SELECT 1 FROM church.schedule_department_assignments da
         JOIN church.department_members dm ON dm.department_id=da.department_id
         WHERE da.responsibility_id=r.id AND dm.user_id=$2)
     ) LIMIT 1`,
    [id, actor.id],
  );
  if (
    !assignment.rowCount ||
    !row.published_at ||
    !["published", "cancelled"].includes(row.status)
  )
    throw new HttpError(
      404,
      "Bạn không có phân công trong lịch này hoặc lịch không còn khả dụng.",
    );
  return sharedSchedule(db, row, actor);
}

export async function getNotifiedSchedule(db: DB, actor: AuthUser, id: string) {
  const row = await header(db, id);
  const notice = await db.query(
    "SELECT 1 FROM church.schedule_notifications WHERE schedule_id=$1 AND member_id=$2 LIMIT 1",
    [id, actor.id],
  );
  if (
    !notice.rowCount ||
    !row.published_at ||
    !["published", "cancelled"].includes(row.status)
  ) {
    throw new HttpError(
      404,
      "Lịch không còn khả dụng hoặc bạn không thuộc nhóm nhận thông báo.",
    );
  }
  return sharedSchedule(db, row, actor);
}

async function sharedSchedule(
  db: DB,
  row: Awaited<ReturnType<typeof header>>,
  actor: AuthUser,
) {
  const data = await hydrate(db, row);
  // The shared schedule includes all duties and names; personal notes stay private.
  for (const event of data.events)
    for (const duty of event.responsibilities)
      for (const assignment of duty.assignments)
        if (assignment.memberId !== actor.id) assignment.notes = "";
  return data;
}

export async function getSchedule(db: DB, actor: AuthUser, id: string) {
  const row = await header(db, id);
  if (manager(actor, row.category_id)) {
    await requireScheduleCategory(db, actor, row.category_id);
    return hydrate(db, row);
  }
  if (row.status !== "published")
    throw new HttpError(404, "Lịch chưa được công bố hoặc bạn không được xem.");
  const data = await hydrate(db, row),
    departments = new Set(
      (
        await db.query(
          "SELECT department_id FROM church.department_members WHERE user_id=$1",
          [actor.id],
        )
      ).rows.map((item) => item.department_id),
    );
  data.events = data.events
    .map((event) => ({
      ...event,
      responsibilities: event.responsibilities
        .filter(
          (duty) =>
            duty.assignments.some((item) => item.memberId === actor.id) ||
            duty.departmentIds.some((id) => departments.has(id)),
        )
        .map((duty) => ({
          ...duty,
          displayText: undefined,
          assignments: duty.assignments.filter(
            (item) => item.memberId === actor.id,
          ),
          departmentIds: duty.departmentIds.filter((id) => departments.has(id)),
        })),
    }))
    .filter((event) => event.responsibilities.length);
  if (!data.events.length)
    throw new HttpError(404, "Bạn không có phân công trong lịch này.");
  data.memberNames = { [actor.id]: actor.name };
  data.departmentNames = Object.fromEntries(
    Object.entries(data.departmentNames).filter(([id]) => departments.has(id)),
  );
  return data;
}
const List = z
  .object({
    categoryId: ScheduleCategoryId.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    status: z.enum(["draft", "published", "cancelled"]).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();
export async function listSchedules(db: DB, actor: AuthUser, input: unknown) {
  const f = List.parse(input);
  if (!managerAny(actor))
    throw new HttpError(403, "Bạn chưa được giao quản lý lịch.");
  const categories = (await scheduleCategories(db, actor)).items
    .filter((item) => item.canManage)
    .map((item) => item.id);
  if (f.categoryId) {
    await requireScheduleCategory(db, actor, f.categoryId);
  }
  const { CalendarDate } = await import("@org/core");
  if (f.from) CalendarDate.parse(f.from);
  if (f.to) CalendarDate.parse(f.to);
  if (f.from && f.to && f.to < f.from)
    throw new HttpError(400, "Khoảng ngày không hợp lệ.");
  const values: unknown[] = [f.categoryId ? [f.categoryId] : categories];
  let where = "s.deleted_at IS NULL AND s.category_id=ANY($1::text[])";
  for (const [value, sql] of [
    [f.from, "s.period_end>="],
    [f.to, "s.period_start<="],
    [f.status, "s.status="],
  ] as const)
    if (value) {
      values.push(value);
      where += " AND " + sql + "$" + values.length;
    }
  const total = (
    await db.query(
      "SELECT count(*)::int total FROM church.schedules s WHERE " + where,
      values,
    )
  ).rows[0].total;
  values.push(25, (f.page - 1) * 25);
  const rows = (
    await db.query(
      `SELECT s.id,s.category_id AS "categoryId",c.name AS "categoryName",s.title,s.period_start AS "periodStart",s.period_end AS "periodEnd",s.status,s.version,(SELECT count(*)::int FROM church.schedule_events e WHERE e.schedule_id=s.id) AS "eventCount" FROM church.schedules s JOIN church.schedule_categories c ON c.id=s.category_id WHERE ${where} ORDER BY s.period_start DESC,s.created_at DESC,s.id LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    )
  ).rows;
  return {
    items: rows,
    total,
    nextPage: f.page * 25 < total ? f.page + 1 : null,
  };
}
async function validateMembers(db: DB, draft: ScheduleDraftValue) {
  const ids = [
    ...new Set(
      draft.events.flatMap((event) =>
        event.responsibilities.flatMap((duty) =>
          duty.assignments.map((item) => item.memberId),
        ),
      ),
    ),
  ];
  const teams = [
    ...new Set(
      draft.events.flatMap((event) =>
        event.responsibilities.flatMap((duty) => duty.departmentIds),
      ),
    ),
  ];
  const rows = (
    await db.query(
      "SELECT id,full_name FROM church.member_profiles WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL AND enabled AND NOT is_test_account",
      [ids],
    )
  ).rows;
  if (rows.length !== ids.length)
    throw new HttpError(
      400,
      "Có thành viên không còn hoạt động hoặc đã được gộp. Tìm và chọn lại.",
    );
  for (const id of ids)
    if ((await canonicalMemberId(db, id)) !== id.toLowerCase())
      throw new HttpError(409, "Hồ sơ đã được gộp. Vui lòng tải lại.");
  const departments = (
    await db.query(
      "SELECT id,name FROM church.departments WHERE id=ANY($1::text[])",
      [teams],
    )
  ).rows;
  if (departments.length !== teams.length)
    throw new HttpError(400, "Có Ban ngành không còn tồn tại.");
  return new Map<string, string>(
    departments.map((item) => [item.id, item.name]),
  );
}
async function replaceEvents(
  db: DB,
  id: string,
  draft: ScheduleDraftValue,
  departments: Map<string, string>,
) {
  await db.query("DELETE FROM church.schedule_events WHERE schedule_id=$1", [
    id,
  ]);
  for (const [i, event] of draft.events.entries()) {
    await db.query(
      "INSERT INTO church.schedule_events(id,schedule_id,event_date,start_time,end_time,title,description,location,session,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        event.id,
        id,
        event.date,
        event.startTime,
        event.endTime,
        event.title,
        event.description,
        event.location,
        event.session,
        i,
      ],
    );
    for (const [j, duty] of event.responsibilities.entries()) {
      await db.query(
        "INSERT INTO church.schedule_responsibilities(id,event_id,name,description,sort_order,display_text) VALUES($1,$2,$3,$4,$5,$6)",
        [
          duty.id,
          event.id,
          duty.name,
          duty.description,
          j,
          duty.displayText ?? null,
        ],
      );
      for (const assignment of duty.assignments)
        await db.query(
          "INSERT INTO church.schedule_assignments(responsibility_id,member_id,notes) VALUES($1,$2,$3)",
          [duty.id, assignment.memberId, assignment.notes],
        );
      for (const team of duty.departmentIds)
        await db.query(
          "INSERT INTO church.schedule_department_assignments(responsibility_id,department_key,department_id,department_name) VALUES($1,$2,$2,$3)",
          [duty.id, team, departments.get(team)],
        );
    }
  }
}
export async function saveSchedule(
  db: DB,
  actor: AuthUser,
  input: unknown,
  id?: string,
) {
  const parsed = id ? ScheduleUpdate.parse(input) : ScheduleCreate.parse(input);
  const bodyHash = createHash("sha256")
    .update(JSON.stringify(parsed))
    .digest("hex");
  const f = normalizeQuarterlySchedule(parsed);
  await requireScheduleCategory(db, actor, f.categoryId);
  let previous: ScheduleRecord | undefined;
  if (id) {
    const row = await header(db, id, true);
    await requireScheduleCategory(db, actor, row.category_id);
    if (row.category_id !== f.categoryId)
      throw new HttpError(400, "Không thể chuyển loại lịch đã tạo.");
    if (row.status === "cancelled")
      throw new HttpError(409, "Lịch đã hủy không thể sửa.");
    if (row.version !== (f as any).version)
      throw new HttpError(409, "Lịch đã thay đổi. Vui lòng tải lại.");
    previous = await hydrate(db, row);
  } else {
    const duplicate = (
      await db.query("SELECT * FROM church.schedules WHERE request_id=$1", [
        (f as any).requestId,
      ])
    ).rows[0];
    if (duplicate) {
      if (
        duplicate.created_by !== actor.id ||
        duplicate.request_hash !== bodyHash
      )
        throw new HttpError(409, "Mã tạo lịch đã được sử dụng.");
      await requireScheduleCategory(db, actor, duplicate.category_id);
      return hydrate(db, duplicate);
    }
  }
  if (
    previous?.settings.template === "quarterly_work" &&
    f.settings.template !== "quarterly_work"
  )
    throw new HttpError(400, "Không thể bỏ mẫu lịch công tác quý.");
  const checked = await validateQuarterlyConflicts(
    db,
    f,
    previous?.status === "published",
  );
  f.events = checked.events;
  const teams = await validateMembers(db, f);
  if (id) {
    await db.query("DELETE FROM church.schedule_events WHERE schedule_id=$1", [
      id,
    ]);
    await db.query(
      "UPDATE church.schedules SET title=$2,description=$3,period_start=$4,period_end=$5,settings=$6::jsonb,updated_by=$7,updated_at=now(),version=version+1 WHERE id=$1",
      [
        id,
        f.title,
        f.description,
        f.periodStart,
        f.periodEnd,
        JSON.stringify(f.settings),
        actor.id,
      ],
    );
  } else
    id = (
      await db.query(
        "INSERT INTO church.schedules(category_id,title,description,period_start,period_end,settings,request_id,request_hash,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$9) RETURNING id",
        [
          f.categoryId,
          f.title,
          f.description,
          f.periodStart,
          f.periodEnd,
          JSON.stringify(f.settings),
          (f as any).requestId,
          bodyHash,
          actor.id,
        ],
      )
    ).rows[0].id;
  await replaceEvents(db, id!, f, teams);
  const saved = await hydrate(db, await header(db, id!));
  const groups = await assignmentDepartments(db, [
    ...(previous ? [previous] : []),
    saved,
  ]);
  const previousSignatures =
    previous?.status === "published"
      ? await readMemberState(db, previous.id)
      : previous
        ? assignmentSignatures(previous, groups)
        : new Map<string, string>();
  const signatures = assignmentSignatures(saved, groups);
  const changes = affectedAssignments(previousSignatures, signatures);
  if (previous?.status === "published")
    await writeMemberState(db, saved, signatures);
  await audit(
    db,
    actor,
    actor.id,
    `${previous ? "Cập nhật" : "Tạo"} lịch phân công ${id}; cập nhật chương trình/trách nhiệm, ${changes.length} thành viên thay đổi`,
  );
  for (const change of changes)
    await audit(
      db,
      actor,
      change.memberId,
      `Phân công lịch ${id}: ${change.kind}`,
    );
  if (previous?.status === "published" && (f as any).notifyAffected)
    await queueScheduleNotifications(db, saved, changes);
  return saved;
}
export async function assignmentDepartments(
  db: DB,
  schedules: ScheduleDraftValue[],
) {
  const ids = [
    ...new Set(
      schedules.flatMap((schedule) =>
        schedule.events.flatMap((event) =>
          event.responsibilities.flatMap((duty) => duty.departmentIds),
        ),
      ),
    ),
  ];
  const rows = (
    await db.query(
      "SELECT dm.department_id,dm.user_id FROM church.department_members dm JOIN church.member_profiles p ON p.id=dm.user_id WHERE dm.department_id=ANY($1::text[]) AND p.deleted_at IS NULL AND p.enabled AND NOT p.is_test_account",
      [ids],
    )
  ).rows;
  const result = new Map<string, string[]>();
  for (const row of rows)
    result.set(row.department_id, [
      ...(result.get(row.department_id) ?? []),
      row.user_id,
    ]);
  return result;
}
export async function transitionSchedule(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
  action: "publish" | "cancel" | "delete",
) {
  const f = ScheduleTransition.parse(input),
    row = await header(db, id, true);
  await requireScheduleCategory(db, actor, row.category_id);
  if (row.version !== f.version)
    throw new HttpError(409, "Lịch đã thay đổi. Vui lòng tải lại.");
  const previous = await hydrate(db, row);
  if (action === "delete") {
    if (row.status !== "draft")
      throw new HttpError(409, "Chỉ xóa bản nháp; lịch công bố cần hủy.");
    await db.query(
      "UPDATE church.schedules SET deleted_at=now(),updated_by=$2,version=version+1 WHERE id=$1",
      [id, actor.id],
    );
    await audit(db, actor, actor.id, `Xóa bản nháp lịch ${id}`);
    return { id, deleted: true };
  }
  if (
    row.status === "cancelled" ||
    (action === "publish" && row.status === "published")
  )
    return previous;
  if (
    action === "publish" &&
    (!previous.events.length ||
      previous.events.some((event) => !event.responsibilities.length))
  )
    throw new HttpError(
      400,
      "Lịch công bố cần có chương trình và ít nhất một trách nhiệm mỗi chương trình.",
    );
  if (action === "publish")
    await validateQuarterlyConflicts(db, previous, true);
  await db.query(
    `UPDATE church.schedules SET status=$2,version=version+1,updated_at=now(),updated_by=$3,${action === "publish" ? "published_at=now(),published_by=$3" : "cancelled_at=now(),cancelled_by=$3"} WHERE id=$1`,
    [id, action === "publish" ? "published" : "cancelled", actor.id],
  );
  const saved = await hydrate(db, await header(db, id));
  const signatures =
    previous.status === "published"
      ? await readMemberState(db, id)
      : assignmentSignatures(
          previous,
          await assignmentDepartments(db, [previous]),
        );
  if (action === "publish") await writeMemberState(db, saved, signatures);
  else if (previous.status === "published")
    await writeMemberState(db, saved, new Map());
  if (action === "publish" || previous.status === "published")
    await queueScheduleNotifications(
      db,
      saved,
      [...signatures.keys()].map((memberId) => ({
        memberId,
        kind: action === "publish" ? "assigned" : "cancelled",
      })),
    );
  await audit(
    db,
    actor,
    actor.id,
    `${action === "publish" ? "Công bố" : "Hủy"} lịch phân công ${id}`,
  );
  return saved;
}
async function readMemberState(db: DB, id: string) {
  return new Map<string, string>(
    (
      await db.query(
        "SELECT member_id,signature FROM church.schedule_member_state WHERE schedule_id=$1",
        [id],
      )
    ).rows.map((row) => [row.member_id, row.signature]),
  );
}
async function writeMemberState(
  db: DB,
  schedule: ScheduleRecord,
  values: Map<string, string>,
) {
  await db.query(
    "DELETE FROM church.schedule_member_state WHERE schedule_id=$1",
    [schedule.id],
  );
  for (const [id, signature] of values)
    await db.query(
      "INSERT INTO church.schedule_member_state(schedule_id,member_id,signature,version) VALUES($1,$2,$3,$4)",
      [schedule.id, id, signature, schedule.version],
    );
  await db.query(
    "UPDATE church.schedule_push_deliveries d SET status='cancelled' FROM church.schedule_notifications n WHERE n.id=d.notification_id AND n.schedule_id=$1 AND n.schedule_version<$2 AND d.status IN ('pending','failed')",
    [schedule.id, schedule.version],
  );
}
export async function copySchedule(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
  preview: boolean,
) {
  const f = ScheduleCopyInput.parse(input),
    source = await getSchedule(db, actor, id);
  await requireScheduleCategory(db, actor, source.categoryId);
  if (f.sourceVersion !== source.version)
    throw new HttpError(409, "Lịch nguồn đã thay đổi. Vui lòng xem trước lại.");
  const hash = createHash("sha256").update(JSON.stringify(f)).digest("hex");
  if (!preview) {
    const prior = (
      await db.query("SELECT * FROM church.schedules WHERE request_id=$1", [
        f.requestId,
      ])
    ).rows[0];
    if (prior) {
      if (
        prior.created_by !== actor.id ||
        prior.copy_source_id !== id ||
        prior.copy_request_hash !== hash
      )
        throw new HttpError(409, "Mã sao chép đã được sử dụng.");
      return hydrate(db, prior);
    }
  }
  const copied = copyScheduleDraft(source, f);
  if (preview) return copied;
  if (copied.issues.length && !f.skipUnmatched)
    throw new HttpError(
      400,
      "Có ngày không phù hợp. Kiểm tra bản xem trước và xác nhận bỏ qua.",
    );
  const saved = await saveSchedule(db, actor, {
    ...copied.draft,
    requestId: f.requestId,
  });
  await db.query(
    "UPDATE church.schedules SET copy_source_id=$2,copy_request_hash=$3 WHERE id=$1",
    [saved.id, id, hash],
  );
  await audit(
    db,
    actor,
    actor.id,
    `Sao chép lịch phân công ${id} thành bản nháp ${saved.id}`,
  );
  return saved;
}
export async function searchScheduleMembers(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  const f = z
    .object({
      categoryId: ScheduleCategoryId,
      q: z.string().trim().min(2).max(100),
      page: z.coerce.number().int().min(1).max(10000).default(1),
    })
    .strict()
    .parse(input);
  await requireScheduleCategory(db, actor, f.categoryId);
  const q = f.q.replace(/[\\%_]/g, "\\$&");
  const rows = (
    await db.query(
      `SELECT id,full_name name,CASE WHEN phone IS NOT NULL THEN '•••• '||right(phone,4) ELSE left(id::text,8) END identifier FROM church.member_profiles WHERE deleted_at IS NULL AND enabled AND NOT is_test_account AND public.unaccent(lower(concat_ws(' ',full_name,phone,email))) ILIKE '%'||public.unaccent(lower($1))||'%' ORDER BY lower(public.unaccent(COALESCE(substring(full_name from '([^[:space:]]+)[[:space:]]*$'),''))),full_name,id LIMIT 26 OFFSET $2`,
      [q, (f.page - 1) * 25],
    )
  ).rows;
  return {
    items: rows.slice(0, 25),
    nextPage: rows.length > 25 ? f.page + 1 : null,
  };
}
function grantToken(rows: any[]) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        rows.map((row) => [row.category_id, row.is_active, row.updated_at]),
      ),
    )
    .digest("hex");
}
export async function scheduleLeaders(db: DB, actor: AuthUser, input: unknown) {
  administrators(actor);
  const f = z
    .object({
      memberId: Id.optional(),
      q: z.string().trim().max(100).optional(),
    })
    .strict()
    .parse(input);
  const rows = (
    await db.query(
      "SELECT m.*,p.full_name name,EXISTS(SELECT 1 FROM church.users u WHERE u.id=p.id) AS has_account FROM church.schedule_manager_permissions m JOIN church.member_profiles p ON p.id=m.member_id WHERE p.deleted_at IS NULL AND ($1::uuid IS NULL OR m.member_id=$1) AND ($2='' OR public.unaccent(lower(p.full_name)) ILIKE '%'||public.unaccent(lower($2))||'%') ORDER BY p.full_name,m.member_id,m.category_id",
      [f.memberId ?? null, (f.q ?? "").replace(/[\\%_]/g, "\\$&")],
    )
  ).rows;
  const ids = [...new Set(rows.map((row) => row.member_id))];
  return {
    items: ids.map((id) => {
      const entries = rows.filter((row) => row.member_id === id);
      return {
        memberId: id,
        name: entries[0].name,
        hasAccount: entries[0].has_account,
        categoryIds: entries.map((row) => row.category_id),
        active: entries.some((row) => row.is_active),
        token: grantToken(entries),
      };
    }),
    token: f.memberId ? grantToken(rows) : undefined,
  };
}
export async function grantScheduleLeader(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  administrators(actor);
  const f = z
    .object({
      memberId: Id,
      categoryIds: z
        .array(ScheduleCategoryId)
        .max(4)
        .refine((ids) => new Set(ids).size === ids.length),
      active: z.boolean(),
      token: z.string().regex(/^[0-9a-f]{64}$/),
    })
    .strict()
    .parse(input);
  if ((await canonicalMemberId(db, f.memberId)) !== f.memberId)
    throw new HttpError(409, "Hồ sơ đã được gộp. Vui lòng tìm lại.");
  if (
    !(
      await db.query(
        "SELECT 1 FROM church.member_profiles WHERE id=$1 AND deleted_at IS NULL AND enabled AND NOT is_test_account",
        [f.memberId],
      )
    ).rowCount
  )
    throw new HttpError(400, "Thành viên không còn hoạt động.");
  const rows = (
    await db.query(
      "SELECT * FROM church.schedule_manager_permissions WHERE member_id=$1 ORDER BY category_id FOR UPDATE",
      [f.memberId],
    )
  ).rows;
  if (grantToken(rows) !== f.token)
    throw new HttpError(409, "Phân quyền đã thay đổi. Vui lòng tải lại.");
  for (const category of f.categoryIds)
    if (
      !(
        await db.query(
          "SELECT 1 FROM church.schedule_categories WHERE id=$1 AND is_active",
          [category],
        )
      ).rowCount
    )
      throw new HttpError(400, "Loại lịch đã tắt.");
  await db.query(
    "DELETE FROM church.schedule_manager_permissions WHERE member_id=$1 AND NOT(category_id=ANY($2::text[]))",
    [f.memberId, f.categoryIds],
  );
  for (const category of f.categoryIds)
    await db.query(
      "INSERT INTO church.schedule_manager_permissions(member_id,category_id,is_active,created_by,updated_by) VALUES($1,$2,$3,$4,$4) ON CONFLICT(member_id,category_id) DO UPDATE SET is_active=EXCLUDED.is_active,updated_by=EXCLUDED.updated_by,updated_at=now()",
      [f.memberId, category, f.active, actor.id],
    );
  await audit(
    db,
    actor,
    f.memberId,
    `Cập nhật người phụ trách lịch: ${JSON.stringify({ categories: f.categoryIds, active: f.active })}`,
  );
  return scheduleLeaders(db, actor, { memberId: f.memberId });
}
