import { z } from "zod";
import { withActor } from "../../../../lib/server/session";
import { listLeaderOtps } from "../../../../lib/server/otp";
import { failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .max(10000)
      .parse(new URL(request.url).searchParams.get("page") ?? 1);
    return await withActor(request, async (db, actor) =>
      json(await listLeaderOtps(db, actor, page)),
    );
  } catch (error) {
    return failure(error);
  }
}
