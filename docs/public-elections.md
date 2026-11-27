# Public election voting

Voters enter at `/vote`, without a staff account, using an exact six-digit OTP. QR scanning and QR invite links are currently disabled; the join API accepts only OTP credentials. Old QR links show a prompt to enter an OTP instead. `/vote/:sessionId` restores an existing browser admission after refresh; knowing that URL alone does not grant access.

Each OTP is single-use: the first successful join atomically claims it for one browser. Another browser receives `OTP_ALREADY_USED`; retries from the original browser recover its existing admission. Saving new session credentials resets consumption. In `NODE_ENV=development`, `123456` resolves the enabled public session even if its stored PIN was generated before this default existed. If several sessions are enabled, set `PUBLIC_ELECTION_DEV_ID` to the intended election ID. An administrator must configure and enable a public session with its actual location first; missing configuration produces an explicit setup error. Election status, location verification, and single-use checks still apply. Production never accepts this development shortcut and always generates random PINs. Migration 056 retires previously shared credentials with existing admissions until an organizer generates fresh ones; it preserves existing admissions and ballots.

## Organizer setup

In **Cài đặt → Bầu cử**, open an election and select the bottom **Cài đặt** tab. The election header and start/end/export controls remain on **Kết quả** and also appear in Cài đặt. Turn on **Cho phép bầu cử trực tuyến**; this switch saves immediately and reveals two top tabs, **Địa điểm** and **OTP**. Turning it off immediately stops online participation and hides these controls without deleting codes or ballots.

In **Địa điểm**, a saved venue opens in view mode with its coordinates, an address when available, and a Google Maps preview. Choose **Chỉnh sửa** to search for an address, use **Dùng vị trí hiện tại**, or expand **Nhập tọa độ thủ công**. Radius chips (500/1,000/1,500/2,000 m) and a custom input stay synchronized. Clean forms show a disabled **Đã lưu** button; radius changes enable **Lưu thay đổi**. Saving a new location returns to view mode, and Cancel confirms before discarding edits. In **OTP**, generate codes and download the list. Location must be saved before generating codes. Changing location requires existing voters to verify again, while adding OTP batches preserves voter progress.

Address autocomplete and reverse lookup use Photon through the admin-only `/api/election-geocoding` proxy. Search waits 300 ms and three characters, restricts results to Vietnam, and biases toward Ho Chi Minh City. Server responses are cached for five minutes (up to 100 searches), concurrent identical searches are shared, and each administrator is limited to 120 lookups per 15 minutes. Set server-only `PHOTON_URL` to use another Photon instance; the default is `https://photon.komoot.io/`, which requires no client key. See [Photon's API and service terms](https://github.com/komoot/photon). Address labels are resolved display data; the existing save API and database continue to store the coordinates, radius, and accuracy settings. The preview embeds Google Maps at the selected coordinates and offers an external Google Maps link. It updates when the selected coordinates change; browsing the embedded map does not modify the location or geofence. Radius validation and location saving continue through the existing form.

After saving the location, use **Danh sách OTP** to generate 1–1,000 additional six-digit codes per batch. Each code independently admits one browser to the same election. Adding a batch preserves previous codes, verification state, and ballots. Repeated generation requests with the same request ID recover the same batch. Code hashes are reserved globally and consumed codes are never recycled into batches.

The OTP tab uses a short quantity input beside **Tạo danh sách mã OTP**, with refresh beside the used-code count. Cards show the election name, six-digit code, usage instructions, and used/unused status. **Tải danh sách mã** downloads all generated codes as an A4 PDF with eight cards per page; leading zeros are preserved. **Xem trước khi in** opens that exact PDF with print and download actions. Browsers without an embedded PDF viewer can open the same file in a separate window. The list remains downloadable after leaving and reopening Cài đặt. Codes are stored encrypted with AES-256-GCM using `SESSION_SECRET`, alongside HMAC hashes for lookup; retain the original secret to decrypt historical downloads. Code values are never written to audit logs. Only election administrators can list, generate, or download them.

Use the existing election start/end controls. Verified voters wait in the lobby until the election opens. The page polls every five seconds only while the session is open and no vote receipt exists. Waiting voters use **Làm mới trạng thái**; closed, cancelled and submitted sessions do not poll. Online elections have no automatic expiry; use the online-voting switch or end the election to stop participation. OTPs remain single-use.

Apply migrations through `database/062_election_public_vote_voids.sql` using `npm run db:migrate` before deploying the updated API and client together. Migration 059 adds the election-level online-voting switch; migration 060 removes session expiry from storage and database vote validation; migration 061 adds scoped connection logs; migration 062 adds append-only online ballot cancellations. Local migrations are backed up before application. Production has not been migrated.

Serve the client and API over HTTPS; localhost supports development location access. Set `APP_ORIGIN` to the public frontend origin and retain the existing base64-encoded 32-byte `SESSION_SECRET`. OTP hashes depend on that secret, so rotate public session credentials after changing it. Configure the deployment proxy to supply trustworthy client IP headers for rate limiting.

## Components and shared rules

After OTP validation identifies an election and admission, the page automatically checks **that election's** connection and location before showing the lobby or candidates. Checks run silently behind the OTP entry form. Eligible users proceed directly to voting (or the waiting room while unopened), with no diagnostic success view or Continue button. Ineligible users see an illustrated error page with the specific requirement they failed, a Back action, and measured distance/allowed radius when available. No example distance is substituted for an unavailable GPS reading. Two HTTP request/ACK exchanges carry distinct request IDs and are checked against the expected election/session IDs. The browser cookie must match the OTP admission. Both production and development obtain a position and call the server location-verification endpoint; development uses the configured simulated coordinates. A successful server-recorded result automatically advances the user. The check never casts a ballot. Diagnostics for one election cannot authorize another election, even with many simultaneous elections.

Each attempt is stored once in `election_connection_checks`, independently of user accounts and staff action logs. Its status, ACK count, cookie acceptance, duration, browser location capability/permission, and failure reason are recorded. Raw GPS coordinates, OTP codes, and diagnostic authorization tokens are not logged. The capability returned after OTP validation authorizes only that admission's diagnostics, including reporting blocked cookies; it grants no voting privileges. Final reports are idempotent. When the server cannot be reached, reports are kept in browser session storage (when available) and retried after connectivity returns, including across elections in that tab. A complete outage cannot be recorded remotely until connectivity returns; attempts already seen by the server but unfinished after 60 seconds appear as invalid/timeouts.

The election's **Log sự kiện** tab polls every five seconds only while the server confirms an open round. Inactive history loads once. Its top cards summarize unique devices (total, valid, invalid) and submitted tickets (total, team, online). Rechecking the same device, refreshing, or using another OTP in the same browser does not increase the device count. The latest check determines that device's valid, invalid, or pending state; a successful retry clears its earlier invalid state from the prominent red alert. Recent invalid counts cover latest checks within 15 minutes. The connection list shows every attempt, including successful and failed checks, with a filter for invalid connections. All original attempt records remain stored. The view and alerts are scoped to the selected election; the same device checking two elections is counted once in each. Device identity uses the existing browser credential, rather than IP address or invasive fingerprinting.

The **Gửi phiếu** list reads persisted team tickets and online votes directly, so each accepted submission appears once, including historical votes and offline synchronization. It shows the team/source, operator when applicable, ticket order, time, selection count, and current ballot status. Submission totals include void tickets. Each list displays up to the latest 1,000 entries; summary counts cover all records. Other administrative events remain in **Hoạt động khác**. Viewing results no longer writes an action log, and historical `results_viewed` entries are excluded from this page without deleting stored records.

`apps/mobile-client/src/elections/public/` contains the entry form, camera scanner, location prompt, lobby, candidate list, swipeable tabs, submission UI, admin setup dialog, and a coordinating hook. `packages/core/src/public-election.ts` supplies typed contracts, Haversine distance, and Vietnamese accent-insensitive word-prefix search. The existing shared `MAX_ELECTION_SELECTIONS` controls the ten-candidate limit.

The two tabs share one selection state and preserve search text. Draft selections survive refresh in session storage. Public votes require a server acknowledgment; they are never queued as offline votes. Retries retain their request ID to prevent duplicate submissions.

## API and storage

- `POST /api/public/elections/join`: validate an OTP and establish a browser admission.
- `POST /api/public/elections/:sessionId/connection`: rate-limited, CSRF-checked, admission-authorized diagnostic probes and final reports. No global-election connection probe is exposed.
- `GET /api/public/elections/:sessionId`: return session state, eligibility, own receipt, and candidates when eligible and open.
- `POST /api/public/elections/:sessionId/location`: verify fresh GPS data against a server-issued challenge.
- `POST /api/public/elections/:sessionId/votes`: validate and record a final ballot.
- `GET/POST /api/elections/:id/public-session`: existing authenticated election API wrapper, restricted to election administrators, for configuration.
- `GET/POST /api/elections/:id/public-otps`: admin-only list/generation; `GET ?download=1` returns the printable PDF cards.

Migration 055 adds `election_public_sessions`, `election_public_admissions`, and immutable `election_public_votes`. One admission per browser/session and one vote per admission are enforced by database uniqueness. Database triggers also check session state, eligibility freshness, selection membership, and the maximum selection count.

Public ballots retain separate immutable storage, but the main election totals, candidate vote counts, percentages, rankings, and admin Excel export combine online and paper ballots exactly once. A shared normalized query classifies empty online ballots as blank ballots using the existing paper rules. The total card shows the paper/online breakdown. The admin results page includes the combined ticket grid with **Trực tuyến** / **Phiếu giấy** badges. Online ballots expose no voter identity or browser credentials. Admins can use **Hủy phiếu** for either source, with a required reason. Online cancellation uses `POST /api/tickets/online/:voteId/void` and stores an append-only decision in `election_public_vote_voids`, preserving the original immutable vote. Cancellation and its `ticket_voided` audit event commit in the same transaction; duplicate cancellation is rejected. Cancelled ballots remain visible as **Đã hủy** with their reason and stay in received/submission totals, but contribute no candidate votes or valid-ballot percentage denominator. The log records the actor, ticket ID, source, time, and reason. Personal scrutineer lists and team exports remain scoped to their paper ballots. Existing paper ballots, teams, membership order, and staff workflows are preserved.

## Location and integrity

Location checks are required in every environment, including development. The server validates freshness, accuracy, distance, and geofence boundaries during admission checks and final ballot submission. There is no development bypass or temporary verification override.

In Vite development mode, requests for the current election location return the simulated position `10.732420152811994, 106.65306644904963`, with a fresh timestamp and simulated 1 m accuracy, without requesting browser GPS permission. This also applies to **Dùng vị trí hiện tại** in venue settings. These simulated coordinates must meet the same server geofence rules as any other position; they do not bypass validation. Production builds use the browser's actual Geolocation API.

The server supplies an expiring nonce and validates it with fresh GPS coordinates, reported accuracy, and timestamp. It calculates Haversine distance using the configured database point, requires the accuracy uncertainty to fit inside the radius, and rejects unavailable, inaccurate, stale, or out-of-range positions. Final submission requests fresh GPS and repeats server validation. Client eligibility flags cannot grant access. Stored admission data contains derived distance, accuracy, and verification time, rather than raw voter coordinates.

Requests use same-origin HttpOnly browser credentials, CSRF/origin checks on writes, PIN attempt limits, row locks, and idempotent submissions. Candidates are withheld until the session is open and location eligibility is verified. Responses expose only the current browser's receipt, without other voters' information.

Anonymous browser protection is not proof of one person per vote: clearing browser data or using another browser/device can establish another admission. Browser GPS can also be spoofed. A verified identity registry or stronger presence verification would be required for those guarantees.

## Validation

Workspace typechecking and the production build passed. Earlier implementation work did not add or run tests. The venue redesign explicitly requests tests: `apps/mobile-client/tests/election-venue-settings.test.ts` covers view/edit modes, location-button visibility, synchronized radius inputs, coordinate validation, dirty/save states, failed saves, discard confirmation, and keyboard autocomplete. Run it with `TSX_TSCONFIG_PATH=apps/mobile-client/tsconfig.json node --import tsx --test apps/mobile-client/tests/election-venue-settings.test.ts`.

## OTP attempt logging, lockout and device admission

Apply migration **065** (`065_public_election_join_security.sql`) before deploying
this client/API update. The migration is registered in `scripts/database.ts`; it
has not been executed as part of this implementation.

The public OTP join flow now:

1. Establishes the existing long-lived HttpOnly browser credential through
   `GET /api/public/elections/device` before submitting the code. Browser Web Locks
   serialize join requests across same-origin tabs where supported, including the
   first cookie initialization.
2. Locks the browser's join-guard row inside the request transaction, so concurrent
   wrong attempts cannot skip the counter.
3. Counts invalid/malformed OTPs, changed credentials and codes consumed by another
   browser. The third failed validation locks **new OTP joins for 15 minutes**,
   including attempts with a correct code. A valid join resets the failure counter;
   expiration resets a completed lockout. Other availability/configuration errors
   do not count as wrong codes. Existing IP/request rate limits still apply.
4. Writes an append-only row to `church.election_public_join_attempts`, recording
   time, pseudonymous browser hash, outcome, safe reason and failure count. It never
   logs the submitted OTP, its hash, raw cookie or request body. Locked attempts,
   duplicate-device denials and successful admissions are also recorded. Invalid
   unknown OTPs cannot be associated with a specific election, so these are global
   security records rather than fabricated election-specific audit entries.
5. Returns expected join errors as transaction results internally and emits the
   HTTP error only **after commit**. A savepoint rolls back unsuccessful admission
   work while retaining the guard update and security record. Database or other
   unexpected errors still roll back the whole transaction.

Each election has one public session, and `(session_id,browser_hash)` remains
unique. An admission now binds its original OTP hash in `entry_credential_hash`.
Another valid OTP for that election is rejected with `DEVICE_ALREADY_JOINED` before
consuming the second code. It does not increment the wrong-OTP counter. The original
OTP can recover the existing admission; normal reload/reconnect uses its existing
session and receipt, never a second vote. OTP lockout does not invalidate a previously
admitted session. The migration backfills the earliest known consumed credential
for existing admissions; historical rows without a matching credential remain
resumable through their existing session URL.

`OTP_LOCKED` is a 429 response; `INVALID_OTP` reports remaining attempts;
`DEVICE_ALREADY_JOINED` explains that the original OTP should be used to resume.
The public client displays these server messages. Security records are stored in
the dedicated table; they are not added to an election's member activity list.

**Device scope:** this is server-side enforcement for the existing browser cookie,
shared by tabs in that browser profile. It is not a physical-device fingerprint.
Clearing cookies, private browsing or another browser creates another identity;
without Web Locks, simultaneous first-cookie initialization cannot be serialized
across tabs by the client. Physical-device identity would require a different
identity/enrollment design.

Validation: workspace typechecking only. No automated or manual tests were added
or run under the current project instructions.

### Polling and connection-report retries

The shared lifecycle in `elections/polling.ts` stops automatic calls after inactive
status, terminal failures or navigation. Waiting sessions use manual status refresh;
no periodic request tries to discover whether a draft election has opened.
Queued connection reports flush only for the current open session on entry or
reconnection. The previous global 30-second sweep of reports for historical
sessions has been removed. Unsent reports remain local rather than repeatedly
contacting closed elections. See the [complete polling lifecycle](election.md#complete-polling-lifecycle)
for all internal and public election request sources.

### Online intake and manual checking

Migration 066 introduces four election phases: **Chưa bắt đầu → Nhận phiếu trực
tuyến → Kiểm phiếu thủ công → Đã đóng**. Online voting is accepted only during
online intake. Advancing to manual checking immediately closes public submissions,
including database-side validation of concurrent requests. Existing receipts and
online tallies remain part of the combined results. The public page shows the
manual-checking lobby and stops polling; its manual refresh can retrieve the final
closed state. A reason-required staff reopen restarts manual checking only.
See the [four-stage workflow](election.md#four-stage-election-workflow) for control
behavior, paper-only elections and deployment requirements.

### Strict online submission gate and transition audit

Every `POST /api/public/elections/:id/votes` checks that online intake is open
before parsing/submitting a ballot or acknowledging a retry. Draft, manual checking,
closed, cancelled or disabled elections reject the POST, even when it repeats a
previously accepted ballot. Existing receipts remain available through session
GET requests. The application gate and migration 066's database trigger both
require the online phase; election/session locks serialize votes with phase changes.

Every successful lifecycle transition logs its actor, timestamp, reason (where
required), `fromPhase`, `toPhase`, `fromStatus` and `toStatus` in the same transaction
as the status update. The event log displays the previous and next Vietnamese
phase labels. If audit persistence fails, the transition rolls back too.

### Production rollout — 25 November 2026

Production is migrated through **067**. Migrations **066** and **067** were applied
in one transaction after an encrypted schema/data backup over verified TLS.
There were no open election rounds at migration time. Election, candidate, paper/
online ballot and audit-record counts were preserved. The migration records and
new phase/deletion/version columns were confirmed after commit. No application
or ballot-submission tests were run against production.

Private backup files and the migration receipt are retained under
`.local-data/production-migrations/2026-11-24T23-08-09.175Z/`; the AES-GCM key is kept
separately under `.local-data/production-backup-keys/`. These directories are ignored
by Git. The complete encrypted archive was authenticated and its PostgreSQL archive
catalogue was read successfully; no database restore was performed.
