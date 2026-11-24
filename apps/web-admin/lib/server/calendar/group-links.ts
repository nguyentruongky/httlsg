import type { DB } from "../db";
import { HttpError } from "../http";

export async function validateGroups(db: DB, ids: string[]) {
  if (!ids.length) return;
  const found = await db.query(
    "SELECT id FROM church.email_groups WHERE id=ANY($1::uuid[]) AND deleted_at IS NULL",
    [ids],
  );
  if (found.rowCount !== ids.length)
    throw new HttpError(
      400,
      "Nhóm email nhận thông báo không còn tồn tại. Vui lòng tải lại.",
    );
}

export async function setGroups(
  db: DB,
  id: string,
  ids: string[],
  existingEvent = true,
) {
  if (existingEvent)
    await db.query("DELETE FROM church.event_email_groups WHERE event_id=$1", [
      id,
    ]);
  if (ids.length)
    await db.query(
      "INSERT INTO church.event_email_groups(event_id,group_id) SELECT $1,unnest($2::uuid[])",
      [id, ids],
    );
}
