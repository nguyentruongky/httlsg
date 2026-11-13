import { measureRequest } from "../../../../lib/server/performance";
import { refreshSession } from "../../../../lib/server/persistent-session";
import { failure } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return measureRequest(request, async () => {
    try {
      return await refreshSession(request);
    } catch (error) {
      return failure(error);
    }
  });
}
