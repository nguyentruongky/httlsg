import { HttpError } from "../../../../lib/server/http";
import { scheduleApi } from "../../../../lib/server/schedule-api";
import {
  saveSchedule,
  transitionSchedule,
} from "../../../../lib/server/schedules";
export const runtime = "nodejs";
export const POST = (request: Request) =>
  scheduleApi(
    request,
    async (db, actor, input) => {
      const saved = await saveSchedule(db, actor, input);
      if (saved.status === "cancelled")
        throw new HttpError(409, "Lịch này đã bị hủy. Vui lòng tạo lịch mới.");
      return transitionSchedule(
        db,
        actor,
        saved.id,
        { version: saved.version },
        "publish",
      );
    },
    true,
    true,
  );
