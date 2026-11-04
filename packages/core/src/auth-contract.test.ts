import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeIdentifier,
  PhoneOtpRequestSchema,
  EmailOtpRequestSchema,
  VerifyOtpSchema,
  SetPasswordSchema,
  LoginRequestSchema,
} from "./auth-contract";
test("email and Vietnamese/international phone login identifiers normalize consistently", () => {
  for (const value of [
    "0901 234 567",
    "(090)1234567",
    "84901234567",
    "+84 901-234-567",
  ])
    assert.equal(normalizeIdentifier(value), "+84901234567");
  assert.equal(
    normalizeIdentifier(" MEMBER@Example.com "),
    "member@example.com",
  );
  for (const value of ["wrong", "000", "member@", "+0123456789", "12345678"])
    assert.equal(normalizeIdentifier(value), null);
  assert.equal(
    LoginRequestSchema.parse({ identifier: "0901 234 567", password: "value" })
      .identifier,
    "+84901234567",
  );
  assert.equal(
    LoginRequestSchema.parse({ email: "member@example.com", password: "value" })
      .identifier,
    "member@example.com",
  );
});
test("onboarding payloads reject role injection and invalid identifiers or OTPs", () => {
  const phone = {
    phone: "0901234567",
    full_name: "Thành viên",
    department_id: "thanh-nien",
  };
  assert.equal(PhoneOtpRequestSchema.safeParse(phone).success, true);
  assert.equal(
    PhoneOtpRequestSchema.safeParse({ ...phone, role: "admin" }).success,
    false,
  );
  assert.equal(
    PhoneOtpRequestSchema.safeParse({ ...phone, phone: "member@example.com" })
      .success,
    false,
  );
  assert.equal(
    EmailOtpRequestSchema.safeParse({ email: "0901234567" }).success,
    false,
  );
  assert.equal(
    VerifyOtpSchema.safeParse({ identifier: "0901234567", otp_code: "012345" })
      .success,
    true,
  );
  assert.equal(
    VerifyOtpSchema.safeParse({ identifier: "0901234567", otp_code: "12345" })
      .success,
    false,
  );
});
test("password setup requires a strong matching confirmation", () => {
  assert.equal(
    SetPasswordSchema.safeParse({
      new_password: "short",
      confirm_password: "short",
    }).success,
    false,
  );
  assert.equal(
    SetPasswordSchema.safeParse({
      new_password: "Long-password-29!",
      confirm_password: "different",
    }).success,
    false,
  );
  assert.equal(
    SetPasswordSchema.safeParse({
      new_password: "Long-password-29!",
      confirm_password: "Long-password-29!",
    }).success,
    true,
  );
});
