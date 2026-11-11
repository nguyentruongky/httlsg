import { z } from "zod";
import {
  assertOrigin,
  body,
  failure,
  HttpError,
  json,
} from "../../../../lib/server/http";
import { audit } from "../../../../lib/server/members";
import {
  currentChurchYear,
  reassignChoirMemberships,
} from "../../../../lib/server/choir-memberships";
import { withActor } from "../../../../lib/server/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    z.object({})
      .strict()
      .parse(await body(request));
    return await withActor(
      request,
      async (db, actor) => {
        if (actor.role !== "admin")
          throw new HttpError(403, "Chỉ Admin được cập nhật Ban hát lễ.");
        const year = currentChurchYear();
        const result = await reassignChoirMemberships(db, year);
        await audit(
          db,
          actor,
          actor.id,
          `Cập nhật Ban hát lễ năm ${year}: ${result.updatedMemberCount} thành viên`,
        );
        return json({ year, ...result });
      },
      true,
    );
  } catch (error) {
    return failure(error);
  }
}
