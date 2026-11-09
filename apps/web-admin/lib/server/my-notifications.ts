import { z } from "zod";
import type { AuthUser } from "@org/core";
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
          n.created_at AS "createdAt",'#/notifications/schedules/' || n.schedule_id::text AS href
        FROM church.schedule_notifications n WHERE n.member_id=$1
        UNION ALL
        SELECT n.id,'event' AS type,n.kind,n.snapshot->>'title' AS title,
          n.created_at AS "createdAt",'#/events/' || e.id::text AS href
        FROM church.event_notifications n
        JOIN church.events e ON e.id=n.event_id
        JOIN church.users u ON u.id=$1
        WHERE e.deleted_at IS NULL AND ${SELECTED_EVENT_MEMBER}
          AND EXISTS(SELECT 1 FROM church.event_notification_deliveries d
            WHERE d.notification_id=n.id AND d.email=u.email)
      ) notices ORDER BY "createdAt" DESC,id DESC LIMIT 26 OFFSET $2`,
      [actor.id, (page - 1) * 25],
    )
  ).rows;
  return {
    items: rows.slice(0, 25),
    nextPage: rows.length > 25 ? page + 1 : null,
  };
}
