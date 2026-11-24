import { z } from "zod";
import {
  WORSHIP_WORKER_CATEGORIES,
  normalizeWorshipWorkerText,
  worshipWorkerCategorySearchTerms,
  type WorshipWorkerCategory,
  type WorshipWorker,
  type AuthUser,
} from "@org/core";
import type { DB } from "../db";
import { requireCalendar } from "./policy";

export async function mentionSuggestions(
  db: DB,
  actor: AuthUser,
  input: unknown,
) {
  requireCalendar(actor, "calendar.read");
  const { query, category } = z
    .object({
      query: z
        .string()
        .trim()
        .max(200)
        .default("")
        .transform(normalizeWorshipWorkerText),
      category: z
        .union([
          z.enum(
            Object.keys(WORSHIP_WORKER_CATEGORIES) as [
              WorshipWorkerCategory,
              ...WorshipWorkerCategory[],
            ],
          ),
          z.literal("ban_hat"),
          z.literal(""),
        ])
        .default(""),
    })
    .strict()
    .parse(input);
  const items = (
    await db.query<WorshipWorker>(
      `SELECT id,category,full_name AS "fullName",phone,email,role_label AS "roleLabel"
     FROM church.worship_service_workers
     WHERE is_active AND ($1='' OR category=$1 OR ($1='ban_hat' AND category LIKE 'ban_hat_%'))
       AND ($2='' OR strpos(public.unaccent(lower(normalize(concat_ws(' ',role_label,full_name,phone,($3::jsonb ->> category)), NFC))),public.unaccent(lower($2)))>0)
     ORDER BY category,full_name,id`,
      [
        category,
        query,
        JSON.stringify(
          Object.fromEntries(
            (
              Object.keys(WORSHIP_WORKER_CATEGORIES) as WorshipWorkerCategory[]
            ).map((key) => [
              key,
              worshipWorkerCategorySearchTerms(key).join(" "),
            ]),
          ),
        ),
      ],
    )
  ).rows;
  return { items };
}

export async function mentionCategories(db: DB, actor: AuthUser) {
  requireCalendar(actor, "calendar.read");
  const rows = (
    await db.query<{ category: WorshipWorkerCategory; count: number }>(
      "SELECT category,count(*)::int AS count FROM church.worship_service_workers WHERE is_active GROUP BY category",
    )
  ).rows;
  return {
    items: Object.entries(WORSHIP_WORKER_CATEGORIES).map(
      ([category, label]) => ({
        category,
        label,
        count: rows.find((row) => row.category === category)?.count ?? 0,
      }),
    ),
  };
}
