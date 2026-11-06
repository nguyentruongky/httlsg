> **Calendar policy:** migration 011 adds calendar permissions. Admin manages events/groups/notifications; Thư ký can view/export only. This is an explicit exception to older general permission-equality descriptions. See [calendar operation](calendar.md).

> **Persistent authentication:** Access tokens now last 15 minutes and remain in memory. Rotating HttpOnly refresh cookies restore sessions until database revocation. See [persistent login](persistent-login.md) for endpoints, browser limits, replay policy, SQL and client examples. This supersedes older access-cookie/8-hour-session descriptions.

> The OTP/account upgrade is implemented. See [OTP onboarding and leader consoles](otp-onboarding.md) for the current flows, account/profile split, SMTP settings, setup-only tokens, and the Leader role. The migration runner applies all sixteen numbered SQL files; raw `001_church.sql` alone is no longer the complete schema.

# Authentication and access control

This is a single-church application. The live PostgreSQL schema has no organizations or tenant memberships. `database/001_church.sql` replaces the unused demonstration schema, which is archived in `database/legacy/`. Existing DTOs retain a constant directory ID for compatibility with the client query keys; it never selects a database tenant or determines authorization.

## Prepared local database

For this workspace, `npm run db:local:setup` has prepared an isolated database on `127.0.0.1:55432`, imported the private fixture, and created `admin@church.local`. Its generated password is in the ignored, owner-readable `.local-data/local-auth.txt`; connection settings and the encryption key are in the ignored `apps/web-admin/.env.local`.

Use `npm run db:local:start` / `npm run db:local:stop` to start or stop PostgreSQL. These commands preserve the database. `db:local:setup` refuses to overwrite an existing cluster or environment file. The local cluster listens only on loopback and uses SCRAM authentication. Its dedicated runtime login inherits `church_runtime` and does not own the schema. The schema-owner connection is for migrations only. This local setup is not a production database provisioning command.

## Run locally from a fresh checkout

Requirements: Node.js 22.16+ (24 LTS preferred), npm, PostgreSQL 16+ with `pgcrypto` and `unaccent`. Install dependencies with `npm install`.

1. Create an empty PostgreSQL database. Copy `apps/web-admin/.env.example` to `apps/web-admin/.env.local`, set the database connection strings, and generate `SESSION_SECRET` with the command in that file. The secret must be 32 random bytes encoded as base64. Use `APP_ORIGIN=http://127.0.0.1:3000` locally.
2. Run `npm run db:migrate` (safe to repeat). `MIGRATION_DATABASE_URL`, when supplied, is used only for this command. It must be a schema owner able to install the extensions and create the `church_runtime` role. For raw SQL setup, apply `001_church.sql`, `002_otp_onboarding.sql`, `003_member_roles.sql`, `004_leader_team_live.sql`, `005_board_otp_access.sql`, `006_profile_merges.sql`, `007_phone_sign_in_otp.sql`, `008_profile_login_identifiers.sql`, `009_persistent_sessions.sql`, `010_session_delete_revocation.sql`, `011_calendar.sql`, `012_immediate_calendar_mail.sql`, `013_worship_information_requests.sql`, `014_worship_viber_email.sql`, `015_automatic_worship_notifications.sql`, and `016_calendar_export_email.sql` in that order against the intended database.
3. For a separate runtime login, have the database owner create it with a strong password and `GRANT church_runtime TO church_app`. Put that login in `DATABASE_URL`. The application does not need a superuser, schema ownership, or permission to change the role-permission matrix. Do not use the migration credentials in a deployed service.
4. Optionally run `npm run db:import` to import `.local-data/believers.json`. The workbook conversion remains `npm run import:believers -- /path/to/workbook.xlsx`. Importing preserves stable member IDs, departments, resolved household links, baptism/faith dates, and known visit dates. It skips the old technical demo account. Existing database profiles are left unchanged on repeated imports. Imported profiles have the `User` role and **no login password**. The source file stays private and is never served to a browser.
5. Create the first administrator with environment variables `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `ADMIN_NAME`, then run `npm run db:bootstrap`. The password must have at least 12 characters. Supply these through a local secret manager or terminal input; do not put a real password into source, documentation, or shell history. Bootstrap refuses to run once a credentialed, enabled Admin/Thư ký exists. Remove bootstrap-only secrets afterward.
6. Run `npm run dev:admin` and open `http://127.0.0.1:3000/login`. Every successful login opens `/client`. The existing Vite client is also available through `npm run dev:mobile` on port 5173; its development proxy forwards API and dashboard requests to Next.js on port 3000. Use the same hostname (`127.0.0.1`) for both.

To create accounts for imported members, open the dashboard member row menu and choose **Thông tin đăng nhập**. To add a new member with login credentials, use **Thêm tài khoản**. These are manual workflows; no invitation email is sent.

`VITE_DEMO_MODE=true npm run dev:mobile` is an explicit development-only option for the old offline demonstration. It uses synthetic/local browser state, has no real authentication, and must not be used to assess authorization. Production Vite builds always use the authenticated API. The Next.js application has no demo bypass.

For a deployed Vite build, place the client and Next.js backend behind the same HTTPS origin and route `/api`, `/dashboard`, `/client`, `/login`, and `/_next` to Next.js. The Next.js `/client` view already hosts the shared client shell without a second deployment. Do not deploy a public, unauthenticated copy of the private fixture endpoint; that Next.js endpoint has been removed.

## Permission matrix

| Role          | Read member directory               | Edit profiles                              | Manage links, accounts, roles, departments | Dashboard |
| ------------- | ----------------------------------- | ------------------------------------------ | ------------------------------------------ | --------- |
| Admin         | All                                 | All                                        | Yes                                        | Yes       |
| Thư ký        | All                                 | All                                        | Yes, identical to Admin                    | Yes       |
| Chấp sự       | All                                 | None, including own profile                | No                                         | No        |
| Ban điều hành | Assigned departments                | Members in explicitly assigned departments | No                                         | No        |
| User          | Self and existing household members | Self and existing household members        | No                                         | No        |

Board oversight (`department_managers`) is independent of ordinary membership (`department_members`). Belonging to a department does not grant oversight. Administrators assign oversight in **Quản lý Ban ngành và phân quyền**. Removing a grant or changing an account role revokes that account's sessions immediately.

Only Admin/Thư ký can change household or department membership. A User can edit existing family profiles but cannot attach an arbitrary person to their household to expand access. Non-administrators cannot change another account's login email. Department position text and **Tình trạng** are profile data, never application roles or permissions. The legacy demo DTO retains a three-value `Member.role` for compatibility; live authorization uses the six-value `AuthUser.role` and server-computed permissions. The dashboard displays `accessRole`, and editable client fields use the server-computed `canEdit` flag.

Every role has a personal profile. User-only accounts have no tab bar. Ban điều hành and Trưởng ban ngành use a team-only Danh sách tab that loads immediately; their Profile role sections are hidden. Only Admin/Thư ký see the dashboard link there. Direct dashboard requests receive a friendly access-denied view for other roles; the underlying administrative APIs independently return 403. Unauthorized access to a particular member returns 404 so unrelated private records are not disclosed. Requests without a valid session return 401.

## API surface

All responses use `Cache-Control: no-store`. Unsafe requests require JSON (where a body is needed) and an allowlisted `Origin` header. The user ID and role in a body, URL, or client state never establish authority.

| Endpoint                           | Methods                  | Behavior                                                                                |
| ---------------------------------- | ------------------------ | --------------------------------------------------------------------------------------- |
| `/api/auth/login`                  | POST                     | Email/password for all roles; sets session cookie; returns `/client` as the destination |
| `/api/auth/me`                     | GET                      | Current profile, role label, oversight department IDs, and effective permissions        |
| `/api/auth/logout`                 | POST                     | Revokes the stored session and clears its cookie                                        |
| `/api/catalog`                     | GET                      | Current department catalog for authenticated clients                                    |
| `/api/members`                     | GET                      | Server-filtered, scoped, paginated directory; `query` is a JSON-encoded directory query |
| `/api/members/me`                  | GET                      | Signed-in member profile                                                                |
| `/api/members/options`             | GET                      | Member choices limited by the same read scope                                           |
| `/api/members/:id`                 | GET, PATCH, DELETE       | Scoped read/update; version-checked updates; deletion requires Admin/Thư ký             |
| `/api/members/:id/notes`           | POST                     | Append a note to an editable profile; author is the session actor                       |
| `/api/members/:id/visits`          | POST                     | Append a date to an editable profile; no summary input; author is the session actor     |
| `/api/admin/workspace`             | GET                      | Full dashboard directory and recent audit events                                        |
| `/api/admin/users`                 | POST                     | Create an account with name, email, password, and one of the six roles                  |
| `/api/admin/users/access`          | POST                     | Bulk role/enablement changes and board oversight assignments                            |
| `/api/admin/users/:id/credentials` | POST                     | Set login email/password and revoke old sessions                                        |
| `/api/admin/departments`           | GET, POST, PATCH, DELETE | Department catalog and oversight mapping management                                     |

Profile PATCH requests contain `{ values, version }`. The server validates the strict profile schema, checks write scope, rejects unauthorized relationship changes, and returns 409 for a stale version. Related household profiles also receive new versions when their links change. Profile writes never accept passwords, application roles, or oversight grants.

Deletion disables login and removes the profile from live lists while retaining its record for audit integrity. An administrator cannot delete their own account or remove their own access, preserving at least one active full-access administrator through these APIs. Removing a household link does not delete the person's profile. Historical visits have nullable authors and display only the date when no author is known; new visits derive the author from the session.

## Session and password handling

Passwords use Argon2id with a fresh salt, 64 MiB of memory, three iterations, and one lane. Only encoded hashes are stored. Password hashes and session tokens are never included in profile responses or audit text. Unknown email logins run password verification against a dummy hash and receive the same invalid-credentials message as wrong passwords.

Sessions use encrypted JWE (`dir` / `A256GCM`) containing the user ID, role, oversight IDs, session ID, purpose, credential version, issuer, audience, issue time, and expiry. Setup sessions last 15 minutes; full sessions last eight hours. The cookie is HttpOnly, SameSite=Lax, host-only, and path `/`. Production uses the `__Host-church-session` name and `Secure`; deploy behind HTTPS and set `APP_ORIGIN` to the exact public origin. The application never stores the token in localStorage.

Only a SHA-256 digest of the encrypted token is stored in PostgreSQL. Each protected request verifies encryption/expiry and checks the live, non-revoked session and enabled account. It then reloads current roles, permissions, and department grants from PostgreSQL. Token role claims never authorize a database operation. Disabling/deleting an account, changing access grants, or changing credentials revokes all its sessions.

Database transactions keep authorization, version checks, updates, and audit inserts together. A transaction-level advisory lock serializes mutating API requests to avoid racing family/access changes. This is a deliberate initial implementation for a single church; if write volume grows, replace it with a reviewed, consistently ordered row-lock strategy. Parameterized queries and explicit read/write scopes form the application authorization boundary. The database connection is server-only; this schema does not claim end-user RLS isolation for a leaked runtime connection.

Login attempts are limited per normalized email by an atomic PostgreSQL counter: eight attempts per 15 minutes across app instances. The gateway should additionally enforce request/IP limits to bound distributed attempts across many email addresses. Do not trust arbitrary `X-Forwarded-For` values. Schedule removal of old login-limit records and expired/revoked sessions; neither is accepted after expiry even before cleanup.

## Verification

- `npm test`: core domain, mobile UI, and workbook importer tests.
- `npm run test:backend`: starts an isolated PostgreSQL cluster under `/tmp`, applies the raw migration, and exercises the actual Next.js route handlers with real hashing and sessions. Requires `initdb`, `pg_ctl`, and `psql`; it removes the cluster afterward and does not use the caller's database. If the private fixture exists, it also checks import and safe repeated import.
- `npm run typecheck` and `npm run build`: both applications and shared packages.
- `node --import tsx scripts/smoke-local-auth.ts`: exercises the running local app using the ignored generated credentials, without printing passwords or member records. It checks redirects, login, client/dashboard pages, paginated members, the admin workspace, and logout.

The backend suite covers identical Admin/Thư ký grants, all six logins, HttpOnly/secure cookie configuration, invalid/revoked/expired sessions, origin checks, directory privacy, Chấp sự write rejection, board scopes, User family edits, privilege-injection attempts, stale versions, account provisioning, department CRUD, credential provisioning, visit attribution, role-change revocation, login throttling, and deletion safeguards. Frontend tests cover shared login/error handling and dashboard-link visibility for all six roles.

Implementation references: [Next.js authentication and authorization](https://nextjs.org/docs/app/guides/authentication), [Next.js cookies](https://nextjs.org/docs/app/api-reference/functions/cookies), [node-argon2](https://github.com/ranisalt/node-argon2), [jose](https://github.com/panva/jose), and [node-postgres transactions](https://node-postgres.com/features/transactions).

### Concurrent devices

The same established account can stay signed in on multiple devices/browsers. Each login gets a separate refresh-token family and access session. Password login and phone OTP login coexist; refreshing one device does not revoke another. Signing in again in the same browser replaces only the session identified by that browser’s cookie. Ordinary logout affects only that device; explicit logout-all affects every device.

Password setup/reset, suspension, permission/security changes, database revocation, and detected refresh-token replay still revoke sessions as designed. First-time password-setup sessions remain restricted and are intentionally invalidated when credentials change. Cookies are hostname-scoped: localhost, 127.0.0.1 and the LAN IP have separate browser sessions. Regression tests exercise two independent device cookie jars, concurrent refresh, OTP/password coexistence, same-browser replacement, local logout and all-device logout.
