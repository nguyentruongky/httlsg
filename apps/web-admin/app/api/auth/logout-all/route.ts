import { logoutSession } from "../../../../lib/server/persistent-session";
import { failure } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    return await logoutSession(request, true);
  } catch (error) {
    return failure(error);
  }
}
