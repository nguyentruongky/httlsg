> **Persistent authentication:** Access tokens now last 15 minutes and remain in memory. Rotating HttpOnly refresh cookies restore sessions until database revocation. See [persistent login](persistent-login.md) for endpoints, browser limits, replay policy, SQL and client examples. This supersedes older access-cookie/8-hour-session descriptions.

> **Phone OTP email notification:** Every successful phone sign-in or first-time phone OTP request generates a new code for the matched profile and emails it to the configured Admin recipient, `nguyentruongky33@gmail.com`, using the existing SMTP settings. The email includes the member name, requested phone, and 24-hour expiry. The same encrypted code remains available in Admin's valid-only OTP list. Resending invalidates the previous code. Email delivery failure rolls back issuance and preserves any previous valid code. Local tests use the private outbox or mocked SMTP. Email-alias verification remains Admin-only without automatic notification to the profile email.

> **Profile contact sign-in:** Both credential identifiers and unique email/normalized-phone contacts on `member_profiles` resolve to the existing profile ID. Known profiles without credentials are provisioned on that same ID, preserving their name, role, departments, and family links. Email aliases on password-ready accounts use the existing password; phone contacts request an Admin-delivered OTP. Email contacts without verified credential ownership also require an Admin-delivered OTP, never an automatic email to an editable profile address. Admin must verify the member before sharing a code. Unknown email registration retains email delivery. OTPs record the requested identifier, so aliases verify correctly and Admin sees the requested contact. Canonical credential ownership takes precedence; ambiguous contacts or contacts owned by another account require Admin resolution/merge. Apply `008_profile_login_identifiers.sql`. No automatic profile merge occurs. These rules supersede older account-claim descriptions below.

> **Current phone sign-in and valid-only OTP policy:** Continuing with a registered phone number at `/login` now issues a fresh six-digit OTP and opens verification directly. Admin supplies the code. Returning users receive a full session after verification without changing their stored password or department; accounts without a permanent password still complete password setup. Unknown phone numbers continue through name/Ban ngành registration first. Phone/password requests to `/api/auth/login` are rejected; email/password sign-in remains available. OTP requests are rate-limited and resending invalidates the prior code. The Admin overview now returns only pending, unexpired, unused codes for enabled accounts, including accounts without departments. Used, locked, expired, and invalidated records are excluded even if an older caller requests history. Live notifications remove consumed codes, with polling fallback and client-side expiry hiding. Apply `007_phone_sign_in_otp.sql` for department-free phone sign-in and notifications. Older historical-OTP descriptions below are superseded.

> **Admin OTP overview:** Admin now has a **Mã OTP** dashboard navigation/command-menu entry at `/dashboard/otps`. `/api/admin/otps` lists all stored phone and email OTP requests across departments, including pending, used/invalidated, expired, and unavailable records, with search, channel/status filters, and pagination. Only currently valid phone codes are decrypted for display; email codes remain one-way hashed and inactive codes are never returned. Data is refreshed every five seconds and discarded on unmount. `/dashboard/leader-otp` redirects Admin to the new page. Non-Admin accounts remain denied; Profile OTP entries remain hidden. This supersedes the older statement that every OTP navigation entry is hidden.

> **Confidential member history:** Notes and visit history are hidden on the authenticated person's own profile for every role. User-only and read-only Chấp sự accounts cannot read or add these records on any profile. Authorized leaders and managers (including existing Admin/Thư ký management access) may read records for other members within their profile access scope and add records only where they have edit permission. API responses redact notes, visits, last-visit dates, and imported last-visit metadata; direct self-write requests return 403. This overrides the older note-only policy below.

> **Team directory navigation:** Ban điều hành and Trưởng ban ngành role sections are hidden in Profile. Their Danh sách tab immediately loads only explicitly assigned team members, including the union of both roles' departments. Search, pagination, totals, option lookups, and direct member routes enforce this scope on the server. `/api/members/filters` supplies related departments, areas, and locations. Admin/Thư ký retain explicit global administration; User-only profile navigation and the temporary Admin-only OTP restriction remain in effect. The older role-section descriptions below are superseded by this navigation policy.

> **Temporary OTP access policy:** OTP navigation entries are hidden for every role. Only an authenticated **Admin** with a completed password setup can directly open `/dashboard/leader-otp` or the client OTP screen, retrieve pending codes, or subscribe to OTP events. Admin access covers all departments without requiring a department assignment. This hard gate overrides the configurable OTP permission grants for Thư ký, Ban điều hành, and Trưởng ban ngành. Phone/email request and OTP verification endpoints remain available for authentication. Department-role OTP capabilities described below are temporarily suspended.

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

The `permissions` table now has stable `id`, unique `code`, and human-readable `name` fields. `role_permissions` is editable through the guarded admin API. `department_leaders` explicitly binds accounts to departments; a leader may serve several departments, and several leaders may serve the same department. The `leader` role is displayed as **Trưởng Ban ngành**. It is separate from Ban điều hành and ordinary membership.

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

The client profile includes a **Vai trò trưởng Ban ngành** card only for users holding a leader role, including a secondary leader role. It links to `/client#/leader/otps` and `/client#/leader/members`, gated by the corresponding permissions. The older `/dashboard/leader-otp` URL remains supported for explicitly assigned leaders with `leader.otps.read`. The corresponding `/api/leader/otps` independently verifies the session, setup state, permission, and live leader mapping. An Admin/Thư ký account without an explicit Leader or Ban điều hành assignment does not get this console by virtue of its administrative role.

Only unused, unexpired `PHONE_LEADER` OTPs whose department snapshot and current account department both match the leader's department are returned. The client loads paginated results as you scroll and refreshes on reopening the screen. Results show the member name, phone, code, pending status, purpose, generation time, and expiry time. Email OTPs, used codes, expired codes, established-account requests, and other departments are excluded. Sensitive query data is discarded on unmount/logout and responses are `no-store`.

Leader directory access is also limited to the assigned department plus the leader's own profile. Nested family responses exclude relatives outside the leader's readable scope, and direct access to those profiles returns 404.

## Admin role and leader console

Admin and Thư ký manage roles from three pages under **Quản trị**:

1. `/dashboard/members` — search members by name, phone or email, then choose **Phân quyền** from a member’s three-dot menu to open **Phân công**. The previous `/dashboard/admin/roles/assign` URL redirects here.
2. `/dashboard/admin/roles/members` — the roster of every non-User member holding a management role, with role/Ban ngành filters and update/revoke actions.
3. `/dashboard/admin/roles/settings` — the permission matrix per role.

In the assignment dialog, select a role. For **Ban điều hành** or **Trưởng Ban ngành**, the exact Ban ngành is required and the server rejects the request with 400 if it is missing. For **Admin**, **Thư ký** or **Chấp sự** the Ban ngành is not applicable and is stored as NULL. A member can hold a departmental role before registering: when the member has no login account, the server creates a credential-less one from their phone (preferred) or email so the Ban ngành mapping can be stored immediately. The member claims that account later by email OTP, or asks their department leader for a phone OTP, or receives an admin-issued temporary password. The request is rejected with 400 only when the member has neither a phone nor email still free for a login account. Saving updates the profile/account role, primary department, explicit leader/board mapping, and department membership, then revokes existing sessions and pending OTPs. Revoking returns the member to the default User role.

Permission checkboxes are scoped to each role: Chấp sự remains read-only, User stays within self/family, Ban điều hành stays within managed-department edits, and Leader stays within the assigned department. Changes invalidate sessions and outstanding OTPs for the affected role.

## API contract

| Endpoint                            | Access and request                                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/identify`           | Public; `{ identifier }`; returns only `next: password` or `next: otp`, limited to ten lookups per identifier per 15 minutes |
| `GET /api/auth/access-options`      | Public department IDs/names only, no member data                                                                             |
| `POST /api/auth/request-phone-otp`  | Public; `{ phone, full_name, department_id }`                                                                                |
| `POST /api/auth/request-email-otp`  | Public; `{ email }`                                                                                                          |
| `POST /api/auth/verify-otp`         | Public; `{ identifier, otp_code }`; sets restricted/full cookie and returns `requires_password_setup`                        |
| `POST /api/auth/set-password`       | Setup cookie only; `{ new_password, confirm_password }`; rotates to full cookie                                              |
| `POST /api/auth/login`              | `{ identifier, password }`; the old `{ email, password }` body remains compatible                                            |
| `GET /api/auth/me`                  | Also permitted for setup sessions; returns setup state and no effective permissions until setup completes                    |
| `GET /api/leader/otps?page=1`       | Assigned Leader/Ban điều hành only; scope cannot be chosen through a query parameter                                         |
| `GET /api/admin/roles`              | Admin/Thư ký; roles, registered permissions, department/user assignment choices                                              |
| `POST /api/admin/roles`             | Admin/Thư ký; assign-user or update-role-permissions action                                                                  |
| `GET /api/admin/members/search`     | Admin/Thư ký; `?q=&page=&pageSize=`; debounced member search by name, phone or email with pagination                         |
| `GET /api/admin/roles/assigned`     | Admin/Thư ký; every non-User member with their role and Ban ngành names                                                      |
| `PUT /api/admin/roles/assign-user`  | Admin/Thư ký; `{ user_id, role_id, department_id }`; a departmental role without a valid `department_id` returns 400         |
| `GET /api/admin/roles/permissions`  | Admin/Thư ký; roles, permissions and the per-role allowed scope                                                              |
| `POST /api/admin/roles/permissions` | Admin/Thư ký; `{ role_id, permissions }`; replaces the role-permission mapping                                               |

The temporary token is returned through an HttpOnly cookie, not a JavaScript-readable response token. API callers should retain/send cookies. Unsafe endpoints check the allowlisted Origin and JSON input. OTP request responses are generic. The identifier-first routing hint intentionally distinguishes password-ready accounts from onboarding accounts, as required by the login flow; it returns no names, roles, account status, or profile data. Aggregate/IP throttling should also be enforced at the gateway.

## Session renewal and replay protection

Encrypted session claims and session rows now include purpose (`password_setup` or `access`) and the credential version. Every request checks encryption/expiry, stored token digest, revocation, current credential version, enabled account, and purpose. Setup tokens are accepted only by the setup/profile-status/logout path, regardless of the user's eventual application role. Password setup consumes outstanding OTPs and revokes all prior sessions before issuing a fresh full-purpose cookie. Old setup tokens cannot be replayed after completion, and a credential-version mismatch invalidates a token even if a session row was not explicitly revoked. The browser clears cached private data when the authenticated identity or credential version changes; delayed 401 responses from an older token cannot expire the newly rotated session.

This follows the session-regeneration and limited-session principles described in [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) and [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). The email flow is account authentication/onboarding, not an unauthenticated password-reset endpoint.

## Validation

The PostgreSQL tests cover both channels, first-time and returning users, stored-code protection, expiry, replay, resend, committed attempt counters, rate limits, setup-only access, cookie replacement, credential versions, SMTP selection, leader scope/reassignment, dynamic permission boundaries, contact-claim prevention, and department removal. UI tests cover the custom department selector, leader instructions, forced setup, confirmation errors, and email requests. SMTP transport behavior is tested without sending real emails; the live provider connection/authentication was separately verified.

Use `npm test`, `npm run test:backend`, `npm run typecheck`, and `npm run build`. The isolated backend runner clears SMTP credentials and writes email test messages only inside its temporary directory. The live smoke script uses the local administrator and does not send emails or modify member records.

## Leader team management and live updates

Apply `database/004_leader_team_live.sql` through `npm run db:migrate`. The migration grants leaders department editing by default; administrators can revoke it in role permissions Settings.

- `GET /api/leader/members?query={encoded JSON}` returns a paginated, searchable/filterable directory restricted to departments the authenticated user explicitly leads. It loads without requiring an initial search, unlike the general People tab.
- `GET /api/leader/members/[id]` and `PATCH /api/leader/members/[id]` enforce the same scope. Profile edits use version checks and audit logging. Leaders can update contact information, church status, and department position text for departments they lead. They cannot grant application roles, change credentials/account status, or modify family/department linkages.
- Family DTOs contain `family: null` plus `familySummaries` with names and relationships only, and `familyDetailsRestricted: true`. Summary rows have no links, identifiers, contact information, or profile actions. Direct requests for profiles outside the leader's departments return 404. A family relationship never grants a leader additional profile access. Independently assigned global roles retain their existing access through their own routes; the team route always returns restricted family summaries.
- `GET /api/leader/events` streams authenticated Server-Sent Events from PostgreSQL LISTEN/NOTIFY. OTP inserts/updates/deletes emit metadata after commit; the legacy web console removes consumed codes immediately, then revalidates its list. The client uses entry-based loading and infinite scrolling, without a live subscription or polling. Initial connection, reconnection, and periodic heartbeats resynchronize snapshots. Event payloads never contain OTP codes or contact data. Session/account/leader changes trigger reauthorization, including permission changes for secondary roles.

The stream uses one dedicated PostgreSQL connection per active leader screen. Deploy behind a proxy that supports unbuffered streaming and size database connection capacity accordingly; transaction-mode poolers must route LISTEN connections directly or through session pooling. The legacy web console falls back to five-second polling while its stream is disconnected. OTP data is discarded on screen unmount/logout; query keys for restricted team details are separate from broader profile queries.

Tests cover scoped directory loading/editing, blocked family navigation and link mutation, cross-department position protection, secondary leader role revocation, an actual OTP-consumption event over SSE, and client infinite scrolling with fresh loading on reentry.

## Ban điều hành client section

The profile has a **Ban điều hành** card for users holding that primary or secondary role. Its member entry opens `/client#/board/members`, sharing the leader directory's iOS back navigation, search/filters, infinite scrolling, and inline member editing. Access is scoped to explicit `department_managers` assignments and current permissions. `/api/board/members` and `/api/board/members/[id]` independently enforce that scope; cross-department profile requests return 404. Family rows contain names/relationships with navigation disabled, and department positions can be edited only within assigned departments. The session profile exposes `boardDepartmentIds` separately from leader assignments. Ban điều hành can also open `/client#/board/otps` using its assigned departments and `leader.otps.read` permission.

## User-only navigation and note privacy

Accounts with only the `User` role open directly to their personal profile and have no bottom tab bar or directory entry. Existing family-profile links remain accessible as a drill-down and return to the personal profile. Holding a management role, including a secondary one, preserves the normal client navigation. The standalone role-label card is removed.

Confidential notes are excluded from every User-only member DTO (`canReadNotes: false`, `notes: []`), including the current profile, family profiles, and directory responses. Note creation is independently rejected with 403 for those accounts. The client hides the entire notes section even if older cached profile data contains notes. Authorized management roles retain their existing read/write scopes.

Apply migration `005_board_otp_access.sql` to enable department-scoped OTP access for Ban điều hành. It grants the existing OTP permission and revokes affected sessions, including secondary assignments, so accounts must sign in again with current effective permissions. OTP queries independently check live leader/board assignments; accounts holding both roles see the union of authorized departments. No reassignment of OTP ownership is accepted through the client.
