import { calendarApi } from "../../../../../../lib/server/calendar-api";
import { removeGroupEmail } from "../../../../../../lib/server/calendar";
import { z } from "zod";
export const runtime = "nodejs";
export const DELETE = (
  r: Request,
  c: { params: Promise<{ id: string; memberId: string }> },
) =>
  calendarApi(
    r,
    async (db, a, input) => {
      z.object({}).strict().parse(input);
      const p = await c.params;
      return removeGroupEmail(db, a, p.id, p.memberId);
    },
    true,
  );
