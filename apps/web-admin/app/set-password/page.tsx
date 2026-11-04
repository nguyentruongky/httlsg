import { redirect } from "next/navigation";
import { currentActor } from "../../lib/server/session";
import { HttpError } from "../../lib/server/http";
import { PasswordSetupPage } from "../../components/password-setup-page";
export const dynamic = "force-dynamic";
export default async function Page() {
  try {
    const user = await currentActor();
    if (!user.requiresPasswordSetup) redirect("/client");
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login");
    throw error;
  }
  return <PasswordSetupPage />;
}
