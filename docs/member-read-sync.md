# Versioned local member reads

The browser stores authorized member reads in IndexedDB (`church-private-read-cache`). Cached lists and profiles render without fetching them again on each mount or focus. All loaded list pages are retained, subject to a 30-day retention period and a 20 MB snapshot limit. Browser storage failure falls back to ordinary network reads.

There are three independent versions:

- `read-cache-v4` identifies the browser snapshot format. Change it when cached data becomes incompatible.
- The authorization scope includes the user, authentication version, permissions, roles and department scopes. Logout or a scope change clears private cached reads.
- Production has a sync epoch and a monotonically increasing data revision. Member edits continue to use the profile's existing optimistic `version`; the sync revision does not replace that concurrency check.

Migration 034 installs a transactional revision counter and a latest-change row per member. Deferred database triggers record profile, account, membership, role, family, board, note, visit and status-history changes at commit. This includes direct SQL writes. The counter is locked only during commit, so clients cannot skip a change from an older transaction that commits later. Hard deletions leave a change marker without retaining profile contents.

On app launch or an explicit browser refresh, the client sends its epoch, last revision and locally cached member IDs to `POST /api/member-sync`. Navigation, focus, foregrounding, reconnecting and timers do not trigger sync. There is one in-flight sync per client; additional batches are requested only when changes exceed one batch. An unchanged database returns only revision metadata. No list/profile payloads are downloaded in that case, and the IndexedDB snapshot is not rewritten merely for the check.

Changed cached members are returned in batches of at most 100 change markers. Each profile is authorized against the current session before returning data. The client updates matching cached rows, removes deleted or inaccessible members, and refreshes only affected views that cannot be reconciled from an existing row (for example, a newly visible member entering a list, department counts or a new department membership). This may require refreshing a list when its composition changes; normal edits of already-loaded rows use the returned member instead of fetching the list again.

The local revision advances only after applying a complete batch and completing required active-view refreshes. Failed requests retain the old revision for retry on the next launch or explicit refresh. Rows and the cursor are persisted in the same IndexedDB snapshot. A different epoch or a revision rollback resets cached reads, covering database rebuilds/restores. Own mutation responses update local records immediately but do not advance the global cursor: doing so could skip another user's concurrent edits.

Department counts are also populated by sync, rather than by opening the department page. A sync response includes counts when the server revision changed or the local counts snapshot is missing/invalidated. Otherwise it omits them. The page observes this persisted cache without issuing `GET /api/admin/departments?view=counts` on navigation, focus or reconnect.

Passwords, tokens, credentials, original import source data, notes and visit-history contents are not persisted. Editing still requires an authenticated online API request; this mechanism does not queue offline writes.

Apply migration 034 before deploying the sync endpoint and browser controller. Older server builds remain compatible with its additive tables and deferred tracking triggers. No historical status entries or member fields are modified by the migration.
