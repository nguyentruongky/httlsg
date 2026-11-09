import { scheduleApi } from "../../../lib/server/schedule-api";
import { myNotifications } from "../../../lib/server/my-notifications";

export const runtime = "nodejs";
export const GET = (request: Request) => scheduleApi(request, myNotifications);
