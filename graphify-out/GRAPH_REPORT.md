# Graph Report - church-management  (2026-11-14)

## Corpus Check
- 403 files · ~185,817 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .webmanifest 3, .css 3)

## Summary
- 2291 nodes · 7732 edges · 133 communities (114 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 89 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e109fa97`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- failure
- apiRequest
- pool
- HttpError
- Button
- index.tsx
- useAuth
- personnel-missions.ts
- Input
- member-directory.tsx
- db.ts
- session.ts
- src/quarterly-work.ts
- server/calendar.ts
- requireCalendar
- schedule-export.ts
- mobile-client/package.json
- src/reception.ts
- src/index.ts
- roles.ts
- calendarApi
- worship-information.ts
- demo.ts
- schedule-views.tsx
- auth-contract.ts
- auth-session.tsx
- route-modules.tsx
- http.ts
- ui/package.json
- with
- schedule-editor.tsx
- scheduleApi
- scripts
- parser.ts
- directory.ts
- saveSchedule
- ref_node_path
- ui-interactions.test.ts
- main.tsx
- server/department-members.ts
- members-compact.ts
- dependencies
- package.json
- core/package.json
- department-members.tsx
- day-responsibilities.tsx
- server/schedules.ts
- calendar-export-email.ts
- import-believers.py
- devDependencies
- role-assign-dialog.tsx
- ref_node_fs
- notifications.tsx
- ScheduleViews
- web-admin/package.json
- src/schedules.ts
- Schedule & Ministry Assignment Management
- Church Member Management
- check-responsive-ui.mts
- choir-memberships.ts
- server/reception.ts
- grantScheduleLeader
- Architecture and integration guide
- merge-members.ts
- Church calendar, email groups, delivery and Word export
- Hội Thánh PWA and device notifications
- OTP onboarding, password setup, and department leaders
- query-persistence.ts
- compilerOptions
- vercel.json
- next
- README.md
- Authentication and access control
- catalog.ts
- copySchedule
- Worship programs: automatic email updates and phone-ready Viber drafts
- local-data.ts
- local-database.ts
- event-presets.ts
- @prisma/composer
- web-admin/tsconfig.json
- Calendar, event email and Word export
- Supporting documentation
- migrate-local-database.mjs
- scripts
- createWorshipViberDraftLink
- scripts
- Local believer workbook fixture
- Production loading performance
- Persistent login
- dependencies
- overrides
- getLocalDataset
- Local development
- schedules/route.ts
- Monthly reception team generator
- Editable reception table text — 9 November 2026
- AuthEventStream
- Member-facing features
- Schedule & Ministry Assignment Management
- mobile-client/tsconfig.json
- exportCalendarPreview
- resolveDelivery
- failures/route.ts
- deliveries/route.ts
- api/notifications/route.ts
- jose
- state.ts
- src/department-members.ts
- core/tsconfig.json
- ui/tsconfig.json
- Administrative features
- Authentication and persistent sessions
- Pages and API reference
- Deployment and operations
- public/sw.js
- Membership
- public/pwa/sw.js
- core/pwa/sw.js
- Backup, archival, and handoff
- AGENTS.md
- @hookform/resolvers@^6.0.0
- nodemailer
- @org/core@*
- @org/ui@*
- @tanstack/react-query@5.107.1
- @tanstack/react-table@^8.21.0
- zod@^4.0.0
- collect

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 150 edges
2. `Button()` - 143 edges
3. `failure()` - 125 edges
4. `json()` - 113 edges
5. `withActor()` - 108 edges
6. `apiRequest()` - 105 edges
7. `ErrorMessage()` - 93 edges
8. `useAuth()` - 78 edges
9. `assertOrigin()` - 68 edges
10. `Dialog()` - 66 edges

## Surprising Connections (you probably didn't know these)
- `Runtime topology` --references--> `start()`  [INFERRED]
  README.md → apps/mobile-client/src/main.tsx
- `Roles, permissions, and privacy` --references--> `admin()`  [INFERRED]
  README.md → apps/web-admin/lib/server/roles.ts
- `Filter navigation and age contract` --references--> `getAge()`  [INFERRED]
  docs/architecture.md → packages/core/src/age.ts
- `Opening the email on a phone` --references--> `href()`  [INFERRED]
  docs/worship-programs.md → apps/mobile-client/src/department-profile-workspace.tsx
- `Lists and SQL` --references--> `department()`  [INFERRED]
  docs/performance.md → apps/web-admin/lib/server/department-members.ts

## Import Cycles
- None detected.

## Communities (133 total, 19 thin omitted)

### Community 0 - "failure"
Cohesion: 0.06
Nodes (81): GET(), runtime, Context, GET(), PATCH(), PUT(), runtime, DELETE (+73 more)

### Community 1 - "apiRequest"
Cohesion: 0.08
Nodes (55): CalendarExport(), Preview, CalendarExport, CalendarPage(), eventColor(), eventColors, EventEditor, weekdayLabels (+47 more)

### Community 2 - "pool"
Cohesion: 0.06
Nodes (55): authorized(), comingWeekRange(), GET(), runtime, GET(), runtime, GET(), runtime (+47 more)

### Community 3 - "HttpError"
Cohesion: 0.08
Nodes (62): CredentialSchema, POST(), runtime, GET(), runtime, GET(), runtime, GET() (+54 more)

### Community 4 - "Button"
Cohesion: 0.11
Nodes (41): AccountCredentials(), downloadCsv(), InviteDialog(), ListControls(), ListPageHeader(), ListResultsSummary(), ListSearchToolbar(), MemberRoleAssignment() (+33 more)

### Community 5 - "index.tsx"
Cohesion: 0.10
Nodes (34): AdminShell(), links, WorshipInformationPanel(), ProfileSettings(), PersonnelActions(), TaskCard(), hasDashboard(), EventPreset (+26 more)

### Community 6 - "useAuth"
Cohesion: 0.10
Nodes (42): ApplicationSettings(), SettingsDestination, SettingsLink(), settingsPages, AuthFrame(), currentClientPath(), currentClientSearch(), goBackClient() (+34 more)

### Community 7 - "personnel-missions.ts"
Cohesion: 0.08
Nodes (38): formatCsv(), getPersonnelMissions(), savePersonnelMissions(), personnelCollator, personnelCsv(), sortPersonnelDepartments(), MissionSelect(), collect() (+30 more)

### Community 8 - "Input"
Cohesion: 0.11
Nodes (36): DateInput(), formatDate(), AreaPicker(), DepartmentChoices(), LocationPicker(), Option, PickerDropdown(), DropdownBox() (+28 more)

### Community 9 - "member-directory.tsx"
Cohesion: 0.09
Nodes (34): AdminOtpConsole(), date(), statusLabels, AutoLoadMore(), LeaderOtpConsole(), Otp, DirectoryLoading(), MemberDirectory() (+26 more)

### Community 10 - "db.ts"
Cohesion: 0.14
Nodes (31): POST(), runtime, POST(), runtime, ensureProfileAccount(), findAccountIdentity(), ProfileIdentity, login() (+23 more)

### Community 11 - "session.ts"
Cohesion: 0.10
Nodes (35): POST(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+27 more)

### Community 12 - "src/quarterly-work.ts"
Cohesion: 0.13
Nodes (40): POST(), runtime, checkQuarterlyWork(), quarterlyDirectoryMembers(), quarterlyRosterMembers(), receptionTextMembers(), resolveQuarterlyText(), scheduledPeople() (+32 more)

### Community 13 - "server/calendar.ts"
Cohesion: 0.08
Nodes (32): POST(), runtime, eventDto(), iso(), recipientPreview(), validateGroups(), queueAutomaticWorshipViberDraft(), WORSHIP_INFORMATION_RECIPIENT (+24 more)

### Community 14 - "requireCalendar"
Cohesion: 0.12
Nodes (29): Context, GET(), POST(), runtime, Context, DELETE(), GET(), PATCH() (+21 more)

### Community 15 - "schedule-export.ts"
Cohesion: 0.17
Nodes (26): saveReceptionImage(), ReceptionCellTextarea(), ReceptionTable(), content(), errorCell(), QUARTERLY_WORD_COLUMNS, quarterlyWordFontSize(), lines() (+18 more)

### Community 16 - "mobile-client/package.json"
Cohesion: 0.09
Nodes (30): dependencies, @hookform/resolvers@^6.0.0, lucide-react@^0.468.0, next-themes@^0.4.6, @org/core@*, @org/ui@*, react@^19.2.0, react-dom@^19.2.0 (+22 more)

### Community 17 - "src/reception.ts"
Cohesion: 0.12
Nodes (28): sendEmail(), ReceptionWorkloadSummary(), createRequestId(), addReceptionExtraService(), cleanReceptionLine(), compareReceptionNames(), editReceptionCell(), eligible() (+20 more)

### Community 18 - "src/index.ts"
Cohesion: 0.14
Nodes (23): MemberChoirSheet(), valuesFor(), sectionUpdate(), MemberDetailScope, useMemberDetail(), persist(), MemberStatusSheet(), isApiMode() (+15 more)

### Community 19 - "roles.ts"
Cohesion: 0.12
Nodes (27): GET(), runtime, GET(), runtime, GET(), POST(), runtime, admin() (+19 more)

### Community 20 - "calendarApi"
Cohesion: 0.11
Nodes (25): GET(), runtime, GET(), runtime, DELETE(), runtime, POST(), runtime (+17 more)

### Community 21 - "worship-information.ts"
Cohesion: 0.14
Nodes (23): Context, GET(), POST(), runtime, POST(), runtime, POST(), runtime (+15 more)

### Community 22 - "demo.ts"
Cohesion: 0.11
Nodes (26): audit(), historyActor(), memory, Snapshot, Activity, ActivitySchema, canEditMemberDetails(), EventDateSchema (+18 more)

### Community 23 - "schedule-views.tsx"
Cohesion: 0.21
Nodes (22): saveQuarterlyImage(), dutyText(), ErrorCell(), PlainCellInput(), QuarterlyCellChange, QuarterlyWorkTable(), cell(), saveScheduleImage() (+14 more)

### Community 24 - "auth-contract.ts"
Cohesion: 0.10
Nodes (24): App(), LeaderDenied(), AdminOtpPage, AdminOtpStatus, canOpenBoardConsole(), canOpenBoardTeam(), canOpenLeaderConsole(), canOpenLeaderTeam() (+16 more)

### Community 25 - "auth-session.tsx"
Cohesion: 0.15
Nodes (20): download(), submit(), advanceAuthEpoch(), ApiError, authenticatedFetch(), clearBrowserAuth(), clearRefreshRequest(), currentAuthBootstrap() (+12 more)

### Community 26 - "route-modules.tsx"
Cohesion: 0.15
Nodes (22): adminScheduleModule, adminShellModule, assignmentsModule, calendarModule, deferred(), departmentDetailModule, departmentsModule, directoryModule (+14 more)

### Community 27 - "http.ts"
Cohesion: 0.15
Nodes (13): GET(), runtime, GET(), runtime, runtime, listAdminOtps(), loadPublishedResponsibilities(), responsibilitiesForDates() (+5 more)

### Community 28 - "ui/package.json"
Cohesion: 0.10
Nodes (24): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, cmdk@^1.1.1, lucide-react@^0.468.0, radix-ui@^1.4.0, react@^19.2.0, react-dom@^19.2.0 (+16 more)

### Community 29 - "with"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, if, runs-on, steps, jobs, deploy (+15 more)

### Community 30 - "schedule-editor.tsx"
Cohesion: 0.17
Nodes (20): draftKey(), ScheduleEditor(), download(), leaveEditor(), requestAction(), ScheduleMenu(), ScheduleMenuAction, stableKey() (+12 more)

### Community 31 - "scheduleApi"
Cohesion: 0.13
Nodes (18): GET(), runtime, GET(), runtime, Context, POST(), runtime, Context (+10 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, b, calendar:deliver, d, db:bootstrap, db:import, db:local:setup, db:local:start (+15 more)

### Community 33 - "parser.ts"
Cohesion: 0.19
Nodes (17): composeWorshipInformationRequest(), DuplicateWorshipHymn, HymnOccurrence, getMissingWorshipProgramFields(), hasWorshipValue(), isWorshipProgramText(), keys, labelMap (+9 more)

### Community 34 - "directory.ts"
Cohesion: 0.13
Nodes (18): AgeBound, AgeRangeSchema, localDateFormatter, viewerId, all(), CompactMember, CompactMembersPage, describeDepartments() (+10 more)

### Community 35 - "saveSchedule"
Cohesion: 0.15
Nodes (18): Context, POST(), runtime, Context, POST(), runtime, POST(), runtime (+10 more)

### Community 36 - "ref_node_path"
Cohesion: 0.12
Nodes (11): children, launch(), require, root, stop(), root, args, connection() (+3 more)

### Community 37 - "ui-interactions.test.ts"
Cohesion: 0.11
Nodes (6): jsdom@^26.1.0, container, dom, root, expected, jsdom

### Community 38 - "main.tsx"
Cohesion: 0.17
Nodes (12): client, ErrorBoundary, root, start(), Providers(), Context, InstallEvent, PwaRoot() (+4 more)

### Community 39 - "server/department-members.ts"
Cohesion: 0.20
Nodes (16): Context, DELETE, GET(), mutate(), PATCH, POST, runtime, boardExpressions() (+8 more)

### Community 40 - "members-compact.ts"
Cohesion: 0.15
Nodes (15): GET(), runtime, GET(), runtime, GET(), runtime, CompactMember, compactMemberDto() (+7 more)

### Community 41 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, argon2@^0.45.2, docx@9.5.1, lucide-react@^0.468.0, pg@^8.23.1, react@^19.2.0, react-dom@^19.2.0, react-hook-form@^7.65.0 (+11 more)

### Community 42 - "package.json"
Cohesion: 0.15
Nodes (18): devDependencies, prettier@^3.9.10, sharp@^0.35.5, tsx@^4.20.0, @types/node@^22.0.0, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.9.0 (+10 more)

### Community 43 - "core/package.json"
Cohesion: 0.13
Nodes (18): dependencies, react@^19.2.0, @tanstack/react-query@5.107.1, @tanstack/react-query-persist-client@^5.107.1, zod@^4.0.0, zustand@^5.0.0, exports, react (+10 more)

### Community 44 - "department-members.tsx"
Cohesion: 0.17
Nodes (13): BOARD_POSITIONS, BoardPerson, BoardRoleEditor(), BoardYear, BoardYears(), fold(), DepartmentMembers(), findProfiles() (+5 more)

### Community 45 - "day-responsibilities.tsx"
Cohesion: 0.20
Nodes (14): assignmentResponsibilityLabel(), churchDay(), DayResponsibilities(), programTitle(), receptionSession(), responsibilityText(), sessionOrder(), Assignment (+6 more)

### Community 46 - "server/schedules.ts"
Cohesion: 0.20
Nodes (14): GET(), runtime, GET(), runtime, getAssignedSchedule(), getNotifiedSchedule(), getSchedule(), header() (+6 more)

### Community 47 - "calendar-export-email.ts"
Cohesion: 0.22
Nodes (14): definiteFailure(), deliverCalendarItems(), deliverNext(), eventEmail(), processCalendarOutbox(), sendCalendarNotificationNow(), Input, recipients (+6 more)

### Community 48 - "import-believers.py"
Cohesion: 0.18
Nodes (4): main(), map_workbook(), normalize(), read_workbook()

### Community 49 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, esbuild@^0.28.2, sharp@^0.35.5, tailwindcss@^4.1.0, @tailwindcss/vite@^4.1.0, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/jsdom@^30.0.0 (+9 more)

### Community 50 - "role-assign-dialog.tsx"
Cohesion: 0.14
Nodes (10): AssignTarget, Department, Field(), RoleAssignDialog(), RoleAssignForm(), AccessRole, accessRoleLabels, managementRoles (+2 more)

### Community 51 - "ref_node_fs"
Cohesion: 0.13
Nodes (9): @vitejs/plugin-react@^4.7.0, @vitejs/plugin-react, path, privateExists, publicExists, hash, root, sources() (+1 more)

### Community 52 - "notifications.tsx"
Cohesion: 0.23
Nodes (14): dateFormat, labels, Notice, notificationDate(), Notifications(), DeviceSettings(), enable(), inspect() (+6 more)

### Community 53 - "ScheduleViews"
Cohesion: 0.20
Nodes (11): ScheduleTable(), ScheduleViews(), move(), addCalendarDays(), calendarDateInChurch(), calendarMonth(), calendarWeek(), CalendarEventLane (+3 more)

### Community 54 - "web-admin/package.json"
Cohesion: 0.17
Nodes (15): devDependencies, jszip@^3.10.1, tailwindcss@^4.1.0, @tailwindcss/postcss@^4.1.0, @types/nodemailer@^8.0.2, @types/pg@^8.23.1, @types/web-push@^3.6.4, tailwindcss (+7 more)

### Community 55 - "src/schedules.ts"
Cohesion: 0.14
Nodes (14): copyScheduleDraft(), days(), fields, ScheduleCategoryId, ScheduleCopyInput, ScheduleCreate, ScheduleDuty, ScheduleEvent (+6 more)

### Community 56 - "Schedule & Ministry Assignment Management"
Cohesion: 0.13
Nodes (14): Categories and configuration, Copying, Database and API knowledge base, Editing and lifecycle, Entry points, Extra reception dates, Local reception drafts and official submission — 9 November 2026, Notifications and privacy (+6 more)

### Community 57 - "Church Member Management"
Cohesion: 0.13
Nodes (15): Applications and request flow, Architecture, Church Member Management, Contents, Database model and migrations, Development commands and verification, Environment configuration, Importing local test data (+7 more)

### Community 58 - "check-responsive-ui.mts"
Cohesion: 0.22
Nodes (14): cdp(), check(), click(), clickText(), delay(), departments, evaluate(), fixture (+6 more)

### Community 59 - "choir-memberships.ts"
Cohesion: 0.27
Nodes (11): POST(), runtime, authorized(), GET(), runtime, currentChurchYear(), reassignChoirMemberships(), currentMemberScope() (+3 more)

### Community 60 - "server/reception.ts"
Cohesion: 0.26
Nodes (11): GET(), PUT(), runtime, POST(), runtime, previewReceptionMonth(), receptionTeam(), saveReceptionTeam() (+3 more)

### Community 61 - "grantScheduleLeader"
Cohesion: 0.23
Nodes (12): GET(), PATCH(), runtime, GET(), PATCH(), runtime, administrators(), configureScheduleCategory() (+4 more)

### Community 62 - "Architecture and integration guide"
Cohesion: 0.14
Nodes (14): API contract to replace the demo adapter, Architecture and integration guide, Authorization matrix, Client state and real-time, Custom mobile dropdowns and type scale, Design and deployment, Filter navigation and age contract, Mobile member directory (+6 more)

### Community 63 - "merge-members.ts"
Cohesion: 0.23
Nodes (11): POST(), runtime, blank(), fields, Ids, labels, MergeInput, mergeMembers() (+3 more)

### Community 64 - "Church calendar, email groups, delivery and Word export"
Cohesion: 0.15
Nodes (13): Built-in event presets, Church calendar, email groups, delivery and Word export, Database and APIs, Delivery states and recovery, Deployment and verification, Email calendar export to Ban Trình chiếu, Email groups, Event entry and parsing (+5 more)

### Community 65 - "Hội Thánh PWA and device notifications"
Cohesion: 0.15
Nodes (12): APIs, Event integration, recipients and delivery recovery, Explicit local reception draft exception, Hội Thánh PWA and device notifications, Installation and device support, Local development and HTTPS, Main implementation files, Manifest, icons and public-only offline behavior (+4 more)

### Community 66 - "OTP onboarding, password setup, and department leaders"
Cohesion: 0.17
Nodes (12): Admin role and leader console, API contract, Ban điều hành client section, Leader console, Leader team management and live updates, OTP onboarding, password setup, and department leaders, PostgreSQL migration, Session renewal and replay protection (+4 more)

### Community 67 - "query-persistence.ts"
Cohesion: 0.29
Nodes (10): startTiming(), allowed(), allowedRoots, authorizationScope(), clearPersistedReads(), database(), READ_CACHE_MAX_AGE, restorePersistedReads() (+2 more)

### Community 68 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+3 more)

### Community 69 - "vercel.json"
Cohesion: 0.17
Nodes (11): crons, framework, rewrites, root, rewrites, $schema, services, mobile-client (+3 more)

### Community 70 - "next"
Cohesion: 0.18
Nodes (5): metadata, viewport, config, next@^16.0.0, next

### Community 72 - "Authentication and access control"
Cohesion: 0.18
Nodes (11): API surface, Authentication and access control, Concurrent devices, Department bulk status and contextual profile navigation, Department detail pages and bulk membership changes, Department member management, Permission matrix, Prepared local database (+3 more)

### Community 73 - "catalog.ts"
Cohesion: 0.22
Nodes (9): areas, DEPARTMENT_DISPLAY_ORDER, DEPARTMENT_TYPE_LABELS, DepartmentCatalogItem, departmentKey(), departmentRanks, departments, DepartmentType (+1 more)

### Community 74 - "copySchedule"
Cohesion: 0.28
Nodes (7): Context, POST(), runtime, Context, POST(), runtime, copySchedule()

### Community 75 - "Worship programs: automatic email updates and phone-ready Viber drafts"
Cohesion: 0.22
Nodes (9): Current save behavior, Device verification, Email link compatibility and alternate labels, Failure handling and retries, Opening the email on a phone, Parsing and missing information, Persistence and compatibility, Verification (+1 more)

### Community 76 - "local-data.ts"
Cohesion: 0.22
Nodes (8): datasets, DatasetSchema, LocalDataset, SourceProfile, SourceProfileSchema, IdSchema, MemberDetailInputSchema, MemberSchema

### Community 77 - "local-database.ts"
Cohesion: 0.28
Nodes (8): cluster, directory, envFile, exists(), log, main(), run(), socket

### Community 78 - "event-presets.ts"
Cohesion: 0.32
Nodes (7): applyPreset(), CalendarDate, defaultEventPreset(), EVENT_PRESETS, EventPresetContext, eventPresetsForDate(), renderEventPreset()

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

### Community 83 - "migrate-local-database.mjs"
Cohesion: 0.43
Nodes (6): args, connection(), localEnvFile, main(), restore(), runCapture()

### Community 84 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 85 - "createWorshipViberDraftLink"
Cohesion: 0.53
Nodes (5): reportLinkDiagnostics(), createWorshipViberDraftLink(), createWorshipViberRecipientLink(), encodeQueryValue(), getWorshipViberDiagnostics()

### Community 86 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 87 - "Local believer workbook fixture"
Cohesion: 0.33
Nodes (5): Field mapping, Local believer workbook fixture, Local-only delivery and verification, Mapping results for this file, Run locally

### Community 88 - "Production loading performance"
Cohesion: 0.33
Nodes (5): Device cache, Lists and SQL, Production loading performance, Startup and navigation, Timing and later verification

### Community 89 - "Persistent login"
Cohesion: 0.33
Nodes (6): Client example, Endpoint contract, Implementation, Limits and security rationale, Persistent login, Revocation and replay

### Community 90 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, effect@4.0.5, @prisma/composer@0.38.0, @prisma/orm-postgres@8.0.0-rc.23, effect, @prisma/orm-postgres

### Community 91 - "overrides"
Cohesion: 0.33
Nodes (6): overrides, effect, @effect/platform-bun, @effect/platform-node, @effect/platform-node-shared, @effect/vitest

### Community 92 - "getLocalDataset"
Cohesion: 0.40
Nodes (6): key(), read(), seed(), write(), getMemberOptions(), getLocalDataset()

### Community 93 - "Local development"
Cohesion: 0.33
Nodes (6): Explicit legacy demo mode, Local development, Option A: create a private local PostgreSQL cluster, Option B: use an existing PostgreSQL database, Prerequisites, Run the separate Vite client

### Community 94 - "schedules/route.ts"
Cohesion: 0.50
Nodes (4): GET(), POST(), runtime, listSchedules()

### Community 95 - "Monthly reception team generator"
Cohesion: 0.40
Nodes (5): Department-sourced reception verification — 9 November 2026, Monthly reception team generator, Reception API and files, Reception verification — 8 November 2026, Required positions

### Community 96 - "Editable reception table text — 9 November 2026"
Cohesion: 0.40
Nodes (5): Editable reception table text — 9 November 2026, Reception ordering, advisory checks and mobile table — 9 November 2026, Reception presentation refinement — 9 November 2026, Simplified reception workspace and workload overview — 9 November 2026, Whole-cell errors and compact person list — 9 November 2026

### Community 98 - "Member-facing features"
Cohesion: 0.40
Nodes (5): Confidential history, Directory and navigation, Filters, Member-facing features, Profile details and editing

### Community 99 - "Schedule & Ministry Assignment Management"
Cohesion: 0.40
Nodes (5): Direct reception table editing, Extra reception dates, Monthly reception assignments, Schedule & Ministry Assignment Management, Temporary reception drafts and official submission

### Community 100 - "mobile-client/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 101 - "exportCalendarPreview"
Cohesion: 0.67
Nodes (3): GET(), runtime, exportCalendarPreview()

### Community 102 - "resolveDelivery"
Cohesion: 0.67
Nodes (3): PATCH(), runtime, resolveDelivery()

### Community 103 - "failures/route.ts"
Cohesion: 0.67
Nodes (3): GET(), runtime, calendarFailureNotifications()

### Community 104 - "deliveries/route.ts"
Cohesion: 0.67
Nodes (3): GET(), runtime, notificationDeliveries()

### Community 105 - "api/notifications/route.ts"
Cohesion: 0.67
Nodes (3): GET(), runtime, allNotificationHistory()

### Community 107 - "jose"
Cohesion: 0.33
Nodes (4): jose@^6.2.15, next-themes@^0.4.6, next-themes, jose

### Community 109 - "src/department-members.ts"
Cohesion: 0.50
Nodes (3): DEPARTMENT_BULK_LIMIT, DepartmentMembershipBulkInput, memberIds

### Community 110 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 111 - "ui/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 112 - "Administrative features"
Cohesion: 0.50
Nodes (4): Administrative features, Duplicate-profile merging, Member management, OTP console

### Community 113 - "Authentication and persistent sessions"
Cohesion: 0.50
Nodes (4): Authentication and persistent sessions, Credentials and token lifecycle, Identifier-first login, Security boundaries and tradeoffs

### Community 114 - "Pages and API reference"
Cohesion: 0.50
Nodes (4): Authentication endpoints, Main pages, Member and management endpoints, Pages and API reference

### Community 115 - "Deployment and operations"
Cohesion: 0.50
Nodes (4): Deployment and operations, Operational responsibilities, Release procedure, Runtime topology

### Community 117 - "Membership"
Cohesion: 0.67
Nodes (3): Membership, Shared model, Project scope and implementation status

### Community 120 - "Backup, archival, and handoff"
Cohesion: 0.67
Nodes (3): Backup, archival, and handoff, What to preserve privately, What to share for code review

## Knowledge Gaps
- **6 isolated node(s):** `RFC-5545`, `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json`, `../../tsconfig.base.json` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 645 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Church Member Management` connect `Church Member Management` to `Member-facing features`, `Schedule & Ministry Assignment Management`, `README.md`, `Administrative features`, `Authentication and persistent sessions`, `Calendar, event email and Word export`, `Deployment and operations`, `Pages and API reference`, `Membership`, `Supporting documentation`, `Backup, archival, and handoff`, `Local development`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `RFC-5545`, `../../tsconfig.base.json`, `RFC-5987` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `failure` be split into smaller, more focused modules?**
  _Cohesion score 0.05960148122024334 - nodes in this community are weakly interconnected._
- **Why does `HttpError` connect `HttpError` to `failure`, `pool`, `personnel-missions.ts`, `db.ts`, `session.ts`, `src/quarterly-work.ts`, `server/calendar.ts`, `requireCalendar`, `schedule-export.ts`, `roles.ts`, `calendarApi`, `worship-information.ts`, `http.ts`, `scheduleApi`, `saveSchedule`, `server/department-members.ts`, `members-compact.ts`, `server/schedules.ts`, `calendar-export-email.ts`, `choir-memberships.ts`, `server/reception.ts`, `grantScheduleLeader`, `merge-members.ts`, `copySchedule`, `schedules/route.ts`, `exportCalendarPreview`, `resolveDelivery`, `deliveries/route.ts`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Should `apiRequest` be split into smaller, more focused modules?**
  _Cohesion score 0.08058608058608059 - nodes in this community are weakly interconnected._
- **Why does `admin()` connect `roles.ts` to `failure`, `Church Member Management`, `HttpError`, `server/department-members.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `pool` be split into smaller, more focused modules?**
  _Cohesion score 0.05837837837837838 - nodes in this community are weakly interconnected._