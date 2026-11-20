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
  type AuthUser,
  type PushMessage,
} from "@org/core";
import type { DB } from "./db";
import { pool } from "./db";
import { HttpError } from "./http";
import {
  calendarEvent,
  lockCalendarReviewEvents,
  requireCalendar,
  saveCalendarEvent,
} from "./calendar";
import { audit } from "./members";
import { deliverMail } from "./mail";
import { escapeEventHtml } from "./calendar-delivery";
import { WORSHIP_INFORMATION_RECIPIENT } from "./worship-constants";
import { pushConfig } from "./push-config";
import { sendPush } from "./push-delivery";
import { LIVE_PUSH } from "./push-subscriptions";

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
  return slotFromRows(rows, date, service);
}
type WorshipEventRow = {
  id: string;
  original_text: string;
  version: number;
  preset_id: string | null;
  title?: string;
};
function slotFromRows(
  rows: WorshipEventRow[],
  date: string,
  service: number,
) {
  // Keep the same event order as the public list when resolving submissions.
  const event = rows[service - 1];
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
  const today = todayInChurch();
  const dates: string[] = [];
  for (let offset = 0; offset <= 60; offset += 1) {
    dates.push(addCalendarDays(today, offset));
  }
  const rows = (
    await db.query(
      "SELECT event_date,id,title,original_text,version,preset_id FROM church.events WHERE event_date = ANY($1::date[]) AND deleted_at IS NULL ORDER BY event_date,created_at,id",
      [dates],
    )
  ).rows;
  const byDate = new Map<string, WorshipEventRow[]>();
  for (const row of rows) {
    const list = byDate.get(row.event_date) ?? [];
    list.push(row);
    byDate.set(row.event_date, list);
  }
  const result = [];
  for (const date of dates) {
    const items = (byDate.get(date) ?? []).map((row, index) => ({
      service: index + 1,
      title: row.title,
      eventId: row.id,
      version: row.version,
      originalText: row.original_text,
    }));
    if (items.length) result.push({ date, items });
  }
  return { dates: result };
}
const Submission = z
  .object({
    requestId: z.uuid(),
    date: z.string(),
    service: z.number().int().min(1),
    eventId: z.uuid().nullable(),
    version: z.number().int().nullable(),
    originalText: z.string().trim().min(1).max(50000),
    name: z.string().trim().max(120).default(""),
  })
  .strict();
/** The event dialog is another UI for the public worship contribution flow. */
export async function submitEventWorshipContribution(db: DB, input: unknown) {
  const f = Submission.omit({ date: true, service: true, name: true })
    .extend({
      eventDate: z.string(),
      contributorName: z.string().trim().max(120).default(""),
      groupIds: z.array(z.uuid()).optional(),
      presetId: z.string().optional(),
    })
    .parse(input);
  if (!f.eventId)
    throw new HttpError(400, "Vui lòng chọn chương trình để bổ sung thông tin.");
  const rows = (
    await db.query(
      "SELECT id FROM church.events WHERE event_date=$1 AND deleted_at IS NULL ORDER BY created_at,id",
      [f.eventDate],
    )
  ).rows;
  const index = rows.findIndex((row) => row.id === f.eventId);
  if (index < 0) throw new HttpError(404, "Không tìm thấy chương trình.");
  return submitWorship(db, {
    requestId: f.requestId,
    date: f.eventDate,
    service: index + 1,
    eventId: f.eventId,
    version: f.version,
    originalText: f.originalText,
    name: f.contributorName,
  });
}
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
  const current = await slot(db, f.date, f.service);
  if (
    f.eventId !== null &&
    (current.eventId !== f.eventId || current.version !== f.version)
  )
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
  if (worshipContributionNotifyEnabled()) {
    void notifyNewWorshipContribution({
      requestId: f.requestId,
      date: f.date,
      service: f.service,
      eventId: f.eventId ?? null,
      version: f.version ?? null,
      baseText: current.originalText,
      proposedText: f.originalText,
      contributorName: f.name,
    });
  }
  return { saved: true };
}
function worshipContributionNotifyEnabled() {
  return process.env.WORSHIP_CONTRIBUTION_NOTIFY_ENABLED !== "false";
}
async function notifyNewWorshipContribution(input: {
  requestId: string;
  date: string;
  service: number;
  eventId: string | null;
  version: number | null;
  baseText: string;
  proposedText: string;
  contributorName: string;
}) {
  const subject = `Bản nháp chương trình mới · ${input.date} · Lễ ${input.service}`;
  const from =
    process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "local@church.test";
  const text = [
    `Có bản nháp chương trình mới chờ duyệt.`,
    `Ngày: ${input.date}`,
    `Lễ: ${input.service}`,
    `Người đóng góp: ${input.contributorName || "(không ghi tên)"}`,
    `Mã sự kiện: ${input.eventId ?? "(mới)"}`,
    `Phiên bản: ${input.version ?? "(mới)"}`,
    "",
    "--- Nội dung gốc (mẫu) ---",
    input.baseText,
    "",
    "--- Nội dung đóng góp ---",
    input.proposedText,
    "",
    "Xem và duyệt tại trang Duyệt bản nháp.",
  ].join("\n");
  const html = [
    `<p>Có bản nháp chương trình mới chờ duyệt.</p>`,
    `<ul>`,
    `<li><strong>Ngày:</strong> ${escapeEventHtml(input.date)}</li>`,
    `<li><strong>Lễ:</strong> ${escapeEventHtml(String(input.service))}</li>`,
    `<li><strong>Người đóng góp:</strong> ${escapeEventHtml(
      input.contributorName || "(không ghi tên)",
    )}</li>`,
    `<li><strong>Mã sự kiện:</strong> ${escapeEventHtml(
      String(input.eventId ?? "(mới)"),
    )}</li>`,
    `<li><strong>Phiên bản:</strong> ${escapeEventHtml(String(input.version ?? "(mới)"))}</li>`,
    `</ul>`,
    `<p><strong>Nội dung gốc (mẫu):</strong></p><div style="white-space:pre-wrap">${escapeEventHtml(input.baseText)}</div>`,
    `<p><strong>Nội dung đóng góp:</strong></p><div style="white-space:pre-wrap">${escapeEventHtml(input.proposedText)}</div>`,
    `${reviewLinkHtml(input)}`,
  ].join("");
  const recipients = new Set<string>();
  recipients.add(WORSHIP_INFORMATION_RECIPIENT);
  try {
    const groupEmails = (
      await pool().query(
        "SELECT DISTINCT m.email FROM church.email_group_members m JOIN church.email_groups g ON g.id=m.group_id WHERE g.deleted_at IS NULL",
      )
    ).rows as { email: string }[];
    for (const row of groupEmails) recipients.add(row.email);
  } catch {}
  const recipientList = Array.from(recipients);
  await Promise.allSettled(
    recipientList.map((to) =>
      deliverMail({
        to,
        from,
        subject,
        text,
        html,
        messageId: `<worship-contribution-${input.requestId}-${Buffer.from(to).toString("hex")}@church.local>`,
      }).catch(() => {}),
    ),
  );
  const config = pushConfig();
  if (config) {
    try {
      const subs = (
        await pool().query(
          `SELECT s.id,s.subscription_ciphertext FROM church.push_subscriptions s JOIN church.users u ON u.id=s.user_id WHERE ${LIVE_PUSH}`,
        )
      ).rows as { subscription_ciphertext: string }[];
      await Promise.allSettled(
        subs.map(async (row) => {
          const payload: PushMessage = {
            title: "Thông báo chương trình mới",
            body: `Có bản nháp chương trình mới vào ${input.date} (Lễ ${input.service}) chờ duyệt.`,
            url: "/client/events",
            tag: `worship-contribution:${input.requestId}`,
            type: "event",
            referenceId: input.requestId,
          };
          await sendPush(row.subscription_ciphertext, payload).catch(() => {});
        }),
      );
    } catch {}
  }
}
function reviewLinkHtml(input: {
  date: string;
  service: number;
}) {
  const origin =
    process.env.APP_ORIGIN ?? "http://localhost:3000";
  try {
    const o = new URL(origin);
    if (!["http:", "https:"].includes(o.protocol)) throw new Error("bad");
    return `<p><a href="${escapeEventHtml(o.origin)}/worship-review">Xem và duyệt bản nháp</a></p>`;
  } catch {
    return `<p>Xem và duyệt tại trang Duyệt bản nháp.</p>`;
  }
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
  if (!rows.length) return { items: [] };
  const events = (
    await db.query(
      "SELECT event_date,id,original_text,version,preset_id FROM church.events WHERE event_date=ANY($1::date[]) AND deleted_at IS NULL ORDER BY event_date,created_at,id",
      [[...new Set(rows.map((row) => row.event_date))]],
    )
  ).rows;
  const byDate = new Map<string, WorshipEventRow[]>();
  for (const event of events) {
    const day = byDate.get(event.event_date) ?? [];
    day.push(event);
    byDate.set(event.event_date, day);
  }
  return {
    items: rows.map((row) => ({
      ...row,
      current: slotFromRows(byDate.get(row.event_date) ?? [], row.event_date, row.service_number),
    })),
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
    "SELECT pg_advisory_xact_lock(hashtext('worship-review'))",
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
    "SELECT pg_advisory_xact_lock(hashtext('worship-review'))",
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
  const lockedEvents = await lockCalendarReviewEvents(
    db,
    actor,
    [...new Set(rows.map((row) => row.event_date))],
  );
  const eventsByDate = new Map<string, typeof lockedEvents>();
  const eventsById = new Map(lockedEvents.map((event) => [event.id, event]));
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  for (const event of lockedEvents) {
    const day = eventsByDate.get(event.eventDate) ?? [];
    day.push(event);
    eventsByDate.set(event.eventDate, day);
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
      const event = eventsByDate.get(row.event_date)?.[row.service_number - 1];
      const initial = event
        ? {
            service: row.service_number,
            eventId: event.id,
            version: event.version,
            originalText: event.originalText,
          }
        : slotFromRows([], row.event_date, row.service_number);
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
    const row = rowsById.get(decision.id)!;
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
    if (program.initial.eventId && program.text === program.initial.originalText) {
      for (const row of rows)
        if (
          row.event_date === program.date &&
          row.service_number === program.service
        )
          row.merged_event_id = program.initial.eventId;
      continue;
    }
    const event = program.initial.eventId
      ? eventsById.get(program.initial.eventId)!
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
      event ?? undefined,
    );
    events.push(saved);
    for (const row of rows)
      if (
        row.event_date === program.date &&
        row.service_number === program.service
      )
        row.merged_event_id = saved.id;
  }
  // Persist all review decisions and their audit entries in one round trip.
  await db.query(
    `WITH changes AS (
      SELECT * FROM jsonb_to_recordset($1::jsonb)
        AS x(id uuid, change_reviews jsonb, status text, merged_event_id uuid, action text)
    ), updated AS (
      UPDATE church.worship_contributions c
      SET change_reviews=x.change_reviews,status=x.status,reviewed_at=now(),
          reviewed_by=$2,merged_event_id=x.merged_event_id
      FROM changes x WHERE c.id=x.id RETURNING c.id
    )
    INSERT INTO church.audit_log(actor_id,subject_id,action)
      SELECT $2,$2,x.action FROM changes x JOIN updated u ON u.id=x.id`,
    [
      JSON.stringify(rows.map((row) => ({
        id: row.id,
        change_reviews: row.change_reviews,
        status: row.status,
        merged_event_id: row.merged_event_id ?? null,
        action: `Lưu phiên duyệt ${f.requestId} bản nháp thờ phượng ${row.id}`,
      }))),
      actor.id,
    ],
  );
  return { saved: true, events };
}
