import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { processCalendarOutbox } from "../apps/web-admin/lib/server/calendar-delivery";
import { pool } from "../apps/web-admin/lib/server/db";
async function main() {
  try {
    await access("apps/web-admin/.env.local");
    process.loadEnvFile("apps/web-admin/.env.local");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  process.env.OTP_OUTBOX_DIR ??= resolve(".local-data/mail-outbox");
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((arg) => !/^--limit=\d+$/.test(arg)))
    throw new Error("Use --limit=1..100");
  const limit = Number(args[0]?.split("=")[1] ?? 25);
  console.log("Calendar delivery summary:", await processCalendarOutbox(limit));
}
void main()
  .catch(() => {
    console.error(
      "Calendar delivery failed; inspect private infrastructure logs without exposing credentials.",
    );
    process.exitCode = 1;
  })
  .finally(() => pool().end());
