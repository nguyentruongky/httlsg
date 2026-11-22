import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  EventInput,
  composeWorshipInformationRequest,
  matchEventResponsibilities,
  type EventResponsiblePerson,
  type ParsedEventText,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { WORSHIP_INFORMATION_RECIPIENT } from "./worship-constants";

export type CalendarCreateContext = {
  groups: { id: string; name: string }[];
  emails: string[];
  recent_count: number;
  people: EventResponsiblePerson[];
};

/** Persist the event and its durable jobs in one round trip, inside the caller's transaction. */
export async function persistNewCalendarEvent(
  db: DB,
  actorId: string,
  input: z.infer<typeof EventInput>,
  parsed: ParsedEventText,
  hash: string,
  worship: boolean,
  context: CalendarCreateContext,
) {
  if (input.groupIds.length && context.recent_count >= 20)
    throw new HttpError(429, "Tối đa 20 lần gửi trong 15 phút.");
  if (context.emails.length > 5000)
    throw new HttpError(400, "Mỗi lần gửi tối đa 5.000 địa chỉ.");
  const emails = context.emails.map((email) => z.email().max(254).parse(email));
  const assignments = [
    ...new Set(
      matchEventResponsibilities(input.originalText, context.people).flatMap(
        (match) => (match.person?.hasAccount ? [match.person.id] : []),
      ),
    ),
  ];
  const id = randomUUID();
  const notificationId = input.groupIds.length ? randomUUID() : null;
  const worshipNotificationId = worship ? randomUUID() : null;
  const information = worship
    ? composeWorshipInformationRequest(input.originalText)
    : null;
  const previewHash = information
    ? createHash("sha256")
        .update(JSON.stringify([id, 0, information.message]))
        .digest("hex")
    : null;
  const row = (
    await db.query(
      `WITH event AS (
      INSERT INTO church.events(id,event_date,end_date,title,time_text,start_time,end_time,details,original_text,
        created_by,updated_by,request_id,request_hash,preset_id)
      VALUES($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$12) RETURNING *
    ), groups AS (
      INSERT INTO church.event_email_groups(event_id,group_id)
      SELECT event.id,group_id FROM event CROSS JOIN unnest($13::uuid[]) AS g(group_id)
    ), assignments AS (
      INSERT INTO church.event_responsible_members(event_id,member_id)
      SELECT event.id,member_id FROM event CROSS JOIN unnest($14::uuid[]) AS a(member_id)
    ), email_batch AS (
      INSERT INTO church.event_notifications(id,event_id,request_id,kind,snapshot,group_names,created_by,group_ids)
      SELECT $15,event.id,$10,'created',$16,$17,$9,$13 FROM event WHERE $15::uuid IS NOT NULL RETURNING id
    ), deliveries AS (
      INSERT INTO church.event_notification_deliveries(notification_id,email)
      SELECT email_batch.id,email FROM email_batch CROSS JOIN unnest($18::text[]) AS d(email)
    ), worship AS (
      INSERT INTO church.notification_history(id,request_id,event_id,event_version,created_by,type,recipient,preview_hash,message,missing_fields)
      SELECT $19,$20,event.id,event.version,$9,'worship_viber_draft',$21,$22,$23,$24 FROM event
      WHERE $19::uuid IS NOT NULL RETURNING id
    ), receipt AS (
      INSERT INTO church.event_save_requests(request_id,event_id,created_by,operation,request_hash,notification_id,applied_version,worship_notification_id)
      SELECT $10,event.id,$9,'created',$11,(SELECT id FROM email_batch),event.version,(SELECT id FROM worship) FROM event
    ), audit AS (
      INSERT INTO church.audit_log(actor_id,subject_id,action)
      SELECT $9,$9,'Tạo chương trình '||event.id::text FROM event
      UNION ALL
      SELECT $9,$9,'Xếp hàng thông báo '||email_batch.id::text||': '||cardinality($18::text[])::text||' người nhận' FROM email_batch
    ) SELECT * FROM event`,
      [
        id,
        input.eventDate,
        parsed.title,
        parsed.timeText,
        parsed.startTime,
        parsed.endTime,
        parsed.details,
        input.originalText,
        actorId,
        input.requestId,
        hash,
        input.presetId ?? (worship ? "worship-program" : null),
        input.groupIds,
        assignments,
        notificationId,
        JSON.stringify({
          eventDate: input.eventDate,
          title: parsed.title,
          timeText: parsed.timeText,
          details: parsed.details,
        }),
        context.groups.map((group) => group.name),
        emails,
        worshipNotificationId,
        worship ? randomUUID() : null,
        WORSHIP_INFORMATION_RECIPIENT,
        previewHash,
        information?.message ?? null,
        JSON.stringify(information?.missingFields ?? []),
      ],
    )
  ).rows[0];
  return { row, notificationId, worshipNotificationId };
}
