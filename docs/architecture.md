> **Historical/demo design:** this document records the original multi-tenant scaffold and its evolution. For the current single-church backend, bearer/refresh authentication and calendar/outbox feature, use the [README](../README.md), [persistent-login guide](persistent-login.md) and [calendar guide](calendar.md). Do not apply the legacy multi-tenant SQL to the live database.

# Architecture and integration guide

## Shared model

`User` is a global identity. `Membership` associates a user with an organization, role, and lifecycle status; a user can be an admin in one tenant and a member in another. Tasks reference `(organization_id, assignee_id)` as a composite foreign key so an assignee must belong to that organization. `Activity` records actor, tenant, subject, action and timestamp. The PostgreSQL schema uses snake_case; map DTOs to the camelCase Zod contracts at the HTTP boundary.

Zod checks incoming and outgoing payloads. Tenant IDs and actor identity are never taken as proof of permission. The organization slug is a URL identifier, not a security boundary. Enforce timezones with PostgreSQL `pg_timezone_names` when writing organization settings, and validate HTTPS logo URLs and domain arrays with the shared schema in the backend.

## Authorization matrix

| Operation                                    | Admin | Manager | Member   |
| -------------------------------------------- | ----- | ------- | -------- |
| Read organization and member directory       | Yes   | Yes     | Yes      |
| Read all organization tasks and audit events | Yes   | Yes     | Own only |
| Complete assigned task/check-in              | Own   | Own     | Own      |
| Invite members                               | Yes   | No      | No       |
| Change roles or suspend/activate access      | Yes   | No      | No       |
| Manage branding/domains/billing              | Yes   | No      | No       |
| Create/assign tasks (service integration)    | Yes   | Yes     | No       |

Managers coordinate work; granting access and role changes remain admin-only to prevent privilege escalation. The demo exposes an admin view and a separate member presentation of the same fixed user. It is a UI adapter, not an RBAC implementation.

## Trusted-server database access

The migration creates `app_runtime` as a non-login role and grants SELECT under RLS plus two narrowly authorized mutation procedures. Do not run requests as the migration owner or a superuser. Do not expose direct database access or connection credentials to either browser bundle.

1. Authenticate with your OIDC provider. On Next.js use a server-owned, HttpOnly, Secure, SameSite session cookie; the mobile SPA uses the same backend-for-frontend session with a precise CORS allowlist. Map verified subject to a stable internal user UUID. Rotate sessions and implement CSRF checks on mutations.
2. Acquire a database connection and start a transaction as a backend login that is granted `app_runtime`. `SET LOCAL ROLE app_runtime` and `SELECT set_config('app.user_id', $1, true)` using the **verified** internal user ID. Actor context is server-owned. A client-supplied actor header is never accepted. The local setting resets on commit/rollback and must be set in every transaction, including reads.
3. Read tenant-scoped records. Explicit `organization_id` WHERE clauses complement RLS. Requesting an unauthorized tenant returns no records or 403 from an explicit membership check.
4. Execute `app.complete_task` or `app.set_member_access` with bound parameters. The latter locks the organization before changing access, protects self-access, and preserves an active administrator. No direct table mutation privileges are granted to the runtime role. Audit writes happen atomically with changes.
5. Commit, then publish an event via an outbox-backed worker if using real-time delivery. Roll back on all errors and release the connection.

The SECURITY DEFINER functions are owned by the migration role, pin `search_path`, and explicitly authorize the actor. That owner bypasses membership RLS to avoid recursive membership policies. Only migrations may alter functions or policies. The `private` schema is not exposed through an HTTP data gateway. Configure the runtime login and restricted search path as part of infrastructure provisioning.

## API contract to replace the demo adapter

Use one backend for both apps (Next.js route handlers or a dedicated API). Replace only `demo` calls in shared query hooks and mutation components with a typed fetch adapter, then split the aggregate workspace query into paginated resources as data grows.

| Endpoint                                             | Contract                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/organizations`                             | Active memberships derived from the authenticated actor; never a public tenant list                                                               |
| `GET /api/organizations/:id/members`                 | Cursor pagination, capped page size, allowlisted sorting/filter fields; validated `Member[]` DTOs                                                 |
| `POST /api/organizations/:id/invitations`            | `InviteSchema`, admin authorization, normalized email, unique membership, expiring hashed single-use invite token; outbox sends mail after commit |
| `PATCH /api/organizations/:id/members`               | `{ids,role?,status?}`; validate UUIDs, 1–100 unique IDs, enum values, at least one changed field; call access procedure                           |
| `GET /api/organizations/:id/tasks`                   | Own work by default; managers/admins can explicitly request the team scope                                                                        |
| `POST /api/organizations/:id/tasks/:taskId/complete` | `{version}`; call completion procedure; 409 on stale version, refetch on conflict                                                                 |
| `GET /api/organizations/:id/activity`                | Keyset pagination on `(created_at,id)`; redact sensitive subjects for members                                                                     |
| `PATCH /api/organizations/:id/settings`              | Admin only; validated branding/domain fields; never allow clients to set billing tier                                                             |
| `POST /api/organizations/:id/billing/checkout`       | Admin only; server allowlisted price IDs; tier updated by verified, idempotent provider webhooks                                                  |

Use 401 for missing sessions, 403 for denied membership/permissions, 404 without tenant record disclosure, 409 for duplicate invitations/stale versions, and 422 for validation failures. Return structured `{code,message,fieldErrors?,requestId}` errors without SQL details. Rate-limit invitations and authentication. Mutation handlers must validate origin/CSRF, and create transactionally durable audit events.

Invitation creation, task assignment, settings writes, profile updates, and billing procedures are not included in the migration; add authorized, transactional procedures or a separately restricted service role for these operations. Bootstrap the initial organization/admin through a trusted onboarding service. In particular, never grant general INSERT/UPDATE on memberships to the browser-facing role.

## Client state and real-time

Every query key begins with `['organizations', organizationId]`. A mutation captures its original organization so switching tenants mid-flight does not write into a new tenant cache. On logout clear the QueryClient and reset Zustand; do not persist authenticated query data unencrypted. Keep UI state separate from server data. Versioned writes and invalidation reconcile optimistic completion.

For production notifications, use an authenticated SSE/WebSocket endpoint bound to verified memberships, per-user notification records and read cursors, reconnection/backoff, and event IDs for resumption. Authorize tenant subscriptions on the server and revoke on suspension. On event receipt invalidate only the affected organization's keys. The demo uses polling and a session-only read cursor instead.

## Design and deployment

The calm green/neutral theme uses semantic OKLCH tokens for both modes; shared source scanning works in both Tailwind builds. Radix owns focus trapping, Escape, keyboard menus and checkbox semantics. The mobile filter uses full-screen selection views, while the profile editor uses custom Radix Popover pickers for departments, areas and locations; other native selects remain in the admin and relative editor. Tab controls have touch targets, `aria-current`, safe-area padding and reduced-motion support. The trend chart includes a textual accessible summary.

Deploy admin with a Node-compatible Next.js host and mobile `dist/` on static hosting with SPA fallback. Set HTTPS, CSP for the selected identity/asset origins, HSTS and secure cookies. Never ship service secrets under a `VITE_` or `NEXT_PUBLIC_` prefix. A PWA needs HTTPS and a service-worker/offline strategy; this repository deliberately does not cache authenticated resources offline.

Before production: database integration tests covering cross-tenant reads and writes, missing actor context, suspended access, membership concurrency, last-admin protection, and task conflicts; identity/CSRF integration tests; invitation token lifecycle tests; end-to-end browser checks across touch devices and keyboard/screen reader navigation; backups and migration rollback/recovery rehearsal. The included unit tests validate schema and demo behavior only.

## Mobile member directory

The mobile client now has Vietnamese Danh sách and Cá nhân tabs. `packages/core/src/directory.ts` owns validated directory query/detail contracts and a demo adapter. TanStack infinite queries key each result by tenant, search, and department/area/location filters; filtering and stable sorting happen before the 12-row page slice. Changing a criterion starts from page one. The list stays mounted while details/profile are open, preserving its filters and loaded pages. Detail hashes (`#/members/:id`) and `#/profile` support deep links and browser navigation.

Demo directories have 96/64 members. Existing saved memberships and access changes survive the expanded seed. Contact data, birth dates, household links and department assignments are explicitly synthetic; they are not database-backed edits. For production, persist tenant-scoped departments, households, household relationships and profile fields with their own migration, authorization, and DTO mapping. Do not expose private addresses or birth dates through the public directory endpoint: apply field-level permissions and sharing preferences. Return a compact list DTO and fetch authorized detail fields only when opening a profile. The current migration covers the original organization/membership/task model.

## Profile edit authorization and persistence

`MemberDetailInputSchema` allowlists editable personal/contact fields, multiple department assignments, area/location fields and family links. The `demo.updateDetails` adapter derives the actor from the current tenant membership, permits active admins and active managers editing non-admins, verifies tenant-owned relative IDs, rejects self/duplicate family links and duplicate emails, checks the expected record version, and writes the updated profile plus audit event in one synchronous snapshot operation. The form captures its starting version so a background refetch cannot silently authorize a stale draft. Role/status fields are excluded and rejected by strict validation.

The UI only offers edit controls after loading the viewer membership; saving rechecks permissions independently. This remains a browser demo, not a security boundary. In the backend, use the authenticated session identity and the same policy inside an atomic, version-checked database transaction. Keep contact email separate from identity-provider login credentials. Profile family links are maintained on the edited profile; a shared household model and reciprocal relationships require a dedicated backend implementation.

The Vietnamese directory uses a full-screen filter navigation view and an IntersectionObserver sentinel with a 320px preload margin. It pauses automatic pagination while hidden, while filtering, during requests, and after errors. A retry control remains available after page failures; a keyboard-accessible load action supplements automatic scrolling.

## Multiple departments and geographic filters

The client consumes a shared catalog of department IDs/names, area codes KV1–KV13 and deduplicated user-supplied location labels. These labels are configuration supplied by the user, not a claim that the list is an authoritative geographic registry. There is no inferred relationship between an area and a location. Queries match any selected department, then apply exact area and location conditions before pagination. No role, status or sort parameter is accepted by the mobile directory query.

The profile contract uses `departmentIds: string[]`, `area`, and `location`. Department IDs validate against the shared catalog so future additions do not require a schema enum change. Profile details expose all department memberships. The original database migration does not yet persist these fields; a production backend should add a tenant-scoped department table and a membership-department junction table with composite tenant foreign keys and authorization. Areas and location assignments also require server-side validation.

Legacy browser profile records preserve personal edits and their version. Their old single department field is retained as `legacyDepartmentId`; an ID with no exact match in the replacement catalog becomes an empty department selection until explicitly reassigned. No demographic department or geographic assignment is inferred for an edited legacy record.

## Custom mobile dropdowns and type scale

`directory-fields.tsx` shares a custom picker implementation across department (multiple), area and location (single) fields. The location search lives inside the panel, focuses on open and resets when reopened. Multi-select choices remain open until Done, Escape or outside interaction, and selections are retained. Buttons are explicitly non-submit controls. Panels are portaled to their local container inside the parent dialog and disabled fieldset so dialog focus trapping and form disabled state remain consistent. A bounded, independently scrollable result list accommodates the complete location catalog.

Mobile Tailwind text tokens are overridden only in the client CSS; no root zoom or shared admin typography changes are used. DOM tests cover nested-dialog focus, accent-insensitive search, multi-select retention/reset, dismissal, form non-submission and disabled controls. Real-device popup placement and font rendering still require browser/device QA.

## Pagination lifecycle

`use-auto-load-more.ts` observes a callback-ref footer and includes the loaded page count in its effect dependencies. It retains observation after an intersection callback and rechecks geometry when another page is appended. This avoids losing the observer when a local Promise resolves before React renders the intermediate loading state. Scroll events (captured from nested panes), resize and visual viewport changes provide a throttled fallback. A shared pending-request ref prevents observer/scroll callbacks from requesting the same page concurrently. End-of-list, hidden/modal state and next-page failures disable automatic loading.

DOM regression tests reproduce the original observer-disconnection failure, then verify consecutive fast page loads, loading without IntersectionObserver, duplicate callback suppression, end-of-list stopping, and resuming after returning to the directory. These are behavior tests with controlled geometry, not physical-device rendering checks.

## Filter navigation and age contract

`member-filters.tsx` owns a full-height Radix Dialog containing an overview and dedicated department, area, location and age pages. The overview slides from right to left; child navigation uses forward/back transitions and respects reduced motion. Focus moves to the new title or location search. The fixed footer applies the draft on the overview and returns to the overview from a child. Back/Escape step through the stack before dismissing it. The underlying directory retains its query and scroll state, with automatic pagination paused until the filter closes.

`AgeRangeSchema` validates nullable `minAge`/`maxAge` integer bounds (0–130, minimum <= maximum). Directory query keys include both bounds. `getAge` uses complete birthdays and a Vietnam-local calendar date, including birthday boundaries and leap dates. Records without valid birth dates match only when both age bounds are absent. Query filtering applies age and geographic/department conditions before stable pagination. Tests cover full-screen draft/apply/cancel/reset behavior, location search, invalid ranges, age boundary calculations and integration with directory pagination. Physical-device animation rendering is not verified.

## Search-first query activation

The directory enables its infinite query only when visible, when a nonblank trimmed search or at least one filter is present, and when search debouncing is complete. The initial/cleared state renders a Vietnamese search/filter prompt instead of cached rows, counts, loading skeletons or a pagination footer. This is a client query/UI rule; the local development fixture still loads at bootstrap for offline testing. Tests verify no initial directory read and that clearing the final search/filter removes results.

All filter screens focus the shared title with `preventScroll`. Location search deliberately avoids autofocus while its screen slides in; tapping it still opens normal text input. The six requested inclusive age presets are 0–12, 13–18, 19–30, 30–40, 40–50 and minimum 50 with no maximum. UI tests apply every preset and verify its exact bounds.

`ageUnknownOnly` defaults to false in both age and directory query schemas. When true, both numeric bounds must be null and matching uses `getAge(dateOfBirth) === null`. The UI clears bounds when selecting the missing-age preset and clears that mode when selecting/typing a numeric range. Reported workbook ages are not used to fill unknown birth dates. Query keys, active-filter counts, summaries and chip removal include this mode.

## Inline fields and department roles

`InlineMemberField` renders field-local forms instead of routing to an edit screen. `MemberInformation` captures the full validated profile input and record version when a field is opened, applies only that field patch, and saves through the existing authorized mutation. Only one editor is open at once; mutation state disables other controls, errors remain local, and successful writes invalidate the tenant query prefix. This retains conflict protection across background refetches.

`departmentRoles` is an optional record keyed by department IDs. Keys must belong to the member’s selected departments; the mutation never changes RBAC membership roles. DTO department positions use the per-department override, falling back to the legacy shared position for older records. Removing an assignment removes its submitted role entry. `faithDate`, `baptismDate`, and `lastVisitDate` are optional validated date overrides; undefined preserves imported data, while an empty string explicitly clears it. The DTO exposes normalized nullable date fields. Preferred name, gender and household role use the same optional-override approach. Original workbook metadata stays immutable.

The client labels locations Phường/xã and omits Loại tín hữu, Khu vực gốc, and Số điện thoại gốc. Faith and baptism dates live only in Thông tin thành viên and always show a value or Chưa cập nhật. Additional tests cover inline save/cancel, invalid input, contact links, read-only controls, independent department roles, and date persistence/clearing.

## Notes and visit history

Browser snapshots optionally include `memberNotes` and `memberVisits`, keyed by member ID. Validated append methods derive the author from the active tenant membership, check edit permission independently, and audit each append. These events do not increment the profile version or replace profile fields, so a profile save cannot overwrite a concurrently appended note or visit. Old snapshots lacking either collection continue to load.

Directory DTOs expose notes sorted by timestamp (latest first) and visits sorted by visit date, then timestamp. Source/legacy latest-visit dates are projected as explicitly labeled baseline entries, deduplicated against saved visit dates. This preserves the known original date while avoiding invented visitor/summary details. No complete historical record is inferred from the workbook’s single date. Last-visit display derives from the newest known visit. Production persistence requires separately authorized append-only note/visit tables and transactional writes; the original SQL migration does not provide them.

Membership collection editors are reached through Cập nhật below each list. They retain profile version checks, tenant-scoped family validation and per-department role validation. Role field labels are kept for accessibility but hidden visually; Ban viên is the default visible value.
