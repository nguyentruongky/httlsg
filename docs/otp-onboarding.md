# OTP onboarding, password setup, and department leaders

## User journey

The shared login screen starts with only **Số điện thoại hoặc email** and **Tiếp tục**. The server returns a rate-limited routing hint. Accounts with a password, including a temporary password, proceed to a password-only step. Unknown identifiers and pending accounts without a password proceed to OTP onboarding. The identifier is carried forward without asking the user to enter it again. For a new email, Continue sends the OTP and opens code entry; for a new phone, the next step asks for name and Ban ngành.

- **Phone:** enter a phone number, full name, and Ban ngành. The server creates a pending login account or safely matches an uncredentialed member, then stores a six-digit `PHONE_LEADER` OTP for 24 hours. The response never contains the code. The page instructs the user to contact their department leader and provides an OTP entry field.
- **Email:** enter an email address. The server creates a six-digit `EMAIL` OTP for ten minutes and sends it through SMTP. The response is generic and contains no code. Users enter the code on the next screen.
- **Verification:** a new account receives an HttpOnly, 15-minute password-setup cookie and `requires_password_setup: true`. It cannot read members, catalogs, dashboards, or leader OTPs. Both the UI and APIs enforce this restriction.
- **Password setup:** `/set-password` requires matching passwords of at least 12 characters. On success, the server stores an Argon2id hash, sets `is_password_set = true`, revokes all previous sessions and pending OTPs, increments the credential version, and issues a new eight-hour application cookie. The user continues to `/client`.
- **Returning users:** sign in with the unique phone/email identifier and permanent password. Email OTP can also authenticate an already-established account; it does not silently reset that account's password.

Admin-issued passwords from account creation or **Thông tin đăng nhập** are temporary for 24 hours and also grant only the setup session. Reusing the temporary password as the permanent password is rejected. Public phone requests never reset an established account or move it to another department.

## PostgreSQL migration

Run `npm run db:migrate`. It applies `001_church.sql` to a fresh database and then `002_otp_onboarding.sql`. On an existing installation, it applies the second migration once. The migration is already applied to this workspace's prepared local database.

The second migration separates two different concepts:

- `church.member_profiles` contains all directory records, including imported people with missing or shared contact details. Existing UUIDs, families, departments, source fields, notes, and visits are preserved.
- `church.users` contains login accounts, linked to profiles by the same UUID. It enforces unique nullable email and canonical phone identifiers, with at least one required. It holds `password_hash`, `is_password_set`, `must_reset_password`, temporary-password expiry, `auth_version`, role, and a primary `department_id`.

No placeholder email/phone is invented for imported records. Phone formats such as `0901 234 567` and `+84 901 234 567` normalize to the same identifier. Many-to-many `department_members` still represent ordinary Ban ngành membership; the primary account department routes phone enrollment and OTPs.

For an imported phone contact, public enrollment matches the name and existing department membership and refuses ambiguous or privileged-profile matches. The leader must verify the person's identity before verbally sharing a code. An anonymous request cannot rename a known person, choose a different scope for an existing account, or set an application role.

Public email self-registration creates a separate, self-only profile unless a login account has already been explicitly provisioned for that email. Editable profile contact fields are **not** authentication authority: changing another member's descriptive email must not let someone claim that member's profile or family permissions. Administrators should provision a matching login on an existing imported profile through **Thông tin đăng nhập** when enrollment should use that record. Editing a contact field does not change existing login identifiers.

The `permissions` table now has stable `id`, unique `code`, and human-readable `name` fields. `role_permissions` is editable through the guarded admin API. `department_leaders` explicitly binds one account to one department; several leaders may serve the same department. The `leader` role is displayed as **Trưởng Ban ngành**. It is separate from Ban điều hành and ordinary membership.

`church.otps` stores a keyed HMAC in `otp_code`, type, user, department snapshot, creation/expiry times, attempts, and consumption state. Only phone OTPs have authenticated ciphertext for the authorized leader display. Email codes are never stored in retrievable form. Every new code invalidates the previous code of that type. Verification consumes a code atomically; five failures consume it as well. OTP issue requests allow three attempts per identifier per 15 minutes; verification allows ten. Failed verification attempts are committed, preventing transaction rollback from resetting counters.

## SMTP configuration

Configure these server-only values in the ignored `apps/web-admin/.env.local`:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-sender-address
SMTP_PASS=your-provider-app-password
SMTP_FROM=your-sender-address
```

Gmail is the default host if none is supplied. Use the provider's app password or SMTP credential where required. Port 465 uses TLS from connection start; other ports require STARTTLS. Certificate verification stays enabled. `SMTP_FROM` defaults to `SMTP_USER` when empty.

Generate a separate 32-byte base64 `OTP_SECRET` with the same random-key command used for `SESSION_SECRET`. The local setup has already generated it. It derives independent verification/encryption keys so a database-only leak cannot brute-force the six-digit HMACs or read leader code ciphertexts.

`node --import tsx scripts/verify-smtp.ts` checks connectivity and authentication without sending an email or printing credentials. This check passed for the credentials configured during implementation.

When SMTP credentials are present, SMTP is used even if the development outbox flag remains set. Without SMTP, `EMAIL_DELIVERY_MODE=file` is permitted only outside production and writes owner-readable messages under `.local-data/mail-outbox` (or `OTP_OUTBOX_DIR`). That directory is ignored and has no public HTTP endpoint. Production without SMTP returns a configuration error; it never silently reports a real email as sent through the local outbox.

## Leader console

`/dashboard/leader-otp` is accessible from the profile tab only for an explicitly assigned leader with the `leader.otps.read` permission. The corresponding `/api/leader/otps` independently verifies the session, setup state, permission, and live leader mapping. An Admin/Thư ký account without a leader assignment does not get this console by virtue of its administrative role.

Only unused, unexpired `PHONE_LEADER` OTPs whose department snapshot and current account department both match the leader's department are returned. Results are paginated, refresh periodically, and show the member name, phone, code, and expiry date. Email OTPs, used codes, expired codes, established-account requests, and other departments are excluded. Sensitive query data is discarded on unmount/logout and responses are `no-store`.

Leader directory access is also limited to the assigned department plus the leader's own profile. Nested family responses exclude relatives outside the leader's readable scope, and direct access to those profiles returns 404.

## Admin role and leader console

Admin and Thư ký open `/dashboard/admin/permissions` from **Phân quyền**:

1. Select a member and role.
2. For **Trưởng Ban ngành**, select the exact Ban ngành. The member must have a login account; provision credentials on the directory row first if necessary.
3. Save. The server updates the profile/account role, primary department, explicit leader mapping, and department membership, then revokes existing sessions and pending OTPs.
4. Adjust registered permission checkboxes for other roles. Changes invalidate sessions and outstanding OTPs for the affected role.

The admin APIs require both the administrative role and management permission. Admin and Thư ký retain identical full permissions and cannot remove their own access. Dynamic permission choices respect the role's scope: Chấp sự remains read-only, User stays within self/family, Ban điều hành stays within managed-department edits, and Leader stays within the assigned department. Role changes and department deletion revoke affected sessions; removing a department also removes its pending phone OTPs.

## API contract

| Endpoint                           | Access and request                                                                                                           |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/identify`          | Public; `{ identifier }`; returns only `next: password` or `next: otp`, limited to ten lookups per identifier per 15 minutes |
| `GET /api/auth/access-options`     | Public department IDs/names only, no member data                                                                             |
| `POST /api/auth/request-phone-otp` | Public; `{ phone, full_name, department_id }`                                                                                |
| `POST /api/auth/request-email-otp` | Public; `{ email }`                                                                                                          |
| `POST /api/auth/verify-otp`        | Public; `{ identifier, otp_code }`; sets restricted/full cookie and returns `requires_password_setup`                        |
| `POST /api/auth/set-password`      | Setup cookie only; `{ new_password, confirm_password }`; rotates to full cookie                                              |
| `POST /api/auth/login`             | `{ identifier, password }`; the old `{ email, password }` body remains compatible                                            |
| `GET /api/auth/me`                 | Also permitted for setup sessions; returns setup state and no effective permissions until setup completes                    |
| `GET /api/leader/otps?page=1`      | Assigned leader only; scope cannot be chosen through a query parameter                                                       |
| `GET /api/admin/roles`             | Admin/Thư ký; roles, registered permissions, department/user assignment choices                                              |
| `POST /api/admin/roles`            | Admin/Thư ký; assign-user or update-role-permissions action                                                                  |

The temporary token is returned through an HttpOnly cookie, not a JavaScript-readable response token. API callers should retain/send cookies. Unsafe endpoints check the allowlisted Origin and JSON input. OTP request responses are generic. The identifier-first routing hint intentionally distinguishes password-ready accounts from onboarding accounts, as required by the login flow; it returns no names, roles, account status, or profile data. Aggregate/IP throttling should also be enforced at the gateway.

## Session renewal and replay protection

Encrypted session claims and session rows now include purpose (`password_setup` or `access`) and the credential version. Every request checks encryption/expiry, stored token digest, revocation, current credential version, enabled account, and purpose. Setup tokens are accepted only by the setup/profile-status/logout path, regardless of the user's eventual application role. Password setup consumes outstanding OTPs and revokes all prior sessions before issuing a fresh full-purpose cookie. Old setup tokens cannot be replayed after completion, and a credential-version mismatch invalidates a token even if a session row was not explicitly revoked. The browser clears cached private data when the authenticated identity or credential version changes; delayed 401 responses from an older token cannot expire the newly rotated session.

This follows the session-regeneration and limited-session principles described in [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). The email flow is account authentication/onboarding, not an unauthenticated password-reset endpoint.

## Validation

The PostgreSQL tests cover both channels, first-time and returning users, stored-code protection, expiry, replay, resend, committed attempt counters, rate limits, setup-only access, cookie replacement, credential versions, SMTP selection, leader scope/reassignment, dynamic permission boundaries, contact-claim prevention, and department removal. UI tests cover the custom department selector, leader instructions, forced setup, confirmation errors, and email requests. SMTP transport behavior is tested without sending real emails; the live provider connection/authentication was separately verified.

Use `npm test`, `npm run test:backend`, `npm run typecheck`, and `npm run build`. The isolated backend runner clears SMTP credentials and writes email test messages only inside its temporary directory. The live smoke script uses the local administrator and does not send emails or modify member records.
