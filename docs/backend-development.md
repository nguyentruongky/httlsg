# Backend development patterns

Start with [architecture.md](architecture.md) for the workspace map. This guide
explains the backend patterns implemented in the current code and how to extend
them. Calendar is the worked example; other domains can adopt these boundaries
incrementally.

## Request lifecycle: template with domain adapters

Calendar and schedule routes share
`apps/web-admin/lib/server/api/authenticated-json.ts`. It implements the repeated
request sequence once:

```text
request metrics
  → origin check for body requests
  → bounded JSON or query-string parsing
  → withActor: authentication + transaction
  → domain operation(db, actor, input)
  → commit
  → optional afterCommit transformation/scheduling
  → JSON response
```

Failures pass through an optional domain error mapper and the existing safe
`failure()` response formatter. Services throw errors rather than constructing
HTTP responses. Request timing and response headers remain centralized.

`calendar-api.ts` and `schedule-api.ts` are policy adapters. Routes keep their
existing signatures and import paths; the adapters configure the shared template.

| Internal mode | Input                 | Origin validation | Shared advisory write lock |
| ------------- | --------------------- | ----------------- | -------------------------- |
| `query`       | URL search parameters | No                | No                         |
| `body-query`  | Bounded JSON          | Yes               | No                         |
| `command`     | Bounded JSON          | Yes               | Yes                        |

Every mode still runs inside the transaction provided by `withActor`. The mode
names do not enforce PostgreSQL read-only transactions or authorize an operation.
Services must validate input and check resource permissions.

Calendar's existing `"read-body"` argument maps to `body-query`; its body limit
remains 200,000 bytes. Schedule body requests retain the 1,100,000-byte limit.
The schedule adapter keeps its domain-specific duplicate-conflict message and
schedules published/cancelled push delivery through Next.js `after()` after commit.
It narrows the returned object before accessing notification fields instead of
using `any`.

Use the appropriate domain adapter for a new route. Add shared lifecycle behavior
to the template only when it applies to its consumers. Public endpoints, binary
exports, push actions and election dispatch retain their specialized wrappers;
their input, CSRF and transaction rules need deliberate migration, not a blanket
replacement.

## Application services: one named use case

`calendar/event-service.ts` coordinates save and delete operations. The public
`calendar.ts` facade exposes these functions without exposing storage helpers.
The operation receives `db`, `actor` and `unknown` input explicitly.

Inside a service:

1. Parse input through the domain Zod schema and authorize the operation.
2. Load the required state and lock rows when the workflow requires it.
3. Check domain rules, optimistic versions and idempotency receipts.
4. Persist related changes, audit records and durable notification jobs using the
   same connection.
5. Return the documented DTO, leaving transport serialization to the adapter.

Keep checks in the service even when the UI already hides forbidden actions.
Repositories receive no implicit current user, and caller-supplied actor IDs are
not authentication.

## Repository and mapper: separate storage from the API

Calendar event reads now use `calendar/event-repository.ts`. Its focused functions
own the shared event SELECT, range reads, single-row reads and review locks.
`CalendarEventRow` describes PostgreSQL snake_case fields and timestamp values.

`calendar/event-mapper.ts` converts that row into the shared camelCase
`CalendarEvent` DTO. It preserves the existing private-email-group visibility and
time formatting. `event-queries.ts` owns permission checks, validated range limits,
not-found behavior and the decision to expose private groups.

This boundary removes raw SELECT fragments from the save service and removes
`Record<string, any>` from event mapping/update rows. Creation and update queries
also declare the event row type they return. These types are static contracts,
not runtime database-row validation.

Repositories are internal persistence helpers. Call them from an authorized service
or query operation, pass the transaction's DB connection, and use parameterized
SQL. An `includeDeleted` repository option grants no permission; `calendarEvent()`
continues to enforce the admin restriction before passing it.

Keep complex write SQL close to its use case when that makes atomic behavior
clearer. The batched event creation and related durable jobs remain together in
`event-create.ts`; the repository extraction does not split them into extra round
trips or independent transactions. Avoid a universal CRUD base class.

## Unit of work: caller-owned transactions

The existing `withActor()` / `transaction()` boundary is the unit of work. Nested
services reuse its DB connection. A row lock in the repository lasts until that
transaction ends. Do not call `pool()` to perform part of the same mutation on
another connection, and do not independently commit inside a domain service.

Preserve request IDs and optimistic versions when composing services. A failed
operation must not leave its audit or durable delivery rows partially applied.
The shared advisory write lock is existing behavior; changing its scope is a
separate concurrency decision.

## Durable jobs and after-commit work

Write notification jobs in the transaction. The after-commit hook may schedule or
trigger delivery only after `withActor()` completes successfully. It does not make
external work part of the database transaction.

An after-commit failure cannot roll back an already committed operation. Keep
retries tied to durable jobs and idempotent request IDs. Calendar hooks keep their
existing error behavior; this refactor does not silently convert hook failures
into successful responses. Schedule delivery failures remain deferred to the
existing retry flow.

## Boundaries to preserve

- Shared schemas and DTOs live in `@org/core`; database credentials and server
  modules stay in web-admin.
- Keep Vietnamese expected-error messages and the existing `{ message, code? }`
  response contract. Never return SQL or driver errors to the client.
- Origin validation and CSRF header checks are distinct. The shared JSON template
  preserves calendar/schedule origin checks; it does not add election-style
  `X-Church-CSRF` enforcement or change authentication policy.
- Keep public submission paths separate from authenticated services and preserve
  their rate limits and resource checks.
- Use explicit facade exports and direct sibling imports inside a feature.
- Update feature documentation when behavior or contracts change. Run
  `npm run typecheck`; do not add, update or run tests or manual testing unless
  explicitly requested under the current project instructions.
