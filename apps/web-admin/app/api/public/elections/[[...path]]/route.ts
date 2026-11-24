import { publicElectionApi } from "../../../../../lib/server/public-election/api";
export const runtime = "nodejs";
type Context = { params: Promise<{ path?: string[] }> };
const handler = async (request: Request, context: Context) =>
  publicElectionApi(request, (await context.params).path ?? []);
export const GET = handler;
export const POST = handler;
