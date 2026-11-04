# Gather · Organization Management Platform

Two runnable TypeScript applications share a design system, validated contracts, and a tenant-scoped demo adapter. A private workbook fixture is also available for local testing; see [local data setup and mapping](docs/local-testing-data.md). The UI is a working core implementation; authentication, production API hosting, invitation delivery, billing, and real-time transport are explicitly integration work. Do not deploy the demo as an authenticated service.

## Run

Node 20.19+ (or Node 22+) and npm 10+.

```sh
npm install
npm run dev:admin   # http://localhost:3000
npm run dev:mobile  # http://localhost:5173
npm run typecheck
npm test
npm run build
```

The admin build selects Next.js’s supported Webpack compiler, which also works in environments that prohibit Turbopack worker sockets.

Open both URLs independently. Browser storage is isolated by origin: the apps share contracts and code, but their demo data is not synchronized across ports. Organization switching preserves a separate dataset per tenant. Clear the `gather-demo-v1:*` localStorage keys to reset. This demo uses a fixed Alex Morgan identity; it does not implement sign-in or authorization.

## Workspace blueprint

```text
apps/
  web-admin/                 Next.js App Router
    app/                     overview, members, activity, settings, error boundaries
    components/              admin shell, command palette, member table, invite form
  mobile-client/             Vite + React SPA
    src/                     two-tab shell, paginated directory, member details, profile, providers
    public/                  standalone manifest and SVG icon
packages/
  core/src/
    schemas.ts               Zod models and derived TypeScript types
    demo.ts                  browser-local adapter (replace with HTTP)
    queries.ts               tenant-scoped Query keys and optimistic mutations
    state.ts                 Zustand organization and navigation state
  ui/src/
    index.tsx                owned shadcn-style Radix primitives
    styles.css               Tailwind v4 semantic tokens, light/dark, reduced motion
 database/001_initial.sql     PostgreSQL schema, RLS, mutation procedures
 docs/architecture.md        data model, permissions, API contracts, deployment steps
```

The shared UI follows shadcn/ui's owned-source pattern: Radix Dialog, DropdownMenu and Checkbox, `cva`, `cn`, semantic Tailwind tokens, and cmdk. It is intentionally committed as source rather than depending on a generated component registry. Tailwind v4 uses the official [Vite integration](https://tailwindcss.com/docs/installation/using-vite) for mobile and PostCSS for Next.js.

## Implemented behavior

- Admin: collapsible sidebar, small-screen navigation dialog, breadcrumbs, Cmd/Ctrl+K navigation, user menu, organization switcher, theme switching, KPI cards and accessible Recharts summary. The trend chart is explicitly illustrative; member/task KPIs use demo state.
- Directory: stable row IDs, multi-column sorting (Shift-click), name/email search, role and faceted multi-status filters, column toggles, row/page selection, pagination, CSV export, bulk activation/suspension, per-user roles, validated invite form, loading, empty and error states. Self access changes are blocked.
- Mobile: light mode by default, `max-w-md` frame, `dvh`, notch/home-indicator spacing, and a translucent two-tab bar: **Danh sách** and **Cá nhân**. The Vietnamese directory starts with a search field and a single filter button. It loads 12 members per page automatically near the end of the list using IntersectionObserver, with debounced accent-insensitive search, multi-department, area (KV1–KV13), and location filters, count summaries, loading states and retry actions. Selecting a row opens a dedicated detail screen with contact and personal information, linked family members, department and membership details. The list preserves search, filters, loaded pages, and scroll position when returning. Hash routes support browser Back/Forward and direct detail links. Profile shows the signed-in demo member’s full details and organization/theme controls. The task card remains available as a reusable component.
- Sample directories contain 96 and 64 people across the two organizations. Existing browser data retains invitations and access changes while gaining the larger directory. Initial personal, family, and department details are generated demo data. Authorized profile edits persist in browser storage with version checks and audit events. They are not saved to a production backend. The manifest is PWA-ready; offline caching, push, and service-worker installation are not implemented.

## Production boundary

Read [the architecture guide](docs/architecture.md) before wiring a backend. [The migration](database/001_initial.sql) uses a trusted-server identity context and fail-closed tenant policies. UI visibility is not an authorization boundary. Apply and test the migration in a disposable PostgreSQL instance before production; application tests do not validate PostgreSQL RLS.

## Verification in this workspace

Workspace TypeScript checks, both production builds, and all twenty-four core/data tests, twenty-six mobile navigation/detail/dropdown/pagination interaction tests, and two workbook mapper tests passed. Next.js builds with Webpack. Browser interaction checks were not run. PostgreSQL migration execution was not verified: local database initialization was blocked by the environment’s shared-memory restriction.

## Vietnamese client and profile editing

The client has no workspace/page header in the directory or member detail screens. The detail screen retains a back control above the member card. Profile editors can change personal/contact fields, multiple departments, area, location, position, family name and relative links, with inline per-field Save/Cancel controls and Vietnamese validation messages. Admins can edit all profiles; active managers can edit non-admin profiles in their own tenant; members and suspended users cannot edit. The demo mutation rechecks these permissions at save time. Role/status fields cannot be changed through the profile payload. Initial personal details remain illustrative.

Directory/profile queries refresh after a save. Repeated saves of an outdated version are rejected, and existing browser data is migrated without clearing membership changes. Server authorization and database persistence must replace this browser adapter before deployment.

## Department and location catalogs

`packages/core/src/catalog.ts` contains the 13 requested Ban ngành entries, KV1–KV13, and the supplied location labels with identical duplicates removed. Add future departments to this catalog; the validation, filter, and profile editor use the same definitions. Members can belong to multiple departments. Selecting several departments matches any selected department; area and location conditions are combined with that result. The mobile filter has no role, status, or sorting controls. List order is deterministic for pagination.

The editor saves department selections, area and location together with profile fields. Legacy personal/family edits and versions are retained. Previous single-department IDs from the replaced demo taxonomy are backed up as `legacyDepartmentId`; categories with no exact match in the new catalog require explicit reassignment rather than guessing a mapping.

## Mobile readability and custom dropdowns

Client-only typography uses 17px body text, 19px member names, 16px ordinary labels/buttons, and at least 14px secondary labels; the admin type scale is unchanged. Longer member and department text can wrap rather than being cut off.

In the profile editor, Ban ngành opens a custom Radix Popover with multiple checkbox selections, a selected count, clear-all action, and Done control. Phường/xã opens a custom panel with its accent-insensitive search field at the top, scrollable results, and immediate single selection. Khu vực uses the same custom panel pattern. Panels stay inside their owning dialog/fieldset for focus and disabled-form behavior, support Escape/outside-click dismissal, and constrain their height to available space. The existing Vietnamese interface text is retained.

`npm test` runs both the core contracts and the mobile DOM interaction tests. These test focus and selection behavior inside the filter dialog; they do not replace real-device visual checks.

## Imported local testing data

The supplied believer export has been mapped to an ignored, development-only fixture with 2,283 member records. Both dev apps automatically select the local dataset when the fixture exists. Start with `npm run dev:mobile` or `npm run dev:admin`; use `npm run import:believers -- /path/to/export.xlsx` to regenerate it. [The mapping guide](docs/local-testing-data.md) explains preserved source fields, household role handling, unmatched areas/locations, the separate test administrator, and production exclusion checks.

## Automatic pagination

The directory keeps its scroll observer active across fast local-data responses and rechecks the footer after each appended page. A frame-throttled scroll/resize position check supplements IntersectionObserver, including captured scroll events from a scrolling pane. A synchronous in-flight guard prevents duplicate requests. Automatic loading pauses while the directory is hidden, the filter sheet is open, a request is running, or the next-page request has failed. A visible load/retry action is available as a fallback.

## Full-screen filters and age ranges

The directory filter opens a full-height view that slides in from the right, covering the tab bar. Ban ngành, Khu vực, Phường/xã and Khoảng tuổi open dedicated selection screens with back navigation. Department multi-select and location search remain available; the filter flow has no dropdown controls. Changes stay in a draft until Apply. Leaving the filter discards unapplied changes, while returning between its screens preserves the draft. Reset clears all conditions. The profile editor retains its existing dropdown controls.

Age filtering accepts an inclusive minimum, maximum, or both (0–130), with quick presets. Age is computed from date of birth using the current calendar date in Asia/Ho_Chi_Minh; the age stored in the workbook is not substituted for missing dates. Unknown birth dates stay visible with no age filter and are excluded when an age bound is active. Reversed, fractional and out-of-range bounds are rejected. The age condition combines with all other filters before pagination and appears as a removable active filter chip.

## Search-first directory and age presets

Danh sách starts with an empty prompt asking users to search or apply filters. No directory query or automatic pagination runs until a nonblank search or active filter exists. Clearing the last criterion hides cached rows and restores the prompt. Search typing is debounced; filtered/search results retain the existing paginated scrolling behavior.

The age quick presets are exactly 0–12, 13–18, 19–30, 30–40, 40–50 and 50+. Endpoints remain inclusive as requested. Full-screen Phường/xã navigation focuses the title with `preventScroll`, matching the other screens. Its search field receives focus only when tapped, so the mobile keyboard does not resize the viewport during the slide transition.

The age selector also includes **Không có dữ liệu tuổi**. This exclusive preset clears numeric bounds and returns profiles whose age cannot be calculated from a valid birth date. It combines with department/area/location/search filters, counts as an active criterion on the search-first directory, and can be removed through its filter chip. Selecting a numeric preset or typing an age switches back to normal age-range filtering.

The member summary uses a circular avatar beside the name, with departments and status below the name. Authorized users edit fields directly on the detail screen by selecting a field; there is no global edit button or separate edit screen. Contact values link directly to `tel:` and `mailto:`; separate call/email buttons are omitted. Faith and baptism dates always appear in Thông tin trong Hội Thánh, using Chưa cập nhật when empty. Other missing dates stay hidden in read-only views.

## Inline member updates

The detail page supports one active inline field at a time, with local Save/Cancel controls, Zod validation, tenant permission checks, and the version captured when editing starts. The screen remains in place after saving and its queries refresh. Contact values retain call/mail links; authorized users select their field labels to edit them.

Department membership roles are stored as `departmentRoles[departmentId]`, separate from access roles. Faith/baptism dates and supplemental profile values persist as optional overrides, preserving older local records and original imported source values until explicitly changed. The removed source-summary fields remain in the private import for provenance, but are not displayed in the client.

## Notes, visits, and list updates

The Ghi chú section stores notes as a vertical stack, newest creation date first, with author and time. Thông tin trong Hội Thánh includes Lịch sử thăm viếng, ordered by visit date, and supports adding dated visits with optional text. A known imported or previously saved latest-visit date appears as a source-labeled entry without invented details. Notes and visits use independent persisted collections, retain their history across profile-field saves, and enforce the same tenant/active-role permissions as profile editing. These remain browser-local demo data.

Gia đình and Ban ngành each show a Cập nhật action below their lists for authorized users. It opens the existing inline collection editor to add/remove memberships. Department role labels are visually hidden; an empty/default role displays Ban viên, and a specific saved role displays its value.
