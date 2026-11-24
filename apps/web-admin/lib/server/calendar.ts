import { persistNewCalendarEvent } from "./calendar-create";
import { saveEventResponsibilities } from "./event-responsibility";
import { queueEventPush } from "./push-delivery";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  WORSHIP_WORKER_CATEGORIES,
  matchEventResponsibilities,
  normalizeWorshipWorkerText,
  worshipWorkerCategorySearchTerms,
  type WorshipWorkerCategory,
  type WorshipWorker,
  CalendarRange,
  CalendarDate,
  EventInput,
  GroupInput,
  BulkEmailInput,
  NotificationInput,
  canCalendar,
  parseEventText,
  EVENT_PRESETS,
  isWorshipProgramText,
  parseBulkEmails,
  type AuthUser,
  type CalendarEvent,
  type CalendarSaveResult,
  type EmailGroup,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { isAdministrativeRead } from "./session";
import { audit } from "./members";
import { queueAutomaticWorshipViberDraft } from "./worship-automatic";
export function requireCalendar(
  actor: AuthUser,
  permission: Parameters<typeof canCalendar>[1] = "calendar.read",
) {
  if (!isAdministrativeRead(actor) && !canCalendar(actor, permission))
    throw new HttpError(403, "Bạn không có quyền sử dụng tính năng lịch này.");
}
export const calendarId = (id: string) => z.uuid().parse(id);
const iso = (value: unknown) =>
  value instanceof Date
    ? value.toISOString()
    : new Date(String(value)).toISOString();
function eventDto(
  row: Record<string, any>,
  privateGroups: boolean,
): CalendarEvent {
  return {
    id: row.id,
    presetId: row.preset_id ?? null,
    eventDate: row.event_date,
    endDate: row.end_date,
    title: row.title,
    timeText: row.time_text,
    startTime: row.start_time?.slice(0, 5) ?? null,
    endTime: row.end_time?.slice(0, 5) ?? null,
    details: row.details,
    originalText: row.original_text,
    groupIds: privateGroups ? (row.group_ids ?? []) : [],
    version: row.version,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}
const eventSelect = `SELECT e.*,ARRAY(SELECT group_id FROM church.event_email_groups eg JOIN church.email_groups g ON g.id=eg.group_id WHERE eg.event_id=e.id AND g.deleted_at IS NULL ORDER BY group_id) group_ids FROM church.events e`;
export async function listCalendarEvents(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor);
  const range = CalendarRange.parse(input);
  const rows = (
    await db.query(
      `${eventSelect} WHERE e.deleted_at IS NULL AND e.event_date BETWEEN $1 AND $2 ORDER BY e.event_date,e.start_time NULLS LAST,e.created_at,e.id LIMIT 5001`,
      [range.from, range.to],
    )
  ).rows;
  if (rows.length > 5000)
    throw new HttpError(
      400,
      "Có quá nhiều chương trình. Vui lòng chọn khoảng ngày ngắn hơn.",
    );
  return {
    items: rows.map((row) =>
      eventDto(row, ["admin", "secretary", "deacon"].includes(actor.role)),
    ),
    ...range,
  };
}
export async function calendarEvent(
  db: DB,
  actor: AuthUser,
  id: string,
  includeDeleted = false,
) {
  requireCalendar(actor);
  calendarId(id);
  const row = (
    await db.query(
      `${eventSelect} WHERE e.id=$1 ${includeDeleted && actor.role === "admin" ? "" : "AND e.deleted_at IS NULL"}`,
      [id],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Không tìm thấy chương trình.");
  return eventDto(row, ["admin", "secretary", "deacon"].includes(actor.role));
}
/** Load review snapshots and hold their event locks until the caller commits. */
export async function lockCalendarReviewEvents(
  db: DB,
  actor: AuthUser,
  dates: string[],
) {
  requireCalendar(actor, "calendar.write");
  const rows = (
    await db.query(
      `${eventSelect} WHERE e.event_date=ANY($1::date[]) AND e.deleted_at IS NULL ORDER BY e.event_date,e.created_at,e.id FOR UPDATE OF e`,
      [dates],
    )
  ).rows;
  return rows.map((row) => eventDto(row, true));
}
async function validateGroups(db: DB, ids: string[]) {
  if (!ids.length) return;
  const found = await db.query(
    "SELECT id FROM church.email_groups WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL",
    [ids],
  );
  if (found.rowCount !== ids.length)
    throw new HttpError(
      400,
      "Nhóm email nhận thông báo không còn tồn tại. Vui lòng tải lại.",
    );
}
async function setGroups(
  db: DB,
  id: string,
  ids: string[],
  existingEvent = true,
) {
  if (existingEvent)
    await db.query("DELETE FROM church.event_email_groups WHERE event_id=$1", [
      id,
    ]);
  if (ids.length)
    await db.query(
      "INSERT INTO church.event_email_groups(event_id,group_id) SELECT $1,unnest($2::uuid[])",
      [id, ids],
    );
}
export async function saveCalendarEvent(
  db: DB,
  actor: AuthUser,
  input: unknown,
  id?: string,
  // Internal snapshot loaded under an event lock in this same transaction.
  lockedEvent?: CalendarEvent,
): Promise<CalendarSaveResult> {
  requireCalendar(actor, "calendar.write");
  const f = EventInput.parse(input),
    p = parseEventText(f.originalText);
  if (f.presetId && !EVENT_PRESETS.some((preset) => preset.id === f.presetId))
    throw new HttpError(400, "Mẫu chương trình không hợp lệ.");
  if (id && f.presetId !== undefined)
    throw new HttpError(400, "Không thể thay đổi mẫu của chương trình đã lưu.");
  if (lockedEvent && lockedEvent.id !== id)
    throw new Error("Locked event does not match save target");
  let priorEvent = lockedEvent ?? null;
  if (id && !priorEvent) {
    calendarId(id);
    const row = (
      await db.query(
        `${eventSelect} WHERE e.id=$1 AND e.deleted_at IS NULL FOR UPDATE OF e`,
        [id],
      )
    ).rows[0];
    if (!row) throw new HttpError(404, "Không tìm thấy chương trình.");
    priorEvent = eventDto(row, true);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (id && new Date(f.eventDate) < today)
    throw new HttpError(400, "Không thể chỉnh sửa chương trình trong quá khứ.");
  const worship =
    priorEvent?.presetId === "worship-program" ||
    f.presetId === "worship-program" ||
    isWorshipProgramText(f.originalText) ||
    Boolean(priorEvent && isWorshipProgramText(priorEvent.originalText));
  if (f.groupIds.length || worship) requireCalendar(actor, "calendar.notify");
  const hash = createHash("sha256")
    .update(
      JSON.stringify({
        eventDate: f.eventDate,
        originalText: f.originalText,
        groupIds: [...f.groupIds].sort(),
        ...(id ? { version: f.version ?? null } : {}),
        ...(f.presetId ? { presetId: f.presetId } : {}),
      }),
    )
    .digest("hex");
  if (id) calendarId(id);
  const operation = id ? "updated" : "created";
  // Request reuse and group validity share one database round trip.
  const checks = (
    await db.query(
      `SELECT
      (SELECT row_to_json(r) FROM church.event_save_requests r WHERE r.request_id=$1) AS receipt,
      (SELECT row_to_json(e) FROM (SELECT id,request_hash,created_by,deleted_at FROM church.events WHERE request_id=$1) e) AS previous,
      EXISTS(SELECT 1 FROM church.event_notifications WHERE request_id=$1) AS notification_exists,
      (SELECT count(*)::int FROM church.email_groups WHERE id=ANY($2::uuid[]) AND deleted_at IS NULL) AS valid_groups,
      CASE WHEN $3::boolean AND cardinality($2::uuid[])>0 THEN
        (SELECT count(*)::int FROM church.event_notifications WHERE created_by=$5 AND created_at>now()-interval '15 minutes') ELSE 0 END AS recent_count,
      COALESCE((SELECT json_agg(g ORDER BY g.name) FROM (
        SELECT id,name FROM church.email_groups WHERE $3::boolean AND id=ANY($2::uuid[]) AND deleted_at IS NULL
      ) g),'[]'::json) AS groups,
      ARRAY(SELECT DISTINCT m.email FROM church.email_group_members m JOIN church.email_groups g ON g.id=m.group_id
        WHERE $3::boolean AND g.id=ANY($2::uuid[]) AND g.deleted_at IS NULL ORDER BY m.email LIMIT 5001) AS emails,
      CASE WHEN $4::boolean THEN (SELECT COALESCE(json_agg(p),'[]'::json) FROM (
        SELECT p.id,p.full_name AS name,false AS "pushEnabled",
          EXISTS(SELECT 1 FROM church.users u WHERE u.id=p.id AND u.enabled AND u.deleted_at IS NULL) AS "hasAccount"
        FROM church.member_profiles p WHERE p.deleted_at IS NULL AND p.enabled AND NOT p.is_test_account
      ) p) ELSE '[]'::json END AS people`,
      [f.requestId, f.groupIds, !id, !id && matchEventResponsibilities(f.originalText, []).length>0, actor.id],
    )
  ).rows[0];
  const receipt = checks.receipt;
  if (receipt) {
    if (
      receipt.created_by !== actor.id ||
      receipt.operation !== operation ||
      receipt.request_hash !== hash ||
      (id && receipt.event_id !== id)
    )
      throw new HttpError(409, "Mã lưu đã được sử dụng cho dữ liệu khác.");
    return {
      ...(await calendarEvent(db, actor, receipt.event_id)),
      notificationId: receipt.notification_id,
      worshipNotificationId: receipt.worship_notification_id,
      pushEventId: receipt.event_id,
    };
  }
  if (!id) {
    const previous = checks.previous;
    if (previous) {
      if (
        previous.created_by !== actor.id ||
        previous.request_hash !== hash ||
        previous.deleted_at
      )
        throw new HttpError(
          409,
          "Mã yêu cầu đã được sử dụng cho dữ liệu khác.",
        );
      const batch = (
        await db.query(
          "SELECT id FROM church.event_notifications WHERE request_id=$1 AND event_id=$2",
          [f.requestId, previous.id],
        )
      ).rows[0];
      return {
        ...(await calendarEvent(db, actor, previous.id)),
        notificationId: batch?.id ?? null,
      };
    }
  }
  if (checks.notification_exists || checks.previous)
    throw new HttpError(409, "Mã yêu cầu đã được sử dụng.");
  const groupsChanged =
    !priorEvent ||
    JSON.stringify([...priorEvent.groupIds].sort()) !==
      JSON.stringify([...f.groupIds].sort());
  if (groupsChanged && checks.valid_groups !== f.groupIds.length)
    throw new HttpError(
      400,
      "Nhóm email nhận thông báo không còn tồn tại. Vui lòng tải lại.",
    );
  if (!id) {
    const created = await persistNewCalendarEvent(db, actor.id, f, p, hash, worship, checks);
    await queueEventPush(db, created.row.id);
    return {
      ...eventDto({ ...created.row, group_ids: f.groupIds }, true),
      notificationId: created.notificationId,
      worshipNotificationId: created.worshipNotificationId,
      pushEventId: created.row.id,
    };
  }
  const contentChanged =
    !priorEvent ||
    priorEvent.originalText !== f.originalText ||
    priorEvent.eventDate !== f.eventDate;
  if (priorEvent && !contentChanged && !groupsChanged) {
    if (f.version === undefined)
      throw new HttpError(400, "Thiếu phiên bản chương trình.");
    if (f.version !== priorEvent.version)
      throw new HttpError(
        409,
        "Chương trình đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    await db.query(
      "INSERT INTO church.event_save_requests(request_id,event_id,created_by,operation,request_hash,notification_id,applied_version,worship_notification_id) VALUES($1,$2,$3,$4,$5,NULL,$6,NULL)",
      [f.requestId, id, actor.id, operation, hash, priorEvent.version],
    );
    return { ...priorEvent, notificationId: null, worshipNotificationId: null };
  }
  let savedRow: Record<string, any>;
  {
    calendarId(id);
    if (f.version === undefined)
      throw new HttpError(400, "Thiếu phiên bản chương trình.");
    const result = await db.query(
      "UPDATE church.events SET event_date=$2,end_date=end_date+($2::date-event_date),title=$3,time_text=$4,start_time=$5,end_time=$6,details=$7,original_text=$8,version=version+1,updated_by=$9,updated_at=now(),preset_id=CASE WHEN $11::boolean THEN COALESCE(preset_id,'worship-program') ELSE preset_id END WHERE id=$1 AND version=$10 AND deleted_at IS NULL RETURNING *",
      [
        id,
        f.eventDate,
        p.title,
        p.timeText,
        p.startTime,
        p.endTime,
        p.details,
        f.originalText,
        actor.id,
        f.version,
        worship,
      ],
    );
    if (!result.rowCount)
      throw new HttpError(
        409,
        "Chương trình đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    savedRow = result.rows[0];

  }
  const saved = savedRow.id as string;
  if (groupsChanged) await setGroups(db, saved, f.groupIds, Boolean(id));
  const result = eventDto({ ...savedRow, group_ids: f.groupIds }, true);
  const notification =
    contentChanged && f.groupIds.length
      ? await queueEventNotification(
          db,
          actor,
          saved,
          { requestId: f.requestId },
          id ? "updated" : "created",
          result,
        )
      : null;
  if (!priorEvent || priorEvent.originalText !== f.originalText)
    await saveEventResponsibilities(db, saved, f.originalText, Boolean(id));
  if (contentChanged || groupsChanged) await queueEventPush(db, saved);
  const worshipNotificationId =
    worship && contentChanged
      ? await queueAutomaticWorshipViberDraft(db, result, actor.id)
      : null;
  await db.query(
    `WITH receipt AS (
      INSERT INTO church.event_save_requests(request_id,event_id,created_by,operation,request_hash,notification_id,applied_version,worship_notification_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING event_id
    ) INSERT INTO church.audit_log(actor_id,subject_id,action)
      SELECT $3,$3,$9 FROM receipt`,
    [
      f.requestId,
      saved,
      actor.id,
      operation,
      hash,
      notification?.id ?? null,
      result.version,
      worshipNotificationId,
      `${id ? "Cập nhật" : "Tạo"} chương trình ${saved}`,
    ],
  );
  return {
    ...result,
    notificationId: notification?.id ?? null,
    worshipNotificationId,
    pushEventId: saved,
  };
}
export async function deleteCalendarEvent(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  requireCalendar(actor, "calendar.write");
  calendarId(id);
  const { version } = z
    .object({ version: z.number().int().nonnegative() })
    .strict()
    .parse(input);
  const result = await db.query(
    "UPDATE church.events SET deleted_at=now(),updated_at=now(),updated_by=$2,version=version+1 WHERE id=$1 AND version=$3 AND deleted_at IS NULL RETURNING id",
    [id, actor.id, version],
  );
  if (!result.rowCount)
    throw new HttpError(409, "Chương trình đã thay đổi hoặc đã xóa.");
  // History is retained, but unsent creation/update jobs are cancelled on deletion.
  await db.query(
    "UPDATE church.event_notification_deliveries SET status='cancelled',safe_error='Chương trình đã xóa; không gửi.' WHERE status='pending' AND notification_id IN(SELECT id FROM church.event_notifications WHERE event_id=$1)",
    [id],
  );
  await audit(db, actor, actor.id, `Xóa chương trình ${id}`);
  await queueEventPush(db, id);
  return { ok: true, pushEventId: id };
}

const CalendarContributionInput = z
  .object({
    requestId: z.uuid(),
    version: z.number().int().nonnegative().optional(),
    eventId: z.string().uuid().nullable(),
    eventDate: CalendarDate,
    originalText: z.string().trim().min(1).max(50000),
    groupIds: z.array(z.string().uuid()).default([]),
    contributorName: z.string().trim().max(120).default(""),
    presetId: z.string().optional(),
  })
  .strict();

/** Public draft submission; reading and reviewing drafts still require calendar.write. */
export async function submitCalendarContribution(db: DB, input: unknown) {
  const f = CalendarContributionInput.parse(input);
  const requestId = f.requestId;
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtext('public-calendar-contribution'))",
  );
  const existing = (
    await db.query(
      "SELECT * FROM church.calendar_contributions WHERE request_id=$1",
      [requestId],
    )
  ).rows[0];
  if (existing) {
    if (
      existing.event_id !== f.eventId ||
      existing.event_date !== f.eventDate ||
      existing.proposed_text !== f.originalText ||
      existing.contributor_name !== f.contributorName
    )
      throw new HttpError(409, "Mã đóng góp đã được sử dụng.");
    return { saved: true, requestId };
  }

  const priorEvent = f.eventId
    ? (
        await db.query(
          "SELECT id,event_date,version,original_text FROM church.events WHERE id=$1 AND deleted_at IS NULL",
          [f.eventId],
        )
      ).rows[0]
    : null;
  if (f.eventId && !priorEvent)
    throw new HttpError(404, "Không tìm thấy chương trình.");
  if (
    priorEvent &&
    (priorEvent.version !== f.version || priorEvent.event_date !== f.eventDate)
  )
    throw new HttpError(
      409,
      "Chương trình đã thay đổi. Vui lòng tải lại trước khi bổ sung.",
    );
  if (priorEvent?.original_text.trim() === f.originalText)
    throw new HttpError(400, "Vui lòng bổ sung thông tin trước khi gửi.");
  const parsed = parseEventText(f.originalText);
  if (!parsed.title || parsed.title.length > 300)
    throw new HttpError(400, "Nhập tiêu đề từ 1 đến 300 ký tự.");
  if (
    (
      await db.query(
        "SELECT count(*)::int n FROM church.calendar_contributions WHERE created_at>now()-interval '15 minutes'",
      )
    ).rows[0].n >= 100
  )
    throw new HttpError(429, "Đã nhận nhiều bản nháp. Vui lòng thử lại sau.");

  await db.query(
    "INSERT INTO church.calendar_contributions(request_id,event_id,event_date,base_event_id,base_version,base_text,proposed_text,contributor_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [
      requestId,
      f.eventId,
      f.eventDate,
      f.eventId,
      priorEvent?.version ?? null,
      priorEvent?.original_text ?? "",
      f.originalText,
      f.contributorName,
    ],
  );
  return { saved: true, requestId };
}

export async function listCalendarContributions(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.write");
  const rows = (
    await db.query(
      `SELECT c.* FROM church.calendar_contributions c
       WHERE c.status='pending'
       ORDER BY c.created_at DESC LIMIT 200`,
    )
  ).rows;
  return {
    items: rows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      eventId: row.event_id,
      eventDate: row.event_date,
      baseEventId: row.base_event_id,
      baseVersion: row.base_version,
      baseText: row.base_text,
      proposedText: row.proposed_text,
      contributorName: row.contributor_name,
      contributorFullName: row.contributor_name,
      contributorEmail: "",
      status: row.status,
      createdAt: row.created_at,
    })),
  };
}

export async function reviewCalendarContribution(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.write");
  const f = z
    .object({
      id: z.string().uuid(),
      action: z.enum(["merge", "reject"]),
      reviewText: z.string().max(50000).optional(),
    })
    .strict()
    .parse(input);

  const row = (
    await db.query(
      "SELECT * FROM church.calendar_contributions WHERE id=$1 AND status='pending' FOR UPDATE",
      [f.id],
    )
  ).rows[0];
  if (!row)
    throw new HttpError(404, "Bản đóng góp không tồn tại hoặc đã xử lý.");

  if (f.action === "reject") {
    await db.query(
      "UPDATE church.calendar_contributions SET status='rejected',reviewed_at=now(),reviewed_by=$2 WHERE id=$1",
      [f.id, actor.id],
    );
    await audit(
      db,
      actor,
      actor.id,
      `Từ chối bản đóng góp chỉnh sửa ${row.event_date}`,
    );
    return { saved: true };
  }

  const eventDate = row.event_date;
  const text = f.reviewText?.trim() || row.proposed_text;
  const parsed = parseEventText(text);
  if (!parsed.title || parsed.title.length > 300)
    throw new HttpError(400, "Nhập tiêu đề từ 1 đến 300 ký tự.");
  let eventId: string;
  if (row.base_event_id) {
    const eventRow = (
      await db.query(
        "SELECT * FROM church.events WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
        [row.base_event_id],
      )
    ).rows[0];
    if (!eventRow || eventRow.version !== row.base_version)
      throw new HttpError(
        409,
        "Chương trình đã thay đổi hoặc đã xóa. Vui lòng xem lại bản đóng góp.",
      );
    await db.query(
      "UPDATE church.events SET title=$2,time_text=$3,start_time=$4,end_time=$5,details=$6,original_text=$7,version=version+1,updated_by=$8,updated_at=now() WHERE id=$1",
      [
        eventRow.id,
        parsed.title,
        parsed.timeText,
        parsed.startTime,
        parsed.endTime,
        parsed.details,
        text,
        actor.id,
      ],
    );
    eventId = eventRow.id;
  } else {
    eventId = (
      await db.query(
        "INSERT INTO church.events(event_date,end_date,title,time_text,start_time,end_time,details,original_text,created_by,updated_by,request_id,request_hash) VALUES($1,$1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10) RETURNING id",
        [
          eventDate,
          parsed.title,
          parsed.timeText,
          parsed.startTime,
          parsed.endTime,
          parsed.details,
          text,
          actor.id,
          row.request_id,
          createHash("sha256")
            .update(JSON.stringify({ eventDate, originalText: text }))
            .digest("hex"),
        ],
      )
    ).rows[0].id;
  }
  await db.query(
    "UPDATE church.calendar_contributions SET status='merged',reviewed_at=now(),reviewed_by=$2,merged_event_id=$3 WHERE id=$1",
    [f.id, actor.id, eventId],
  );
  await audit(
    db,
    actor,
    actor.id,
    `Duyệt bản đóng góp chỉnh sửa chương trình ${eventDate}`,
  );
  await queueEventPush(db, eventId);
  return { saved: true, eventId, pushEventId: eventId };
}

export async function listEmailGroups(
  db: DB,
  actor: AuthUser,
): Promise<{ items: EmailGroup[] }> {
  requireCalendar(actor);
  const rows = (
    await db.query(
      'SELECT g.id,g.name,g.description,g.version,count(m.id)::int "memberCount" FROM church.email_groups g LEFT JOIN church.email_group_members m ON m.group_id=g.id WHERE g.deleted_at IS NULL GROUP BY g.id ORDER BY lower(g.name),g.id LIMIT 501',
    )
  ).rows;
  if (rows.length > 500) throw new HttpError(400, "Quá nhiều nhóm email.");
  return { items: rows };
}
export async function emailGroup(db: DB, actor: AuthUser, id: string) {
  requireCalendar(actor);
  calendarId(id);
  const row = (
    await db.query(
      "SELECT id,name,description,version FROM church.email_groups WHERE id=$1 AND deleted_at IS NULL",
      [id],
    )
  ).rows[0];
  if (!row) throw new HttpError(404, "Không tìm thấy nhóm email.");
  const members = (
    await db.query(
      "SELECT id,email FROM church.email_group_members WHERE group_id=$1 ORDER BY email",
      [id],
    )
  ).rows;
  return { ...row, members, memberCount: members.length };
}
export async function saveEmailGroup(
  db: DB,
  actor: AuthUser,
  input: unknown,
  id?: string,
) {
  requireCalendar(actor, "calendar.groups");
  const f = GroupInput.parse(input);
  let saved: string;
  if (id) {
    calendarId(id);
    if (f.version === undefined)
      throw new HttpError(400, "Thiếu phiên bản nhóm.");
    const result = await db.query(
      "UPDATE church.email_groups SET name=$2,description=$3,version=version+1,updated_at=now(),updated_by=$4 WHERE id=$1 AND version=$5 AND deleted_at IS NULL RETURNING id",
      [id, f.name, f.description, actor.id, f.version],
    );
    if (!result.rowCount)
      throw new HttpError(
        409,
        "Nhóm email nhận thông báo đã thay đổi. Vui lòng tải lại.",
      );
    saved = id;
  } else {
    if (
      (
        await db.query(
          "SELECT count(*)::int n FROM church.email_groups WHERE deleted_at IS NULL",
        )
      ).rows[0].n >= 500
    )
      throw new HttpError(400, "Tối đa 500 nhóm email.");
    saved = (
      await db.query(
        "INSERT INTO church.email_groups(name,description,created_by,updated_by) VALUES($1,$2,$3,$3) RETURNING id",
        [f.name, f.description, actor.id],
      )
    ).rows[0].id;
  }
  await audit(
    db,
    actor,
    actor.id,
    `${id ? "Cập nhật" : "Tạo"} nhóm email ${saved}`,
  );
  return emailGroup(db, actor, saved);
}
export async function deleteEmailGroup(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  const group = await emailGroup(db, actor, id);
  const { version } = z
    .object({ version: z.number().int().nonnegative() })
    .strict()
    .parse(input);
  if (group.version !== version) throw new HttpError(409, "Nhóm đã thay đổi.");
  await db.query(
    "UPDATE church.email_groups SET deleted_at=now(),version=version+1,updated_at=now(),updated_by=$2 WHERE id=$1",
    [id, actor.id],
  );
  await db.query("DELETE FROM church.event_email_groups WHERE group_id=$1", [
    id,
  ]);
  await audit(db, actor, actor.id, `Xóa nhóm email ${id}`);
  return { ok: true };
}
export async function addGroupEmails(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  const group = await emailGroup(db, actor, id),
    f = BulkEmailInput.parse(input);
  const result = parseBulkEmails(
    f.text,
    group.members.map((m: Record<string, string>) => m.email),
  );
  if (group.members.length + result.valid.length > 5000)
    throw new HttpError(400, "Tối đa 5.000 địa chỉ trong một nhóm.");
  if (result.valid.length) {
    await db.query(
      "INSERT INTO church.email_group_members(group_id,email) SELECT $1,unnest($2::text[]) ON CONFLICT(group_id,email) DO NOTHING",
      [id, result.valid],
    );
    await db.query(
      "UPDATE church.email_groups SET version=version+1,updated_at=now(),updated_by=$2 WHERE id=$1",
      [id, actor.id],
    );
    await audit(
      db,
      actor,
      actor.id,
      `Thêm ${result.valid.length} địa chỉ vào nhóm ${id}`,
    );
  }
  return { ...result, added: result.valid.length };
}
export async function removeGroupEmail(
  db: DB,
  actor: AuthUser,
  id: string,
  member: string,
) {
  await emailGroup(db, actor, id);
  calendarId(member);
  const result = await db.query(
    "DELETE FROM church.email_group_members WHERE id=$1 AND group_id=$2 RETURNING id",
    [member, id],
  );
  if (!result.rowCount)
    throw new HttpError(404, "Không tìm thấy địa chỉ trong nhóm.");
  await db.query(
    "UPDATE church.email_groups SET version=version+1,updated_at=now(),updated_by=$2 WHERE id=$1",
    [id, actor.id],
  );
  await audit(db, actor, actor.id, `Xóa địa chỉ khỏi nhóm ${id}`);
  return { ok: true };
}
export async function recipientPreview(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.notify");
  const { groupIds } = z
    .object({ groupIds: z.array(z.uuid()).max(50) })
    .strict()
    .parse(input);
  await validateGroups(db, [...new Set(groupIds)]);
  return {
    count: (
      await db.query(
        "SELECT count(DISTINCT m.email)::int n FROM church.email_group_members m JOIN church.email_groups g ON g.id=m.group_id WHERE m.group_id=ANY($1::uuid[]) AND g.deleted_at IS NULL",
        [groupIds],
      )
    ).rows[0].n,
  };
}
export async function queueEventNotification(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
  kind: "created" | "updated" = "updated",
  savedEvent?: CalendarEvent,
) {
  requireCalendar(actor, "calendar.notify");
  calendarId(id);
  const f = NotificationInput.parse(input);
  // Batch the independent reads; serial awaits on one connection add remote RTTs.
  const state = (
    await db.query(
      `SELECT
      (SELECT row_to_json(n) FROM (SELECT id,event_id FROM church.event_notifications WHERE request_id=$1) n) AS previous,
      (SELECT count(*)::int FROM church.event_notifications WHERE created_by=$2 AND created_at>now()-interval '15 minutes') AS recent_count,
      COALESCE((SELECT json_agg(g ORDER BY g.name) FROM (
        SELECT g.id,g.name FROM church.event_email_groups eg JOIN church.email_groups g ON g.id=eg.group_id
        WHERE eg.event_id=$3 AND g.deleted_at IS NULL
      ) g),'[]'::json) AS groups,
      ARRAY(SELECT DISTINCT m.email FROM church.email_group_members m
        JOIN church.event_email_groups eg ON eg.group_id=m.group_id
        JOIN church.email_groups g ON g.id=m.group_id
        WHERE eg.event_id=$3 AND g.deleted_at IS NULL ORDER BY m.email LIMIT 5001) AS emails`,
      [f.requestId, actor.id, id],
    )
  ).rows[0];
  if (state.previous) {
    if (state.previous.event_id !== id)
      throw new HttpError(409, "Mã gửi đã được sử dụng.");
    return { id: state.previous.id as string };
  }
  if (state.recent_count >= 20)
    throw new HttpError(429, "Tối đa 20 lần gửi trong 15 phút.");
  const event = savedEvent ?? (await calendarEvent(db, actor, id));
  const groups = state.groups as { id: string; name: string }[];
  if (!groups.length)
    throw new HttpError(400, "Chọn ít nhất một nhóm email trước khi gửi.");
  if (state.emails.length > 5000)
    throw new HttpError(400, "Mỗi lần gửi tối đa 5.000 địa chỉ.");
  const emails = (state.emails as string[]).map((email) =>
    z.email().max(254).parse(email),
  );
  const batch = (
    await db.query(
      `WITH batch AS (
      INSERT INTO church.event_notifications(event_id,request_id,kind,snapshot,group_names,created_by,group_ids)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id
    ), deliveries AS (
      INSERT INTO church.event_notification_deliveries(notification_id,email)
      SELECT batch.id,email FROM batch CROSS JOIN unnest($8::text[]) AS recipient(email)
    ), audit AS (
      INSERT INTO church.audit_log(actor_id,subject_id,action)
      SELECT $6,$6,'Xếp hàng thông báo '||batch.id::text||': '||cardinality($8::text[])::text||' người nhận' FROM batch
    ) SELECT id FROM batch`,
      [
        id,
        f.requestId,
        kind,
        JSON.stringify({
          eventDate: event.eventDate,
          title: event.title,
          timeText: event.timeText,
          details: event.details,
        }),
        groups.map((g) => g.name),
        actor.id,
        groups.map((g) => g.id),
        emails,
      ],
    )
  ).rows[0];
  return { id: batch.id as string, count: emails.length };
}
export async function notificationHistory(db: DB, actor: AuthUser, id: string) {
  requireCalendar(actor, "calendar.notify");
  calendarId(id);
  await calendarEvent(db, actor, id, true);
  const batches = (
    await db.query(
      `SELECT n.id,n.kind,n.created_at "createdAt",n.group_names "groupNames",COALESCE((SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*)::int n FROM church.event_notification_deliveries WHERE notification_id=n.id GROUP BY status) counts),'{}') counts FROM church.event_notifications n WHERE event_id=$1 ORDER BY n.created_at DESC,n.id`,
      [id],
    )
  ).rows;
  return { items: batches };
}
export async function notificationDeliveries(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  requireCalendar(actor, "calendar.notify");
  calendarId(id);
  const { page } = z
    .object({ page: z.coerce.number().int().min(1).max(1000).default(1) })
    .strict()
    .parse(input);
  const batch = (
    await db.query("SELECT id FROM church.event_notifications WHERE id=$1", [
      id,
    ])
  ).rows[0];
  if (!batch) throw new HttpError(404, "Không tìm thấy thông báo.");
  const total = (
    await db.query(
      "SELECT count(*)::int n FROM church.event_notification_deliveries WHERE notification_id=$1",
      [id],
    )
  ).rows[0].n;
  const items = (
    await db.query(
      'SELECT id,email,status,attempts,safe_error error,sent_at "sentAt" FROM church.event_notification_deliveries WHERE notification_id=$1 ORDER BY created_at,id LIMIT 50 OFFSET $2',
      [id, (page - 1) * 50],
    )
  ).rows;
  return { items, total, page };
}
export async function retryNotification(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  requireCalendar(actor, "calendar.notify");
  calendarId(id);
  const f = NotificationInput.parse(input);
  const old = (
    await db.query(
      "SELECT notification_id,count FROM church.event_notification_retries WHERE request_id=$1",
      [f.requestId],
    )
  ).rows[0];
  if (old) {
    if (old.notification_id !== id)
      throw new HttpError(409, "Mã thử lại đã được sử dụng.");
    return { count: old.count, notificationId: id };
  }
  if (
    (
      await db.query(
        "SELECT count(*)::int n FROM church.event_notification_retries WHERE created_by=$1 AND created_at>now()-interval '15 minutes'",
        [actor.id],
      )
    ).rows[0].n >= 20
  )
    throw new HttpError(429, "Tối đa 20 lần thử lại trong 15 phút.");
  const batch = (
    await db.query(
      "SELECT n.id,e.deleted_at FROM church.event_notifications n JOIN church.events e ON e.id=n.event_id WHERE n.id=$1",
      [id],
    )
  ).rows[0];
  if (!batch) throw new HttpError(404, "Không tìm thấy thông báo.");
  if (batch.deleted_at)
    throw new HttpError(409, "Không gửi lại chương trình đã xóa.");
  const queued = await db.query(
    "UPDATE church.event_notification_deliveries SET status='pending',safe_error=NULL WHERE notification_id=$1 AND status='failed' AND attempts<5 RETURNING id",
    [id],
  );
  await db.query(
    "INSERT INTO church.event_notification_retries(request_id,notification_id,count,created_by) VALUES($1,$2,$3,$4)",
    [f.requestId, id, queued.rowCount, actor.id],
  );
  await audit(
    db,
    actor,
    actor.id,
    `Thử lại thông báo ${id}: ${queued.rowCount} người nhận`,
  );
  return { count: queued.rowCount, notificationId: id };
}
export async function resolveDelivery(
  db: DB,
  actor: AuthUser,
  id: string,
  input: unknown,
) {
  requireCalendar(actor, "calendar.notify");
  calendarId(id);
  const f = z
    .object({
      status: z.enum(["sent", "failed"]),
      attempt: z.number().int().positive(),
    })
    .strict()
    .parse(input);
  const result = await db.query(
    "UPDATE church.event_notification_deliveries SET status=$2,safe_error='Admin đã xác minh kết quả gửi.',sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END WHERE id=$1 AND status='uncertain' AND attempts=$3 RETURNING id",
    [id, f.status, f.attempt],
  );
  if (!result.rowCount)
    throw new HttpError(409, "Kết quả gửi đã thay đổi. Vui lòng tải lại.");
  await audit(db, actor, actor.id, `Xác minh kết quả gửi ${id}: ${f.status}`);
  return { ok: true };
}
export async function allNotificationHistory(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.notify");
  const { page } = z
    .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
    .strict()
    .parse(input);
  const total = (
    await db.query("SELECT count(*)::int n FROM church.event_notifications")
  ).rows[0].n;
  const items = (
    await db.query(
      `SELECT n.id,n.event_id "eventId",n.snapshot->>'title' title,n.snapshot->>'eventDate' "eventDate",(e.deleted_at IS NOT NULL) "eventDeleted",n.kind,n.created_at "createdAt",n.group_names "groupNames",COALESCE((SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*)::int n FROM church.event_notification_deliveries WHERE notification_id=n.id GROUP BY status) counts),'{}') counts FROM church.event_notifications n JOIN church.events e ON e.id=n.event_id ORDER BY n.created_at DESC,n.id LIMIT 20 OFFSET $1`,
      [(page - 1) * 20],
    )
  ).rows;
  return { items, total, page };
}

// Failure notifications are derived from durable delivery outcomes. Successful
// retries automatically clear the alert without a separate mutable inbox flag.
export async function calendarFailureNotifications(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.notify");
  const { page } = z
    .object({ page: z.coerce.number().int().min(1).max(100000).default(1) })
    .strict()
    .parse(input);
  const feed = `SELECT n.id,'calendar'::text kind,n.snapshot->>'title' title,n.snapshot->>'eventDate' "eventDate",n.created_at "createdAt",
    (SELECT count(*)::int FROM church.event_notification_deliveries d WHERE d.notification_id=n.id AND d.status='failed') failed,
    (SELECT count(*)::int FROM church.event_notification_deliveries d WHERE d.notification_id=n.id AND d.status='failed' AND d.attempts<5) retryable,
    (SELECT count(*)::int FROM church.event_notification_deliveries d WHERE d.notification_id=n.id AND (d.status='uncertain' OR (d.status='sending' AND d.claimed_at<now()-interval '5 minutes'))) uncertain
    FROM church.event_notifications n JOIN church.events e ON e.id=n.event_id WHERE e.deleted_at IS NULL AND EXISTS(SELECT 1 FROM church.event_notification_deliveries d WHERE d.notification_id=n.id AND (d.status IN ('failed','uncertain') OR (d.status='sending' AND d.claimed_at<now()-interval '5 minutes')))
    UNION ALL
    SELECT h.id,'worship_viber'::text kind,split_part(ltrim(h.message),E'\\n',1) title,e.event_date::text "eventDate",h.created_at "createdAt",
    CASE WHEN h.status='failed' THEN 1 ELSE 0 END failed,
    CASE WHEN h.status='failed' AND (SELECT count(*) FROM church.notification_history a WHERE a.event_id=h.event_id AND a.event_version=h.event_version AND a.type=h.type)<5 THEN 1 ELSE 0 END retryable,
    CASE WHEN h.status='uncertain' OR h.status='sending' THEN 1 ELSE 0 END uncertain
    FROM church.notification_history h JOIN church.events e ON e.id=h.event_id
    WHERE e.deleted_at IS NULL AND h.type='worship_viber_draft' AND (h.status IN('failed','uncertain') OR (h.status='sending' AND h.claimed_at<now()-interval '5 minutes'))
    AND NOT EXISTS(SELECT 1 FROM church.notification_history newer WHERE newer.event_id=h.event_id AND newer.event_version=h.event_version AND newer.type=h.type AND (newer.created_at,newer.id)>(h.created_at,h.id))`;
  const total = (await db.query(`SELECT count(*)::int n FROM (${feed}) alerts`))
    .rows[0].n;
  const items = (
    await db.query(
      `SELECT * FROM (${feed}) alerts ORDER BY "createdAt" DESC,id LIMIT 20 OFFSET $1`,
      [(page - 1) * 20],
    )
  ).rows;
  return { items, total, page };
}

export async function mentionSuggestions(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.read");
  const { query, category } = z
    .object({
      query: z
        .string()
        .trim()
        .max(200)
        .default("")
        .transform(normalizeWorshipWorkerText),
      category: z
        .union([
          z.enum(
            Object.keys(WORSHIP_WORKER_CATEGORIES) as [
              WorshipWorkerCategory,
              ...WorshipWorkerCategory[],
            ],
          ),
          z.literal("ban_hat"),
          z.literal(""),
        ])
        .default(""),
    })
    .strict()
    .parse(input);
  const items = (
    await db.query<WorshipWorker>(
      `SELECT id,category,full_name AS "fullName",phone,email,role_label AS "roleLabel"
     FROM church.worship_service_workers
     WHERE is_active AND ($1='' OR category=$1 OR ($1='ban_hat' AND category LIKE 'ban_hat_%'))
       AND ($2='' OR strpos(public.unaccent(lower(normalize(concat_ws(' ',role_label,full_name,phone,($3::jsonb ->> category)), NFC))),public.unaccent(lower($2)))>0)
     ORDER BY category,full_name,id`,
      [
        category,
        query,
        JSON.stringify(
          Object.fromEntries(
            (
              Object.keys(WORSHIP_WORKER_CATEGORIES) as WorshipWorkerCategory[]
            ).map((key) => [
              key,
              worshipWorkerCategorySearchTerms(key).join(" "),
            ]),
          ),
        ),
      ],
    )
  ).rows;
  return { items };
}
export async function mentionCategories(db: DB, actor: AuthUser) {
  requireCalendar(actor, "calendar.read");
  const rows = (
    await db.query<{ category: WorshipWorkerCategory; count: number }>(
      "SELECT category,count(*)::int AS count FROM church.worship_service_workers WHERE is_active GROUP BY category",
    )
  ).rows;
  return {
    items: Object.entries(WORSHIP_WORKER_CATEGORIES).map(
      ([category, label]) => ({
        category,
        label,
        count: rows.find((row) => row.category === category)?.count ?? 0,
      }),
    ),
  };
}
