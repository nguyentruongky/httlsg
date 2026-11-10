import { withActor } from "../../../../lib/server/session";
import { requireOtpAdmin } from "../../../../lib/server/leader-access";
import { failure, json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return await withActor(request, async (_db, actor) => {
      requireOtpAdmin(actor);
      return json({ message: "Mã OTP chỉ tải lại khi chọn Làm mới." }, 410);
    });
  } catch (error) {
    return failure(error);
  }
}
