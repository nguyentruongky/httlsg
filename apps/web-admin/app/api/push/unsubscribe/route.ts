import { pushApi } from "../../../../lib/server/push-api";
export const runtime = "nodejs";
export const POST = (request: Request) => pushApi(request, "unsubscribe");
