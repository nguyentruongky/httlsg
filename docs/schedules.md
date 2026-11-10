# Schedule & Ministry Assignment Management

This module maintains ministry duty rosters independently of the existing free-text event calendar. Both applications use one shared implementation, the existing member database, authentication, UI primitives, audit log, date helpers and Web Push delivery. It sends no event-group email or Viber draft.

## Entry points

- `/dashboard/schedules`: Admin/Thư ký schedule workspace.
- `/dashboard/schedule-leaders`: select an existing profile and grant or revoke category management.
- `/client#/schedules`: the same schedule editor for explicitly authorized members, accessible from Profile → Quản lý lịch phân công.
- `/client#/assignments`: Profile → Lịch phục vụ của tôi. Published assignments belonging to the signed-in person, including department assignments, with upcoming/past/all filters and cancellation notices.

The Vite client supports the same hash routes through its existing API proxy. Standard User accounts retain their profile-only navigation; these screens are reachable from Profile without enabling the full member directory.

## Categories and configuration

| Key                | Vietnamese name             | Initial configuration                                                           |
| ------------------ | --------------------------- | ------------------------------------------------------------------------------- |
| `reception`        | Lịch tiếp tân               | Suggested editable reception responsibilities                                   |
| `prayer_guidance`  | Lịch hướng dẫn cầu nguyện   | Weekday sections; Monday–Saturday 05:30, Sunday 06:30                           |
| `program_guidance` | Lịch hướng dẫn chương trình | Sunday morning, Sunday afternoon, Wednesday sessions; suggested editable duties |
| `communion_duty`   | Lịch trực tiệc thánh        | No assumed time or duties; configure explicitly                                 |

Category settings contain default times, presentation layout, session suggestions and ordered active responsibility definitions. A plan snapshots its settings. Changes to category defaults affect new plans and newly created entries, not existing published schedules. Generic plans retain editable duties and manual assignment. The quarterly work template uses the fixed roles and automatic rotation described below.

A plan supports a date or a range up to 367 inclusive days and up to 200 events. Each event has date, optional start/end time, title, description, location and optional session label. Responsibilities have a name, description, multiple existing member assignments with individual notes, and optional department assignments. An empty responsibility displays **Chưa phân công**. Multiple sessions on the same day are supported. Times use local church time; ISO date strings and existing GMT+7 calendar helpers avoid browser-zone shifts. Weeks start Sunday and displayed dates use DD/MM/YYYY.

## Quarterly work template

Choosing **Lịch công tác quý** offers the current quarter plus the next three. Selecting a new quarter calls `POST /api/schedules/quarterly-generate` with `{year, quarter}` and opens an editable draft. Existing plans are reopened. The editor does not offer **Tự động phân công lại**. **Lưu** saves and publishes quarterly and reception plans in one transaction; neither editor has a separate **Công bố lịch** menu action.

The template uses `program_guidance` with `settings.template = "quarterly_work"`. It contains three separate tables: **SÁNG CHÚA NHẬT**, **CHIỀU CHÚA NHẬT**, and **THỨ TƯ**. Both Sunday sections have NGÀY, HDTP, HD hát, Nhóm hát, Ban hát, Ban nhạc and Giữ xe columns. Wednesday has NGÀY and HDTP alongside the Sunday sessions in the same weekly row. Ban nhạc starts empty. Giữ xe rotates across Trung niên, Tráng niên, Thanh tráng and Thanh niên, excluding Lão niên and Thiếu niên. It must differ from Ban hát in the same session; manual edits are checked against the same rules. Earlier four-column quarterly drafts are adapted to this format when opened.

The allocator solves all individual roles for a day together, maximizing filled positions before balancing counts in the supplied session-specific rosters and overall workload. Worship teams 1–4 rotate evenly within both Sunday sessions, with different morning/afternoon teams on each date and total counts differing by at most one. Six choirs rotate across Sunday sessions. The roster constants live in `packages/core/src/quarterly-work.ts`; group labels do not infer individual team members. Auto-fill always uses every predefined roster name, independently of directory matches. Unique profiles may be linked silently for notifications; missing or duplicate profiles never remove a roster name or create schedule warnings.

Dates are fixed and displayed as **dd/MM**. Sunday morning and afternoon share a row with the following Wednesday, with separate fixed dd/MM dates. A Wednesday before the first in-quarter Sunday is retained in a row with blank Sunday cells. Assignment cells support plain inline editing without hover effects, field borders/backgrounds or tooltips; columns size to their text. Known personnel names display the penultimate name initial and final name (for example **T. Kỷ**), while full names and member IDs remain stored. Thiệu Huy displays as **Th. Huy**, and Trọng Huy as **Tr. Huy**. Focusing an editor keeps its abbreviated display; Nhóm Hát cells are centered. Custom names, choir entries such as **Các BHL** and **GV. TCN**, music and parking text are permitted. Recognizable personnel names are resolved to active member IDs when saved, retaining individual assignments and notifications. Roster names remain valid even without a unique directory match. Manual HDTP and HD hát entries must belong to the predefined list for their role and session. Recognized short names are expanded to canonical roster names internally. Directory-match ambiguity is not a scheduling error and is never displayed.

After a short typing delay, `POST /api/schedules/quarterly-check` checks the current draft and returns duplicate-person issues, reception conflicts and unresolved-name warnings, including structured cell locations. Evening MC roster members cannot be assigned as morning HDTP; this restriction applies during generation and manual validation. Cells with validation issues use a light red background. Error details appear on hover, focus or click; clicking pins the tooltip until dismissed, and messages remain available to screen readers; duplicate assignments highlight both affected cells. Validated highlights remain stable while a new debounced check runs. Validation checks the predefined role/session lists; directory duplicate-name and abbreviation-match messages are suppressed. Generation, saving and publication check existing draft/published reception plans, including linked members and edited full/abbreviated names. Cancelled/deleted plans are excluded. Explicit time intervals are compared when available; otherwise the session labels are used, treating unspecified sessions conservatively as overlapping. Reception edits also check saved quarterly plans. Existing write transaction locks serialize schedule updates.

Drafts can retain vacancies for review. Publication requires the complete quarter and nonempty required cells; music and parking may stay blank. Custom group text is allowed. Duplicate-person and reception conflicts block saving or publishing. The read-only table, print view and Word export all use the same combined weekly structure.

## Permission model

Management and serving assignments are separate. Assigning someone to a duty never grants access to edit a roster.

- Admin has full category and leader-management access.
- Thư ký follows the existing general administration policy: seeded category management and leader-management permissions. This does not change the separate Admin-only event-calendar mutation rules.
- Other roles must have an active `schedule_manager_permissions` row for the specific active category. Their global role cannot manufacture schedule access via the generic role-permission matrix.
- Category managers can configure defaults and create, edit, copy, publish, cancel and export only their own categories. Only administrators can activate/deactivate a category or grant/revoke another manager.
- Every endpoint reloads the actor and current grants from PostgreSQL. Removing a grant takes effect on the next request, including requests with previously issued access tokens. A stale open form cannot bypass revocation. Refresh the profile to update navigation.
- Ordinary members receive only published events/duties assigned directly to them or their current departments. Other people's assignments and individual notes are removed server-side. Unpublished and unrelated resources return a private-resource 404. They cannot export the complete roster or mutate it.
- An existing profile without a login can be assigned duties or manager grants. This does not create an account, set a password, bypass onboarding or duplicate the member. Account activation still uses the existing onboarding flow.

Manager member search returns only profile ID, display name and a masked identifying suffix. It deliberately allows finding existing church members for assignments without granting access to their complete profiles.

## Editing and lifecycle

Create a plan, choose a period, add events, configure duties and select people. Prayer plans additionally offer **Tạo lịch từng ngày**, using the chosen default times; generation is available only while the event list is empty, so it never overwrites existing entries. The editor supports table, month and week views. Month/week event clicks open the editor for managers and a read-only detail dialog for member views.

Draft saves never notify. Publishing requires at least one event and one responsibility on each event; an unassigned duty remains visible rather than inventing an assignee. Publishing requires confirmation and queues notifications for affected people. Published edits offer an explicit **notify affected members** checkbox, initially off. A notification is generated only when that person's assignment signature changes. Unchanged people and unchanged saves do not generate new notifications. Cancellation is confirmed and notifies the last published assignment recipients. Cancelled plans are read-only. The draft-delete API remains for legacy compatibility, but the editor no longer shows a delete-draft button; only published plans show cancellation.

Aggregate edits are transactional and optimistic-versioned. Stale forms return 409. Client-created event/duty IDs cannot overwrite another plan's children: conflicting IDs abort the transaction. Dates must remain inside the plan's period; duplicate event slots, duplicate member assignments, invalid times and inactive/missing profiles are rejected. A same-category, same-title, same-period active plan is rejected; overlapping plans with different titles are intentionally permitted for multiple services/teams. Create and copy operations use request UUIDs with payload hashes for safe retries.

The unsaved-changes guard covers the editor's back button and browser unload. SPA navigation outside the editor is not a global route blocker; save before using unrelated navigation.

## Copying

Choose a source plan, target period/title and mapping method, then preview:

- **Weekday pattern** maps the nth occurrence of a weekday relative to the source period onto the target period (e.g. the second Sunday → second Sunday).
- **Exact offset** retains the number of days after the period start.

Duties and people can be included or omitted independently (omitting duties also removes their assignments). Unmappable dates are listed; saving requires an explicit choice to skip them. Copies receive new event/duty IDs and a new draft plan, never modify the source, never inherit publication, and never send notifications. Source version checks reject copying an outdated preview.

## Notifications and privacy

`church.schedule_notifications` is a per-person change journal. `schedule_member_state` stores each last published assignment signature, allowing changes/removals to be detected even when a department's membership has changed since the previous save. Direct and department recipients are deduplicated. Current department membership controls team access; membership edits alone do not automatically send schedule notifications. The next published save/publish operation reconciles those memberships.

`church.schedule_push_deliveries` is a separate durable queue using the existing encrypted subscriptions, VAPID configuration, session-family eligibility checks, provider adapter, safe generic payloads and subscription outcome handling. The destination is always `/client#/assignments`; no names, phone numbers or private notes are sent through the push provider. Notification links survive login/password setup.

The API attempts delivery after committing publication or an opted-in published edit. A delivery failure does not roll back the schedule. `npm run push:deliver` drains both calendar and schedule queues for recovery; schedule sends use bounded batches, skip-locked claims and capped retries. Ambiguous in-flight sends become `uncertain` instead of blind resending. Expired or revoked subscriptions are handled using existing provider rules. Reliable background recovery requires scheduling that command on the deployment platform. Browser push requires configured VAPID keys, an eligible signed-in subscription and user permission; otherwise the assignment remains available in the app. This module does not request notification permission during publishing.

## Printing and export

Published managers can download DOCX or print/save PDF through the browser. There is no separate PDF server or new export dependency. Table sections follow category settings: ordinary table, weekday groups, or session groups. Columns derive from actual responsibilities and retain names, multiple assignees, notes and unassigned indicators. The document includes category, plan name, date range and generation date. Word uses landscape pages, repeated table headers and rows that do not split across pages. Shared print styles hide navigation and print the roster table rather than the interactive calendar. Save current edits before exporting. Browser print margins and PDF pagination can differ by device.

## Database and API knowledge base

Apply forward migration `database/019_ministry_schedules.sql` with `npm run db:migrate`. It adds categories, responsibility definitions, category manager grants, plans, events, duties, member and department assignments, published recipient state, notification journal and push queue. Existing members remain authoritative. Foreign keys, unique constraints and query indexes cover ownership, date lookup, assignments and delivery. No calendar/event/email data is rewritten.

Profile merges retarget assignments, manager grants, published recipient state and notification ownership to the retained first profile ID. Duplicate duties/grants/notification rows are coalesced; preview tokens include scheduling relationships so new changes require a fresh merge preview. Historical calendar snapshots remain unchanged.

| Endpoint                                                    | Purpose                                                               |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| `GET /api/schedule-categories`                              | Authorized categories, definitions and department catalog             |
| `PATCH /api/schedule-categories`                            | Versioned category settings/definitions; global activation restricted |
| `GET/PATCH /api/schedule-leaders`                           | Administrator roster and version-token-protected grant changes        |
| `GET /api/schedule-members?categoryId=...&q=...&page=...`   | Scoped masked assignment search                                       |
| `GET/POST /api/schedules`                                   | Managed plan list/create                                              |
| `GET/PUT/DELETE /api/schedules/:id`                         | Scoped detail, aggregate update, draft deletion                       |
| `POST /api/schedules/:id/publish`                           | Versioned confirmed publication                                       |
| `POST /api/schedules/:id/cancel`                            | Versioned cancellation                                                |
| `POST /api/schedules/:id/copy-preview`                      | Validate target and report mapped/skipped dates                       |
| `POST /api/schedules/:id/copy`                              | Idempotent new draft                                                  |
| `POST /api/schedules/:id/export`                            | Version-checked published DOCX                                        |
| `GET /api/my-assignments?view=upcoming\|past\|all&page=...` | Own published/cancelled duties and recent notices                     |

All writes reuse existing origin/CSRF, authenticated actor and transaction conventions. Audit entries cover category configuration, grants, creates, updates, assignment changes, publication, cancellation, deletion, copying and exports. Static text is rendered as React text or Word text, never executable HTML.

Core logic: `packages/core/src/schedules.ts`. Server logic: `apps/web-admin/lib/server/schedules.ts`, `my-assignments.ts`, `schedule-notifications.ts`, `schedule-export.ts`, `schedule-api.ts`. Shared client UI: `apps/mobile-client/src/schedules/`; admin grants: `apps/web-admin/components/schedule-leaders.tsx`. PWA destinations are validated in shared push contracts and the service worker template; regenerate public assets with `npm run pwa:assets` after worker changes.

## Verification and operational limits

Automated coverage includes core date/copy/default/diff validation, API authentication and category isolation, grant revocation, draft privacy, idempotency, stale edits, own-note privacy, selective publication notifications, cancellation, copying and DOCX content, plus shared UI rendering/navigation. Existing event and authentication suites must continue to pass. Test runners use an isolated PostgreSQL database and disable real SMTP/VAPID delivery; never use production recipients to test this module.

Actual verification results for this implementation are recorded in the README. Physical iOS/Android push delivery and printer output still need device acceptance testing. The two supplied external example-image URLs could not be fetched during implementation; the supplied descriptions, times, sessions and configurable structures were used instead. No OCR or assumptions about the Communion roster were introduced.

### Verification record — 8 November 2026

- `npm run test:backend`: 144 passed, including isolated PostgreSQL migration/import checks, category grants/revocation, privacy, version conflicts, selective notifications, copy/export and profile-merge deduplication. Web Push provider calls were mocked.
- `PATH=/opt/homebrew/bin:$PATH NODE_OPTIONS=--no-webstorage npm run test:mobile`: 128 passed. The runtime override avoids the existing Node web-storage global interfering with browser-test fixtures.
- `node --import tsx --test packages/core/src/schedules.test.ts packages/core/src/push.test.ts packages/core/src/calendar.test.ts`: 42 passed.
- `npm run test:core`: 124 passed, 8 existing worship preset/newline failures; scheduling tests pass.
- `npm run test:import`: 2 existing Python errors from the importer splitting an outdated department-catalog export string. No importer/catalog code was changed for this module.
- `npm run typecheck`: passed all workspaces.
- `npm run build`: passed Vite and Next.js production builds.
- `npm run pwa:assets`: generated both service workers successfully.
- Local `npm run db:migrate`: applied migration 019 successfully.

The isolated backend suite also imported the available local fixture twice and confirmed the second import created zero duplicate profiles. This database fixture import is separate from the failing Python workbook-mapping tests.

## Monthly reception team generator

Reception managers and administrators press the plus button in **Lịch phân công**, tap a Vietnamese month in the four-column picker. The month picker shows twelve Vietnamese months in four columns, with the year centered between previous/next chevrons. Tapping a month opens its board immediately; the dialog title is hidden visually but retained for accessibility.

1. The roster automatically loads the deduplicated union of active profiles in **Ban Chấp sự** and **Ban Tiếp tân - Trật tự**. Maintain membership through the existing Ban ngành screens; there is no separate manual reception list to save.
2. Gender comes from the profile's `gender` field, with the imported `source.gender` as a fallback when the field is blank. Male members of Ban Chấp sự qualify as **Nam chấp sự**; other male members qualify as **Nam**; female members of either department qualify as **Nữ**. Unknown gender is never guessed: those profiles are omitted from automatic assignments and named in the generator warnings. Application RBAC roles do not determine this classification and are never modified.
3. Selecting a month opens its existing official schedule, resumes a matching local copy, or generates a fresh editable board immediately. Generation does not save a schedule or notify anyone. Reception cards show only the month title and status: no date ranges, event counts, copy action or date-range filters.
4. Save/publish through the existing schedule editor. Manual edits remain possible after generation.

The two department names are matched without case, accents, spaces or punctuation differences, including hyphen/en-dash variants. Both department memberships and profile genders are re-read for each generation. A member of both departments is counted once. Inactive, deleted and test profiles are excluded. Legacy rows in migration 020's manual `reception_team` table are retained for compatibility but are no longer read by the generator; they cannot add outsiders to the generated list. No new database migration is needed for this change.

### Required positions

| Session | Position        | Required people       |
| ------- | --------------- | --------------------- |
| Sáng    | Cửa chính       | 2 nam chấp sự + 2 nữ  |
| Sáng    | Phòng trung lão | 1 nam chấp sự + 1 nam |
| Sáng    | Gác lửng        | 2 nam chấp sự + 1 nam |
| Sáng    | Phòng nhóm phụ  | 1 nam chấp sự         |
| Tối     | Buổi tối        | 4 nam chấp sự + 2 nữ  |

There are **16 assignments per Sunday**: 10 morning and 6 evening. General male slots can also be served by a male deacon; no female or regular male can fill a deacon-only slot. A person cannot hold two positions in one session, but may serve both morning and evening. Filling an entire Sunday requires at least six male deacons, eight men in total and two women if people may serve both sessions. For example, with only two women both must serve every morning and evening; their counts necessarily differ from larger eligibility groups.

The pure helper `packages/core/src/reception.ts` uses maximum-flow/minimum-cost allocation. It first maximizes the number of fillable slots, then minimizes the sum of squared monthly per-person counts under eligibility and one-position-per-session constraints. This gives an optimal workload distribution for these constraints, rather than merely cycling names in roster order. Among equally fair total workloads, a second convex cost minimizes morning/evening count imbalance for members eligible for both sessions (male deacons and women). At a fixed total, minimizing M² + E² minimizes (M − E)². Per-person session buckets retain one-position-per-service capacity. Total-workload cost dominates all session costs; session costs dominate the remaining position/tie costs. Lower-priority costs preserve specialized deacons for deacon slots when possible and rotate equivalent choices deterministically by month. Exact equality across different eligibility groups is not always possible. The balancing window is the selected month; previous months’ totals, absences and individual availability are not modeled in this phase.

Insufficient people produce explicit shortages, never duplicate simultaneous assignments or invented eligibility. Required staffing counts remain in editable duty descriptions; the generation preview lists shortages. Shortage warnings describe the generated result and are not copied into static descriptions, so fixing an assignment does not leave a stale warning in the final table. The leader can adjust every date, person, duty and note manually; manual edits are not forcibly rebalanced or restricted to the original roster. The reception summary counts recognized names in the visible text, updating immediately after edits; it does not expand department/group labels into people.

Generated plans use the `reception` presentation layout. Their table, printed output and DOCX have one row per Sunday, **Sáng** spanning four subcolumns (**Cửa chính**, **Phòng trung lão**, **Gác lửng**, **Phòng nhóm phụ**), and **Tối** as the final column. The table scrolls within its container on phones. Authorized managers edit each assignment cell directly in a textarea and save through the existing schedule action. Member/cancelled views and print output remain read-only. If a manually added morning responsibility or session no longer matches the fixed reception columns, the ordinary schedule table is used so additional content is not omitted.

The roster snapshot token includes current membership, names and gender data. An outdated preview request returns 409 after a relevant change; reopen the planner to refresh. Department/gender changes affect future generation and never rewrite saved schedules. Existing profile-merge logic moves department memberships to the retained profile; legacy reception rows continue to be merged for compatibility but do not control generation.

### Reception API and files

- `GET /api/reception-team`: reception managers only; returns department-sourced names, classification, source department names and snapshot token.
- `PUT /api/reception-team`: legacy endpoint; authorized requests now receive 400 directing the caller to maintain departments/profile genders. It cannot change the generated roster.
- `POST /api/schedules/reception-generate`: `{month:"YYYY-MM",token}`; returns an unsaved draft, member names, counts and shortage warnings. Reuses category authorization, CSRF/origin protections and the audit log. Stale rosters and inactive/missing profiles are rejected.

Server handlers live in `apps/web-admin/lib/server/reception.ts`; the shared mobile/admin planner is `apps/mobile-client/src/schedules/reception-planner.tsx`. No new accounts, global roles, email workflows or independent calendar were introduced. Apply 020 through `npm run db:migrate`; the local database migration and isolated backend runner include it.

### Reception verification — 8 November 2026

- **148 backend tests passed**, including reception-category authorization, saved roster concurrency, invalid/stale/inactive members, preview-only generation, normal draft editing/publication, grouped DOCX headers and reception-aware profile merging.
- **131 frontend tests passed**, including Sunday row counts, grouped column spans, cell editing, monthly preview/shortages and saving classifications before generation.
- **49 focused core tests passed** across reception, schedules, push and calendar. Reception coverage includes exact staffing, monthly balance, short rosters, no simultaneous duplicate, four/five-Sunday months, deterministic allocation, fresh IDs, editable fallback and a 200-person roster.
- Full `npm run test:core`: **131 passed, 8 existing worship-template/newline failures**. No new reception failures.
- `npm run typecheck` and `npm run build`: passed all workspaces and both production apps.
- Local `npm run db:migrate`: migration **020** applied successfully. No actual reception team was invented or populated.

### Department-sourced reception verification — 9 November 2026

`npm run test:backend` passed all **148 tests**, including deduplication across both departments, ignoring legacy manual outsiders, department-based deacon eligibility, unknown genders, token invalidation after membership/gender changes, inactive-profile exclusion and editable draft/export regression checks. Type checking and both production builds passed. The full frontend run passed **130/131 tests**; all three reception tests passed. The unrelated existing calendar test “worship uses the current selected date without rewriting text on later date edits” fails on the new Monday date because its setup starts with today's non-Sunday preset. Calendar code was not modified for this change.

## Editable reception table text — 9 November 2026

Reception cells now show one compact honorific/name per line: **CS Minh Quân**, **Ô. Tấn Kiệt**, or **CS Mỹ Hạnh**, using the final two words of the existing name and the known generated reception classification. Existing explicit name prefixes are respected. Gender/staffing labels and duty descriptions are not appended to table cells or Word output. Full profile names, stored notes, staffing rules and linked member IDs are unchanged.

Every morning-position/evening assignment cell is an accessible multiline textarea for authorized editors. Typing updates the working draft immediately and reception edits autosave silently on this device. **Gởi lịch tiếp tân** submits a new reception plan; **Lưu thay đổi** updates an existing official plan. There is no request per keystroke or popup for editing text. Empty strings, whitespace, Vietnamese text and line breaks are preserved. Read-only viewers never receive edit controls, and saving temporarily disables the controls. Word/print uses the same saved text.

The optional `displayText` field is presentation text, not a name-to-profile parser. Typing a different name does not silently reassign a profile or change notification recipients. Use **Danh sách chương trình** to change linked members; the editor explains this distinction. Changing linked members/department assignments clears their custom presentation text so the names can regenerate. Copying without assignments also clears custom text. Existing assignment counts continue to count linked profiles, not typed lines.

Migration **021_reception_cell_text.sql** adds nullable `schedule_responsibilities.display_text` with a 4,000-character limit; legacy rows stay null and render compact generated names automatically. No old content is rewritten. Apply with `npm run db:migrate` before deployment; applied locally. Text changes participate in published-assignment diffing when notifications are explicitly enabled, using the existing linked recipient scope. Missing overrides do not alter old signatures. Personal scoped responses remove custom cell text, which may contain other members' names, and show only the viewer's own assignments.

Verification: **149 backend tests passed**, including save/reload, exact multiline/empty text, linked-ID preservation, published Word output and personal-view privacy. **52 focused core tests** and **6 focused reception/schedule UI tests** passed, including direct editing and save payloads. Typecheck and both builds passed. Full frontend: **131 passed / 1 existing Monday-dependent worship-calendar failure**; calendar code was unchanged.

### Reception presentation refinement — 9 November 2026

Generated female names use **CS**, including **CS Thùy Linh**; regular male names retain **Ô.**, and male-deacon names retain **CS**. Generated names within each cell list women first without mutating linked assignment order or counts. Custom line contents are preserved; recognized names are sorted on blur and saving under the current ordering rule. This is presentation formatting and does not change authentication roles or staffing eligibility.

The browser table uses alternating theme-aware row backgrounds, vertically centered cells, content-sized borderless transparent textareas and centered headings/title. The Word table uses corresponding alternating white/`#FDF3D0` rows, centered headings/title and vertically centered cells. The focus ring remains for keyboard accessibility. No database migration or data rewriting is required.

### Reception ordering, advisory checks and mobile table — 9 November 2026

Cells order people by **women → male Chấp sự → other members**, then by Vietnamese given-name alphabet (the last word, consistent with the directory), with full-name tie-breaking. Generated names follow this order immediately. Edited cells sort on blur and on save, preserving each line's content instead of moving the caret during typing. Names are resolved against current active profiles in the two source Ban ngành, using either full names or unambiguous compact names. Unknown/ambiguous lines stay visible for review; gender or membership is never guessed from a title alone.

Reception editors load the scoped roster to check presentation text live. A subtle amber cell background and accessible explanation identify outsiders, ambiguous names (enter a full name to disambiguate), unknown gender, wrong gender/deacon eligibility for the position, inappropriate CS/Ô. title, and a repeated person in the same Sunday/session. Serving both morning and evening remains valid. When a replacement keeps the standard cell head count, its required gender/deacon mix is also checked. Understaffed cells and missing required gender/deacon positions produce warnings. Monthly workload differences remain informational.

Saving or publishing a schedule with these warnings opens **Vẫn lưu phân công cần kiểm tra?**. **Quay lại chỉnh sửa** preserves the edits and sends no save request; **Vẫn lưu thay đổi** explicitly allows the exception. Corrected cells clear their warning immediately. A valid edit saves without this extra dialog. If roster verification is unavailable, the editor explains that and requires explicit confirmation before an unchecked save. These are advisory leader checks, not a replacement for the existing server authorization, linked-member validation or version checks. Text changes still do not silently reassign linked profiles or notification recipients.

Alternating rows now use exactly **#FDF3D0** in browser/Word output. Textareas have no border or resize thumb and grow automatically with content/wrapping and viewport changes. Mobile text is at least 16px to avoid iOS input zoom; the horizontal table is contained, dates remain sticky while swiping, and a phone-only swipe hint explains the layout. Keyboard focus indicators, centered headings and vertical alignment are retained. No schema migration is required.

Verification for the ordering/rule/mobile update: **56 focused core tests**, **7 focused reception/schedule UI tests**, and **149 backend tests** passed. Coverage includes all three priority groups, Vietnamese D/Đ ordering, outsider/ambiguous names, eligibility, same-session duplication, replacement composition, ignored head counts, live warning removal, cancel preserving edits, explicit override confirmation, and valid edits saving without an extra confirmation. `npm run typecheck` and both production builds passed. Full-suite calendar/template limitations recorded above remain outside this change; no physical-phone screenshot testing was performed.

### Simplified reception workspace and workload overview — 9 November 2026

The monthly reception editor now presents the fixed month title, editable table, live workload overview and existing save/publish/export controls. The metadata creation form, table/month/week switcher, **Thêm chương trình** and **Danh sách chương trình** are hidden for this reception layout. Other schedule categories keep their existing forms and navigation. Month selection remains in the reception generation dialog.

Understaffed cells now show a red/rose background and explicit **Còn thiếu X người** feedback, counting unique resolvable profiles rather than duplicate or unknown lines. Missing required women/deacons are also listed; eligibility, ambiguity and duplicate-session checks remain. These warnings share the existing leader confirmation before save/publish. Monthly workload differences remain summary information, not errors. Textareas have no native appearance, border, shadow or focus ring; a subtle containing-cell background and caret indicate focus without drawing a frame. Read-only/printed text remains plain.

**Phân công từng người** is a compact list using the same honorific/name format as the table, for example **CS Linh Công: 3 sáng - 1 tối**. Overview metric cards, average captions, role subtitles, avatars, total badges and workload bars have been removed. The list still reflects visible cell text immediately and reports unresolved names separately. Initially eight entries appear with an option to show all; linked member IDs and notification recipients are unchanged by text edits, as explained below the table.

Verification: **57 focused core tests**, **7 focused reception/schedule UI tests**, typecheck and both production builds passed. Tests cover understaffing, valid staffed cells, immediate summary updates (80 → 79 → 80), removed controls, correction clearing errors and confirmation overrides. Existing broader-suite limitations recorded above are unchanged.

### Whole-cell errors and compact person list — 9 November 2026

An invalid assignment colors the entire table `<td>`, including padding and the area beneath the text field, with the rose error background. The textarea remains transparent and borderless. Every error is displayed as a complete line; there are no collapsed “+1” indicators or fractions. Staffing deficits are specific: **Còn thiếu 1 nam chấp sự.**, **Còn thiếu 1 nữ.**, or **Còn thiếu 1 nam.** Extra male deacons can cover a general male slot after the required deacon slots are reserved. Ineligible placements say **[compact name] không thể xếp ở vị trí này.** Ambiguous names, duplicates and missing gender still have explicit explanations.

The **Tổng quan phân công** dashboard is removed. The remaining section is **Phân công từng người**, with simple compact-name/count lines such as **CS Linh Công: 3 sáng - 1 tối**; full names are not used for these entries. Counts still update from visible text, and the eight-entry expand control is retained for larger rosters.

Verification: **57 focused core tests**, **8 focused reception/schedule UI tests**, typecheck and both production builds passed. Tests cover role-specific shortage wording, ineligible names, complete error explanations without shorthand, compact person names, exact morning/evening wording and live count updates. No migration required.

Reception cell polish: person-specific warnings no longer start with “Nhân sự” (e.g. **CS Thu Hồng không thể xếp ở vị trí này.**). The textarea and its wrapper have no inset background, rounded panel or focus tint. Fields stay transparent and flat against the whole-cell background while editing; whole-cell red error highlighting remains.

Pasting into reception table cells trims surrounding whitespace and each pasted line, normalizes Windows line endings, and keeps names/internal spaces and multiline content. It replaces the current selection, preserves unselected text and respects the 4,000-character limit. Whitespace-only pastes are ignored; normal typing is unchanged.

Paste verification: 9 focused reception/schedule UI tests and workspace typecheck passed, covering per-line trimming, Windows newlines, selection replacement, whitespace-only input and the cell length limit.

## Local reception drafts and official submission — 9 November 2026

Reception plans no longer have **Lưu bản nháp** or **Xóa bản nháp** controls. Typing saves a temporary copy silently in browser `localStorage`, without a server request, success toast or publication. The copy includes the draft, compact-cell text, display names, linked IDs, notification preference and retry UUID; authentication credentials are never included. There is no separate local-draft section: selecting the same month resumes a remaining temporary copy after reloading. Confirmed Back discards that editor’s temporary copy. Separate new generations have separate UUID-scoped copies; existing server plans use their record ID. This behavior is specific to monthly reception; other category editors retain their existing draft-save workflow.

Local copies are scoped by authenticated user ID and auth version. Logout, detected session expiration/revocation and authenticated-principal changes clear this private draft namespace, without clearing unrelated preferences. Submission, successful official saves and cancellation remove the corresponding temporary copy. Local storage is not encrypted and is not a security boundary; it is the user-requested exception to the previous public-only persistence model. No auth token is stored there, no private API response/HTML is cached in the service worker, and this does not create a general offline member directory. A storage failure is reported so the leader knows to keep the page open. Drafts can be resumed on the same device/browser while that session remains valid; there is no cross-device draft synchronization.

The editor’s back button warns for every unsubmitted reception plan, including an unchanged legacy server draft. Confirming **Rời trang** discards the editor’s local temporary copy and pending changes; **Quay lại** cancels leaving and retains them. Autosave/pagehide callbacks are stopped before deletion so they cannot recreate the discarded copy. Official/server records and other local drafts are not deleted. Browser unload/close also uses the existing native unsaved-work warning. Navigation through unrelated SPA links is not a universal route blocker; the local copy remains available. The back dialog explicitly warns that pending changes will be discarded.

**Gởi lịch tiếp tân** keeps the existing publication/rule confirmation, then atomically saves and publishes through `POST /api/schedules/submit`. Invalid publication rolls the complete transaction back, leaving no new server draft. The retry UUID/payload hash makes repeat successful submissions return the same official plan without duplicate notifications. Cancelled retry targets reject with 409. `POST /api/schedules/:id/submit` atomically updates and publishes an existing legacy server draft using version checks. Both use the existing category authorization, origin/CSRF checks, audit and post-commit push handling. No migration is needed. Legacy draft APIs stay available for compatibility and other schedule categories.

Reception copying also starts locally: the copy dialog uses the authorized preview route and reads current source names, then opens a local working plan. It does not call the server copy-create endpoint until a different, legacy category explicitly requires that workflow. Source-version checks and skipped-date acknowledgement remain.

**Hủy lịch** is shown only for published plans. **In lịch chính thức** appears for official reception plans and prints the last server-confirmed record, even if a local working copy has unsent edits. Unsaved/unsubmitted draft text is not substituted into the official printout. The existing Word export and saved-edit controls remain. Stale local edits with a different server base version are not applied automatically: a read-only **Xem bản tạm** view lets the owner inspect/copy them. Late responses after leaving/logout do not reopen a private editor.

Verification: **151 backend tests** passed, including atomic submit rollback, authorization, idempotency, cancelled-target retry and legacy draft submission. **61 focused core tests** passed, including existing API-client/session behavior. **15 focused reception/schedule UI tests** passed, covering silent persistence, account/version isolation, logout cleanup, back alert/restore, storage failure without data loss, cache removal on submit, official printing with pending local edits and local-only copying. Typecheck and both builds passed. Existing unrelated full-suite calendar/template issues recorded above were not changed.

### Extra reception dates

On the monthly reception board, **Thêm ngày bổ sung** lets the leader type only a day number within the selected month (month and year come from the board), **Sáng** or **Tối**, and a prefill headcount (default 10; 1–10, the total capacity of the four-position staffing rules). This supports occasions such as Christmas Eve on 24 December; dates are not inserted automatically. Selecting **Thêm vào bảng** appends a regular schedule event without changing Sunday assignments. A duplicate date/session or an out-of-month date is rejected; Sundays are already represented by their normal morning/evening rows.

Prefill uses the live department roster and prioritizes people with fewer visible assignments in the month, then name order. Automatic filling selects each person at most once and applies the morning position requirements to both extra morning and extra evening services: Cửa chính 2 male deacons + 2 women; Phòng trung lão 1 male deacon + 1 man; Gác lửng 2 male deacons + 1 man; Phòng nhóm phụ 1 male deacon. Constrained deacon/women slots are filled before flexible male slots; extra male deacons can fill general male slots. People with missing eligibility are not guessed. If the roster cannot fill the requested number under these rules, unfilled slots stay empty and the UI explains that eligible personnel are missing. Both extra morning and extra evening services have Cửa chính, Phòng trung lão, Gác lửng and Phòng nhóm phụ. Prefill places people only in positions allowed by these rules; the leader can freely rearrange them afterward. Sunday evenings retain their combined cell. Older combined extra-evening content remains visible in Cửa chính and is never discarded. The other session is shown as a dash until separately added. Sunday staffing validation remains unchanged; extra weekday rows have no Sunday count, gender, title or placement warnings, and allow free text. Duplicate detection always runs, including after manual edits: it flags all affected cells when the same person appears multiple times within one date/session, resolving full/compact names to profile IDs. Repeated unrecognized names are also flagged. Different dates or morning versus evening are independent. Duplicate warnings participate in the existing save confirmation and disappear when corrected. Extra assignments contribute to **Phân công từng người**. The date header is **Ngày**, and rows remain in date order.

Extra services use the same silent local autosave, submission, permissions, audit, linked-member notification and print/Word export flows as the rest of the board. The small remove control beside an extra date removes that service from the working copy; it reaches the server only on submission/save. No database migration or holiday inference is needed. As with existing cells, editing display text does not change linked member IDs or notification recipients.

Extra evening columns and Word export: extra weekday services use the existing four **Sáng** position columns instead of adding evening columns. Each extra service gets its own row, with a prominent capsule **Sáng**/**Tối** badge above the date and weekday; its combined evening cell shows a dash. The actual session stays unchanged in stored data, editing callbacks, workload counts and notifications. If both sessions exist on an extra date, they appear as separate labeled rows. Sunday morning/evening rows retain their existing layout. Word export uses the same six-column layout, with session, date and weekday in the date cell, in an editable landscape `.docx` table. **Xuất Word** is available before submission and includes the current reception board and pending cell edits. It calls the authenticated, category-manager-only, origin-protected `POST /api/schedules/export-preview` route; the server validates the draft and bounded display-name map, audits the export, and reuses the existing document renderer. Export creates no schedule, does not submit, and sends no assignment notifications. Existing saved-official Word exports retain version checking. Downloaded files can be edited in Microsoft Word; those file edits do not automatically change the app.

Extra-service autofill also considers the current **Sáng/Tối** split: among eligible people with equal monthly totals, it prefers the person whose imbalance would improve most by adding the requested session. Totals come from the current visible board, including manual edits and earlier extras. This affects automatic choices only; existing saved schedules and manual edits are never rewritten or forcibly balanced. Exact 50/50 splits are constrained by the Sunday demand of six male deacons in the morning versus four in the evening. In a four-Sunday month with ten deacons each serving four times, six 2-sáng/2-tối splits and four 3-sáng/1-tối splits are optimal; requiring 2/2 for everyone would leave morning positions unfilled.

Reception Word printing uses explicit **A4 landscape (297 × 210 mm)** with 10 mm margins and a fixed six-column grid sized to the printable width. The title is centered and bold; duplicate category/date-range/export-date paragraphs are omitted for reception exports. Compact zero-after paragraph spacing, vertically centered cells, thin gray borders, muted green headers, and alternating cream rows make it ready to print at actual size on A4. A conservative text-wrap/page-height estimate selects the largest body font from 11 down to 8.5 pt for longer monthly boards, including extra services. Repeated table headers and unsplittable rows preserve readable continuation if unusually long manual text or many extra dates exceed one page. Content is never truncated and font size is never made illegible just to claim one-page output. This layout estimate is tested against five-Sunday and extra-service fixtures; actual pagination can differ with Word/font/printer versions. Existing export authorization, editable text and save/submission behavior are unchanged.

Reception print refinement: Word downloads use `Lich tiep tan thang MM-YYYY.docx` (the slash in the requested month/year label is replaced because it is a filename separator). The browser print/PDF title uses `Lich tiep tan thang MM/YYYY` and restores the application title after printing. The print-only board is mounted in a direct-body portal: unrelated app layout boxes are removed from print flow, preventing the hidden application height from producing an extra blank page. A 297 mm-wide A4 landscape canvas uses 10 mm padding, a small vertical rounding reserve, and a measured zoom that compensates width while shrinking height. The clone is measured with its final print font and light palette. Screen alternating rows now use light/dark theme tokens; paper remains white/cream regardless of device theme. Word's page budget measures notes at their actual body font and reserves space for the final paragraph. No automated tests were updated or run for this refinement, following the project's current test instructions.

Quarterly print and Word exports use the same A4 landscape page and 10 mm margins as reception. The 15-column weekly table uses a compact fixed grid: date and group-number columns are narrower, names wrap inside cells, and all morning/afternoon/Wednesday columns stay within the page width. Browser printing measures this compact layout before applying height scaling. Word uses the matching column proportions and a conservative height estimate to select the body font (11–8 pt), with a compact title and no extra metadata paragraphs. Quarterly Word preview downloads, like reception previews, include current edits. Browser printing uses the saved official schedule. **Lưu** saves and publishes both plan types; generation remains part of creating a new quarterly plan.
