import { createHash } from "node:crypto";
import { z } from "zod";
import {
  CalendarRange,
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
import { requirePermission } from "./session";
import { audit } from "./members";
import { queueAutomaticWorshipViberDraft } from "./worship-automatic";
export function requireCalendar(
  actor: AuthUser,
  permission: Parameters<typeof canCalendar>[1] = "calendar.read",
) {
  if (!canCalendar(actor, permission))
    throw new HttpError(403, "Bạn không có quyền sử dụng tính năng lịch này.");
  requirePermission(actor, permission!);
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
      "Có quá nhiều sinh hoạt. Vui lòng chọn khoảng ngày ngắn hơn.",
    );
  return {
    items: rows.map((row) => eventDto(row, actor.role === "admin")),
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
  if (!row) throw new HttpError(404, "Không tìm thấy sinh hoạt.");
  return eventDto(row, actor.role === "admin");
}
async function validateGroups(db: DB, ids: string[]) {
  if (!ids.length) return;
  const found = await db.query(
    "SELECT id FROM church.email_groups WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL",
    [ids],
  );
  if (found.rowCount !== ids.length)
    throw new HttpError(400, "Nhóm email không còn tồn tại. Vui lòng tải lại.");
}
async function setGroups(db: DB, id: string, ids: string[]) {
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
): Promise<CalendarSaveResult> {
  requireCalendar(actor, "calendar.write");
  const f = EventInput.parse(input),
    p = parseEventText(f.originalText);
  if (f.presetId && !EVENT_PRESETS.some((preset) => preset.id === f.presetId))
    throw new HttpError(400, "Mẫu chương trình không hợp lệ.");
  if (id && f.presetId !== undefined)
    throw new HttpError(400, "Không thể thay đổi mẫu của sinh hoạt đã lưu.");
  if (id) {
    calendarId(id);
    await db.query(
      "SELECT id FROM church.events WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
      [id],
    );
  }
  const priorEvent = id ? await calendarEvent(db, actor, id) : null;
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
  const receipt = (
    await db.query(
      "SELECT * FROM church.event_save_requests WHERE request_id=$1",
      [f.requestId],
    )
  ).rows[0];
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
    };
  }
  if (!id) {
    const previous = (
      await db.query(
        "SELECT id,request_hash,created_by,deleted_at FROM church.events WHERE request_id=$1",
        [f.requestId],
      )
    ).rows[0];
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
  if (
    (
      await db.query(
        "SELECT 1 FROM church.event_notifications WHERE request_id=$1 UNION ALL SELECT 1 FROM church.events WHERE request_id=$1 LIMIT 1",
        [f.requestId],
      )
    ).rowCount
  )
    throw new HttpError(409, "Mã yêu cầu đã được sử dụng.");
  await validateGroups(db, f.groupIds);
  const contentChanged =
    !priorEvent ||
    priorEvent.originalText !== f.originalText ||
    priorEvent.eventDate !== f.eventDate;
  if (
    priorEvent &&
    !contentChanged &&
    JSON.stringify([...priorEvent.groupIds].sort()) ===
      JSON.stringify([...f.groupIds].sort())
  ) {
    if (f.version === undefined)
      throw new HttpError(400, "Thiếu phiên bản sinh hoạt.");
    if (f.version !== priorEvent.version)
      throw new HttpError(
        409,
        "Sinh hoạt đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    await db.query(
      "INSERT INTO church.event_save_requests(request_id,event_id,created_by,operation,request_hash,notification_id,applied_version,worship_notification_id) VALUES($1,$2,$3,$4,$5,NULL,$6,NULL)",
      [f.requestId, id, actor.id, operation, hash, priorEvent.version],
    );
    return { ...priorEvent, notificationId: null, worshipNotificationId: null };
  }
  let saved: string;
  if (id) {
    calendarId(id);
    if (f.version === undefined)
      throw new HttpError(400, "Thiếu phiên bản sinh hoạt.");
    const result = await db.query(
      "UPDATE church.events SET event_date=$2,title=$3,time_text=$4,start_time=$5,end_time=$6,details=$7,original_text=$8,version=version+1,updated_by=$9,updated_at=now() WHERE id=$1 AND version=$10 AND deleted_at IS NULL RETURNING id",
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
      ],
    );
    if (!result.rowCount)
      throw new HttpError(
        409,
        "Sinh hoạt đã thay đổi. Vui lòng tải lại trước khi lưu.",
      );
    saved = id;
  } else
    saved = (
      await db.query(
        "INSERT INTO church.events(event_date,title,time_text,start_time,end_time,details,original_text,created_by,updated_by,request_id,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,$10) RETURNING id",
        [
          f.eventDate,
          p.title,
          p.timeText,
          p.startTime,
          p.endTime,
          p.details,
          f.originalText,
          actor.id,
          f.requestId,
          hash,
        ],
      )
    ).rows[0].id;
  if (!id && (f.presetId || worship))
    await db.query("UPDATE church.events SET preset_id=$2 WHERE id=$1", [
      saved,
      f.presetId ?? "worship-program",
    ]);
  if (id && worship && !priorEvent?.presetId)
    await db.query(
      "UPDATE church.events SET preset_id='worship-program' WHERE id=$1",
      [saved],
    );
  await setGroups(db, saved, f.groupIds);
  const notification =
    contentChanged && f.groupIds.length
      ? await queueEventNotification(
          db,
          actor,
          saved,
          { requestId: f.requestId },
          id ? "updated" : "created",
        )
      : null;
  const result = await calendarEvent(db, actor, saved);
  const worshipNotificationId =
    worship && contentChanged
      ? await queueAutomaticWorshipViberDraft(db, result, actor.id)
      : null;
  await db.query(
    "INSERT INTO church.event_save_requests(request_id,event_id,created_by,operation,request_hash,notification_id,applied_version,worship_notification_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [
      f.requestId,
      saved,
      actor.id,
      operation,
      hash,
      notification?.id ?? null,
      result.version,
      worshipNotificationId,
    ],
  );
  await audit(
    db,
    actor,
    actor.id,
    `${id ? "Cập nhật" : "Tạo"} sinh hoạt ${saved}`,
  );
  return {
    ...result,
    notificationId: notification?.id ?? null,
    worshipNotificationId,
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
    throw new HttpError(409, "Sinh hoạt đã thay đổi hoặc đã xóa.");
  // History is retained, but unsent creation/update jobs are cancelled on deletion.
  await db.query(
    "UPDATE church.event_notification_deliveries SET status='cancelled',safe_error='Sinh hoạt đã xóa; không gửi.' WHERE status='pending' AND notification_id IN(SELECT id FROM church.event_notifications WHERE event_id=$1)",
    [id],
  );
  await audit(db, actor, actor.id, `Xóa sinh hoạt ${id}`);
  return { ok: true };
}
export async function listEmailGroups(
  db: DB,
  actor: AuthUser,
): Promise<{ items: EmailGroup[] }> {
  requireCalendar(actor, "calendar.groups");
  const rows = (
    await db.query(
      'SELECT g.id,g.name,g.description,g.version,count(m.id)::int "memberCount" FROM church.email_groups g LEFT JOIN church.email_group_members m ON m.group_id=g.id WHERE g.deleted_at IS NULL GROUP BY g.id ORDER BY lower(g.name),g.id LIMIT 501',
    )
  ).rows;
  if (rows.length > 500) throw new HttpError(400, "Quá nhiều nhóm email.");
  return { items: rows };
}
export async function emailGroup(db: DB, actor: AuthUser, id: string) {
  requireCalendar(actor, "calendar.groups");
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
      throw new HttpError(409, "Nhóm email đã thay đổi. Vui lòng tải lại.");
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
) {
  requireCalendar(actor, "calendar.notify");
  calendarId(id);
  const f = NotificationInput.parse(input);
  const previous = (
    await db.query(
      "SELECT id,event_id FROM church.event_notifications WHERE request_id=$1",
      [f.requestId],
    )
  ).rows[0];
  if (previous) {
    if (previous.event_id !== id)
      throw new HttpError(409, "Mã gửi đã được sử dụng.");
    return { id: previous.id };
  }
  if (
    (
      await db.query(
        "SELECT count(*)::int n FROM church.event_notifications WHERE created_by=$1 AND created_at>now()-interval '15 minutes'",
        [actor.id],
      )
    ).rows[0].n >= 20
  )
    throw new HttpError(429, "Tối đa 20 lần gửi trong 15 phút.");
  const event = await calendarEvent(db, actor, id);
  const groups = (
    await db.query(
      "SELECT g.id,g.name FROM church.event_email_groups eg JOIN church.email_groups g ON g.id=eg.group_id WHERE eg.event_id=$1 AND g.deleted_at IS NULL ORDER BY g.name",
      [id],
    )
  ).rows;
  if (!groups.length)
    throw new HttpError(400, "Chọn ít nhất một nhóm email trước khi gửi.");
  const recipients = (
    await db.query(
      "SELECT DISTINCT m.email FROM church.email_group_members m JOIN church.event_email_groups eg ON eg.group_id=m.group_id JOIN church.email_groups g ON g.id=m.group_id WHERE eg.event_id=$1 AND g.deleted_at IS NULL ORDER BY m.email LIMIT 5001",
      [id],
    )
  ).rows;
  if (recipients.length > 5000)
    throw new HttpError(400, "Mỗi lần gửi tối đa 5.000 địa chỉ.");
  const emails = recipients.map((r) => z.email().max(254).parse(r.email));
  const batch = (
    await db.query(
      "INSERT INTO church.event_notifications(event_id,request_id,kind,snapshot,group_names,created_by,group_ids) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
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
      ],
    )
  ).rows[0];
  if (emails.length)
    await db.query(
      "INSERT INTO church.event_notification_deliveries(notification_id,email) SELECT $1,unnest($2::text[])",
      [batch.id, emails],
    );
  await audit(
    db,
    actor,
    actor.id,
    `Xếp hàng thông báo ${batch.id}: ${emails.length} người nhận`,
  );
  return { id: batch.id, count: emails.length };
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
    throw new HttpError(409, "Không gửi lại sinh hoạt đã xóa.");
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
