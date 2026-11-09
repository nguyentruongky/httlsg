import { sendSchedulePushNow } from "../apps/web-admin/lib/server/schedule-notifications";
import { sendEventPushNow } from "../apps/web-admin/lib/server/push-delivery";
import { pool } from "../apps/web-admin/lib/server/db";
try {
  process.loadEnvFile("apps/web-admin/.env.local");
} catch {}
try {
  for (let i = 0; i < 20; i++) {
    const result = await sendEventPushNow();
    console.log("Push delivery:", result);
    const schedules = await sendSchedulePushNow();
    console.log("Schedule push delivery:", schedules);
    if (result.processed === 0 && schedules.processed === 0) break;
  }
} catch {
  console.error(
    "Push delivery failed; inspect database/configuration without logging subscription secrets.",
  );
  process.exitCode = 1;
} finally {
  await pool().end();
}
