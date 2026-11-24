import { persistNewCalendarEvent } from "./event-create";
import { saveEventResponsibilities } from "../event-responsibility";
import { queueEventPush } from "../push-delivery";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  matchEventResponsibilities,
  EventInput,
  parseEventText,
  EVENT_PRESETS,
  isWorshipProgramText,
  type AuthUser,
  type CalendarEvent,
  type CalendarSaveResult,
} from "@org/core";
import type { DB } from "../db";
import { HttpError } from "../http";
import { audit } from "../members";
import { queueAutomaticWorshipViberDraft } from "../worship-automatic";
import { requireCalendar, calendarId } from "./policy";
import { calendarEvent } from "./event-queries";
import { eventDto } from "./event-mapper";
import { findEventRow, type CalendarEventRow } from "./event-repository";
import { setGroups } from "./group-links";
import { queueEventNotification } from "./notifications";

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
    const row = await findEventRow(db, id, { lock: true });
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
      [
        f.requestId,
        f.groupIds,
        !id,
        !id && matchEventResponsibilities(f.originalText, []).length > 0,
        actor.id,
      ],
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
    const created = await persistNewCalendarEvent(
      db,
      actor.id,
      f,
      p,
      hash,
      worship,
      checks,
    );
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
  let savedRow: CalendarEventRow;
  {
    calendarId(id);
    if (f.version === undefined)
      throw new HttpError(400, "Thiếu phiên bản chương trình.");
    const result = await db.query<CalendarEventRow>(
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
  const saved = savedRow.id;
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
