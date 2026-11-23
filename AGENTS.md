# Church Management Platform — Agent Documentation

This document is written for AI agents that will work on this codebase. It covers
architecture, conventions, database, APIs, key files, and how to run/typecheck.
Read this before making changes.

---

## 1. Project Overview

A church-management monorepo (Turborepo-style npm workspaces) with three parts:

| Workspace | Name | Framework | Port | Purpose |
|-----------|------|-----------|------|---------|
| `apps/mobile-client` | `@org/mobile` | Vite + React 19 + Tailwind 4 | 5173 | Member/calendar mobile PWA (Vietnamese UI) |
| `apps/web-admin` | `@org/admin` | Next.js 16 + React 19 | 3000 | Admin API routes + server logic (Node.js runtime) |
| `packages/core` | `@org/core` | TS library | — | Shared schemas, queries, API client, auth contract, worship logic |
| `packages/ui` | `@org/ui` | React component library | — | Shared UI primitives (Button, Dialog, WorshipInformationPanel, etc.) |

Package manager: npm workspaces (`"workspaces": ["apps/*", "packages/*"]`).
TypeScript: strict, `noEmit`, `moduleResolution: Bundler`, `jsx: react-jsx`.

---

## 2. Root Scripts (`package.json`)

| Script | Command |
|--------|---------|
| `npm run dev` | Start both dev servers via `scripts/dev.mjs` |
| `npm run dev:mobile` | Vite dev for mobile client |
| `npm run dev:admin` | Next.js dev for web-admin |
| `npm run typecheck` | `tsc --noEmit` across all workspaces |
| `npm run format` | Prettier over apps/, packages/, docs/ |
| `npm run db:migrate` | `node --import tsx scripts/database.ts migrate` |
| `npm run db:bootstrap` | `node --import tsx scripts/database.ts bootstrap` |
| `npm run db:local:start` | Start local Postgres (Docker) |
| `npm run db:local:setup` | Setup local DB schema + seed |
| `npm run test:unit` | Run vitest tests |
| `npm run calendar:deliver` | Deliver calendar notifications |
| `npm run push:deliver` | Deliver push notifications |

Important: **Never commit unless explicitly asked.** Typecheck before considering a task done.

---

## 3. Monorepo Conventions

- Shared code lives in `@org/core` and `@org/ui`. Mobile and admin import them as `@org/core` and `@org/ui` (workspaces resolve locally).
- All API calls from mobile go through `apiRequest()` in `@org/core` (`packages/core/src/api-client.ts`), which uses same-origin `/api/*` paths. Vercel rewrites `/api/*` to the web-admin service.
- Route navigation uses `clientPath()` / `navigateClient()` from `apps/mobile-client/src/client-router.ts`. All mobile routes are under `/client/*` (e.g., `/client/calendar`, `/client/members`, `/client/home`).
- Prettier is the formatter. Tailwind 4 via `@tailwindcss/vite` (mobile) / `@tailwindcss/postcss` (admin).
- Vietnamese UI strings throughout. Error messages are in Vietnamese.
- `HttpError(status, message, code?)` is the standard server error class (`apps/web-admin/lib/server/http.ts`).
- Server API handlers use `calendarApi(request, handler, writeFlag)` wrapper (`apps/web-admin/lib/server/calendar-api.ts`), which handles auth (`withActor`), CSRF (`X-Church-CSRF: 1`), body parsing, and JSON responses.
- DB access: `pg` pool (`apps/web-admin/lib/server/db.ts`), `DATABASE_URL` env, timezone `Asia/Ho_Chi_Minh`. `transaction(fn)` wraps BEGIN/COMMIT/ROLLBACK.

---

## 4. Database (PostgreSQL, schema `church`)

Migrations live in `database/` as numbered `.sql` files (001–046). Run via `scripts/database.ts`.

Key tables:

| Table | Purpose |
|-------|---------|
| `church.events` | Calendar events (id, event_date, title, original_text, preset_id, version, created_by, updated_by, deleted_at) |
| `church.event_notifications` | Email notification batches tied to events |
| `church.event_notification_deliveries` | Per-recipient delivery status |
| `church.email_groups` / `church.email_group_members` | Named recipient groups |
| `church.event_email_groups` | Event ↔ group linkage |
| `church.member_profiles` | Member directory (id, full_name, email, phone, role_id, enabled, deleted_at, church_status, date_of_birth, area, location, ...) |
| `church.users` | Auth accounts (id, role_id, password_hash, enabled, ...) |
| `church.schedule_categories`, `church.schedules`, `church.schedule_events`, `church.schedule_responsibilities`, `church.schedule_assignments` | Ministry schedules |
| `church.worship_service_workers` | Worship service workers seeded by migration 042 (categories: hdct, hd_hat, ban_hat_*) |
| `church.calendar_contributions` | Pending edit drafts awaiting admin review (status: pending/merged/rejected) |
| `church.event_responsible_members` | Event ↔ responsible member linkage |
| `church.schema_migrations` | Applied migration versions |
| `church.audit_log` | Admin action log |

Role hierarchy (`AccessRole`): `admin` > `secretary` > `deacon` > `board` > `leader` > `user`.

---

## 5. Key Source Files by Domain

### 5.1 Shared Core (`packages/core/src/`)

| File | Purpose |
|------|---------|
| `index.ts` | Barrel export for `@org/core` |
| `schemas.ts` | Zod schemas (LoginSchema, DirectoryQuerySchema, MemberSchema, etc.) |
| `auth-contract.ts` | `AuthUser` type, `AccessRole`, role helpers (`canCalendar`, `hasDashboard`, `managementRoles`, `departmentScopedRoles`) |
| `api-client.ts` | `apiRequest()`, `authenticatedFetch()`, `enableApiMode()`, `restoreAuthSession()`, `expire()` |
| `queries.ts` | TanStack Query hooks: `useOrganization`, `useOrganizationMembers`, `useOrganizationActivity`, `useCompleteTask` |
| `directory.ts` | `listMembersCompact()`, `CompactMember`, `CompactMembersPage`, `DirectoryQuery` |
| `queries.ts` + `query-persistence.ts` | IndexedDB read cache + `readCachedListPage` |
| `calendar.ts` | `CalendarRange`, `CalendarDate`, `CalendarEvent`, `parseEventText`, `formatEventText` |
| `event-parser.ts` | `parseEventText()` — parses title/time/details from raw text |
| `event-presets.ts` | `EVENT_PRESETS` (worship-program, evangelism-fellowship, tvcs-fellowship, weekly-bible-study), `defaultEventPreset()`, `renderEventPreset()` |
| `event-responsibility.ts` | `matchEventResponsibilities()` — extracts @mentions and `Role: Name` lines from event text |
| `worship-workers.ts` | `WORSHIP_WORKER_CATEGORIES`, `WorshipWorker`, `detectWorshipWorkerCategories()`, `prependWorkerMentions()`, `stripLeadingWorkerMentions()` |
| `worship/` | Worship parser (`isWorshipProgramText`), duplicate hymn detection |
| `client-route.ts` | `clientPath()` — normalizes legacy `#/` hash URLs and `/dashboard/*` → `/client/*` |
| `random-id.ts` | `createRequestId()` |
| `demo.ts` | Demo data snapshot (used when not in API mode) |

### 5.2 Mobile Client (`apps/mobile-client/src/`)

| File | Purpose |
|------|---------|
| `app.tsx` | Root app; renders `WorkspaceLayout` + `WorkspaceContent` |
| `client-router.ts` | Custom client-side router (`useClientRoute`, `navigateClient`, `usePathname`) |
| `workspace/use-workspace-route.ts` | Parses URL → `WorkspaceRoute` (directory, memberId, calendar, publicWorship, assignments, calendarContributions, ...) |
| `workspace/workspace-content.tsx` | Renders lazy modules per route (CalendarPage, MemberDirectory, CalendarReviewPage, ApplicationSettings, ...) |
| `workspace/workspace-tabs.tsx` | Bottom tab bar (Calendar, Members, Departments, ...) |
| `calendar/event-editor.tsx` | Event create/edit dialog: textarea, date input, email groups, save/contribute mutations, worship info panel |
| `calendar/calendar-page.tsx` | Calendar month view + event detail dialog |
| `calendar/worship-review-page.tsx` | Admin review of pending worship contribution drafts |
| `calendar/calendar-review-page.tsx` | Admin review of pending calendar contribution drafts |
| `calendar/worship-mention-textarea.tsx` | @-mention picker for worship workers |
| `calendar/event-responsibility-badges.tsx` | Responsibility match badges with inline edit |
| `calendar/public-worship-page.tsx` | Public worship listing |
| `member-directory.tsx` / `use-member-directory.ts` | Member list with infinite query + compact API |
| `member-detail.tsx` | Member profile detail |
| `department-members.tsx` | Department member list |
| `schedule-manager.tsx` / `schedules/` | Ministry schedule management |
| `notifications.tsx` | Notification feed |
| `auth-frame.tsx` / `login-page.tsx` | Auth frames |
| `application-settings.tsx` | Admin settings |
| `styles.css` | Tailwind directives + app-specific CSS |

### 5.3 Web Admin (`apps/web-admin/`)

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout |
| `app/api/events/route.ts` | `GET` list events, `POST` save event |
| `app/api/events/[id]/route.ts` | `GET`/`PATCH`/`DELETE` single event |
| `app/api/events/mention-suggestions/route.ts` | `GET` — worship worker suggestions by query + category |
| `app/api/events/mention-categories/route.ts` | `GET` — worker categories with counts |
| `app/api/events/contributions/route.ts` | `GET` list pending drafts, `POST` submit draft |
| `app/api/events/contributions/review/route.ts` | `POST` merge/reject a contribution |
| `app/api/events/responsibilities/route.ts` | `POST` preview responsibility matches |
| `app/api/events/people-in-charge/route.ts` | `GET` people in charge for worship |
| `app/api/members/compact/route.ts` | `GET` paginated compact member list |
| `app/api/members/route.ts` | `GET` member list |
| `app/api/members/[id]/route.ts` | `GET` single member |
| `app/api/members/filters/route.ts` | `GET` member filter options |
| `app/api/admin/workspace/activity/route.ts` | `GET` activity log |
| `app/api/cron/check-worship-events/route.ts` | Cron: Friday 10am check for 2 worship events |
| `app/api/cron/annual-choir-memberships/route.ts` | Cron: annual choir memberships |
| `lib/server/calendar.ts` | Core server logic: `listCalendarEvents`, `saveCalendarEvent`, `deleteCalendarEvent`, `submitCalendarContribution`, `listCalendarContributions`, `reviewCalendarContribution`, `mentionSuggestions`, `mentionCategories`, `queueEventNotification`, `queueEventPush` |
| `lib/server/calendar-api.ts` | `calendarApi()` wrapper: auth + body parse + JSON response |
| `lib/server/event-responsibility.ts` | `previewEventResponsibilities()`, `worshipPeopleInCharge()`, `saveEventResponsibilities()` |
| `lib/server/worship-contributions.ts` | `submitEventWorshipContribution()` |
| `lib/server/calendar-responsibilities.ts` | Calendar responsibilities query (batched, no N+1) |
| `lib/server/members-compact.ts` | `listMembersCompact()` — compact paginated members |
| `lib/server/members.ts` | Full member CRUD, `listReadScope()`, `assignedDepartments()` |
| `lib/server/session.ts` | `withActor()`, `isAdministrativeRead()`, auth session |
| `lib/server/db.ts` | `pool()`, `transaction()` |
| `lib/server/http.ts` | `HttpError`, `json()`, `failure()`, `body()`, `assertOrigin()` |
| `lib/server/push-provider.ts` / `push-config.ts` / `push-delivery.ts` | Web Push delivery |
| `lib/server/mail.ts` | `deliverMail()` (nodemailer/SMTP) |
| `lib/server/persistent-session.ts` | Encrypted session cookies |

### 5.4 UI Package (`packages/ui/src/`)

| File | Exports |
|------|---------|
| `index.tsx` | Barrel: `cn`, `Button`, `Input`, `Dropdown`, `Select`, `Card`, `Badge`, `Avatar`, `EmptyState`, `ErrorMessage`, `Checkbox`, `Dialog`, `DialogBoundary`, `DropdownMenu`, `MenuItem`, `MenuCheckbox`, `Toaster`, `useToast`, `Command`, `Chevron`, `Popover`, `NavigationDialog`, `WorshipNotificationPanel`, `WorshipMissingInformation`, `WorshipInformationPanel` |
| `button.tsx` | `Button` (variants: default, outline, ghost, destructive; sizes: default, sm, icon, touch) |
| `dialog.tsx` | `Dialog`, `DialogBoundary` — supports `scrollableBody`, `fullScreenOnMobile`, `mobileBackButton` |
| `display.tsx` | `Card`, `Badge`, `Avatar`, `EmptyState`, `ErrorMessage` |
| `dropdown.tsx` / `dropdown-menu.tsx` | `Dropdown`, `Select`, `DropdownMenu`, `MenuItem`, `MenuCheckbox` |
| `input.tsx` | `Input` |
| `toast.tsx` | `Toaster`, `useToast` |
| `worship-information-panel.tsx` | `WorshipInformationPanel(draft)` — missing fields + duplicate hymn warnings |
| `worship-notification-panel.tsx` | `WorshipNotificationPanel`, `WorshipMissingInformation` |

---

## 6. Authentication & Permissions

- Auth is cookie-based (encrypted session via `persistent-session.ts`). Access token stored in memory, refreshed via `/api/auth/refresh`.
- `canCalendar(user, permission)` — checks `calendar.read`, `calendar.write`, `calendar.notify`, `calendar.groups`.
- `isAdministrativeRead(actor)` — admin/secretary can read everything.
- Roles: `admin`, `secretary`, `deacon`, `board`, `leader`, `user`.
- `managementRoles` = admin, secretary, deacon, board, leader.
- `departmentScopedRoles` = board, leader (require a department).
- `canOpenLeaderTeam`, `canOpenBoardTeam` — gate leader/board workspace views.
- CSRF header `X-Church-CSRF: 1` required on all write requests.
- `X-Church-Refresh-Request` header for refresh token rotation (distributed lock via `navigator.locks`).

---

## 7. Worship Service Workers (Mention / Auto-assign Domain)

Migration `database/042_worship_service_workers.sql` creates `church.worship_service_workers` with 9 categories:

| Category | Label | Sample workers |
|----------|-------|----------------|
| `hdct` | HDCT | 14 Chấp sự members |
| `hd_hat` | HD Hát | 6 members |
| `ban_hat_thieu_nhien` | Ban hát Thiếu niên | Nguyễn Ngọc Uyên Thy |
| `ban_hat_thanh_trang` | Ban hát Thanh tráng | Huỳnh Lê Minh Hoàng Nguyên |
| `ban_hat_thanh_nien` | Ban hát Thanh niên | Hồ Thiên Thanh |
| `ban_hat_phu_nu` | Ban hát Phụ nữ | Nguyễn Ái Linh |
| `ban_hat_trung_nien` | Ban hát Trung niên | Trần Thanh Đức Tín |
| `ban_hat_trang_nien` | Ban hát Tráng niên | Chấp sự Nguyễn Khánh Linh |
| `ban_hat_lao_nien` | Ban hát Lão niên | Chấp sự Nguyễn Thanh Tân |

Key functions:
- `detectWorshipWorkerCategories(text)` — scans event text for `HDCT`, `HĐ Hát`, `Ban hát <Tên>` keywords, returns category array.
- `mentionSuggestions(db, {query, category})` — SQL search over `worship_service_workers` (active only, unaccent-insensitive).
- `mentionCategories(db)` — returns all categories with counts.
- `prependWorkerMentions(text, workers)` — inserts `@Name` lines at top of text.
- `stripLeadingWorkerMentions(text)` — removes leading `@` lines before parsing event title/time.
- `matchEventResponsibilities(text, people)` — extracts `Role: Name` and `@mention` responsibility assignments.

API routes:
- `GET /api/events/mention-suggestions?query=&category=`
- `GET /api/events/mention-categories`

---

## 8. Calendar Contribution Review Workflow

Non-write users can submit edits as drafts (`calendar_contributions` table). Admin/secretary reviews:

1. User submits `POST /api/events/contributions` with `requestId`, `eventId` (nullable), `eventDate`, `originalText`, `groupIds`, `contributorName`, `presetId`.
2. Admin lists `GET /api/events/contributions` → pending drafts.
3. Admin reviews `POST /api/events/contributions/review` with `{id, action: "merge"\|"reject", reviewText?}`.
   - `merge`: applies `proposed_text` to the event (updates existing or creates new), sets status `merged`.
   - `reject`: sets status `rejected`.

Mobile: `CalendarReviewPage` (`calendar-review-page.tsx`) renders the review UI.

---

## 9. Calendar Event Save Flow

`saveCalendarEvent(db, actor, input, id?)`:

1. Parses `EventInput` (eventDate, originalText, groupIds, presetId, version, requestId).
2. Validates preset, no preset change on existing events, no past dates.
3. Detects worship (`presetId === "worship-program"` or `isWorshipProgramText(originalText)`).
4. Requires `calendar.notify` if groups or worship.
5. Computes SHA-256 hash of {eventDate, originalText, groupIds, version, presetId}.
6. Checks `event_save_requests` for duplicate request_id (idempotency).
7. Creates or updates `church.events` with optimistic concurrency (`version` check).
8. Saves email groups, queues notification + push, saves responsibilities, queues worship Viber draft.
9. Writes audit log.

---

## 10. Adding a New API Endpoint (Web Admin)

Pattern (see existing routes in `apps/web-admin/app/api/events/*`):

1. Create route directory: `apps/web-admin/app/api/events/<name>/route.ts`
2. Route file:
```ts
import { calendarApi } from "../../../../lib/server/calendar-api";
import { myHandler } from "../../../../lib/server/calendar";
export const runtime = "nodejs";
export const GET = (request: Request) =>
  calendarApi(request, myHandler);  // read
export const POST = (request: Request) =>
  calendarApi(request, myHandler, true);  // write (asserts origin, parses body)
```
3. Add server function in `apps/web-admin/lib/server/calendar.ts` (or a new `lib/server/*.ts` file).
4. The function signature: `(db: DB, actor: AuthUser, input: unknown) => Promise<T>`.
5. Use `requireCalendar(actor, "calendar.read"\|"calendar.write"\|"calendar.notify"\|"calendar.groups")` for auth.
6. Return JSON-serializable data; errors thrown as `HttpError(status, message)`.

---

## 11. Adding a New Database Migration

1. Create `database/047_description.sql` (next number after 046).
2. Content:
```sql
BEGIN;
-- your DDL/DML
INSERT INTO church.schema_migrations(version) VALUES(47) ON CONFLICT DO NOTHING;
COMMIT;
```
3. Apply locally: `npm run db:migrate` (or `scripts/database.ts migrate`).
4. Grant permissions to `church_runtime` role for new tables.

---

## 12. Typecheck & Lint

```bash
# Root (all workspaces)
npm run typecheck

# Individual
cd apps/mobile-client && npx tsc --noEmit
cd apps/web-admin && npx tsc --noEmit   # runs next typegen first
cd packages/core && npx tsc --noEmit
cd packages/ui && npx tsc --noEmit
```

Prettier:
```bash
npm run format
```

Tests:
```bash
npm run test:unit
```

---

## 13. Environment Variables

**web-admin** (`.env.local` / production):
| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `APP_ORIGIN` | Allowed CORS origin (production required) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Email |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push |
| `DB_POOL_MAX`, `DB_CONNECT_TIMEOUT_MS`, `DB_IDLE_TIMEOUT_MS` | Pool tuning |

**Local development**: `scripts/local-database.ts start|setup|stop` manages a local Postgres instance.

---

## 14. Deployment (Vercel)

`vercel.json` defines two services:
- `mobile-client` (Vite, root `apps/mobile-client`) — SPA with `/index.html` fallback
- `web-admin` (Next.js, root `apps/web-admin`) — API routes

Rewrites:
- `/api/:path*` → web-admin
- `/(.*)` → mobile-client

Crons:
- `0 3 * * 5` → `/api/cron/check-worship-events` (Friday 10am Vietnam = 03:00 UTC)
- `0 17 28 2 *` → `/api/cron/annual-choir-memberships`

---

## 15. Graphify (Knowledge Graph)

The project has a knowledge graph at `graphify-out/`. Rules (from `AGENTS.md`):

- Before first grep/search/read for a codebase question, run `graphify query "<question>"`.
- Use `graphify path "<A>" "<B>"` for relationships, `graphify explain "<concept>"` for focused concepts.
- After modifying code, run `graphify update .` to keep the graph current.
- `graphify-out/graph.json` is regenerated on every build; large diffs are expected.

---

## 16. Common Conventions / Gotchas

1. **All mobile routes use `/client/` prefix.** `clientPath()` normalizes `/dashboard/*` → `/client/*` and `#/` hash URLs. Never use bare `/calendar` — use `/client/calendar`.
2. **`scrollableBody` on Dialog** creates a nested scroll container. Removing it gives a single scroll level (better mobile UX).
3. **`w-full` on textarea inside Dialog** can cause layout issues; use `block` + explicit padding + `min-h-[]` instead.
4. **Amber background for missing-info warning**: `border border-amber-200 bg-amber-200 p-3 mt-2` with black heading text.
5. **No commits unless explicitly asked.** Typecheck after changes.
6. **Vietnamese UI strings** — keep all user-facing text in Vietnamese.
7. **`@org/core` and `@org/ui`** are workspace packages; import them directly, no relative paths across apps/packages.
8. **Server functions always take `(db, actor, input)`**. Use `calendarApi()` wrapper for Next.js route handlers.
9. **Optimistic concurrency**: events use `version` column; clients must send `version` on updates, server rejects stale versions with 409.
10. **Read cache**: IndexedDB via `query-persistence.ts` (`readCachedListPage`, `useLocalQueryReady`). Members use `staleTime: Infinity`, no refetch on mount/focus/reconnect.
