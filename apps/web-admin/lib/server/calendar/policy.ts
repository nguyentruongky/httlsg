import { z } from "zod";
import { canCalendar, type AuthUser } from "@org/core";
import { HttpError } from "../http";
import { isAdministrativeRead } from "../session";

export function requireCalendar(
  actor: AuthUser,
  permission: Parameters<typeof canCalendar>[1] = "calendar.read",
) {
  if (!isAdministrativeRead(actor) && !canCalendar(actor, permission))
    throw new HttpError(403, "Bạn không có quyền sử dụng tính năng lịch này.");
}

export const calendarId = (id: string) => z.uuid().parse(id);
