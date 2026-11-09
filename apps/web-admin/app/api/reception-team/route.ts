import { scheduleApi } from "../../../lib/server/schedule-api";
import {
  receptionTeam,
  saveReceptionTeam,
} from "../../../lib/server/reception";
export const runtime = "nodejs";
export const GET = (request: Request) => scheduleApi(request, receptionTeam);
export const PUT = (request: Request) =>
  scheduleApi(request, saveReceptionTeam, true);
