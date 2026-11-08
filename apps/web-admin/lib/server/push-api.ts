import { withActor } from "./session";
import { assertOrigin, body, failure, json } from "./http";
import {
  subscribePush,
  unsubscribePush,
  pushStatus,
} from "./push-subscriptions";
import { testOwnPush } from "./push-delivery";
import { rateLimit } from "./limits";
export async function pushApi(
  request: Request,
  action: "subscribe" | "unsubscribe" | "status" | "test",
) {
  try {
    if (action !== "status") assertOrigin(request);
    const input =
      action === "status"
        ? Object.fromEntries(new URL(request.url).searchParams)
        : action === "test"
          ? null
          : await body(request, 8192);
    const result = await withActor(
      request,
      async (db, actor) => {
        if (action === "subscribe")
          return subscribePush(db, actor, request, input);
        if (action === "unsubscribe") return unsubscribePush(db, actor, input);
        if (action === "status") return pushStatus(db, actor, input);
        await rateLimit("push-test:" + actor.id, 5);
        return { userId: actor.id };
      },
      action !== "status",
    );
    return json(
      action === "test"
        ? await testOwnPush((result as { userId: string }).userId)
        : result,
    );
  } catch (error) {
    return failure(error);
  }
}
