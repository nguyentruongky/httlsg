import { pool, transaction } from "../../../../lib/server/db";
import { assertOrigin, body, failure, json } from "../../../../lib/server/http";
import {
  publicWorship,
  submitWorship,
} from "../../../../lib/server/worship-contributions";
export const runtime = "nodejs";
export async function GET() {
  try {
    return json(await publicWorship(pool()));
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const input = await body(request, 200000);
    return json(await transaction((db) => submitWorship(db, input)));
  } catch (error) {
    return failure(error);
  }
}
