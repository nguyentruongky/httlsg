import { pushApi } from "../../../../lib/server/push-api";
export const runtime = "nodejs";
export const GET = (request: Request) => pushApi(request, "status");
