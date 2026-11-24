# Graph Report - church-management  (2026-11-24)

## Corpus Check
- 631 files · ~274,046 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 3, .webmanifest 3, .css 3)

## Summary
- 3067 nodes · 10755 edges · 146 communities (132 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 250 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5fe4f0e1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Button
- json
- local-election.ts
- cn
- event-service.ts
- index.tsx
- ref_lucide_react
- server/elections.ts
- renderScheduleDocument
- server/calendar.ts
- roles.ts
- src/member-sync.ts
- src/quarterly-work.ts
- ref_zod
- Church Management Platform — Agent Documentation
- schedule-export.ts
- devDependencies
- parser.ts
- src/calendar.ts
- schedule-editor.tsx
- http.ts
- location-settings-form.tsx
- merge-members.ts
- scheduleApi
- prepareWorshipInformationRequest
- calendarApi
- ReviewQueue
- pwa-settings.tsx
- ui/package.json
- with
- personnel/api.ts
- Input
- scripts
- auth-contract.ts
- failure
- Architecture and integration guide
- Input
- push-subscriptions.ts
- authenticatedFetch
- personnel-missions.ts
- calendar-immediate-mail.ts
- src/schedules.ts
- package.json
- core/package.json
- server/session.ts
- phone-calendar.ts
- choir-memberships.ts
- query-persistence.ts
- import-believers.py
- public-election-page.tsx
- 5.1 Shared Core (`packages/core/src/`)
- db.ts
- main.tsx
- useAuth
- web-admin/package.json
- public-worship-page.tsx
- Schedule & Ministry Assignment Management
- Church Member Management
- exceljs
- server/reception.ts
- use-public-election.ts
- auth-service.ts
- election-team-export-data.ts
- mobile-client/package.json
- Hội Thánh PWA and device notifications
- day-responsibilities.tsx
- Card
- compilerOptions
- vercel.json
- changeDepartmentBoardMember
- README.md
- Authentication and access control
- use-workspace-route.ts
- Architecture and code organization
- Worship programs: automatic email updates and phone-ready Viber drafts
- client-router.ts
- apiRequest
- auth-contract.ts
- @prisma/composer
- web-admin/tsconfig.json
- Calendar, event email and Word export
- Supporting documentation
- dependencies
- server/quarterly-work.ts
- public-election.ts
- scripts
- Local believer workbook fixture
- worship-information.ts
- Persistent login
- dependencies
- overrides
- ui-interactions.test.ts
- Local development
- PageErrorBoundary
- 5.3 Web Admin (`apps/web-admin/`)
- push-keys.mjs
- schemas.ts
- useDepartmentMembers
- connection-check.ts
- mobile-client/tsconfig.json
- Church calendar, email groups, delivery and Word export
- header
- scripts
- check-responsive-ui.mts
- public/elections/[[...path]]/route.ts
- Monthly reception team generator
- audit-log-list.tsx
- server/schedules.ts
- core/tsconfig.json
- ui/tsconfig.json
- 5.1 Shared Core (`packages/core/src/`)
- previewEventResponsibilities
- api-client.ts
- Member-facing features
- public/sw.js
- public-election/location.ts
- public/pwa/sw.js
- core/pwa/sw.js
- src/index.ts
- AGENTS.md
- Production loading performance
- members.ts
- nodemailer
- Backend development patterns
- state.ts
- Schedule & Ministry Assignment Management
- createWorshipViberDraftLink
- Authentication and persistent sessions
- copySchedule
- Deployment and operations
- database-performance.md
- grantScheduleLeader
- directory.ts
- member-read-sync.md
- PublicQrScanner
- ref_react
- useKeyboardScrollSpace
- schedule-categories/route.ts
- Backup, archival, and handoff
- ref_node_crypto
- Pages and API reference

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 217 edges
2. `Button()` - 209 edges
3. `apiRequest()` - 134 edges
4. `failure()` - 125 edges
5. `json()` - 114 edges
6. `withActor()` - 113 edges
7. `useAuth()` - 97 edges
8. `ErrorMessage()` - 91 edges
9. `Dialog()` - 88 edges
10. `cn()` - 75 edges

## Surprising Connections (you probably didn't know these)
- `8. Calendar Contribution Review Workflow` --references--> `CalendarReviewPage()`  [INFERRED]
  AGENTS.md → apps/mobile-client/src/calendar/calendar-review-page.tsx
- `Registration troubleshooting` --references--> `subscribe()`  [INFERRED]
  docs/pwa.md → apps/mobile-client/src/client-router.ts
- `Patterns used here` --references--> `db()`  [INFERRED]
  docs/architecture.md → apps/mobile-client/src/elections/local-election.ts
- `Application services: one named use case` --references--> `db()`  [INFERRED]
  docs/backend-development.md → apps/mobile-client/src/elections/local-election.ts
- `Runtime topology` --references--> `start()`  [INFERRED]
  README.md → apps/mobile-client/src/main.tsx

## Import Cycles
- None detected.

## Communities (146 total, 14 thin omitted)

### Community 0 - "Button"
Cohesion: 0.08
Nodes (43): EmailGroupsPage(), GroupDialog(), GroupForm(), ConnectionIssue(), BOARD_POSITIONS, BoardPerson, BoardRoleEditor(), BoardYear (+35 more)

### Community 1 - "json"
Cohesion: 0.08
Nodes (38): Context, DELETE, GET(), mutate(), PATCH, POST, runtime, GET() (+30 more)

### Community 2 - "local-election.ts"
Cohesion: 0.06
Nodes (55): ElectionSync(), Action, append(), completed(), db(), digest(), exportElectionBackup(), LocalTicket (+47 more)

### Community 3 - "cn"
Cohesion: 0.06
Nodes (71): ApplicationSettings(), ElectionPage, SettingsDestination, SettingsLink(), settingsPages, CalendarToolbar(), CalendarToolbarProps, useWorshipContributions() (+63 more)

### Community 4 - "event-service.ts"
Cohesion: 0.16
Nodes (21): EventResponsibilityBadges(), persistNewCalendarEvent(), eventDto(), iso(), calendarEvent(), listCalendarEvents(), lockCalendarReviewEvents(), CalendarEventRow (+13 more)

### Community 5 - "index.tsx"
Cohesion: 0.09
Nodes (27): 5.4 UI Package (`packages/ui/src/`), AnimatedSheetContent(), FieldEditor(), useFieldEditorDismiss(), Providers(), Providers(), buttonVariants, DialogBoundaryContext (+19 more)

### Community 6 - "ref_lucide_react"
Cohesion: 0.06
Nodes (51): DepartmentManagement(), FilterChip, FilterChips(), memberFilterChips(), ClientError(), roleLabels, statusLabels, MemberDetail() (+43 more)

### Community 7 - "server/elections.ts"
Cohesion: 0.08
Nodes (50): Context, GET, handler(), POST, runtime, Context, GET, handler() (+42 more)

### Community 8 - "renderScheduleDocument"
Cohesion: 0.18
Nodes (28): saveQuarterlyImage(), dutyText(), ErrorCell(), PlainCellInput(), QuarterlyCellChange, QuarterlyWorkTable(), cell(), ReceptionCellChange (+20 more)

### Community 9 - "server/calendar.ts"
Cohesion: 0.16
Nodes (28): POST(), runtime, Context, DELETE(), GET(), PATCH(), runtime, GET() (+20 more)

### Community 10 - "roles.ts"
Cohesion: 0.10
Nodes (32): GET(), runtime, PUT(), runtime, GET(), runtime, GET(), POST() (+24 more)

### Community 11 - "src/member-sync.ts"
Cohesion: 0.15
Nodes (17): adminKinds, CachedPage, CachedRow, detailKinds, listKinds, memberKinds, removeMemberReads(), Cursor (+9 more)

### Community 12 - "src/quarterly-work.ts"
Cohesion: 0.15
Nodes (37): checkQuarterlyWork(), quarterlyDirectoryMembers(), quarterlyReceptionUnavailableDays(), receptionTextMembers(), resolveQuarterlyText(), scheduledPeople(), validateQuarterlyConflicts(), generateQuarterlyWork() (+29 more)

### Community 13 - "ref_zod"
Cohesion: 0.20
Nodes (25): JoinInput, joinPublicElection(), publicElectionAction(), publicElectionApi(), publicConnectionAccess(), publicElectionConnection(), publicBrowserCredential(), publicCredentialHash() (+17 more)

### Community 14 - "Church Management Platform — Agent Documentation"
Cohesion: 0.09
Nodes (23): 10. Adding a New API Endpoint (Web Admin), 11. Adding a New Database Migration, 12. Typecheck & Lint, 13. Environment Variables, 14. Deployment (Vercel), 15. Graphify (Knowledge Graph), 16. Common Conventions / Gotchas, 1. Project Overview (+15 more)

### Community 15 - "schedule-export.ts"
Cohesion: 0.16
Nodes (21): ReceptionCellTextarea(), saveReceptionImage(), ReceptionTable(), content(), errorCell(), saveScheduleImage(), QUARTERLY_WORD_COLUMNS, A4_PAGE (+13 more)

### Community 16 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, esbuild@^0.28.2, sharp@^0.35.5, tailwindcss@^4.1.0, @tailwindcss/vite@^4.1.0, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/jsdom@^30.0.0 (+11 more)

### Community 17 - "parser.ts"
Cohesion: 0.19
Nodes (17): composeWorshipInformationRequest(), DuplicateWorshipHymn, findDuplicateWorshipHymns(), HymnOccurrence, getMissingWorshipProgramFields(), hasWorshipValue(), keys, labelMap (+9 more)

### Community 18 - "src/calendar.ts"
Cohesion: 0.07
Nodes (48): eventColor(), eventColors, weekdayLabels, CalendarListView(), CalendarListViewProps, CalendarMonthPreview(), CalendarMonthView(), CalendarMonthViewProps (+40 more)

### Community 19 - "schedule-editor.tsx"
Cohesion: 0.09
Nodes (43): ReceptionWorkloadSummary(), draftKey(), ScheduleEditor(), download(), leaveEditor(), requestAction(), update(), ScheduleMenuAction (+35 more)

### Community 20 - "http.ts"
Cohesion: 0.15
Nodes (14): POST(), runtime, POST(), runtime, POST(), runtime, authenticatedJsonApi(), JsonRequestMode (+6 more)

### Community 21 - "location-settings-form.tsx"
Cohesion: 0.23
Nodes (13): fromConfig(), LocationSettingsForm(), PublicLocationSettings, PublicSessionConfig, SettingsResponse, VenueAddressSearch(), VenuePreview(), VenueRadius() (+5 more)

### Community 22 - "merge-members.ts"
Cohesion: 0.27
Nodes (11): authorize(), blank(), fields, Ids, labels, MergeInput, mergeMembers(), MergePreviewInput (+3 more)

### Community 23 - "scheduleApi"
Cohesion: 0.10
Nodes (24): GET(), runtime, GET(), runtime, GET(), runtime, Context, POST() (+16 more)

### Community 24 - "prepareWorshipInformationRequest"
Cohesion: 0.14
Nodes (16): Context, GET(), POST(), runtime, POST(), runtime, POST(), runtime (+8 more)

### Community 25 - "calendarApi"
Cohesion: 0.07
Nodes (33): GET(), runtime, GET(), runtime, DELETE(), runtime, POST(), runtime (+25 more)

### Community 26 - "ReviewQueue"
Cohesion: 0.15
Nodes (20): WorshipDraft, changes(), Edit, LocalSession, projectSession(), ReviewChange, ReviewQueue(), back() (+12 more)

### Community 27 - "pwa-settings.tsx"
Cohesion: 0.18
Nodes (15): dateFormat, labels, Notice, notificationDate(), Notifications(), pushRegistrationError(), DeviceSettings(), enable() (+7 more)

### Community 28 - "ui/package.json"
Cohesion: 0.10
Nodes (24): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, cmdk@^1.1.1, lucide-react@^0.468.0, radix-ui@^1.4.0, react@^19.2.0, react-dom@^19.2.0 (+16 more)

### Community 29 - "with"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, if, runs-on, steps, jobs, deploy (+15 more)

### Community 30 - "personnel/api.ts"
Cohesion: 0.14
Nodes (18): MemberUpdateResult, savePersonnelMissions(), MissionSelect(), collect(), DraftMission, MissionsForm(), Target, AssignedData (+10 more)

### Community 31 - "Input"
Cohesion: 0.15
Nodes (22): formatDate(), AreaPicker(), DepartmentChoices(), LocationPicker(), Option, ProfileChoiceList(), InlineMemberField(), displayDate() (+14 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, b, calendar:deliver, d, db:bootstrap, db:import, db:local:setup, db:local:start (+15 more)

### Community 33 - "auth-contract.ts"
Cohesion: 0.16
Nodes (16): 6. Authentication & Permissions, canOpenBoardTeam(), canOpenLeaderTeam(), CreateAccountSchema, departmentScopedRoles, hasBoardRole(), hasHistoryManagementRole(), hasLeaderRole() (+8 more)

### Community 34 - "failure"
Cohesion: 0.10
Nodes (38): POST(), runtime, Context, GET(), PATCH(), PUT(), runtime, POST() (+30 more)

### Community 35 - "Architecture and integration guide"
Cohesion: 0.13
Nodes (15): API contract to replace the demo adapter, Architecture and integration guide, Authorization matrix, Client state and real-time, Custom mobile dropdowns and type scale, Design and deployment, Filter navigation and age contract, Mobile member directory (+7 more)

### Community 36 - "Input"
Cohesion: 0.09
Nodes (29): CalendarExport(), download(), sendEmail(), Preview, EventEditor(), EventPresetSelector(), DateInput(), DropdownBox() (+21 more)

### Community 37 - "push-subscriptions.ts"
Cohesion: 0.11
Nodes (26): GET(), runtime, GET(), runtime, POST(), runtime, POST(), runtime (+18 more)

### Community 39 - "personnel-missions.ts"
Cohesion: 0.26
Nodes (15): Context, GET(), PUT(), runtime, authorize(), Board, BoardMember, getPersonnelMissions() (+7 more)

### Community 40 - "calendar-immediate-mail.ts"
Cohesion: 0.09
Nodes (24): Context, GET(), POST(), runtime, POST(), runtime, GET(), POST() (+16 more)

### Community 41 - "src/schedules.ts"
Cohesion: 0.12
Nodes (14): days(), defaultScheduleSettings(), fields, ScheduleCategoryId, ScheduleCopyInput, ScheduleCreate, ScheduleDuty, ScheduleEvent (+6 more)

### Community 42 - "package.json"
Cohesion: 0.15
Nodes (18): devDependencies, prettier@^3.9.10, sharp@^0.35.5, tsx@^4.20.0, @types/node@^22.0.0, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.9.0 (+10 more)

### Community 43 - "core/package.json"
Cohesion: 0.13
Nodes (18): dependencies, react@^19.2.0, @tanstack/react-query@5.107.1, @tanstack/react-query-persist-client@^5.107.1, zod@^4.0.0, zustand@^5.0.0, exports, react (+10 more)

### Community 44 - "server/session.ts"
Cohesion: 0.16
Nodes (24): POST(), runtime, POST(), runtime, POST(), runtime, authBootstrap(), electionSessionLog() (+16 more)

### Community 45 - "phone-calendar.ts"
Cohesion: 0.25
Nodes (13): assignmentResponsibilityLabel(), Assignment, MyAssignments(), assignmentEvent(), calendarSaveLabel(), googleCalendarUrl(), saveAssignmentToCalendar(), calendarFile() (+5 more)

### Community 46 - "choir-memberships.ts"
Cohesion: 0.24
Nodes (11): authorized(), GET(), runtime, currentChurchYear(), reassignChoirMemberships(), AgeBound, AgeRangeSchema, CHOIR_DEPARTMENT_AGE_BANDS (+3 more)

### Community 47 - "query-persistence.ts"
Cohesion: 0.17
Nodes (21): useCalendarResponsibilities(), startTiming(), allowed(), allowedRoots, clearPersistedReads(), database(), durableQuery(), DurableRead (+13 more)

### Community 48 - "import-believers.py"
Cohesion: 0.18
Nodes (4): main(), map_workbook(), normalize(), read_workbook()

### Community 49 - "public-election-page.tsx"
Cohesion: 0.22
Nodes (13): CheckResult, PublicConnectionCheck(), flushAllPublicConnectionReports(), descriptions, ElectionEligibilityError(), EligibilityIllustration(), Reason, SingleLineText() (+5 more)

### Community 50 - "5.1 Shared Core (`packages/core/src/`)"
Cohesion: 0.21
Nodes (17): caretPosition(), mentionAt(), missingInformationContacts(), Trigger, WorshipMentionTextarea(), GET(), runtime, mentionSuggestions() (+9 more)

### Community 51 - "db.ts"
Cohesion: 0.12
Nodes (37): authorized(), comingWeekRange(), GET(), runtime, GET(), runtime, pool(), setting() (+29 more)

### Community 52 - "main.tsx"
Cohesion: 0.19
Nodes (10): client, root, start(), deferred(), Component(), Context, InstallEvent, PwaRoot() (+2 more)

### Community 53 - "useAuth"
Cohesion: 0.33
Nodes (11): AuthFrame(), dismissKeyboard(), ClientAuthGate(), LoginForm(), LoginPage(), PageLoading(), PasswordSetupForm(), PasswordSetupPage() (+3 more)

### Community 54 - "web-admin/package.json"
Cohesion: 0.12
Nodes (17): devDependencies, jszip@^3.10.1, tailwindcss@^4.1.0, @tailwindcss/postcss@^4.1.0, @types/nodemailer@^8.0.2, @types/pdfkit@^0.17.7, @types/pg@^8.23.1, @types/qrcode@^1.5.6 (+9 more)

### Community 55 - "public-worship-page.tsx"
Cohesion: 0.22
Nodes (6): PublicWorshipPage(), submit(), submitNew(), Slot, publicWorshipModule, EVENT_PRESETS

### Community 56 - "Schedule & Ministry Assignment Management"
Cohesion: 0.10
Nodes (21): Cancellation and deletion, Categories and configuration, Copying, Creation and editing permissions, Database and API knowledge base, Editable reception table text — 9 November 2026, Editing and lifecycle, Entry points (+13 more)

### Community 57 - "Church Member Management"
Cohesion: 0.11
Nodes (18): Administrative features, Applications and request flow, Architecture, Church Member Management, Contents, Database model and migrations, Development commands and verification, Duplicate-profile merging (+10 more)

### Community 60 - "server/reception.ts"
Cohesion: 0.13
Nodes (31): GET(), PUT(), runtime, POST(), runtime, queueCalendarExportEmail(), setManualChoirMembership(), authorize() (+23 more)

### Community 61 - "use-public-election.ts"
Cohesion: 0.38
Nodes (9): publicErrorMessage(), key(), publicVoteRequestId(), readPublicDraft(), storePublicDraft(), currentElectionLocation(), positionInput(), initialId() (+1 more)

### Community 62 - "auth-service.ts"
Cohesion: 0.18
Nodes (18): findAccountIdentity(), ProfileIdentity, login(), dummyHash(), hashPassword(), setPassword(), verifyPassword(), actorById() (+10 more)

### Community 63 - "election-team-export-data.ts"
Cohesion: 0.27
Nodes (15): electionTeamExcel(), heading(), table(), ElectionTeamExport, electionTeamExportData(), teamExportDate(), teamStats(), teamTicketStatus() (+7 more)

### Community 64 - "mobile-client/package.json"
Cohesion: 0.09
Nodes (32): dependencies, @hookform/resolvers@^6.0.0, lucide-react@^0.468.0, next-themes@^0.4.6, @noble/hashes@2.4.0, @org/core@*, @org/ui@*, react@^19.2.0 (+24 more)

### Community 65 - "Hội Thánh PWA and device notifications"
Cohesion: 0.13
Nodes (14): APIs, Calendar changes for admins, Event integration, recipients and delivery recovery, Explicit local reception draft exception, Hội Thánh PWA and device notifications, Installation and device support, Local development and HTTPS, Main implementation files (+6 more)

### Community 66 - "day-responsibilities.tsx"
Cohesion: 0.39
Nodes (7): churchDay(), DayResponsibilities(), programTitle(), receptionSession(), responsibilityText(), sessionOrder(), SCHEDULE_CATEGORIES

### Community 67 - "Card"
Cohesion: 0.12
Nodes (24): CalendarContribution, CalendarReviewPage(), Data, Permission, Role, roleSettingsModule, SchedulePermissionSummary(), scheduleRules (+16 more)

### Community 68 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+3 more)

### Community 69 - "vercel.json"
Cohesion: 0.17
Nodes (11): crons, framework, rewrites, root, rewrites, $schema, services, mobile-client (+3 more)

### Community 70 - "changeDepartmentBoardMember"
Cohesion: 0.36
Nodes (9): authorize(), canonical(), changeDepartmentBoardMember(), currentYear(), listDepartmentBoard(), persist(), saveDepartmentBoard(), validMember() (+1 more)

### Community 71 - "README.md"
Cohesion: 0.20
Nodes (4): Calendar server feature, Account access, Nhân sự Hội Thánh, Admin profile merging

### Community 72 - "Authentication and access control"
Cohesion: 0.17
Nodes (12): API surface, Authentication and access control, Concurrent devices, Department bulk status and contextual profile navigation, Department detail pages and bulk membership changes, Department member management, Permission matrix, Prepared local database (+4 more)

### Community 73 - "use-workspace-route.ts"
Cohesion: 0.17
Nodes (17): 5.2 Mobile Client (`apps/mobile-client/src/`), App(), currentClientSearch(), isHistoryNavigation(), restoreNavigationScroll(), useClientSearch(), OfflineBanner(), PwaDeviceSettings() (+9 more)

### Community 74 - "Architecture and code organization"
Cohesion: 0.22
Nodes (9): Architecture and code organization, Calendar module map, Follow an event save, Frontend boundaries, Further restructuring, Making your first change, Patterns used here, Read the project in this order (+1 more)

### Community 75 - "Worship programs: automatic email updates and phone-ready Viber drafts"
Cohesion: 0.20
Nodes (10): Current save behavior, Device verification, Email link compatibility and alternate labels, Failure handling and retries, Opening the email on a phone, Parsing and missing information, Persistence and compatibility, Public worship contributions (+2 more)

### Community 76 - "client-router.ts"
Cohesion: 0.14
Nodes (31): currentClientPath(), goBackClient(), historyPosition, isNativeHistoryNavigation(), listeners, navigateClient(), notify(), observedPath (+23 more)

### Community 77 - "apiRequest"
Cohesion: 0.08
Nodes (41): AccountCredentials(), InviteDialog(), Action, MemberCardMenu(), choose(), item(), MemberCardMenuMember, choirOptions (+33 more)

### Community 78 - "auth-contract.ts"
Cohesion: 0.10
Nodes (23): GET(), runtime, DELETE, GET(), mutate(), PATCH, POST, runtime (+15 more)

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
Cohesion: 0.07
Nodes (41): dependencies, argon2@^0.45.2, docx@9.5.1, @hookform/resolvers@^6.0.0, jose@^6.2.15, lucide-react@^0.468.0, next@^16.0.0, next-themes@^0.4.6 (+33 more)

### Community 84 - "server/quarterly-work.ts"
Cohesion: 0.24
Nodes (9): POST(), runtime, POST(), runtime, quarterlyRosterMembers(), previewQuarterlyCheck(), previewQuarterlyWork(), QuarterlyInput (+1 more)

### Community 85 - "public-election.ts"
Cohesion: 0.16
Nodes (14): PublicCandidateList(), PublicCandidateSelection(), PublicSelectionTabs(), MAX_ELECTION_SELECTIONS, ElectionPoint, matchesElectionName(), PUBLIC_DEFAULT_ACCURACY_METERS, PUBLIC_DEFAULT_RADIUS_METERS (+6 more)

### Community 86 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 87 - "Local believer workbook fixture"
Cohesion: 0.33
Nodes (5): Field mapping, Local believer workbook fixture, Local-only delivery and verification, Mapping results for this file, Run locally

### Community 88 - "worship-information.ts"
Cohesion: 0.20
Nodes (18): definiteFailure(), deliverCalendarItems(), deliverNext(), escapeEventHtml(), eventEmail(), processCalendarOutbox(), sendCalendarNotificationNow(), Input (+10 more)

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

### Community 95 - "5.3 Web Admin (`apps/web-admin/`)"
Cohesion: 0.13
Nodes (22): 5.3 Web Admin (`apps/web-admin/`), POST(), runtime, GET(), Context, DELETE(), GET(), runtime (+14 more)

### Community 96 - "push-keys.mjs"
Cohesion: 0.33
Nodes (5): web-push@^4.0.0, web-push, path, privateExists, publicExists

### Community 97 - "schemas.ts"
Cohesion: 0.07
Nodes (41): Membership, Shared model, audit(), historyActor(), key(), memory, read(), seed() (+33 more)

### Community 98 - "useDepartmentMembers"
Cohesion: 0.60
Nodes (4): useDepartmentMembers(), findProfiles(), leaveSelection(), openBoard()

### Community 99 - "connection-check.ts"
Cohesion: 0.22
Nodes (15): PublicElectionError, publicElectionRequest(), activeChecks, checkPublicElectionConnection(), errorReason(), flushPublicConnectionReports(), key(), queue() (+7 more)

### Community 100 - "mobile-client/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 101 - "Church calendar, email groups, delivery and Word export"
Cohesion: 0.15
Nodes (13): Built-in event presets, Church calendar, email groups, delivery and Word export, Database and APIs, Delivery states and recovery, Deployment and verification, Email calendar export to Ban Trình chiếu, Email groups, Event entry and parsing (+5 more)

### Community 102 - "header"
Cohesion: 0.28
Nodes (7): GET(), runtime, GET(), runtime, getAssignedSchedule(), getNotifiedSchedule(), header()

### Community 103 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 104 - "check-responsive-ui.mts"
Cohesion: 0.06
Nodes (39): cdp(), check(), click(), clickText(), delay(), departments, evaluate(), fixture (+31 more)

### Community 105 - "public/elections/[[...path]]/route.ts"
Cohesion: 0.33
Nodes (5): Context, GET, handler(), POST, runtime

### Community 107 - "Monthly reception team generator"
Cohesion: 0.40
Nodes (5): Department-sourced reception verification — 9 November 2026, Monthly reception team generator, Reception API and files, Reception verification — 8 November 2026, Required positions

### Community 108 - "audit-log-list.tsx"
Cohesion: 0.12
Nodes (22): actions, ActivityLogs(), ConnectionLogs(), SubmissionLogs(), time(), AuditSummary(), ActivityLog, AuditData (+14 more)

### Community 109 - "server/schedules.ts"
Cohesion: 0.14
Nodes (25): Context, POST(), runtime, POST(), runtime, POST(), runtime, queueScheduleNotifications() (+17 more)

### Community 110 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 111 - "ui/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 112 - "5.1 Shared Core (`packages/core/src/`)"
Cohesion: 0.27
Nodes (13): 5.1 Shared Core (`packages/core/src/`), isApiMode(), DirectoryQuery, listDirectory(), listMembersCompact(), emptyDirectoryQuery, organizationActivityKey(), organizationMembersKey() (+5 more)

### Community 113 - "previewEventResponsibilities"
Cohesion: 0.50
Nodes (4): POST(), runtime, eventResponsiblePeople(), previewEventResponsibilities()

### Community 114 - "api-client.ts"
Cohesion: 0.19
Nodes (20): advanceAuthEpoch(), ApiError, clearBrowserAuth(), clearRefreshRequest(), currentAuthBootstrap(), enableApiMode(), expire(), REAUTHENTICATION_MESSAGE (+12 more)

### Community 115 - "Member-facing features"
Cohesion: 0.40
Nodes (5): Confidential history, Directory and navigation, Filters, Member-facing features, Profile details and editing

### Community 116 - "public/sw.js"
Cohesion: 0.40
Nodes (4): ASSETS, destination(), SHELL_ASSETS, submit()

### Community 117 - "public-election/location.ts"
Cohesion: 0.60
Nodes (4): recordPublicLocation(), validatePublicLocation(), electionDistanceMeters(), PublicLocationInput

### Community 120 - "src/index.ts"
Cohesion: 0.06
Nodes (37): CalendarCreateContext, loadPublishedResponsibilities(), responsibilitiesForDates(), DB, BoardMember, Input, Position, boardExpressions() (+29 more)

### Community 122 - "Production loading performance"
Cohesion: 0.40
Nodes (4): Device cache, Production loading performance, Startup and navigation, Timing and later verification

### Community 123 - "members.ts"
Cohesion: 0.10
Nodes (30): GET(), runtime, GET(), runtime, GET(), runtime, GET(), runtime (+22 more)

### Community 125 - "Backend development patterns"
Cohesion: 0.50
Nodes (4): Application services: one named use case, Backend development patterns, Boundaries to preserve, Durable jobs and after-commit work

### Community 127 - "Schedule & Ministry Assignment Management"
Cohesion: 0.40
Nodes (5): Direct reception table editing, Extra reception dates, Monthly reception assignments, Schedule & Ministry Assignment Management, Temporary reception drafts and official submission

### Community 128 - "createWorshipViberDraftLink"
Cohesion: 0.33
Nodes (8): Draft, SavedDraft(), reportLinkDiagnostics(), WorshipViberDraftPage(), createWorshipViberDraftLink(), createWorshipViberRecipientLink(), encodeQueryValue(), getWorshipViberDiagnostics()

### Community 130 - "Authentication and persistent sessions"
Cohesion: 0.50
Nodes (4): Authentication and persistent sessions, Credentials and token lifecycle, Identifier-first login, Security boundaries and tradeoffs

### Community 133 - "copySchedule"
Cohesion: 0.28
Nodes (7): Context, POST(), runtime, Context, POST(), runtime, copySchedule()

### Community 134 - "Deployment and operations"
Cohesion: 0.50
Nodes (4): Deployment and operations, Operational responsibilities, Release procedure, Runtime topology

### Community 135 - "database-performance.md"
Cohesion: 0.50
Nodes (3): Consolidation (migration 052), Local database performance review, Retired tables

### Community 136 - "grantScheduleLeader"
Cohesion: 0.36
Nodes (8): GET(), PATCH(), runtime, administrators(), grantScheduleLeader(), grantToken(), scheduleLeaders(), isAdministrativeRead()

### Community 137 - "directory.ts"
Cohesion: 0.12
Nodes (24): areas, DEPARTMENT_DISPLAY_ORDER, DepartmentCatalogItem, departmentKey(), departmentRanks, DepartmentType, locations, sortDepartments() (+16 more)

### Community 139 - "PublicQrScanner"
Cohesion: 0.67
Nodes (3): jsqr@^1.4.0, PublicQrScanner(), jsqr

### Community 140 - "ref_react"
Cohesion: 0.07
Nodes (52): AutoLoadMore(), Failure, FailureNotifications(), downloadCsv(), formatCsv(), ListControls(), ListPageHeader(), ListResultsSummary() (+44 more)

### Community 142 - "useKeyboardScrollSpace"
Cohesion: 0.52
Nodes (6): useKeyboardScrollSpace(), blur(), focus(), restore(), schedule(), update()

### Community 144 - "schedule-categories/route.ts"
Cohesion: 0.33
Nodes (8): GET(), PATCH(), runtime, GET(), configureScheduleCategory(), listSchedules(), scheduleCategories(), canViewSchedules()

### Community 145 - "Backup, archival, and handoff"
Cohesion: 0.67
Nodes (3): Backup, archival, and handoff, What to preserve privately, What to share for code review

### Community 147 - "ref_node_crypto"
Cohesion: 0.12
Nodes (12): ElectionOtp, decryptElectionOtp(), encryptElectionOtp(), encryptionKey(), BatchInput, publicElectionOtps(), PUBLIC_OTP_CARD_HEADER, PUBLIC_OTP_CARD_INSTRUCTIONS (+4 more)

### Community 149 - "Pages and API reference"
Cohesion: 0.50
Nodes (4): Authentication endpoints, Main pages, Member and management endpoints, Pages and API reference

## Knowledge Gaps
- **5 isolated node(s):** `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 783 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HttpError` connect `server/reception.ts` to `json`, `event-service.ts`, `copySchedule`, `server/elections.ts`, `grantScheduleLeader`, `server/calendar.ts`, `roles.ts`, `src/quarterly-work.ts`, `ref_zod`, `schedule-export.ts`, `schedule-categories/route.ts`, `ref_node_crypto`, `http.ts`, `merge-members.ts`, `scheduleApi`, `prepareWorshipInformationRequest`, `calendarApi`, `failure`, `push-subscriptions.ts`, `personnel-missions.ts`, `calendar-immediate-mail.ts`, `server/session.ts`, `choir-memberships.ts`, `db.ts`, `auth-service.ts`, `election-team-export-data.ts`, `changeDepartmentBoardMember`, `auth-contract.ts`, `server/quarterly-work.ts`, `worship-information.ts`, `5.3 Web Admin (`apps/web-admin/`)`, `header`, `server/schedules.ts`, `previewEventResponsibilities`, `public-election/location.ts`, `src/index.ts`, `members.ts`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `HttpError` (e.g. with `5.3 Web Admin (`apps/web-admin/`)` and `Backend implementation`) actually correct?**
  _`HttpError` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.08269394714407502 - nodes in this community are weakly interconnected._
- **Why does `Button()` connect `Button` to `local-election.ts`, `cn`, `index.tsx`, `ref_lucide_react`, `renderScheduleDocument`, `PublicQrScanner`, `ref_react`, `src/calendar.ts`, `schedule-editor.tsx`, `location-settings-form.tsx`, `ReviewQueue`, `pwa-settings.tsx`, `personnel/api.ts`, `Input`, `Input`, `phone-calendar.ts`, `public-election-page.tsx`, `useAuth`, `Card`, `apiRequest`, `public-election.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Button()` (e.g. with `5.4 UI Package (`packages/ui/src/`)` and `primitiveCases()`) actually correct?**
  _`Button()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `json` be split into smaller, more focused modules?**
  _Cohesion score 0.0797872340425532 - nodes in this community are weakly interconnected._