import { departments } from "@org/core";
import { json } from "../../../../lib/server/http";
export const runtime = "nodejs";
export async function GET() {
  return json({ departments });
}
