import { queueEventPush } from "../push-delivery";
import { createHash } from "node:crypto";
import { z } from "zod";
import { CalendarDate, parseEventText, type AuthUser } from "@org/core";
import type { DB } from "../db";
import { HttpError } from "../http";
import { audit } from "../members";
import { requireCalendar } from "./policy";

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
