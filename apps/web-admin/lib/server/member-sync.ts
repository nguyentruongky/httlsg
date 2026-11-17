import { z } from "zod";
import { authorizationScope, type AuthUser } from "@org/core";
import type { DB } from "./db";
import { getMember, listReadScope } from "./members";
import { listAssignedRoles } from "./roles";
import { HttpError } from "./http";
import { currentMemberScope } from "./member-visibility";

const Input = z
  .object({
    organization: z.string().min(1).max(100),
    scope: z.string().max(20000),
    epoch: z.uuid().optional(),
    since: z
      .string()
      .regex(/^\d{1,19}$/)
      .default("0"),
    watched: z.array(z.uuid()).max(5000),
    includeCounts: z.boolean().default(false),
  })
  .strict();

export async function syncMemberReads(db: DB, actor: AuthUser, input: unknown) {
  const f = Input.parse(input);
  if (authorizationScope(actor, f.organization) !== f.scope)
    return { scopeChanged: true };
  const head = (
    await db.query(
      "SELECT epoch,revision::text FROM church.member_sync_state WHERE singleton",
    )
  ).rows[0];
  if (!head) throw new HttpError(503, "Chưa cấu hình đồng bộ dữ liệu.");
  const needsCounts =
    f.includeCounts || f.epoch !== head.epoch || f.since !== head.revision;
  const countRows = needsCounts
    ? (
        await db.query(
          `SELECT dm.department_id,count(*)::int AS count FROM church.department_members dm JOIN church.member_profiles p ON p.id=dm.user_id WHERE p.deleted_at IS NULL AND NOT p.is_test_account AND ${currentMemberScope("p")} GROUP BY dm.department_id ORDER BY dm.department_id`,
        )
      ).rows
    : undefined;
  const responsibilityRevision = ["admin", "secretary", "deacon"].includes(
    actor.role,
  )
    ? (
        await db.query(
          `SELECT md5(COALESCE(string_agg(id::text || ':' || version::text, ',' ORDER BY id), '')) AS version
         FROM church.schedules WHERE deleted_at IS NULL AND status='published'`,
        )
      ).rows[0].version
    : undefined;
  const counts = {
    ...(countRows
      ? {
          departmentCounts: Object.fromEntries(
            countRows.map((row) => [row.department_id, row.count]),
          ),
        }
      : {}),
    ...(responsibilityRevision
      ? {
          responsibilitiesVersion: `${head.epoch}:${head.revision}:${responsibilityRevision}`,
        }
      : {}),
  };
  if (f.epoch !== head.epoch || BigInt(f.since) > BigInt(head.revision))
    return {
      epoch: head.epoch,
      version: head.revision,
      reset: true,
      changes: [],
      removed: [],
      hasMore: false,
      refreshLists: false,
      ...counts,
    };
  if (f.since === head.revision)
    return {
      epoch: head.epoch,
      version: head.revision,
      changes: [],
      removed: [],
      hasMore: false,
      refreshLists: false,
      ...counts,
    };
  const log = (
    await db.query(
      "SELECT member_id,revision::text FROM church.member_sync_changes WHERE revision>$1::bigint AND revision<=$2::bigint ORDER BY revision LIMIT 101",
      [f.since, head.revision],
    )
  ).rows;
  const batch = log.slice(0, 100);
  const watched = new Set(f.watched);
  const changes = [];
  const removed: string[] = [];
  const canReadPersonnel =
    ["admin", "secretary", "deacon"].includes(actor.role) &&
    actor.permissions.includes("access.manage");
  for (const entry of batch) {
    if (!watched.has(entry.member_id)) continue;
    try {
      const member = await getMember(db, actor, entry.member_id, false, false);
      if (member.id !== entry.member_id) removed.push(entry.member_id);
      const personnel = canReadPersonnel
        ? ((await listAssignedRoles(db, actor, {}, member.id)).items[0] ?? null)
        : undefined;
      changes.push({
        member,
        ...(personnel !== undefined ? { personnel } : {}),
      });
    } catch (error) {
      if (error instanceof HttpError && [403, 404].includes(error.status))
        removed.push(entry.member_id);
      else throw error;
    }
  }
  const unknown = batch
    .filter((entry) => !watched.has(entry.member_id))
    .map((entry) => entry.member_id);
  const refreshLists = unknown.length
    ? (
        await db.query(
          `SELECT EXISTS(SELECT 1 FROM church.member_profiles u WHERE u.id=ANY($3::uuid[]) AND NOT u.is_test_account AND ${listReadScope(actor)}) changed`,
          [actor.id, actor.role, unknown],
        )
      ).rows[0].changed
    : false;
  return {
    epoch: head.epoch,
    version:
      log.length > 100 ? batch[batch.length - 1].revision : head.revision,
    changes,
    removed,
    refreshLists,
    hasMore: log.length > 100,
    ...counts,
  };
}
