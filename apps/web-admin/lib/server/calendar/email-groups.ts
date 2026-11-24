import { z } from "zod";
import {
  GroupInput,
  BulkEmailInput,
  parseBulkEmails,
  type AuthUser,
  type EmailGroup,
} from "@org/core";
import type { DB } from "../db";
import { HttpError } from "../http";
import { audit } from "../members";
import { requireCalendar, calendarId } from "./policy";
import { validateGroups } from "./group-links";

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
