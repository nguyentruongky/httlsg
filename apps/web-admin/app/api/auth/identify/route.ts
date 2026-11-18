import { z } from "zod";
import { IdentifierSchema } from "@org/core";
import { rateLimit } from "../../../../lib/server/limits";
import { assertOrigin, body, failure, json } from "../../../../lib/server/http";
import { measureRequest } from "../../../../lib/server/performance";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return measureRequest(request, async () => {
    try {
      assertOrigin(request);
      const { identifier } = z
        .object({ identifier: IdentifierSchema })
        .strict()
        .parse(await body(request));
      await rateLimit(`identify:${identifier}`, 10);
      return json({ next: "password" });
    } catch (error) {
      return failure(error);
    }
  });
}
