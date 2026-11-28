# Architecture and code organization

This is the current single-church application architecture. Start here when joining
the project. The [historical architecture](architecture-history.md) describes the
original demo and must not be used as the live database or authentication design.
See [design-system.md](design-system.md) for visual tokens and engineering rules,
and [backend-development.md](backend-development.md) for backend patterns and extension guidance.

## Read the project in this order

1. Read the root README for setup, environment requirements and feature status.
2. Follow one mobile route: `app.tsx` → `workspace/use-workspace-route.ts` →
   `workspace/workspace-content.tsx` → the feature page.
3. Follow one request: the feature's `@org/core` API helper → a Next.js
   `app/api/**/route.ts` → its request wrapper → its server service → PostgreSQL.
4. Read the feature documentation before changing permissions, notifications,
   local drafts or printing. These workflows have requirements beyond their UI.

## Workspace map

```text
apps/
  mobile-client/src/
    app.tsx                     Application composition
    client-router.ts            Browser navigation and history
    route-modules.tsx           Screen import/preload registry
    navigation/
      deferred-route.tsx        Shared deferred loading and chunk recovery
    workspace/
      workspace-route.ts        Pure URL matching and redirect rules
      use-workspace-route.ts    Session-aware route adapter and navigation effect
      workspace-content.tsx     Screen composition and retained directory state
    calendar/                   Calendar screens and feature components
    schedules/                  Ministry assignment screens
    elections/                  Election screens and local election workflow
  web-admin/
    app/api/                    HTTP entry points; URLs follow Next conventions
    lib/server/
      api/
        authenticated-json.ts   Shared authenticated JSON request lifecycle
      calendar-api.ts           Calendar request policy adapter
      schedule-api.ts           Schedule request policy adapter
      calendar.ts               Public calendar facade; explicit exports only
      calendar-create.ts        Compatibility facade for the moved creation helper
      calendar/                 Calendar implementation, grouped by responsibility
      db.ts                     Shared database and transaction infrastructure
      http.ts                   JSON parsing, safe errors and origin validation
      session.ts                Actor authentication and request scope
packages/
  core/src/                     Shared contracts, pure domain rules and API client
  ui/src/                       Shared visual components and theme
database/                      SQL migrations (at repository root)
docs/                          Feature behavior and contributor documentation
```

The frontend is partly feature-oriented already. Older member and department
screens still live directly under `src/`, and other server domains remain flat.
Move those when working on the relevant feature, updating imports deliberately;
the map above describes actual boundaries rather than a completed repository-wide
migration.

## Patterns used here

| Pattern                                 | Concrete use                                                      | Why it helps                                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Feature modules                         | `lib/server/calendar/`, mobile calendar/schedule/election folders | Related behavior is discoverable together.                                                                            |
| Facade                                  | Server `calendar.ts`                                              | Routes use a small, stable public surface while implementation can move.                                              |
| Service functions                       | `calendar/event-service.ts`, `contributions.ts`                   | A named operation coordinates validation, persistence and durable jobs.                                               |
| Query functions                         | `calendar/event-queries.ts`                                       | Authorized event reads stay separate from mutation orchestration; persistence and DTO mapping have dedicated modules. |
| Dependency injection through parameters | Server functions receive `db` and `actor`                         | Transaction and authenticated identity are visible at the call boundary.                                              |
| Pure rules with a React adapter         | `workspace-route.ts` + `use-workspace-route.ts`                   | URL rules are readable without hooks, browser state or navigation effects.                                            |
| Registry plus loading adapter           | `route-modules.tsx` + `navigation/deferred-route.tsx`             | Screen registration is separated from import retries and error recovery.                                              |

Calendar event reads use a focused repository and DTO mapper; the JSON request
lifecycle uses a shared template with domain adapters. Use plain functions and
direct imports unless there is a concrete need for another abstraction. SQL belongs near the domain operation that owns it. Introduce a
repository abstraction only when it removes meaningful duplicated persistence
logic or supports a real alternative implementation; there is no generic repository
or dependency-injection container to learn here.

## Calendar module map

| File under `apps/web-admin/lib/server/calendar/` | Responsibility                                              |
| ------------------------------------------------ | ----------------------------------------------------------- |
| `policy.ts`                                      | Calendar permission checks and UUID validation.             |
| `event-queries.ts`                               | Authorized event reads and locked review reads.             |
| `event-repository.ts`                            | Shared SELECTs, typed storage rows and row-locking queries. |
| `event-mapper.ts`                                | Storage-row to public event DTO conversion.                 |
| `event-service.ts`                               | Save/delete orchestration, version checks and idempotency.  |
| `event-create.ts`                                | Batched creation of an event and its durable jobs.          |
| `group-links.ts`                                 | Validation and replacement of event-to-email-group links.   |
| `email-groups.ts`                                | Email group and recipient management.                       |
| `contributions.ts`                               | Public draft submission and authenticated review.           |
| `notifications.ts`                               | Email queueing, delivery history, retries and failure feed. |
| `workers.ts`                                     | Worship worker and category lookup.                         |

Outside the feature, import the public facade (`lib/server/calendar.ts`). Inside
`calendar/`, import the specific sibling module. Importing the facade internally
would point back at the whole feature and make dependency cycles harder to see.
New helper functions are internal unless explicitly exported by the facade.

### Follow an event save

```text
mobile calendar/event-editor.tsx
  → shared core API client
  → web-admin app/api/events/route.ts (or events/[id]/route.ts)
  → calendarApi(request, handler, true)
  → authenticatedJsonApi (command mode)
  → withActor / transaction
  → calendar.ts facade → calendar/event-service.ts
  → event-repository + event-mapper + group-links + event-create or update SQL
  → durable email/push/worship jobs and audit records
  → JSON response
```

The request wrapper owns the transaction boundary; the extracted modules receive
its DB connection. They must not independently commit or start a parallel write
transaction. Keep optimistic versions, request receipts, audit records and queued
jobs in the same operation. Delivery workers handle external sending.

Public contribution submission is a distinct existing entry point with its own
protection and limits. Do not assume every function in the feature takes an actor
or is reached through `calendarApi()`; inspect the route before changing access.

## Frontend boundaries

The member directory shows pinned and recently viewed people when no search or
filter is applied. `member-directory/member-shortcuts.ts` persists only IDs on the
current device, separately for each actor, organization, and directory/team scope.
`use-member-shortcuts.ts` resolves those IDs through authorized member reads and
keeps the returned profiles in TanStack Query. Successful profile reads record
recent views; the directory cards expose pin/unpin controls. These shortcuts reuse
the normal cards and do not replace search results or bypass read permissions.

`workspace-route.ts` interprets paths and existing redirect rules. It has no React
or browser dependencies. `use-workspace-route.ts` reads authentication, derives
navigation access, and applies path changes through the client router. Its return
shape remains the contract consumed by workspace content and tabs.

`route-modules.tsx` lists deferred screen imports and chooses preloads.
`navigation/deferred-route.tsx` owns import deduplication, failed-chunk recovery,
and the page error boundary. Eager main-tab screens and the retained directory
remain managed by workspace content to preserve their navigation behavior.

Put reusable presentation in `@org/ui`, shared schemas and pure domain rules in
`@org/core`, and feature-specific hooks/components next to their screens. Browser
code must never import `web-admin/lib/server` or database credentials.

### Reusing navigation and election summaries

`BottomNavigation` in `@org/ui` renders links or buttons from typed items, including
active/disabled states, accessible navigation labels, and keyboard focus styles.
Workspace tabs and election navigation share this renderer. Their feature adapters
still own route matching, permission checks, labels, icons, and layout classes.
Use links for destinations and buttons for local view changes; do not move router
or authentication dependencies into the shared component.

Election results compose `ElectionResultsMetrics` and `ElectionResultsTabs` rather
than duplicating their markup. The metrics panel accepts a counted-ballots slot,
so saving that value stays with the caller. Both election metrics presentations
use `domain/summary-metrics.ts` for labels and counts, including separating blank
ballots from other invalid ballots. Keep this election-specific presentation logic
inside the feature rather than adding it to the shared UI package.

## Making your first change

- UI appearance: start with the existing shared primitive and semantic tokens.
- New calendar behavior: find the responsible module in the table; keep the route
  thin and add public exports only if consumers need them.
- New mobile path: update the pure route matcher, its rendering branch, and the
  preload registry if that screen is deferred.
- Database behavior: inspect the existing migration and service authorization;
  use a new numbered migration rather than rewriting deployed SQL.
- Documentation: update the owning feature guide and this map if files move.

Run `npm run typecheck` after changes. Per current project instructions, do not add,
update or run tests (including manual testing) without an explicit user request.
Typechecking verifies static integration; it does not verify runtime behavior.

## Further restructuring

The calendar extraction is a behavior-preserving structure change. Existing public
names, HTTP paths, schemas, SQL operations, permission rules and transaction ownership
are retained. Other domains can adopt the same structure when touched. Prioritize
large mixed-responsibility files; do not create layers merely to match this example.

Feature-specific CSS still appears in shared and app-wide stylesheets. Move it only
with a clear feature owner and preserved import order, especially for print and
mobile dialog rules. See the design-system guide for remaining review findings.
