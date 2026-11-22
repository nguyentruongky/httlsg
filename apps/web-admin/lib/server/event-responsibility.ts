import { z } from "zod";
import {
  canCalendar,
  matchEventResponsibilities,
  type AuthUser,
  type EventResponsiblePerson,
  type WorshipPersonInCharge,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { LIVE_PUSH } from "./push-subscriptions";

export async function eventResponsiblePeople(
  db: DB,
  includePushStatus = true,
): Promise<EventResponsiblePerson[]> {
  return (
    await db.query<EventResponsiblePerson>(
      `SELECT p.id,p.full_name AS name,
      EXISTS(SELECT 1 FROM church.users u WHERE u.id=p.id AND u.enabled AND u.deleted_at IS NULL) AS "hasAccount",
      ($1::boolean AND EXISTS(SELECT 1 FROM church.push_subscriptions s JOIN church.users u ON u.id=s.user_id
        WHERE u.id=p.id AND ${LIVE_PUSH})) AS "pushEnabled"
    FROM church.member_profiles p WHERE p.deleted_at IS NULL AND p.enabled AND NOT p.is_test_account
    ORDER BY p.full_name,p.id`,
      [includePushStatus],
    )
  ).rows;
}
export async function previewEventResponsibilities(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  if (!canCalendar(actor, "calendar.write"))
    throw new HttpError(403, "Bạn không có quyền sửa chương trình.");
  const { text } = z
    .object({ text: z.string().max(50000) })
    .strict()
    .parse(input);
  return {
    items: matchEventResponsibilities(text, await eventResponsiblePeople(db)),
  };
}
export async function saveEventResponsibilities(
  db: DB,
  eventId: string,
  text: string,
  existingEvent = true,
) {
  if (!matchEventResponsibilities(text, []).length) {
    if (existingEvent)
      await db.query(
        "DELETE FROM church.event_responsible_members WHERE event_id=$1",
        [eventId],
      );
    return;
  }
  const matches = matchEventResponsibilities(
    text,
    await eventResponsiblePeople(db, false),
  );
  const ids = [
    ...new Set(
      matches.flatMap((m) => (m.person?.hasAccount ? [m.person.id] : [])),
    ),
  ];
  if (existingEvent)
    await db.query(
      "DELETE FROM church.event_responsible_members WHERE event_id=$1",
      [eventId],
    );
  if (ids.length)
    await db.query(
      "INSERT INTO church.event_responsible_members(event_id,member_id) SELECT $1,unnest($2::uuid[])",
      [eventId, ids],
    );
}

/** Sync only the configured worship roster and the member identities matching it. */
export async function worshipPeopleInCharge(db: DB, actor: AuthUser) {
  if (!canCalendar(actor))
    throw new HttpError(
      403,
      "Bạn không có quyền xem người phụ trách thờ phượng.",
    );
  const people = (
    await db.query<WorshipPersonInCharge>(
      `WITH roster AS (
      SELECT min(id::text)::uuid AS id,full_name,array_agg(DISTINCT category ORDER BY category) AS categories,
        max(role_label) AS role_label,max(phone) AS phone,max(email) AS email
      FROM church.worship_service_workers WHERE is_active GROUP BY full_name
    ) SELECT COALESCE(p.id,r.id) AS id,p.id AS "memberId",COALESCE(p.full_name,r.full_name) AS name,
      r.categories,r.phone,r.email,r.role_label AS "roleLabel",
      EXISTS(SELECT 1 FROM church.users u WHERE u.id=p.id AND u.enabled AND u.deleted_at IS NULL) AS "hasAccount",
      EXISTS(SELECT 1 FROM church.push_subscriptions s JOIN church.users u ON u.id=s.user_id
        WHERE u.id=p.id AND ${LIVE_PUSH}) AS "pushEnabled"
    FROM roster r LEFT JOIN church.member_profiles p
      ON p.deleted_at IS NULL AND p.enabled AND NOT p.is_test_account
      AND public.unaccent(lower(btrim(p.full_name)))=public.unaccent(lower(btrim(r.full_name)))
    ORDER BY name,id`,
    )
  ).rows;
  return { people, syncedAt: new Date().toISOString() };
}
