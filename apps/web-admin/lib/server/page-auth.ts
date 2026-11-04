import { redirect } from "next/navigation";
import { currentActor } from "./session";
import { HttpError } from "./http";
export async function requirePageActor() {
  try {
    const actor = await currentActor();
    if (actor.requiresPasswordSetup) redirect("/set-password");
    return actor;
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login");
    throw error;
  }
}
