import { z } from "zod";
import { canCalendar, type AuthUser } from "@org/core";
import type { DB } from "./db";
import { SELECTED_EVENT_MEMBER } from "./push-delivery";

export async function myNotifications(db: DB, actor: AuthUser, input: unknown) {
  const { page } = z
    .object({ page: z.coerce.number().int().min(1).max(10000).default(1) })
    .strict()
    .parse(input);
  const rows = (
    await db.query(
      `SELECT * FROM (
        SELECT n.id,'schedule' AS type,n.kind,n.schedule_title AS title,
          n.created_at AS "createdAt",'/client/notifications/schedules/' || n.schedule_id::text AS href
        FROM church.schedule_notifications n WHERE n.member_id=$1
        UNION ALL
        SELECT n.id,'event' AS type,n.kind,n.snapshot->>'title' AS title,
          n.created_at AS "createdAt",'/client/events/' || e.id::text AS href
        FROM church.event_notifications n
        JOIN church.events e ON e.id=n.event_id
        JOIN church.users u ON u.id=$1
        WHERE e.deleted_at IS NULL AND ${SELECTED_EVENT_MEMBER}
          AND EXISTS(SELECT 1 FROM church.event_notification_deliveries d
            WHERE d.notification_id=n.id AND d.email=u.email)
        UNION ALL
        SELECT n.id,'event' AS type,'assigned' AS kind,n.title,
          n.created_at AS "createdAt",'/client/events/' || n.event_id::text AS href
        FROM church.event_assignment_notifications n
        JOIN church.events e ON e.id=n.event_id AND e.deleted_at IS NULL
        WHERE n.member_id=$1 AND EXISTS(
          SELECT 1 FROM church.event_responsible_members rm
          WHERE rm.event_id=n.event_id AND rm.member_id=$1
        )
        UNION ALL
        SELECT c.id,'calendar_contribution' AS type,'contribution' AS kind,
          'Đóng góp chương trình ngày ' || c.event_date::text AS title,
          c.created_at AS "createdAt",'/client/calendar-contributions' AS href
        FROM church.calendar_contributions c WHERE $3::boolean
        UNION ALL
        SELECT c.id,'worship_contribution' AS type,'contribution' AS kind,
          'Đóng góp thờ phượng ngày ' || c.event_date::text || ' · Lễ ' || c.service_number::text AS title,
          c.created_at AS "createdAt",'/client/worship-review' AS href
        FROM church.worship_contributions c WHERE $4::boolean
      ) notices ORDER BY "createdAt" DESC,type DESC,id DESC LIMIT 26 OFFSET $2`,
      [
        actor.id,
        (page - 1) * 25,
        canCalendar(actor, "calendar.write"),
        ["admin", "secretary"].includes(actor.role) &&
          canCalendar(actor, "calendar.write"),
      ],
    )
  ).rows;
  return {
    items: rows.slice(0, 25),
    nextPage: rows.length > 25 ? page + 1 : null,
  };
}
