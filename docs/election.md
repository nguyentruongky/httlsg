# Bầu cử / Election module

For anonymous PIN/QR voting, see [Public election voting](public-elections.md).

The module is at **Cài đặt → Bầu cử** (`/client/admin/elections`).
For scrutineers, `/client/elections/:electionId` opens the assigned election. Administrators use the Settings page. There is no separate election workspace tab.
The new module stores elections and candidates in `church.election_contests` and
`church.election_nominees`. Migration 051 removes the unused legacy
`church.elections`, `church.election_candidates`, and `church.election_votes`
tables only when empty; it refuses to delete legacy records or cascade dependencies.
It uses existing accounts and sessions. There is no separate election login.

## Setup

1. Install workspace dependencies with `npm install`.
2. Run `npm run db:migrate` against the intended database to apply all migrations through 054. Deploy the updated API and client together with migration 052; old application versions require tables and paper columns that this migration removes. Back up the database and pause election writes during rollout.
3. In the existing role assignment dialog, grant `election_admin` to election organizers and `election_scrutineer` to operators. Existing `admin` accounts can administer all elections. Other church management roles do not implicitly receive election access. Multiple roles are supported.
4. Start the usual admin and mobile applications with `npm run dev`.

Optional environment variables on web-admin:

| Variable                     | Default                                                                 | Purpose                                                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ELECTION_SELF_VOID_SECONDS` | `60`                                                                    | Server-received time window for an operator to void their own most recent ticket in an open round; `0` disables self-void. Maximum 3600 seconds.                           |
| `ELECTION_PDF_FONT`          | `assets/NotoSans-Regular.ttf` relative to web-admin's working directory | Optional absolute font path override. A full Noto Sans font and its SIL OFL license are bundled in `apps/web-admin/assets`; Next.js includes the font in server artifacts. |

The maximum number of selections is the shared, non-configurable `MAX_ELECTION_SELECTIONS = 10` in `packages/core/src/elections.ts`.

The admin results view has five cards: manually counted ballots, submitted ballots, valid ballots, invalid ballots, and blank ballots. **Tổng số phiếu đếm được** accepts a nonnegative integer and saves on Enter or blur through the admin-only `POST /api/elections/:id/counted-ballots`. Migration 058 stores it as `election_contests.counted_ballots`. Updates are audited and reject stale edits; this independent count does not change submitted tickets, candidate tallies, or percentages.

## Run an election

1. An administrator creates a named election, with an optional description. Use its numeric election ID to identify it.
2. In **Danh sách ứng viên**, click **Nhập Excel**. The application reads the `Candidates` worksheet or the first worksheet, accepting `Họ và tên`, `Họ tên`, `Tên ứng viên`, or `full_name` as the name column. Import loads an editable, paginated worksheet on screen; it does not write to the database.
3. Review every row. Edit names and additional columns, tick **Tham gia** for Round 1, use **Thêm ứng viên** for manual entries, and **Xóa** to remove a row. New candidate numbers are allocated only when saved; existing numbers remain permanent. If an imported number is unknown, choose **Tạo số tự động** for that row. Extra workbook columns are preserved. Unknown member links and duplicate normalized names are reported for review.
4. Click **Lưu danh sách** to write the reviewed worksheet to the database. Removing saved candidates requires confirmation; their numbers remain retired and are never reused. Saves carry a server revision and reject concurrent changes instead of overwriting another administrator's edits. The server validates all rows again and creates or refreshes draft Round 1. Import and manual edits are disabled after any round has opened. File imports log the original SHA-256 and the final saved list hash.
5. In **Tổ kiểm phiếu**, find a member by name and add them to the scrutineer list. Saving a scrutineer's name does not require or create a login account, email address, phone number, or password. The list is loaded from member profiles and includes members without accounts. Existing account credentials are preserved. Login provisioning is a separate step for operators who will sign in to enter ballots. Removing a scrutineer is blocked while they are assigned to an open round.
6. Scrutineers log in with existing accounts and land directly in `/client/elections`, which automatically selects an assigned open round, otherwise an assigned draft round. A draft round shows **Đang chờ mở vòng** and polls every five seconds; the command/search entry screen appears automatically when it opens. If no assignment exists, the screen waits for an administrator to assign one. With multiple assignments, a selector allows switching rounds. A closed round shows only the operator's submissions and report/backup actions. Administrators keep their existing landing page and Settings management screens. Scrutineers never see running totals from other operators.
7. The administrator checks **Kết quả**. **Bắt đầu** is available once the round has candidates and the election has saved scrutineers (or existing round assignments). Starting automatically assigns eligible existing roster accounts to the saved teams. Members without accounts remain on the roster and do not block starting. Four icon cards show **Tổng số phiếu**, **Hợp lệ**, **Bất hợp lệ**, and **Phiếu trắng**, all computed from received tickets and refreshed every five seconds. Blank ballots are shown separately from other invalid ballots. Voided ballots remain in the received total but are excluded from valid votes and percentages. Equal vote totals show **≡**. There are no manual paper totals or paper reconciliation controls.
8. Click **Kết thúc**, review received tickets and heartbeat-reported pending counts in the confirmation dialog, then choose **Xác nhận kết thúc**. Keep operator devices connected long enough to synchronize before closing.
9. For another round, choose Top X, minimum votes, or manual selection. Review the preview and every checkbox. Equal votes at the Top X boundary show a warning; the application does not resolve ties. Confirm to create the next draft round. Scrutineers are copied; draft candidates and assignments remain editable until opening. Carry-over provenance is retained for unchanged candidates.
10. Once the round is closed, **Xuất Excel** appears on the result page. The result page has no PDF export button. Export each operator's work PDF and JSON backup separately. A closed round can be reopened only with a reason and only before any later round exists. Archiving is available through the admin API and requires no open round.

## Team membership invariant

Team assignment is stored directly in PostgreSQL. `church.election_scrutineers` stores election-wide roster rows with `round_id IS NULL` and `(election_id,user_id,team_id,team_name,team_sort_order,position)`. Partial unique indexes enforce one roster entry per person and unique saved team positions. A member belongs to at most one team per election. Stable team UUIDs, names, display order, creation timestamps, and empty teams are preserved in `election_contests.scrutineer_teams` JSON metadata. Adding appends to the explicitly selected team's saved member order. Name sorting, alphabetical insertion, chunking by member count, and automatic balancing must never determine membership.

Session-specific rows in the same table have non-null `round_id`, an internal account UUID code, pending count, and heartbeat. Round assignments require an existing login account; election-wide roster membership does not. Round rows retain a snapshot of their team metadata when assigned. Explicit roster reordering updates only election-wide positions, preserving historical round assignments. Database triggers reject assignments to another election or an unknown team.

The API returns explicit `teams[].members` in their saved position order. The UI renders that structure unchanged and updates only after the database confirms a mutation. A repeated add to the same team is idempotent and does not reorder members. Adding a member already in another team returns a conflict; an intentional transfer requires removing the old assignment first. Removal validates the expected team ID, so a stale client cannot delete a different team's assignment. New teams are persisted through the API, not created only in React state. Dragging a member item explicitly reorders members within one team using mouse, pen, or touch, with the complete member set checked again by the server. Dropping outside the team or cancelling does not change membership. Team removal does not revoke a person's global role or change other elections.

Migration 049 preserves known legacy election members as **unassigned** using the latest recorded grant/revoke action. The old code saved no team ID, so historical groups cannot be reconstructed from alphabetically sorted names. Uncertain members are never guessed into teams. The UI shows these names in **Chưa có phân công tổ đã lưu** with an explicit team selector for one-time recovery. All subsequent membership changes log the member ID, team UUID, team name, and position.

## Keyboard entry

Search runs entirely over the locally cached ballot and ignores accents, case,
and token order. Results are numbered by their current filtered position.
Commands run on Enter:

| Command           | Action                                                                |
| ----------------- | --------------------------------------------------------------------- |
| `-number` + Enter | Select/toggle the candidate at that position in the filtered results. |
| Enter             | Select the only candidate when the filter has exactly one result.     |
| `-pt` + Enter     | Immediately submit a Phiếu trắng ticket with no selections.           |
| `-bhl` + Enter    | Immediately submit a Bất hợp lệ ticket with no selections.            |
| `-s` + Enter      | Immediately submit the currently selected ticket.                     |

After selection, the search clears, the full candidate list returns to the top,
and the name appears in the ticket preview. `ky -2 -s` + Enter selects the second
result for `ky` and submits that computed selection. All tokens are validated
before the ticket changes; invalid positions or commands never submit. Use
`-pt` or `-bhl` separately. The old `-b`, `-c`, `-clear`, and `-undo` entry commands
are no longer supported. Submitting `-s` without selections shows instructions
for choosing one of the explicit blank/invalid commands.

Eleven or more selections are still allowed and saved as invalid/over_limit.
Explicit invalid tickets use invalid/manual, distinct from invalid/blank, and
never contribute candidate votes. The action bar and on-screen command help
match these shortcuts. No extra confirmation is required for `-pt` or `-bhl`.

## Offline storage and recovery

The independent `church-election-backup` IndexedDB database contains `local_ticket`, `local_action`, and `local_meta`. Session expiry does not delete it. Cache and queue keys are scoped to the logged-in user. The application requests persistent storage, though the browser may decline it.

Ticket submission atomically saves a pending ticket and a SHA-256-chained action before sending any request. Sequence allocation and action appends share atomic IndexedDB read/write transactions across tabs. Each account has its own chain. `verifyElectionChain()` verifies exported action records. The queue sends tickets in creation order with exponential retry backoff; repeated UUIDs with matching identity and selections are idempotent successes. Authentication expiry leaves tickets pending for re-login. Definitive server rejections remain visible locally and are not silently retried or deleted.

The background worker remains active across workspace tabs. Pending/rejected counts are shown in the workspace; round heartbeats report pending counts to the administrator. The entry screen prompts for backup export when it observes a closed round. Backup filenames follow `backup_E{id}_R{n}_S{code}_{date}.json`. A backup contains that account's tickets for the selected round and its complete per-account action chain, so chain verification is possible.

Administrators can upload JSON under **Đối chiếu bản sao JSON**. The server verifies the chain, previews duplicate/missing/closed/conflicting records, and requires the preview hash before import. Recovery preserves the original scrutineer's identity and logs the recovering administrator. Missing tickets can be restored only into an assigned **open** round. Closed-round tickets remain visible in the diff; reopen an eligible round explicitly before recovery. Import never bypasses ballot validation or edits existing tickets.

## API

All endpoints authenticate through `withActor`. Writes require same-origin JSON and `X-Church-CSRF: 1`. Route methods are explicitly allowlisted. Election administrators can manage all elections; operator access requires round assignment and ticket reads are limited to their own records. Results and audit endpoints require admin access.

| Method     | Endpoint                                          | Purpose                                                                                                                        |
| ---------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| GET / POST | `/api/elections`                                  | Accessible elections / create election                                                                                         |
| GET        | `/api/elections/:id`                              | Election, accessible rounds, eligible operators for admins                                                                     |
| GET / POST | `/api/elections/:id/candidates`                   | Load `{rows, revision, locked}` / save reviewed `{rows, revision, sourceFileHash?}`                                            |
| GET / POST | `/api/elections/:id/scrutineers`                  | Search members and list scrutineers / `{memberId, teamId, action: grant\|revoke}`; `{action: create_team}` persists a new team |
| POST       | `/api/elections/:id/candidates/import`            | `{file: base64Xlsx, dryRun, expectedHash?}`                                                                                    |
| POST       | `/api/elections/:id/rounds`                       | Create first draft round if absent; imports normally create it                                                                 |
| GET        | `/api/elections/:id/audit`                        | Election audit records, newest first (latest 10,000)                                                                           |
| POST       | `/api/elections/:id/archive`                      | Archive election                                                                                                               |
| POST       | `/api/elections/:id/backup`                       | `{backup, dryRun, expectedHash?}` reconciliation                                                                               |
| GET        | `/api/rounds/assigned`                            | Own assigned round metadata, including draft waiting state; no candidate totals or results                                     |
| GET        | `/api/rounds/:id/candidates`                      | Frozen ballot / administrator's editable draft ballot                                                                          |
| POST       | `/api/rounds/:id/configure`                       | Draft `{userIds, candidateIds?}`                                                                                               |
| POST       | `/api/rounds/:id/start`, `/stop`, `/reopen`       | State transitions; reopen requires `{reason}`                                                                                  |
| POST       | `/api/rounds/:id/heartbeat`                       | `{pending}` and current round state                                                                                            |
| GET / POST | `/api/rounds/:id/tickets`                         | Scoped ticket list / append ticket                                                                                             |
| POST       | `/api/tickets/:id/void`                           | `{reason, requestOnly?}`                                                                                                       |
| GET        | `/api/rounds/:id/results`                         | Valid-only results and operator progress                                                                                       |
| POST       | `/api/rounds/:id/prepare-next`                    | `{rule: top\|minimum\|manual, value, candidateIds?, dryRun}`                                                                   |
| GET        | `/api/rounds/:id/results/export?format=pdf\|xlsx` | Administrator report                                                                                                           |
| GET        | `/api/rounds/:id/my-report?format=pdf`            | Own work report                                                                                                                |

Submission requires `{client_uuid, seq_no, candidate_ids, created_at}` and supports `entry_kind: normal|blank|invalid` (default normal). Blank and explicit-invalid submissions require empty selections. UUID retries must match both selections and the original invalid reason, including after voiding. The server allocates the canonical ticket code using election ID, the saved team UUID, and a sequential ticket number shared by the team. Responses are `{state: "ok"|"duplicate", ticket}` or `{state: "rejected", reason}` for a closed/draft round, candidate mismatch, or used sequence. Ordinary validation/auth/rate-limit errors use existing HTTP errors. Rate limiting allows at most 120 new tickets per account per minute; idempotent retries do not consume this quota.

Election-row locks serialize round transitions, submissions, voids, and imports. PostgreSQL additionally enforces one open round per election, permanent candidate numbers, frozen ballot definitions, ticket uniqueness, and immutable ticket contents. Member roles extend the existing role administration UI. Election session login/logout, lifecycle, exports, recovery, and ballot operations write server audit records including request metadata.

Excel results contain `Summary`, `Results`, `Tickets`, `Carry-over`, and `Audit`. PDFs embed the full Vietnamese-capable Noto Sans font, use A4 portrait, repeat table headers, stripe rows, strike void tickets, and include page count, generation time, and a report-data hash on every footer. Work reports include own tally and signatures; administrator reports include ranking/ties, a Top 10 chart, operator totals, invalid/void details, and committee signatures.

## Limits and delivery notes

- The prompt referenced `election-system-design.md`, which was not supplied. Implementation follows the available detailed prompt, using `church.election_*` tables to match the existing schema.
- For migration 052, the user explicitly requested verification: populated migration fixtures, 21 backend integration checks, and a DOM results-tab test passed. Typecheck passed. This is not a live-browser or load benchmark.
- Heartbeats report only the last count actually received. An offline device can have additional pending tickets; the confirmation shows report timestamps and warns of this limitation. Closing prevents new unsynced tickets from being counted until an eligible round is explicitly reopened.
- Server-generated PDFs cannot inspect a browser's local rejected/pending database. Work reports identify this and include the last reported pending count; JSON backups carry local sync issues. Server audit appendices include the most recent 100 round actions. The audit screen returns the latest 10,000 election actions; full history remains in PostgreSQL.
- Offline use requires an already loaded application/session and cached election/ballot. There is no new offline login. Use a single device/browser profile per operator per round; multi-device sequence reconciliation is outside scope. Browsers must provide IndexedDB and secure random values. Web Locks are optional for sync coordination; local ballot writes and hash-chain updates are serialized by IndexedDB read/write transactions. SHA-256 uses a browser-compatible implementation and works without crypto.subtle.
- XLSX imports are capped at 10 MB and 10,000 rows. The on-screen worksheet shows 50 rows per page, with horizontal scrolling for extra columns. No schema migration is needed for the worksheet editor or scrutineer account controls.
- No online member voting, double entry, automatic tie-breaking, or cross-device local database synchronization is implemented, as requested.
- No commits were created.

## Consolidated storage (migration 052)

The election module now uses seven tables: contests, nominees, rounds, round
candidates, scrutineers, tickets, and the action log. The former three scrutineer
tables and ticket selections table are removed. Each ticket stores a canonical
`candidate_ids integer[]`; insertion validates round membership and uniqueness,
and the existing immutability trigger prevents later ballot changes. Tallies
unnest only valid tickets in the requested round. No GIN index is added: this
query expands arrays rather than using array containment predicates. A B-tree
index on `(round_id,status)` supports filtering.

Migration 052 locks source tables, checks migrated roster and round assignments,
checks team definitions (including empty teams), compares both directions of the
selection mapping, and commits atomically. The ticket immutability trigger is
suspended only during the transactional array backfill and re-enabled before
commit. Paper columns and the round reconcile endpoint are removed; offline JSON
backup recovery remains available and uses embedded ticket selections. Retain a
pre-migration database backup for rollback, including removed paper values.

Verification commands (local database only; fixtures are rolled back):

```sh
# Before migration 052 only: exercise migration with nonempty legacy fixtures
TSX_TSCONFIG_PATH=apps/mobile-client/tsconfig.json node --import tsx apps/web-admin/tests/election-storage.integration.ts --migration
# After migration 052: exercise consolidated backend behavior
TSX_TSCONFIG_PATH=apps/mobile-client/tsconfig.json node --import tsx apps/web-admin/tests/election-storage.integration.ts
# Render the actual results component with a controlled API response
TSX_TSCONFIG_PATH=apps/mobile-client/tsconfig.json node --import tsx --test apps/mobile-client/tests/election-results.test.ts
npm run typecheck
```

## Scrutineer entry interface

The scrutineer screen uses a warm neutral background, a dedicated operator/round
header, search and shortcut bar, candidate list, current-ballot preview, and a
sticky save/blank action bar above fixed bottom navigation. Desktop uses two
columns; mobile stacks the panels. The three-dot menu exposes JSON, log, team Excel results, and Word minutes exports. Waiting, closed, offline, and own-ticket views are retained.

The command list above is also shown directly on the entry screen. Candidate
selection clears the search and restores the complete local list. Blank and
invalid actions are explicit submissions rather than selection or clear commands.
More than ten selections remain allowed and are saved as invalid/over_limit.

UI components live in `src/elections/scrutineer/`: header, navigation, settings,
search, candidate results, ballot preview, ballot actions, and command instructions.
`use-round-session` owns loading, caching, heartbeat, and background sync;
`use-ticket-entry` owns search, selection, commands, and saving through the
existing local write-ahead queue.

Local storage compatibility: ballot sequence allocation, ticket creation, audit
append, and chain-head updates share one IndexedDB read/write transaction, which
serializes writes across tabs without Web Locks. Sync uses Web Locks when present
and a per-user in-flight guard otherwise; simultaneous cross-tab retries use the
same UUID and the server's existing idempotent acknowledgment. A delayed rejection
cannot overwrite a locally acknowledged ticket. Existing hash chains remain
compatible because the SHA-256 format is unchanged. Search loads independently
of audit initialization; saving stays disabled until local storage is ready.

Migration 053 extends the ticket invalid-reason constraint with `manual` for
explicit `-bhl` tickets. It does not rewrite existing tickets. The new entry kind
is preserved in offline tickets and backups; the API recomputes the outcome
rather than trusting submitted status fields. Counts and reports include manual
invalid tickets while keeping blank counts separate. Applied to the local
database; production is unchanged.

## Election and team identity (migration 054)

Each election is independent. Its numeric ID identifies the admin page and the
scrutineer URL `/client/elections/:electionId`. Screens, reports, and ticket codes
no longer use a round number or S01-style operator code. The existing round table
and `/api/rounds/:id` endpoints remain an internal compatibility layer, with a
unique election ID enforcing exactly one session per election. Preparing a
follow-up ballot creates a new election, clones selected nominees with new row
IDs, and copies the explicitly saved roster/team identities. Original election
records and candidate provenance remain intact.

A canonical ticket identifier is `E<election_id>-T<team_uuid>-<ticket_number>`,
for example `E1-T<saved-team-uuid>-0001`. Numbers increase across all operators in
that election/team, including void tickets, and are never reused. The existing
exclusive election lock serializes allocation; a unique database constraint
protects `(election_id,team_id,team_ticket_no)`. A database trigger validates the
saved operator/team mapping and identifier format. Unknown teams are not guessed.

An offline ticket temporarily uses its client UUID as the final identifier
segment. On acknowledgment, local storage adopts the server's allocated number
and canonical code. The UUID and per-device/operator sequence remain internal
idempotency keys. The preview shows an ellipsis until a number can be allocated.
Legacy local backups remain recoverable by UUID, assignment, selections, and
classification; existing server tickets retain `legacy_ticket_code`.

Migration 054 refuses multi-session elections or tickets missing explicit saved
teams, rather than silently regrouping or deleting data. A local backup was taken
before applying it. All four local tickets retained their ballot contents,
operators, timestamps, classifications, and per-operator sequences; old codes are
retained separately. No production database was changed. No tests were run for
this change, per the project instruction; typecheck is the static check.

## Scrutineer export menu

The header three-dot menu contains **Xuất file JSON**, **Xuất file log**, **Xuất kết quả**, **Xuất biên bản**, and **In biên bản**. JSON retains the existing offline backup
and full per-user audit chain for recovery, with election/team metadata. The log
file is UTF-8 JSON Lines: a metadata line followed by this election's local
operator actions. Its chain-valid flag is calculated over the full user chain,
not over the filtered log alone. Both exports work from local storage offline.

After the election closes, Excel and Word exports are enabled for an assigned
team. `GET /api/rounds/:id/team-report?format=xlsx|docx|html` independently verifies
access, closure, and the actor's saved team assignment. Requests have no caller-
selected team ID. All statistics, candidate votes, and tickets are scoped to the
assigned election/team; exports do not expose another team's tickets. Team
members include profile-only roster members in the signature list. Export actions
are recorded in the server audit log.

The Excel workbook has Vietnamese title/header rows on every sheet, the election
name and ID, team name, exporter, generation date, summary counts, valid-only
candidate results, individual ticket details (including full IDs, statuses,
selections and void reasons), and the team member list. Voided tickets are kept
in received totals and excluded from counted/valid results; blank and other
invalid counts are separate.

The A4 `.docx` minutes use a generic church/committee page header, election title,
team identification, start/end times, statistics, candidate results, statements
of confirmation, space for handwritten comments and date, signature spaces with
team-member names, and a committee handover signature area. No church-specific
name or team-leader role is invented. The file is an editable Word document.

**In biên bản** is also available beside the closed-election heading. It fetches
an authenticated, team-scoped A4 print document and opens the browser print dialog
in an isolated iframe, preserving the current election screen. The print version
and Word export share the same minutes wording, statistics, candidate results,
and team signature names. All dynamic HTML text is escaped. Printing retains the
same closed-election and team-access checks as document exports.
