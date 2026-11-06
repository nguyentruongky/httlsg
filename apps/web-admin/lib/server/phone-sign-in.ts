import { findAccountIdentity, ensureProfileAccount } from "./account-lookup";
import { transaction } from "./db";
import { issuePhoneOtp } from "./phone-otp-delivery";
import { rateLimit } from "./limits";
// Existing accounts keep their identity, department and password; only a code is issued.
export async function requestPhoneSignIn(phone: string) {
  await rateLimit(`otp-request:${phone}`, 3);
  return transaction(async (db) => {
    await db.query("SELECT pg_advisory_xact_lock(74298331)");
    const identity = await findAccountIdentity(db, phone);
    if (!identity) return null;
    const account = await ensureProfileAccount(db, identity, phone);
    if (
      account.enabled &&
      !account.deleted_at &&
      identity.profile.enabled &&
      !identity.profile.deleted_at
    )
      await issuePhoneOtp(
        db,
        { id: account.id, full_name: identity.profile.full_name },
        account.department_id,
        phone,
      );
    return "Yêu cầu đã được ghi nhận. Vui lòng liên hệ Admin để nhận mã OTP. Mã có hiệu lực trong 24 giờ.";
  });
}
