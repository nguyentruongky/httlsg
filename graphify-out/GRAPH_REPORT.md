# Graph Report - church-management  (2026-11-24)

## Corpus Check
- 611 files · ~268,719 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 3, .webmanifest 3, .css 3)

## Summary
- 3008 nodes · 10537 edges · 153 communities (127 shown, 26 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 226 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `16637147`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- departments/[id]/members/route.ts
- use-ticket-entry.ts
- local-election.ts
- Input
- useAuth
- index.tsx
- db.ts
- server/elections.ts
- renderScheduleDocument
- server/calendar.ts
- members.ts
- src/member-sync.ts
- src/quarterly-work.ts
- ref_zod
- Church Management Platform — Agent Documentation
- src/index.ts
- devDependencies
- parser.ts
- day-responsibilities.tsx
- src/reception.ts
- member-filters.tsx
- json
- ref_zod
- ref_node_fs
- scrutineer-page.tsx
- migrate-local-database.mjs
- public-election.ts
- check-responsive-ui.mts
- ui/package.json
- with
- Dialog
- member-information.tsx
- scripts
- public-election-page.tsx
- failure
- server/schedules.ts
- server/schedules.ts
- assertOrigin
- AuthEventStream
- header
- worship-contributions.ts
- src/department-members.ts
- package.json
- core/package.json
- server/session.ts
- phone-calendar.ts
- ticket-entry.tsx
- query-persistence.ts
- import-believers.py
- connection-check.ts
- worship-mention-textarea.tsx
- push-delivery.ts
- event-presets.ts
- Card
- web-admin/package.json
- useToast
- Schedule & Ministry Assignment Management
- Church Member Management
- exceljs
- reception-team/route.ts
- Bầu cử / Election module
- Architecture and integration guide
- local-database.ts
- mobile-client/package.json
- Hội Thánh PWA and device notifications
- @hookform/resolvers@^6.0.0
- Button
- compilerOptions
- vercel.json
- jose
- README.md
- Authentication and access control
- public/elections/[[...path]]/route.ts
- lucide-react@^0.468.0
- Worship programs: automatic email updates and phone-ready Viber drafts
- client-router.ts
- auth-session.tsx
- next
- @prisma/composer
- web-admin/tsconfig.json
- Calendar, event email and Word export
- Supporting documentation
- dependencies
- ticket-card.tsx
- http.ts
- scripts
- Local believer workbook fixture
- local-data.ts
- Persistent login
- dependencies
- overrides
- ui-interactions.test.ts
- Local development
- worship-review-page.tsx
- calendar-responsibilities.ts
- election-page.tsx
- directory.ts
- catalog.ts
- @org/core@*
- mobile-client/tsconfig.json
- Church calendar, email groups, delivery and Word export
- Member-facing features
- scripts
- ref_node_path
- grantScheduleLeader
- src/calendar.ts
- audit-log-list.tsx
- scheduleApi
- core/tsconfig.json
- ui/tsconfig.json
- departments/route.ts
- schedule-categories/route.ts
- api-client.ts
- @org/ui@*
- public/sw.js
- event-parser.ts
- public/pwa/sw.js
- core/pwa/sw.js
- choir-memberships/route.ts
- AGENTS.md
- Production loading performance
- personnel-missions.ts
- HttpError
- pg
- collect
- Schedule & Ministry Assignment Management
- copySchedule
- Authentication and persistent sessions
- Editable reception table text — 9 November 2026
- zustand@^5.0.0
- database-performance.md
- next-themes@^0.4.6
- directory.ts
- member-read-sync.md
- react-dom@^19.2.0
- Card
- local-schedule-drafts.ts
- schedule-members/route.ts
- recharts@^3.3.0
- state.ts
- @tanstack/react-table@^8.21.0
- ReceptionTable
- zod@^4.0.0
- Pages and API reference
- pdfkit
- Deployment and operations
- Administrative features
- Backup, archival, and handoff

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 210 edges
2. `Button()` - 209 edges
3. `apiRequest()` - 133 edges
4. `failure()` - 126 edges
5. `json()` - 116 edges
6. `withActor()` - 111 edges
7. `useAuth()` - 97 edges
8. `ErrorMessage()` - 91 edges
9. `Dialog()` - 88 edges
10. `calendarApi()` - 76 edges

## Surprising Connections (you probably didn't know these)
- `8. Calendar Contribution Review Workflow` --references--> `CalendarReviewPage()`  [INFERRED]
  AGENTS.md → apps/mobile-client/src/calendar/calendar-review-page.tsx
- `Runtime topology` --references--> `start()`  [INFERRED]
  README.md → apps/mobile-client/src/main.tsx
- `Setup` --references--> `admin()`  [INFERRED]
  docs/election.md → apps/web-admin/lib/server/roles.ts
- `Roles, permissions, and privacy` --references--> `admin()`  [INFERRED]
  README.md → apps/web-admin/lib/server/roles.ts
- `Opening the email on a phone` --references--> `href()`  [INFERRED]
  docs/worship-programs.md → apps/mobile-client/src/department-profile-workspace.tsx

## Import Cycles
- None detected.

## Communities (153 total, 26 thin omitted)

### Community 0 - "departments/[id]/members/route.ts"
Cohesion: 0.25
Nodes (7): Context, DELETE, GET(), mutate(), PATCH, POST, runtime

### Community 1 - "use-ticket-entry.ts"
Cohesion: 0.44
Nodes (8): saveLocalTicket(), CommandPlan, entryFilter(), filterEntryCandidates(), planEntryCommand(), errorMessage(), useTicketEntry(), ElectionTicketKind

### Community 2 - "local-election.ts"
Cohesion: 0.18
Nodes (20): ElectionSync(), Action, append(), completed(), db(), digest(), localMeta(), LocalTicket (+12 more)

### Community 3 - "Input"
Cohesion: 0.10
Nodes (30): CalendarExport(), sendEmail(), Preview, DateInput(), DropdownBox(), DropdownBoxProps, InviteDialog(), scheduleModule (+22 more)

### Community 4 - "useAuth"
Cohesion: 0.13
Nodes (23): AutoLoadMore(), ConnectionIssue(), ListLoading(), dateFormat, labels, Notice, notificationDate(), Notifications() (+15 more)

### Community 5 - "index.tsx"
Cohesion: 0.06
Nodes (52): AnimatedSheetContent(), CalendarToolbar(), CalendarToolbarProps, useWorshipContributions(), WorshipContributions(), WorshipContributionsBadge(), worshipContributionsKey, WorshipDraft (+44 more)

### Community 6 - "db.ts"
Cohesion: 0.17
Nodes (24): definiteFailure(), deliverCalendarItems(), deliverNext(), escapeEventHtml(), eventEmail(), processCalendarOutbox(), sendCalendarNotificationNow(), Input (+16 more)

### Community 7 - "server/elections.ts"
Cohesion: 0.06
Nodes (64): Context, GET, handler(), POST, runtime, Context, GET, handler() (+56 more)

### Community 8 - "renderScheduleDocument"
Cohesion: 0.12
Nodes (44): saveQuarterlyImage(), dutyText(), ErrorCell(), PlainCellInput(), QuarterlyCellChange, QuarterlyWorkTable(), cell(), saveReceptionImage() (+36 more)

### Community 9 - "server/calendar.ts"
Cohesion: 0.03
Nodes (120): 5.3 Web Admin (`apps/web-admin/`), DELETE(), runtime, POST(), runtime, Context, DELETE(), GET() (+112 more)

### Community 10 - "members.ts"
Cohesion: 0.08
Nodes (56): setManualChoirMembership(), assignedDepartments(), Input, syncMemberReads(), currentMemberScope(), directoryMemberScope(), addHistory(), canonicalMemberId() (+48 more)

### Community 11 - "src/member-sync.ts"
Cohesion: 0.15
Nodes (17): adminKinds, CachedPage, CachedRow, detailKinds, listKinds, memberKinds, removeMemberReads(), Cursor (+9 more)

### Community 12 - "src/quarterly-work.ts"
Cohesion: 0.11
Nodes (50): draftKey(), ScheduleEditor(), download(), requestAction(), update(), stableKey(), checkQuarterlyWork(), quarterlyDirectoryMembers() (+42 more)

### Community 13 - "ref_zod"
Cohesion: 0.20
Nodes (26): JoinInput, joinPublicElection(), publicElectionAction(), publicElectionApi(), publicConnectionAccess(), publicElectionConnection(), publicBrowserCredential(), publicCredentialHash() (+18 more)

### Community 14 - "Church Management Platform — Agent Documentation"
Cohesion: 0.14
Nodes (13): 10. Adding a New API Endpoint (Web Admin), 11. Adding a New Database Migration, 12. Typecheck & Lint, 13. Environment Variables, 14. Deployment (Vercel), 15. Graphify (Knowledge Graph), 1. Project Overview, 2. Root Scripts (`package.json`) (+5 more)

### Community 15 - "src/index.ts"
Cohesion: 0.07
Nodes (30): MemberUpdateResult, getPersonnelMissions(), savePersonnelMissions(), MissionSelect(), collect(), DraftMission, MissionsForm(), Target (+22 more)

### Community 16 - "devDependencies"
Cohesion: 0.09
Nodes (19): devDependencies, esbuild@^0.28.2, sharp@^0.35.5, tailwindcss@^4.1.0, @tailwindcss/vite@^4.1.0, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/jsdom@^30.0.0 (+11 more)

### Community 17 - "parser.ts"
Cohesion: 0.15
Nodes (21): reportLinkDiagnostics(), DuplicateWorshipHymn, findDuplicateWorshipHymns(), HymnOccurrence, getMissingWorshipProgramFields(), hasWorshipValue(), keys, labelMap (+13 more)

### Community 18 - "day-responsibilities.tsx"
Cohesion: 0.35
Nodes (8): assignmentResponsibilityLabel(), churchDay(), DayResponsibilities(), programTitle(), receptionSession(), responsibilityText(), sessionOrder(), SCHEDULE_CATEGORIES

### Community 19 - "src/reception.ts"
Cohesion: 0.14
Nodes (26): addReceptionExtraService(), cleanReceptionLine(), compareReceptionNames(), editReceptionCell(), eligible(), formatReceptionName(), generateReceptionSchedule(), RECEPTION_EXCLUDED_MEMBER_IDS (+18 more)

### Community 20 - "member-filters.tsx"
Cohesion: 0.10
Nodes (34): FilterChips(), ClientError(), roleLabels, statusLabels, DirectoryCards(), DirectoryLoading(), DirectoryPagination(), DirectoryResults() (+26 more)

### Community 21 - "json"
Cohesion: 0.08
Nodes (27): GET(), POST(), runtime, GET(), POST(), runtime, GET(), runtime (+19 more)

### Community 22 - "ref_zod"
Cohesion: 0.09
Nodes (27): DB, createFollowupElection(), grantScrutineerRole(), manageElectionScrutineers(), readRoster(), authorize(), blank(), fields (+19 more)

### Community 23 - "ref_node_fs"
Cohesion: 0.18
Nodes (7): path, privateExists, publicExists, hash, root, sources(), version

### Community 24 - "scrutineer-page.tsx"
Cohesion: 0.25
Nodes (13): downloadElectionFile(), exportElectionBackup(), AssignedResponse, ScrutineerPage(), printTeamMinutes(), ScrutineerExportKind, ScrutineerHeader(), ScrutineerNavigation() (+5 more)

### Community 25 - "migrate-local-database.mjs"
Cohesion: 0.43
Nodes (6): args, connection(), localEnvFile, main(), restore(), runCapture()

### Community 26 - "public-election.ts"
Cohesion: 0.12
Nodes (17): PublicCandidateList(), PublicCandidateSelection(), PublicSelectionTabs(), MAX_ELECTION_SELECTIONS, ElectionPoint, matchesElectionName(), PUBLIC_DEFAULT_ACCURACY_METERS, PUBLIC_DEFAULT_RADIUS_METERS (+9 more)

### Community 27 - "check-responsive-ui.mts"
Cohesion: 0.22
Nodes (14): cdp(), check(), click(), clickText(), delay(), departments, evaluate(), fixture (+6 more)

### Community 28 - "ui/package.json"
Cohesion: 0.10
Nodes (24): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, cmdk@^1.1.1, lucide-react@^0.468.0, radix-ui@^1.4.0, react@^19.2.0, react-dom@^19.2.0 (+16 more)

### Community 29 - "with"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, if, runs-on, steps, jobs, deploy (+15 more)

### Community 30 - "Dialog"
Cohesion: 0.07
Nodes (64): AccountCredentials(), EmailGroupsPage(), GroupDialog(), GroupForm(), EventEditor(), EventResponsibilityBadges(), Failure, FailureNotifications() (+56 more)

### Community 31 - "member-information.tsx"
Cohesion: 0.11
Nodes (26): formatDate(), AreaPicker(), DepartmentChoices(), LocationPicker(), Option, ProfileChoiceList(), InlineMemberField(), displayDate() (+18 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, b, calendar:deliver, d, db:bootstrap, db:import, db:local:setup, db:local:start (+15 more)

### Community 33 - "public-election-page.tsx"
Cohesion: 0.23
Nodes (13): CheckResult, PublicConnectionCheck(), flushAllPublicConnectionReports(), descriptions, ElectionEligibilityError(), EligibilityIllustration(), Reason, SingleLineText() (+5 more)

### Community 34 - "failure"
Cohesion: 0.06
Nodes (46): GET(), runtime, GET(), runtime, Context, GET(), PUT(), runtime (+38 more)

### Community 35 - "server/schedules.ts"
Cohesion: 0.16
Nodes (16): Context, POST(), runtime, Context, POST(), runtime, POST(), runtime (+8 more)

### Community 36 - "server/schedules.ts"
Cohesion: 0.13
Nodes (25): getSchedule(), Id, List, managerAny(), requireScheduleCategory(), affectedAssignments(), assignmentSignatures(), canCreateScheduleCategory() (+17 more)

### Community 37 - "assertOrigin"
Cohesion: 0.11
Nodes (26): Context, GET(), PATCH(), PUT(), runtime, POST(), runtime, POST() (+18 more)

### Community 39 - "header"
Cohesion: 0.24
Nodes (9): GET(), runtime, GET(), runtime, getAssignedSchedule(), getNotifiedSchedule(), header(), hydrate() (+1 more)

### Community 40 - "worship-contributions.ts"
Cohesion: 0.12
Nodes (26): Context, GET(), POST(), runtime, POST(), runtime, GET(), POST() (+18 more)

### Community 41 - "src/department-members.ts"
Cohesion: 0.50
Nodes (3): DEPARTMENT_BULK_LIMIT, DepartmentMembershipBulkInput, memberIds

### Community 42 - "package.json"
Cohesion: 0.15
Nodes (18): devDependencies, prettier@^3.9.10, sharp@^0.35.5, tsx@^4.20.0, @types/node@^22.0.0, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.9.0 (+10 more)

### Community 43 - "core/package.json"
Cohesion: 0.13
Nodes (18): dependencies, react@^19.2.0, @tanstack/react-query@5.107.1, @tanstack/react-query-persist-client@^5.107.1, zod@^4.0.0, zustand@^5.0.0, exports, react (+10 more)

### Community 44 - "server/session.ts"
Cohesion: 0.09
Nodes (40): POST(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+32 more)

### Community 45 - "phone-calendar.ts"
Cohesion: 0.29
Nodes (10): Assignment, assignmentEvent(), googleCalendarUrl(), saveAssignmentToCalendar(), calendarFile(), CalendarFileEvent, CalendarFileEventSchema, calendarTimestamp() (+2 more)

### Community 46 - "ticket-entry.tsx"
Cohesion: 0.26
Nodes (10): BallotActions(), BallotPreview(), CandidateResults(), commands, EntryInstructions(), EntrySearch(), entryPanel, entryPrimary (+2 more)

### Community 47 - "query-persistence.ts"
Cohesion: 0.15
Nodes (23): 16. Common Conventions / Gotchas, deferred(), Component(), useCalendarResponsibilities(), organizationMembersKey(), useOrganizationMembers(), allowed(), allowedRoots (+15 more)

### Community 48 - "import-believers.py"
Cohesion: 0.18
Nodes (4): main(), map_workbook(), normalize(), read_workbook()

### Community 49 - "connection-check.ts"
Cohesion: 0.16
Nodes (24): PublicElectionError, publicElectionRequest(), publicErrorMessage(), activeChecks, checkPublicElectionConnection(), errorReason(), flushPublicConnectionReports(), key() (+16 more)

### Community 50 - "worship-mention-textarea.tsx"
Cohesion: 0.25
Nodes (15): caretPosition(), mentionAt(), missingInformationContacts(), Trigger, WorshipMentionTextarea(), LocalWorshipPeopleInCharge, useLocalDirectory(), useLocalWorshipPeopleInCharge() (+7 more)

### Community 51 - "push-delivery.ts"
Cohesion: 0.09
Nodes (39): authorized(), comingWeekRange(), GET(), runtime, GET(), runtime, POST(), runtime (+31 more)

### Community 52 - "event-presets.ts"
Cohesion: 0.13
Nodes (15): applyPreset(), EventPresetSelector(), PublicWorshipPage(), submit(), submitNew(), Slot, Built-in event presets, Email calendar export to Ban Trình chiếu (+7 more)

### Community 53 - "Card"
Cohesion: 0.06
Nodes (49): 5.4 UI Package (`packages/ui/src/`), ApplicationSettings(), SettingsDestination, SettingsLink(), settingsPages, CalendarContribution, CalendarReviewPage(), Draft (+41 more)

### Community 54 - "web-admin/package.json"
Cohesion: 0.14
Nodes (19): devDependencies, jszip@^3.10.1, tailwindcss@^4.1.0, @tailwindcss/postcss@^4.1.0, @types/nodemailer@^8.0.2, @types/pdfkit@^0.17.7, @types/pg@^8.23.1, @types/qrcode@^1.5.6 (+11 more)

### Community 55 - "useToast"
Cohesion: 0.16
Nodes (19): CandidateManager(), decorate(), post(), Row, CountedBallotsCard(), download(), ElectionAdminPage(), ElectionResults() (+11 more)

### Community 56 - "Schedule & Ministry Assignment Management"
Cohesion: 0.10
Nodes (21): Cancellation and deletion, Categories and configuration, Copying, Creation and editing permissions, Database and API knowledge base, Department-sourced reception verification — 9 November 2026, Editing and lifecycle, Entry points (+13 more)

### Community 57 - "Church Member Management"
Cohesion: 0.13
Nodes (15): Applications and request flow, Architecture, Church Member Management, Contents, Database model and migrations, Development commands and verification, Environment configuration, Importing local test data (+7 more)

### Community 60 - "reception-team/route.ts"
Cohesion: 0.47
Nodes (5): GET(), PUT(), runtime, receptionTeam(), saveReceptionTeam()

### Community 61 - "Bầu cử / Election module"
Cohesion: 0.11
Nodes (17): Bầu cử / Election module, Consolidated storage (migration 052), Election and team identity (migration 054), Keyboard entry, Limits and delivery notes, Offline storage and recovery, Run an election, Scrutineer entry interface (+9 more)

### Community 62 - "Architecture and integration guide"
Cohesion: 0.12
Nodes (17): Membership, API contract to replace the demo adapter, Architecture and integration guide, Authorization matrix, Client state and real-time, Custom mobile dropdowns and type scale, Design and deployment, Mobile member directory (+9 more)

### Community 63 - "local-database.ts"
Cohesion: 0.28
Nodes (8): cluster, directory, envFile, exists(), log, main(), run(), socket

### Community 64 - "mobile-client/package.json"
Cohesion: 0.08
Nodes (34): dependencies, @hookform/resolvers@^6.0.0, jsqr@^1.4.0, lucide-react@^0.468.0, next-themes@^0.4.6, @noble/hashes@2.4.0, @org/core@*, @org/ui@* (+26 more)

### Community 65 - "Hội Thánh PWA and device notifications"
Cohesion: 0.15
Nodes (12): APIs, Event integration, recipients and delivery recovery, Explicit local reception draft exception, Hội Thánh PWA and device notifications, Installation and device support, Local development and HTTPS, Main implementation files, Manifest, icons and public-only offline behavior (+4 more)

### Community 67 - "Button"
Cohesion: 0.10
Nodes (27): PublicLocationCard(), fromConfig(), LocationSettingsForm(), PublicLocationSettings, PublicSessionConfig, ElectionOtp, OtpCard(), OtpResponse (+19 more)

### Community 68 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+3 more)

### Community 69 - "vercel.json"
Cohesion: 0.17
Nodes (11): crons, framework, rewrites, root, rewrites, $schema, services, mobile-client (+3 more)

### Community 71 - "README.md"
Cohesion: 0.26
Nodes (3): Account access, Nhân sự Hội Thánh, Admin profile merging

### Community 72 - "Authentication and access control"
Cohesion: 0.17
Nodes (12): API surface, Authentication and access control, Concurrent devices, Department bulk status and contextual profile navigation, Department detail pages and bulk membership changes, Department member management, Permission matrix, Prepared local database (+4 more)

### Community 73 - "public/elections/[[...path]]/route.ts"
Cohesion: 0.33
Nodes (5): Context, GET, handler(), POST, runtime

### Community 75 - "Worship programs: automatic email updates and phone-ready Viber drafts"
Cohesion: 0.20
Nodes (10): Current save behavior, Device verification, Email link compatibility and alternate labels, Failure handling and retries, Opening the email on a phone, Parsing and missing information, Persistence and compatibility, Public worship contributions (+2 more)

### Community 76 - "client-router.ts"
Cohesion: 0.06
Nodes (62): 3. Monorepo Conventions, 5.2 Mobile Client (`apps/mobile-client/src/`), App(), AuthFrame(), currentClientPath(), currentClientSearch(), goBackClient(), historyPosition (+54 more)

### Community 77 - "auth-session.tsx"
Cohesion: 0.25
Nodes (11): currentAuthBootstrap(), setOfflineReadAccess(), AuthBootstrap, AuthSessionProvider(), AuthState, Context, startTiming(), clearDevicePush() (+3 more)

### Community 78 - "next"
Cohesion: 0.18
Nodes (5): metadata, viewport, config, next@^16.0.0, next

### Community 79 - "@prisma/composer"
Cohesion: 0.32
Nodes (5): @prisma/composer-prisma-cloud@0.38.0, prisma@8.0.0-rc.33, prisma, @prisma/composer, @prisma/composer-prisma-cloud

### Community 80 - "web-admin/tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, incremental, plugins, exclude, extends, include, ../../tsconfig.base.json

### Community 81 - "Calendar, event email and Word export"
Cohesion: 0.29
Nodes (7): Calendar and event editor, Calendar, event email and Word export, Editable Word export, Immediate email delivery and recovery, Mẫu chương trình — built-in event presets, Recipient groups and notifications, Worship program updates and automatic Viber-draft email

### Community 82 - "Supporting documentation"
Cohesion: 0.29
Nodes (7): Concurrent devices, Department bulk status and contextual profile navigation, Department detail pages and bulk membership changes, Department member management, Email calendar export to Ban Trình chiếu, Supporting documentation, Testing email links on a phone over Wi-Fi

### Community 83 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, argon2@^0.45.2, docx@9.5.1, nodemailer@^10.3.1, qrcode@^1.5.4, react@^19.2.0, react-hook-form@^7.65.0, @tanstack/react-query@5.107.1 (+9 more)

### Community 84 - "ticket-card.tsx"
Cohesion: 0.27
Nodes (8): TicketStatusBadge(), ticketStatusLabel(), TicketCandidateLine(), TicketCandidates(), TicketCard(), TicketCardData, copyTicketId(), TicketNumber()

### Community 85 - "http.ts"
Cohesion: 0.19
Nodes (9): GET(), runtime, POST(), runtime, POST(), runtime, attachmentDisposition(), DIRECTORY_ID (+1 more)

### Community 86 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 87 - "Local believer workbook fixture"
Cohesion: 0.33
Nodes (5): Field mapping, Local believer workbook fixture, Local-only delivery and verification, Mapping results for this file, Run locally

### Community 88 - "local-data.ts"
Cohesion: 0.15
Nodes (13): key(), read(), seed(), write(), datasets, DatasetSchema, getLocalDataset(), LocalDataset (+5 more)

### Community 89 - "Persistent login"
Cohesion: 0.33
Nodes (6): Client example, Endpoint contract, Implementation, Limits and security rationale, Persistent login, Revocation and replay

### Community 90 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, effect@4.0.5, @prisma/composer@0.38.0, @prisma/orm-postgres@8.0.0-rc.23, effect, @prisma/orm-postgres

### Community 91 - "overrides"
Cohesion: 0.33
Nodes (6): overrides, effect, @effect/platform-bun, @effect/platform-node, @effect/platform-node-shared, @effect/vitest

### Community 92 - "ui-interactions.test.ts"
Cohesion: 0.11
Nodes (5): jsdom@^26.1.0, container, dom, root, jsdom

### Community 93 - "Local development"
Cohesion: 0.33
Nodes (6): Explicit legacy demo mode, Local development, Option A: create a private local PostgreSQL cluster, Option B: use an existing PostgreSQL database, Prerequisites, Run the separate Vite client

### Community 94 - "worship-review-page.tsx"
Cohesion: 0.19
Nodes (14): changes(), projectSession(), ReviewQueue(), back(), finish(), save(), update(), apply() (+6 more)

### Community 95 - "calendar-responsibilities.ts"
Cohesion: 0.26
Nodes (9): GET(), runtime, GET(), runtime, calendarResponsibilities(), loadPublishedResponsibilities(), responsibilitiesForDates(), clientSchedule() (+1 more)

### Community 96 - "election-page.tsx"
Cohesion: 0.25
Nodes (15): ElectionPage, Audit(), BackupImport(), download(), ElectionPage(), errorMessage(), labelStatus(), post() (+7 more)

### Community 97 - "directory.ts"
Cohesion: 0.11
Nodes (25): audit(), historyActor(), memory, Snapshot, ActivitySchema, canEditMemberDetails(), EventDateSchema, Invite (+17 more)

### Community 98 - "catalog.ts"
Cohesion: 0.24
Nodes (10): areas, DEPARTMENT_DISPLAY_ORDER, DEPARTMENT_TYPE_LABELS, DepartmentCatalogItem, departmentKey(), departmentRanks, DepartmentType, locations (+2 more)

### Community 100 - "mobile-client/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 101 - "Church calendar, email groups, delivery and Word export"
Cohesion: 0.22
Nodes (9): Church calendar, email groups, delivery and Word export, Database and APIs, Delivery states and recovery, Deployment and verification, Email groups, Immediate delivery and optional recovery worker, Notification triggers and recipient privacy, Product behavior and permissions (+1 more)

### Community 102 - "Member-facing features"
Cohesion: 0.40
Nodes (5): Confidential history, Directory and navigation, Filters, Member-facing features, Profile details and editing

### Community 103 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 104 - "ref_node_path"
Cohesion: 0.12
Nodes (11): children, launch(), require, root, stop(), root, args, connection() (+3 more)

### Community 105 - "grantScheduleLeader"
Cohesion: 0.48
Nodes (6): GET(), PATCH(), runtime, grantScheduleLeader(), grantToken(), scheduleLeaders()

### Community 107 - "src/calendar.ts"
Cohesion: 0.08
Nodes (44): eventColor(), eventColors, weekdayLabels, CalendarListView(), CalendarListViewProps, CalendarMonthPreview(), CalendarMonthView(), CalendarMonthViewProps (+36 more)

### Community 108 - "audit-log-list.tsx"
Cohesion: 0.23
Nodes (14): actions, ActivityLogs(), ConnectionLogs(), SubmissionLogs(), time(), AuditSummary(), ActivityLog, AuditData (+6 more)

### Community 109 - "scheduleApi"
Cohesion: 0.11
Nodes (21): GET(), runtime, GET(), runtime, Context, POST(), runtime, Context (+13 more)

### Community 110 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 111 - "ui/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 112 - "departments/route.ts"
Cohesion: 0.29
Nodes (6): DELETE, GET(), mutate(), PATCH, POST, runtime

### Community 113 - "schedule-categories/route.ts"
Cohesion: 0.23
Nodes (10): GET(), PATCH(), runtime, GET(), POST(), runtime, administrators(), configureScheduleCategory() (+2 more)

### Community 114 - "api-client.ts"
Cohesion: 0.21
Nodes (15): 5.1 Shared Core (`packages/core/src/`), 5. Key Source Files by Domain, download(), advanceAuthEpoch(), ApiError, authenticatedFetch(), clearBrowserAuth(), clearRefreshRequest() (+7 more)

### Community 116 - "public/sw.js"
Cohesion: 0.40
Nodes (4): ASSETS, destination(), SHELL_ASSETS, submit()

### Community 117 - "event-parser.ts"
Cohesion: 0.38
Nodes (6): Event entry and parsing, clock(), formatEventText(), isValidEventTime(), ParsedEventText, parseEventTime()

### Community 120 - "choir-memberships/route.ts"
Cohesion: 0.29
Nodes (9): POST(), runtime, authorized(), GET(), runtime, currentChurchYear(), reassignChoirMemberships(), choirDepartmentForAge() (+1 more)

### Community 122 - "Production loading performance"
Cohesion: 0.33
Nodes (5): Device cache, Lists and SQL, Production loading performance, Startup and navigation, Timing and later verification

### Community 123 - "personnel-missions.ts"
Cohesion: 0.09
Nodes (44): AccessChangeSchema, changeAccess(), createAccount(), manageDepartment(), authorize(), BoardMember, canonical(), changeDepartmentBoardMember() (+36 more)

### Community 124 - "HttpError"
Cohesion: 0.08
Nodes (36): 6. Authentication & Permissions, CredentialSchema, runtime, GET(), runtime, findAccountIdentity(), ProfileIdentity, login() (+28 more)

### Community 127 - "Schedule & Ministry Assignment Management"
Cohesion: 0.40
Nodes (5): Direct reception table editing, Extra reception dates, Monthly reception assignments, Schedule & Ministry Assignment Management, Temporary reception drafts and official submission

### Community 128 - "copySchedule"
Cohesion: 0.28
Nodes (7): Context, POST(), runtime, Context, POST(), runtime, copySchedule()

### Community 130 - "Authentication and persistent sessions"
Cohesion: 0.50
Nodes (4): Authentication and persistent sessions, Credentials and token lifecycle, Identifier-first login, Security boundaries and tradeoffs

### Community 133 - "Editable reception table text — 9 November 2026"
Cohesion: 0.40
Nodes (5): Editable reception table text — 9 November 2026, Reception ordering, advisory checks and mobile table — 9 November 2026, Reception presentation refinement — 9 November 2026, Simplified reception workspace and workload overview — 9 November 2026, Whole-cell errors and compact person list — 9 November 2026

### Community 135 - "database-performance.md"
Cohesion: 0.50
Nodes (3): Consolidation (migration 052), Local database performance review, Retired tables

### Community 137 - "directory.ts"
Cohesion: 0.13
Nodes (20): Filter navigation and age contract, AgeBound, AgeRangeSchema, getAge(), localDateFormatter, viewerId, all(), CompactMembersPage (+12 more)

### Community 140 - "Card"
Cohesion: 0.08
Nodes (46): downloadCsv(), formatCsv(), FilterChip, memberFilterChips(), ListControls(), ListPageHeader(), ListResultsSummary(), ListSearchToolbar() (+38 more)

### Community 141 - "local-schedule-drafts.ts"
Cohesion: 0.33
Nodes (10): leaveEditor(), openPeriod(), clearLocalScheduleDrafts(), key(), listLocalScheduleDrafts(), LocalScheduleDraftSchema, readLocalScheduleDraft(), removeLocalScheduleDraft() (+2 more)

### Community 142 - "schedule-members/route.ts"
Cohesion: 0.67
Nodes (3): GET(), runtime, searchScheduleMembers()

### Community 146 - "ReceptionTable"
Cohesion: 0.24
Nodes (12): ReceptionCellTextarea(), ReceptionTable(), content(), errorCell(), useKeyboardScrollSpace(), blur(), focus(), restore() (+4 more)

### Community 148 - "Pages and API reference"
Cohesion: 0.50
Nodes (4): Authentication endpoints, Main pages, Member and management endpoints, Pages and API reference

### Community 150 - "Deployment and operations"
Cohesion: 0.50
Nodes (4): Deployment and operations, Operational responsibilities, Release procedure, Runtime topology

### Community 151 - "Administrative features"
Cohesion: 0.67
Nodes (3): Administrative features, Duplicate-profile merging, Member management

### Community 152 - "Backup, archival, and handoff"
Cohesion: 0.67
Nodes (3): Backup, archival, and handoff, What to preserve privately, What to share for code review

## Knowledge Gaps
- **5 isolated node(s):** `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 772 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Church Member Management` connect `Church Member Management` to `Authentication and persistent sessions`, `Member-facing features`, `README.md`, `Calendar, event email and Word export`, `Supporting documentation`, `Pages and API reference`, `Deployment and operations`, `Administrative features`, `Backup, archival, and handoff`, `Local development`, `Architecture and integration guide`, `Schedule & Ministry Assignment Management`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Button()` (e.g. with `5.4 UI Package (`packages/ui/src/`)` and `primitiveCases()`) actually correct?**
  _`Button()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Input` be split into smaller, more focused modules?**
  _Cohesion score 0.09855072463768116 - nodes in this community are weakly interconnected._
- **Why does `HttpError` connect `HttpError` to `copySchedule`, `db.ts`, `server/elections.ts`, `renderScheduleDocument`, `server/calendar.ts`, `members.ts`, `src/quarterly-work.ts`, `ref_zod`, `json`, `ref_zod`, `failure`, `server/schedules.ts`, `server/schedules.ts`, `assertOrigin`, `header`, `worship-contributions.ts`, `server/session.ts`, `push-delivery.ts`, `reception-team/route.ts`, `http.ts`, `calendar-responsibilities.ts`, `grantScheduleLeader`, `scheduleApi`, `schedule-categories/route.ts`, `choir-memberships/route.ts`, `personnel-missions.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `apiRequest()` (e.g. with `3. Monorepo Conventions` and `5.1 Shared Core (`packages/core/src/`)`) actually correct?**
  _`apiRequest()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `useAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.13068181818181818 - nodes in this community are weakly interconnected._