import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  EVENT_PRESETS,
  worshipMerge,
  applyWorshipReviewDecision,
  renderEventPreset,
  todayInChurch,
  calendarWeekday,
  addCalendarDays,
  isWorshipProgramText,
  type AuthUser,
} from "@org/core";
import type { DB } from "./db";
import { HttpError } from "./http";
import { calendarEvent, requireCalendar, saveCalendarEvent } from "./calendar";
import { audit } from "./members";

export function upcomingWorshipSunday() {
  const today = todayInChurch();
  return addCalendarDays(today, (7 - calendarWeekday(today)) % 7);
}
async function slot(db: DB, date: string, service: number) {
  const rows = (
    await db.query(
      "SELECT id,original_text,version,preset_id FROM church.events WHERE event_date=$1 AND deleted_at IS NULL ORDER BY created_at,id",
      [date],
    )
  ).rows;
  const matches = rows.filter(
    (row) =>
      (row.preset_id === "worship-program" ||
        isWorshipProgramText(row.original_text)) &&
      new RegExp(`(?:Lễ|LỄ)\\s*0?${service}(?!\\d)`, "iu").test(
        row.original_text.split(/\r?\n/)[0],
      ),
  );
  if (matches.length > 1)
    throw new HttpError(
      409,
      "Có nhiều chương trình cùng Lễ. Nhờ Admin kiểm tra lại tiêu đề.",
    );
  const event = matches[0];
  return {
    service,
    eventId: event?.id ?? null,
    version: event?.version ?? null,
    originalText:
      event?.original_text ??
      renderEventPreset(
        EVENT_PRESETS.find((p) => p.id === "worship-program")!,
        { date, service_number: String(service) },
      ),
  };
}
export async function publicWorship(db: DB) {
  const date = upcomingWorshipSunday();
  return {
    date,
    items: await Promise.all([slot(db, date, 1), slot(db, date, 2)]),
  };
}
const Submission = z
  .object({
    requestId: z.uuid(),
    date: z.string(),
    service: z.number().int().min(1).max(2),
    eventId: z.uuid().nullable(),
    version: z.number().int().nullable(),
    originalText: z.string().trim().min(1).max(50000),
    name: z.string().trim().max(120).default(""),
  })
  .strict();
export async function submitWorship(db: DB, input: unknown) {
  const f = Submission.parse(input);
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtext('public-worship-submission'))",
  );
  const previous = (
    await db.query(
      "SELECT * FROM church.worship_contributions WHERE request_id=$1",
      [f.requestId],
    )
  ).rows[0];
  if (previous) {
    if (
      previous.event_date !== f.date ||
      previous.service_number !== f.service ||
      previous.proposed_text !== f.originalText ||
      previous.contributor_name !== f.name
    )
      throw new HttpError(409, "Mã gửi đã được sử dụng.");
    return { saved: true };
  }
  if (f.date !== upcomingWorshipSunday())
    throw new HttpError(409, "Tuần đã thay đổi. Vui lòng tải lại biểu mẫu.");
  const current = await slot(db, f.date, f.service);
  if (current.eventId !== f.eventId || current.version !== f.version)
    throw new HttpError(
      409,
      "Chương trình đã thay đổi. Hãy sao chép nội dung của bạn rồi tải lại.",
    );
  if (current.originalText.trim() === f.originalText)
    throw new HttpError(400, "Vui lòng bổ sung thông tin trước khi gửi.");
  if (
    (
      await db.query(
        "SELECT count(*)::int n FROM church.worship_contributions WHERE created_at>now()-interval '15 minutes'",
      )
    ).rows[0].n >= 100
  )
    throw new HttpError(429, "Đã nhận nhiều bản nháp. Vui lòng thử lại sau.");
  await db.query(
    "INSERT INTO church.worship_contributions(request_id,event_date,service_number,base_event_id,base_version,base_text,proposed_text,contributor_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [
      f.requestId,
      f.date,
      f.service,
      f.eventId,
      f.version,
      current.originalText,
      f.originalText,
      f.name,
    ],
  );
  return { saved: true };
}
function reviewer(actor: AuthUser) {
  if (!["admin", "secretary"].includes(actor.role))
    throw new HttpError(403, "Chỉ Admin và Thư ký được duyệt bản nháp.");
  requireCalendar(actor, "calendar.write");
}
export async function listWorshipContributions(db: DB, actor: AuthUser) {
  reviewer(actor);
  const rows = (
    await db.query(
      "SELECT * FROM church.worship_contributions WHERE status='pending' ORDER BY created_at LIMIT 200",
    )
  ).rows;
  return {
    items: await Promise.all(
      rows.map(async (row) => ({
        ...row,
        current: await slot(db, row.event_date, row.service_number),
      })),
    ),
  };
}
export async function reviewWorshipContribution(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  reviewer(actor);
  const f = z
    .object({
      id: z.uuid(),
      action: z.enum(["merge", "reject", "approve-change", "discard-change"]),
      changeIds: z
        .array(z.number().int().nonnegative())
        .min(1)
        .max(1000)
        .optional(),
      changeText: z.string().max(50000).optional(),
      originalText: z.string().min(1).max(50000).optional(),
      eventId: z.uuid().nullable().optional(),
      version: z.number().int().nullable().optional(),
    })
    .strict()
    .parse(input);
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtext('public-worship-submission'))",
  );
  const row = (
    await db.query(
      "SELECT * FROM church.worship_contributions WHERE id=$1 FOR UPDATE",
      [f.id],
    )
  ).rows[0];
  if (!row || row.status !== "pending")
    throw new HttpError(409, "Bản nháp đã được xử lý hoặc không tồn tại.");
  let result = null;
  if (f.action === "approve-change" || f.action === "discard-change") {
    await db.query(
      "SELECT id FROM church.events WHERE event_date=$1 AND deleted_at IS NULL FOR UPDATE",
      [row.event_date],
    );
    const current = await slot(db, row.event_date, row.service_number);
    if (current.eventId !== f.eventId || current.version !== f.version)
      throw new HttpError(
        409,
        "Chương trình đã thay đổi. Tải lại để duyệt theo nội dung mới nhất.",
      );
    const reviews = row.change_reviews as {
      changeIds: number[];
      action: string;
    }[];
    const resolved = reviews.flatMap((review) => review.changeIds);
    const parts = worshipMerge(
      row.base_text,
      row.proposed_text,
      current.originalText,
      resolved,
    );
    const selected = parts.find(
      (part) =>
        part.changed &&
        JSON.stringify(part.changeIds) === JSON.stringify(f.changeIds),
    );
    if (!selected)
      throw new HttpError(
        409,
        "Thay đổi đã được xử lý hoặc đã thay đổi. Vui lòng tải lại.",
      );
    const approved = f.action === "approve-change";
    if (approved) {
      const originalText = parts
        .flatMap((part) => {
          if (part === selected) {
            const text = f.changeText ?? part.after;
            return text === "" ? [] : text.split("\n");
          }
          return part.beforeLines ? part.before.split("\n") : [];
        })
        .join("\n");
      const event = current.eventId
        ? await calendarEvent(db, actor, current.eventId)
        : null;
      result = await saveCalendarEvent(
        db,
        actor,
        {
          requestId: randomUUID(),
          eventDate: row.event_date,
          originalText,
          groupIds: event?.groupIds ?? [],
          ...(event
            ? { version: event.version }
            : { presetId: "worship-program" }),
        },
        event?.id,
      );
    }
    const decision = {
      changeIds: selected.changeIds,
      action: f.action,
      text: f.changeText ?? selected.after,
      reviewedBy: actor.id,
      reviewedAt: new Date().toISOString(),
    };
    const remaining = parts.some((part) => part.changed && part !== selected);
    const anyApproved =
      approved || reviews.some((review) => review.action === "approve-change");
    await db.query(
      "UPDATE church.worship_contributions SET change_reviews=change_reviews || $2::jsonb,status=$3,reviewed_at=now(),reviewed_by=$4,merged_event_id=COALESCE($5,merged_event_id) WHERE id=$1",
      [
        f.id,
        JSON.stringify([decision]),
        remaining ? "pending" : anyApproved ? "merged" : "rejected",
        actor.id,
        result?.id ?? null,
      ],
    );
    await audit(
      db,
      actor,
      actor.id,
      `${approved ? "Duyệt" : "Bỏ"} thay đổi ${selected.changeIds.join(",")} bản nháp thờ phượng ${f.id}`,
    );
    return { saved: true, event: result };
  }
  if (f.action === "merge") {
    await db.query(
      "SELECT id FROM church.events WHERE event_date=$1 AND deleted_at IS NULL FOR UPDATE",
      [row.event_date],
    );
    const current = await slot(db, row.event_date, row.service_number);
    if (current.eventId !== f.eventId || current.version !== f.version)
      throw new HttpError(
        409,
        "Chương trình đã thay đổi. Tải lại danh sách để đối chiếu.",
      );
    if (!f.originalText) throw new HttpError(400, "Thiếu nội dung hợp nhất.");
    const event = current.eventId
      ? await calendarEvent(db, actor, current.eventId)
      : null;
    result = await saveCalendarEvent(
      db,
      actor,
      {
        requestId: randomUUID(),
        eventDate: row.event_date,
        originalText: f.originalText,
        groupIds: event?.groupIds ?? [],
        ...(event
          ? { version: event.version }
          : { presetId: "worship-program" }),
      },
      event?.id,
    );
  }
  await db.query(
    "UPDATE church.worship_contributions SET status=$2,reviewed_at=now(),reviewed_by=$3,merged_event_id=$4 WHERE id=$1",
    [
      f.id,
      f.action === "merge" ? "merged" : "rejected",
      actor.id,
      result?.id ?? null,
    ],
  );
  await audit(
    db,
    actor,
    actor.id,
    `${f.action === "merge" ? "Hợp nhất" : "Từ chối"} bản nháp thờ phượng ${f.id}`,
  );
  return { saved: true, event: result };
}

/** Apply a device's review session atomically, saving each program only once. */
export async function saveWorshipReviewSession(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  reviewer(actor);
  const f = z
    .object({
      requestId: z.uuid(),
      decisions: z
        .array(
          z
            .object({
              id: z.uuid(),
              scope: z.literal("submission").optional(),
              action: z.enum(["approve-change", "discard-change", "reject"]),
              eventId: z.uuid().nullable(),
              version: z.number().int().nullable(),
              changeIds: z
                .array(z.number().int().nonnegative())
                .min(1)
                .max(1000)
                .optional(),
              changeText: z.string().max(50000).optional(),
            })
            .strict(),
        )
        .min(1)
        .max(1000),
    })
    .strict()
    .parse(input);
  await db.query(
    "SELECT pg_advisory_xact_lock(hashtext('public-worship-submission'))",
  );
  const ids = [...new Set(f.decisions.map((decision) => decision.id))];
  const rows = (
    await db.query(
      "SELECT * FROM church.worship_contributions WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE",
      [ids],
    )
  ).rows;
  if (rows.length !== ids.length)
    throw new HttpError(409, "Một bản nháp không còn tồn tại.");
  const hash = createHash("sha256")
    .update(JSON.stringify(f.decisions))
    .digest("hex");
  const prior = rows
    .flatMap((row) => row.change_reviews)
    .filter((review) => review.sessionId === f.requestId);
  if (prior.length) {
    if (
      prior.length !== f.decisions.length ||
      prior.some(
        (review) =>
          review.sessionHash !== hash || review.reviewedBy !== actor.id,
      )
    )
      throw new HttpError(409, "Mã phiên duyệt đã được sử dụng.");
    return { saved: true, events: [] };
  }
  const programs = new Map<
    string,
    {
      initial: Awaited<ReturnType<typeof slot>>;
      text: string;
      date: string;
      service: number;
      approved: boolean;
    }
  >();
  for (const row of rows) {
    if (row.status !== "pending")
      throw new HttpError(
        409,
        "Bản nháp đã được xử lý. Bản duyệt trên thiết bị vẫn được giữ; vui lòng tải lại.",
      );
    const key = `${row.event_date}:${row.service_number}`;
    if (!programs.has(key)) {
      await db.query(
        "SELECT id FROM church.events WHERE event_date=$1 AND deleted_at IS NULL FOR UPDATE",
        [row.event_date],
      );
      const initial = await slot(db, row.event_date, row.service_number);
      programs.set(key, {
        initial,
        text: initial.originalText,
        date: row.event_date,
        service: row.service_number,
        approved: false,
      });
    }
  }
  for (const decision of f.decisions) {
    const row = rows.find((row) => row.id === decision.id)!;
    if (row.status !== "pending")
      throw new HttpError(409, "Phiên duyệt chứa thay đổi đã được xử lý.");
    const program = programs.get(`${row.event_date}:${row.service_number}`)!;
    if (
      program.initial.eventId !== decision.eventId ||
      program.initial.version !== decision.version
    )
      throw new HttpError(
        409,
        "Chương trình đã thay đổi trên máy chủ. Các quyết định trên thiết bị vẫn được giữ; tải lại để so sánh trước khi lưu.",
      );
    let result;
    try {
      result = applyWorshipReviewDecision(row, program.text, decision);
    } catch (error) {
      throw new HttpError(
        409,
        error instanceof Error ? error.message : "Thay đổi không còn hợp lệ.",
      );
    }
    program.text = result.text;
    program.approved ||= decision.action === "approve-change";
    row.change_reviews.push({
      changeIds: result.changeIds,
      action: decision.action,
      text: decision.changeText,
      reviewedBy: actor.id,
      reviewedAt: new Date().toISOString(),
      sessionId: f.requestId,
      sessionHash: hash,
    });
    const approved = row.change_reviews.some(
      (review: { action: string }) => review.action === "approve-change",
    );
    row.status = result.remaining
      ? "pending"
      : approved
        ? "merged"
        : "rejected";
  }
  const events = [];
  for (const program of programs.values()) {
    if (!program.approved) continue;
    const event = program.initial.eventId
      ? await calendarEvent(db, actor, program.initial.eventId)
      : null;
    const saved = await saveCalendarEvent(
      db,
      actor,
      {
        requestId: randomUUID(),
        eventDate: program.date,
        originalText: program.text,
        groupIds: event?.groupIds ?? [],
        ...(event
          ? { version: event.version }
          : { presetId: "worship-program" }),
      },
      event?.id,
    );
    events.push(saved);
    for (const row of rows)
      if (
        row.event_date === program.date &&
        row.service_number === program.service
      )
        row.merged_event_id = saved.id;
  }
  for (const row of rows) {
    await db.query(
      "UPDATE church.worship_contributions SET change_reviews=$2::jsonb,status=$3,reviewed_at=now(),reviewed_by=$4,merged_event_id=$5 WHERE id=$1",
      [
        row.id,
        JSON.stringify(row.change_reviews),
        row.status,
        actor.id,
        row.merged_event_id,
      ],
    );
    await audit(
      db,
      actor,
      actor.id,
      `Lưu phiên duyệt ${f.requestId} bản nháp thờ phượng ${row.id}`,
    );
  }
  return { saved: true, events };
}
