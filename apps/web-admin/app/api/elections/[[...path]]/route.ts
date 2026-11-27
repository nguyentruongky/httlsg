import { electionApi } from "../../../../lib/server/election-api";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
const handler = async (request: Request, context: Context) =>
  electionApi(request, ["elections", ...((await context.params).path ?? [])]);
export const GET = handler;
export const POST = handler;
export const PUT = handler;
