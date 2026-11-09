import { scheduleApi } from "../../../lib/server/schedule-api";
import { myAssignments } from "../../../lib/server/my-assignments";
export const runtime = "nodejs";
export const GET = (request: Request) => scheduleApi(request, myAssignments);
