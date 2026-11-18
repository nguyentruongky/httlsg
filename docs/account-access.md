# Account access

Sign in with a phone number or email and a password. Credential identifiers take precedence; a unique profile contact can also resolve to an existing account. Ambiguous contacts require Admin resolution.

Members without a password, or who have forgotten it, contact Admin or Thư ký. Authorized staff issue a temporary password through the existing member credential action (`POST /api/admin/users/[id]/credentials`). It expires after 24 hours and requires choosing a permanent password before accessing the app. There is no public self-registration or automated password-recovery flow.

Existing passwords and persistent sessions remain valid. Password changes, account suspension and explicit revocation retain their existing security behavior. See [persistent login](persistent-login.md).

Migration `036_remove_otp.sql` removes the OTP table and its data, notification function, account flag, and permission grants. The OTP APIs, consoles, delivery code and secret configuration have been removed. Historical migrations remain in sequence for reproducible upgrades; fresh databases apply all migrations through 036.

SMTP and the generic `MAIL_OUTBOX_DIR` configuration remain available for calendar email. They are not required for password login.
