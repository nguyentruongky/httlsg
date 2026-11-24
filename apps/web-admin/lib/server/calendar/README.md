# Calendar server feature

Start at [`../calendar.ts`](../calendar.ts), the public facade used by routes and
other domains. The facade only re-exports supported operations.

- **Read events:** `event-queries.ts` (authorization and read use cases),
  `event-repository.ts` (typed storage access), `event-mapper.ts` (public DTOs)
- **Save or delete:** `event-service.ts` (creation SQL in `event-create.ts`)
- **Review drafts:** `contributions.ts`
- **Manage recipients:** `email-groups.ts` and `group-links.ts`
- **Queue or review deliveries:** `notifications.ts`
- **Find worship workers:** `workers.ts`
- **Check access:** `policy.ts`

Use direct sibling imports internally. Services receive the caller's database
connection and authenticated actor where required. Transaction ownership stays in
the existing route/session infrastructure. Public draft submission retains its
separate entry point and protection; it is not an authenticated write service.

For a request walkthrough and extension conventions, read the
[root architecture guide](../../../../../docs/architecture.md).

For request adapters, transaction ownership and service/repository conventions,
read the [backend development guide](../../../../../docs/backend-development.md).
