import type { DB } from "./db";
import { issueOtp } from "./otp-code";
import { sendPhoneOtpAdminEmail } from "./mail";

// Called inside the issuance transaction: failed delivery rolls back the new
// code and invalidation of the previous code, allowing a safe retry.
export async function issuePhoneOtp(
  db: DB,
  account: { id: string; full_name: string },
  departmentId: string | null,
  phone: string,
) {
  const code = await issueOtp(
    db,
    account.id,
    "PHONE_LEADER",
    departmentId,
    phone,
  );
  await sendPhoneOtpAdminEmail(account.full_name, phone, code);
}
