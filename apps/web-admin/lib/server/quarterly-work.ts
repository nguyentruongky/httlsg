import { z } from "zod";
import { HttpError } from "./http";
import {
  generateQuarterlyWork,
  ScheduleDraft,
  isQuarterlyWork,
  QuarterlyInput,
  quarterlyPeriod,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { requireScheduleCategory } from "./schedules";
import {
  scheduledPeople,
  quarterlyRosterMembers,
  checkQuarterlyWork,
} from "./quarterly-conflicts";
import { audit } from "./members";

export async function previewQuarterlyWork(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  await requireScheduleCategory(db, actor, "program_guidance");
  const { year, quarter } = QuarterlyInput.parse(input);
  const { from, to } = quarterlyPeriod(year, quarter);
  const people = await quarterlyRosterMembers(db);
  const result = generateQuarterlyWork(
    year,
    quarter,
    people,
    await scheduledPeople(db, "reception", from, to, people),
  );
  await audit(
    db,
    actor,
    actor.id,
    `Xem trước lịch công tác quý ${quarter}/${year}: ${result.draft.events.length} buổi; ${result.warnings.length} cảnh báo; chưa lưu hoặc thông báo`,
  );
  return result;
}

export async function previewQuarterlyCheck(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  await requireScheduleCategory(db, actor, "program_guidance");
  const { draft } = z.object({ draft: ScheduleDraft }).strict().parse(input);
  if (!isQuarterlyWork(draft))
    throw new HttpError(400, "Nội dung không phải lịch công tác quý.");
  const result = await checkQuarterlyWork(db, draft);
  return {
    issues: result.issues,
    warnings: result.warnings,
    cellIssues: result.cellIssues,
  };
}
