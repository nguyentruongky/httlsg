import { departments } from "@org/core";
import { withActor } from "../../../lib/server/session";
import { failure, json } from "../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(request, async () => json({ departments }));
  } catch (error) {
    return failure(error);
  }
}
