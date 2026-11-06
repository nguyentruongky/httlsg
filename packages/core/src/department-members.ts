import { z } from "zod";
import { ChurchStatusSchema } from "./schemas";
export const DEPARTMENT_BULK_LIMIT = 100;
const memberIds = z
  .array(z.uuid())
  .min(1)
  .max(DEPARTMENT_BULK_LIMIT)
  .refine(
    (ids) => new Set(ids.map((id) => id.toLowerCase())).size === ids.length,
    "Thành viên bị trùng.",
  );
export const DepartmentMembershipBulkInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), memberIds }).strict(),
  z.object({ action: z.literal("remove"), memberIds }).strict(),
  z
    .object({
      action: z.literal("status"),
      memberIds,
      status: ChurchStatusSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal("move"),
      memberIds,
      targetDepartmentId: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .max(100),
    })
    .strict(),
]);
