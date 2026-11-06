import { createHash, randomUUID } from "node:crypto";
import {
  composeWorshipInformationRequest,
  type CalendarEvent,
} from "@org/core";
import type { DB } from "./db";
import { WORSHIP_INFORMATION_RECIPIENT } from "./worship-constants";
/** Caller has persisted and authorized this version inside its save transaction. */
export async function queueAutomaticWorshipViberDraft(
  db: DB,
  event: CalendarEvent,
  actorId: string,
) {
  const info = composeWorshipInformationRequest(event.originalText);
  const hash = createHash("sha256")
    .update(JSON.stringify([event.id, event.version, info.message]))
    .digest("hex");
  const row = (
    await db.query(
      `INSERT INTO church.notification_history(request_id,event_id,event_version,created_by,type,recipient,preview_hash,message,missing_fields)
    VALUES($1,$2,$3,$4,'worship_viber_draft',$5,$6,$7,$8)
    ON CONFLICT(event_id,event_version,type) WHERE status IN('pending','sending','sent','uncertain') DO UPDATE SET event_id=EXCLUDED.event_id RETURNING id`,
      [
        randomUUID(),
        event.id,
        event.version,
        actorId,
        WORSHIP_INFORMATION_RECIPIENT,
        hash,
        info.message,
        JSON.stringify(info.missingFields),
      ],
    )
  ).rows[0];
  return row.id as string;
}
