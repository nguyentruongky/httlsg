# Production loading performance

The changes reduce application work; production speedups have not yet been measured.
Deploy the backend additions before the frontend so bootstrap payloads and paginated
personnel responses are available when the new client starts.

## Startup and navigation

Login, OTP verification and refresh return `user`, `accessToken`, `departments` and
`navigation.hasAssignments`. Existing response fields and endpoints remain available.
The browser restores through the existing serialized refresh-token flow instead of
first making an unauthorized `/api/auth/me` request. Session rotation, replay detection,
CSRF checks and row locks remain enabled. The catalog is no longer loaded for every
API request. Department identifiers use structural validation and write operations
validate referenced departments in the database.

Routes preload their code before committing navigation, keeping the old page visible
while downloads finish. Pointer/focus prefetch only loads likely member/department
route modules, not their private data. Charts, calendar exports and schedule editors
have separate asynchronous chunks. A missing deployment chunk may trigger one guarded
reload per path; persistent failures use the existing error boundary.

## Device cache

Successful whitelisted member-list/profile-summary, personnel-list, department-list,
department-catalog and schedule-category queries persist in IndexedDB for 24 hours.
Only the first page of infinite queries is stored. Cached data is shown after server
authentication and revalidated on page entry, focus and reconnect. Storage is partitioned
by organization, account, role/scopes, permissions, auth version and cache schema.

Tokens, credentials, OTPs, profile source records, notes, visit histories, mutation
state and private exports are not persisted. Profile history is loaded separately near
its viewport section. Account/scope changes, logout and session expiry clear stored
reads. Storage errors or blocked IndexedDB fall back to in-memory/network reads;
individual open/transaction operations have bounded waits. A sanitized snapshot is
limited to 5 MB. Authenticated HTTP responses remain `private, no-store`; the service
worker does not cache API responses.

The cache version is `read-cache-v1`; bump it when cached response shapes become
incompatible. One-day retention is not one-day freshness: queries refresh on entry.

## Lists and SQL

Member and department continuation requests send `summary=0` and use one look-ahead
row to determine the next page. The first page retains exact totals and dashboard
summary counts. Personnel supports `q`, `role`, `department` and optional `page`;
paginated responses retain the global personnel total on page one. Omitting `page`
keeps full filtered results available for CSV export. List rendering retains rows,
selection, stable totals, loading space and retry controls while requests are pending.
Successful profile writes update cached profiles/member rows immediately, then
invalidate affected member/department/personnel queries.

Schedule responsibilities use the batched loader for the page's dates instead of a
`getSchedule` call per schedule. No new indexes have been added: index migrations
require production query-plan evidence rather than guessing at the bottleneck.

## Timing and later verification

Authenticated requests and login/refresh/OTP verification expose `Server-Timing` for
pool acquisition, authentication, SQL, JSON serialization and total duration.
Authentication includes its SQL work, so timing categories overlap and must not be
summed. Set `PERFORMANCE_LOGGING=true` to log normalized route, status, query count
and durations. SQL text, parameters, tokens and member records are never logged.

Pool defaults are unchanged: `DB_POOL_MAX=10`, `DB_CONNECT_TIMEOUT_MS=5000`,
`DB_IDLE_TIMEOUT_MS=10000`. Increase capacity only after observing connection waits
and confirming the database connection budget.

Browser Performance entries include `church:bootstrap`, `church:cache-restore`,
`church:navigation`, `church:first-members`, `church:first-personnel` and
`church:first-department`. Navigation measures code preparation and the next paints;
first-list measures time from list mount to available initial data. These are local
Performance entries, not a new analytics collector. Compare cold/warm production
p50/p95 timings, SQL counts, pool waits and initial transferred JavaScript before
claiming an improvement or changing hosting regions.

No tests, builds, manual browser checks or database modifications were run for this
implementation. Later explicitly authorized verification should cover cold/warm
startup, expired/revoked sessions, cross-account/scope isolation, storage failure,
24-hour expiry, stale-data refresh, offline/slow pagination, accurate totals,
profile histories, CSV completeness, stable schedule query counts and route chunk
failure recovery.
