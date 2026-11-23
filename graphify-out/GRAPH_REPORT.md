# Graph Report - church-management  (2026-11-23)

## Corpus Check
- 487 files · ~209,780 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .webmanifest 3, .css 3)

## Summary
- 2553 nodes · 8810 edges · 140 communities (118 shown, 22 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 216 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4228b0a0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- HttpError
- apiRequest
- schedule-api.ts
- displayCalendarDate
- member-filters.tsx
- index.tsx
- schedule-export.ts
- role-members.tsx
- Input
- personnel-missions-dialog.tsx
- calendar-responsibilities.ts
- session.ts
- src/quarterly-work.ts
- HttpError
- calendar-immediate-mail.ts
- push-subscriptions.ts
- mobile-client/package.json
- schedule-editor.tsx
- member-table.tsx
- roles.ts
- calendarApi
- prepareWorshipInformationRequest
- directory.ts
- navigateClient
- audit
- createRequestId
- role-assign-dialog.tsx
- failure
- ui/package.json
- with
- requireCalendar
- scheduleApi
- scripts
- worship-mention-textarea.tsx
- server/calendar.ts
- saveSchedule
- migrate-local-database.mjs
- src/index.ts
- displayCalendarDate
- ui-interactions.test.ts
- db.ts
- @tanstack/react-query@5.107.1
- package.json
- core/package.json
- member-detail.tsx
- day-responsibilities.tsx
- login-form.tsx
- push.ts
- import-believers.py
- devDependencies
- client-router.ts
- ref_node_path
- my-assignments.tsx
- calendar-page.tsx
- web-admin/package.json
- src/member-sync.ts
- Schedule & Ministry Assignment Management
- Church Member Management
- check-responsive-ui.mts
- choir-memberships.ts
- reception-team/route.ts
- ref_lucide_react
- Architecture and integration guide
- use-workspace-route.ts
- Church calendar, email groups, delivery and Word export
- Hội Thánh PWA and device notifications
- ref_node_fs
- route-modules.tsx
- compilerOptions
- vercel.json
- catalog.ts
- README.md
- Authentication and access control
- directory.ts
- copySchedule
- Worship programs: automatic email updates and phone-ready Viber drafts
- local-data.ts
- Production loading performance
- worship-contributions.ts
- @prisma/composer
- web-admin/tsconfig.json
- Calendar, event email and Word export
- Supporting documentation
- grantScheduleLeader
- scripts
- addGroupEmails
- scripts
- Local believer workbook fixture
- Persistent login
- dependencies
- overrides
- Church Management Platform — Agent Documentation
- Local development
- server/schedules.ts
- AuthEventStream
- Member-facing features
- Schedule & Ministry Assignment Management
- mobile-client/tsconfig.json
- local-database.ts
- useLocalQueryReady
- next
- PageErrorBoundary
- jose
- MissionsForm
- src/department-members.ts
- core/tsconfig.json
- ui/tsconfig.json
- Authentication and persistent sessions
- Pages and API reference
- schedules/route.ts
- public/sw.js
- nodemailer
- public/pwa/sw.js
- core/pwa/sw.js
- AGENTS.md
- dependencies
- useKeyboardScrollSpace
- docx
- @org/ui@*
- personnel-filters.tsx
- recipients/route.ts
- getLocalDataset
- ReviewQueue
- publish/route.ts
- previewQuarterlyCheck
- next-themes@^0.4.6
- react-dom@^19.2.0
- state.ts
- member-read-sync.md
- @hookform/resolvers@^6.0.0
- lucide-react@^0.468.0
- react-hook-form@^7.65.0
- zustand@^5.0.0
- collect
- displayCalendarDate
- src/schedules.ts

## God Nodes (most connected - your core abstractions)
1. `Button()` - 163 edges
2. `HttpError` - 161 edges
3. `failure()` - 122 edges
4. `json()` - 112 edges
5. `apiRequest()` - 112 edges
6. `withActor()` - 107 edges
7. `ErrorMessage()` - 91 edges
8. `useAuth()` - 89 edges
9. `Dialog()` - 75 edges
10. `calendarApi()` - 74 edges

## Surprising Connections (you probably didn't know these)
- `8. Calendar Contribution Review Workflow` --references--> `CalendarReviewPage()`  [INFERRED]
  AGENTS.md → apps/mobile-client/src/calendar/calendar-review-page.tsx
- `Runtime topology` --references--> `start()`  [INFERRED]
  README.md → apps/mobile-client/src/main.tsx
- `Roles, permissions, and privacy` --references--> `admin()`  [INFERRED]
  README.md → apps/web-admin/lib/server/roles.ts
- `Filter navigation and age contract` --references--> `getAge()`  [INFERRED]
  docs/architecture.md → packages/core/src/age.ts
- `3. Monorepo Conventions` --references--> `navigateClient()`  [INFERRED]
  AGENTS.md → apps/mobile-client/src/client-router.ts

## Import Cycles
- None detected.

## Communities (140 total, 22 thin omitted)

### Community 0 - "HttpError"
Cohesion: 0.09
Nodes (44): Context, DELETE, GET(), mutate(), PATCH, POST, runtime, authorize() (+36 more)

### Community 1 - "apiRequest"
Cohesion: 0.09
Nodes (63): AccountCredentials(), AutoLoadMore(), CalendarExport(), Preview, CalendarContribution, CalendarReviewPage(), EmailGroupsPage(), GroupDialog() (+55 more)

### Community 2 - "schedule-api.ts"
Cohesion: 0.15
Nodes (27): authorized(), comingWeekRange(), GET(), runtime, definiteFailure(), deliverCalendarItems(), deliverNext(), eventEmail() (+19 more)

### Community 3 - "displayCalendarDate"
Cohesion: 0.17
Nodes (26): CalendarMonthPreview(), QuarterlyCellChange, ReceptionCellTextarea(), ReceptionTable(), content(), errorCell(), ReceptionCellChange, ScheduleTable() (+18 more)

### Community 4 - "member-filters.tsx"
Cohesion: 0.06
Nodes (47): AnimatedSheetContent(), ConnectionIssue(), BOARD_POSITIONS, BoardPerson, BoardRoleEditor(), BoardYear, BoardYears(), fold() (+39 more)

### Community 5 - "index.tsx"
Cohesion: 0.10
Nodes (39): 5.4 UI Package (`packages/ui/src/`), ApplicationSettings(), SettingsDestination, SettingsLink(), settingsPages, DepartmentMenu(), ScheduleMenu(), findDuplicateWorshipHymns() (+31 more)

### Community 6 - "schedule-export.ts"
Cohesion: 0.13
Nodes (37): saveQuarterlyImage(), dutyText(), ErrorCell(), PlainCellInput(), QuarterlyWorkTable(), cell(), saveReceptionImage(), saveScheduleImage() (+29 more)

### Community 7 - "role-members.tsx"
Cohesion: 0.23
Nodes (16): downloadCsv(), formatCsv(), ListControls(), ListPageHeader(), exportCsv(), getPersonnel(), PersonnelFilters(), personnelCollator (+8 more)

### Community 8 - "Input"
Cohesion: 0.08
Nodes (35): DateInput(), formatDate(), AreaPicker(), DepartmentChoices(), LocationPicker(), Option, ProfileChoiceList(), DropdownBox() (+27 more)

### Community 9 - "personnel-missions-dialog.tsx"
Cohesion: 0.20
Nodes (14): MemberUpdateResult, getPersonnelMissions(), DraftMission, Target, AssignedData, AssignedMember, PersonnelQueryParams, PERSONNEL_CHOIR_NAMES (+6 more)

### Community 10 - "calendar-responsibilities.ts"
Cohesion: 0.24
Nodes (9): GET(), runtime, GET(), runtime, calendarResponsibilities(), loadPublishedResponsibilities(), responsibilitiesForDates(), clientSchedule() (+1 more)

### Community 11 - "session.ts"
Cohesion: 0.12
Nodes (33): POST(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+25 more)

### Community 12 - "src/quarterly-work.ts"
Cohesion: 0.15
Nodes (38): checkQuarterlyWork(), quarterlyDirectoryMembers(), quarterlyRosterMembers(), receptionTextMembers(), resolveQuarterlyText(), scheduledPeople(), validateQuarterlyConflicts(), previewQuarterlyWork() (+30 more)

### Community 13 - "HttpError"
Cohesion: 0.08
Nodes (46): PUT(), runtime, GET(), runtime, GET(), runtime, GET(), runtime (+38 more)

### Community 14 - "calendar-immediate-mail.ts"
Cohesion: 0.19
Nodes (13): PATCH(), GET(), POST(), runtime, POST(), runtime, deferSavedCalendarEvent(), dispatch() (+5 more)

### Community 15 - "push-subscriptions.ts"
Cohesion: 0.18
Nodes (16): GET(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+8 more)

### Community 16 - "mobile-client/package.json"
Cohesion: 0.09
Nodes (30): dependencies, @hookform/resolvers@^6.0.0, lucide-react@^0.468.0, next-themes@^0.4.6, @org/core@*, @org/ui@*, react@^19.2.0, react-dom@^19.2.0 (+22 more)

### Community 17 - "schedule-editor.tsx"
Cohesion: 0.19
Nodes (18): draftKey(), ScheduleEditor(), download(), leaveEditor(), requestAction(), ScheduleMenuAction, stableKey(), openPeriod() (+10 more)

### Community 18 - "member-table.tsx"
Cohesion: 0.09
Nodes (39): 5.1 Shared Core (`packages/core/src/`), ListResultsSummary(), statusColors, MemberTable(), normalizeSearch(), MergeProfilesDialog(), Preview, PersonCard() (+31 more)

### Community 19 - "roles.ts"
Cohesion: 0.09
Nodes (30): DELETE, GET(), mutate(), PATCH, POST, runtime, GET(), runtime (+22 more)

### Community 20 - "calendarApi"
Cohesion: 0.07
Nodes (35): Context, DELETE(), GET(), PATCH(), runtime, GET(), GET(), runtime (+27 more)

### Community 21 - "prepareWorshipInformationRequest"
Cohesion: 0.23
Nodes (12): Context, GET(), POST(), runtime, POST(), runtime, prepareWorshipInformationRequest(), sendWorshipInformationRequest() (+4 more)

### Community 22 - "directory.ts"
Cohesion: 0.10
Nodes (27): Shared model, audit(), historyActor(), memory, Snapshot, Activity, ActivitySchema, canEditMemberDetails() (+19 more)

### Community 23 - "navigateClient"
Cohesion: 0.42
Nodes (8): CalendarToolbar(), CalendarToolbarProps, useWorshipContributions(), WorshipContributions(), WorshipContributionsBadge(), worshipContributionsKey, navigateClient(), hasScheduleCreation()

### Community 24 - "audit"
Cohesion: 0.09
Nodes (36): 6. Authentication & Permissions, CredentialSchema, POST(), runtime, findAccountIdentity(), ProfileIdentity, AccessChangeSchema, login() (+28 more)

### Community 25 - "createRequestId"
Cohesion: 0.19
Nodes (12): sendEmail(), EventEditor(), applyPreset(), EventResponsibilityBadges(), PublicWorshipPage(), submit(), submitNew(), Slot (+4 more)

### Community 26 - "role-assign-dialog.tsx"
Cohesion: 0.16
Nodes (10): AssignRoleEntry, AssignTarget, Department, Field(), RoleAssignDialog(), RoleAssignForm(), ScheduleAssignmentHint(), scheduleRules (+2 more)

### Community 27 - "failure"
Cohesion: 0.05
Nodes (93): GET(), runtime, Context, GET(), PATCH(), PUT(), runtime, POST() (+85 more)

### Community 28 - "ui/package.json"
Cohesion: 0.11
Nodes (23): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, cmdk@^1.1.1, lucide-react@^0.468.0, react@^19.2.0, react-dom@^19.2.0, tailwind-merge@^3.3.0 (+15 more)

### Community 29 - "with"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, if, runs-on, steps, jobs, deploy (+15 more)

### Community 30 - "requireCalendar"
Cohesion: 0.11
Nodes (25): DELETE(), runtime, GET(), POST(), runtime, Context, DELETE(), GET() (+17 more)

### Community 31 - "scheduleApi"
Cohesion: 0.10
Nodes (24): GET(), runtime, GET(), runtime, GET(), runtime, GET(), runtime (+16 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, b, calendar:deliver, d, db:bootstrap, db:import, db:local:setup, db:local:start (+15 more)

### Community 33 - "worship-mention-textarea.tsx"
Cohesion: 0.10
Nodes (34): caretPosition(), mentionAt(), missingInformationContacts(), Trigger, WorshipMentionTextarea(), reportLinkDiagnostics(), composeWorshipInformationRequest(), DuplicateWorshipHymn (+26 more)

### Community 34 - "server/calendar.ts"
Cohesion: 0.08
Nodes (38): 5.3 Web Admin (`apps/web-admin/`), EventPresetSelector(), POST(), runtime, POST(), runtime, CalendarContributionInput, persistNewCalendarEvent() (+30 more)

### Community 35 - "saveSchedule"
Cohesion: 0.17
Nodes (22): Context, POST(), runtime, POST(), runtime, queueScheduleNotifications(), assignmentDepartments(), getAssignedSchedule() (+14 more)

### Community 36 - "migrate-local-database.mjs"
Cohesion: 0.43
Nodes (6): args, connection(), localEnvFile, main(), restore(), runCapture()

### Community 37 - "src/index.ts"
Cohesion: 0.07
Nodes (48): download(), client, root, start(), Providers(), Providers(), advanceAuthEpoch(), ApiError (+40 more)

### Community 38 - "displayCalendarDate"
Cohesion: 0.09
Nodes (17): BulkEmailInput, CALENDAR_ZONE, CalendarDate, CalendarDelivery, calendarExportPreview(), calendarExportText(), calendarPermissions, CalendarSendSummary (+9 more)

### Community 39 - "ui-interactions.test.ts"
Cohesion: 0.12
Nodes (4): container, dom, root, expected

### Community 40 - "db.ts"
Cohesion: 0.08
Nodes (37): POST(), runtime, POST(), runtime, POST(), runtime, CalendarCreateContext, Input (+29 more)

### Community 42 - "package.json"
Cohesion: 0.15
Nodes (18): devDependencies, prettier@^3.9.10, sharp@^0.35.5, tsx@^4.20.0, @types/node@^22.0.0, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.9.0 (+10 more)

### Community 43 - "core/package.json"
Cohesion: 0.13
Nodes (18): dependencies, react@^19.2.0, @tanstack/react-query@5.107.1, @tanstack/react-query-persist-client@^5.107.1, zod@^4.0.0, zustand@^5.0.0, exports, react (+10 more)

### Community 44 - "member-detail.tsx"
Cohesion: 0.23
Nodes (13): goBackClient(), isNativeHistoryNavigation(), onClick(), usePathname(), DepartmentDetail(), DepartmentProfileWorkspace(), close(), href() (+5 more)

### Community 45 - "day-responsibilities.tsx"
Cohesion: 0.16
Nodes (18): assignmentResponsibilityLabel(), churchDay(), DayResponsibilities(), programTitle(), receptionSession(), responsibilityText(), sessionOrder(), Assignment (+10 more)

### Community 46 - "login-form.tsx"
Cohesion: 0.32
Nodes (9): AuthFrame(), dismissKeyboard(), ClientAuthGate(), LoginForm(), LoginPage(), PageLoading(), PasswordSetupForm(), PasswordSetupPage() (+1 more)

### Community 47 - "push.ts"
Cohesion: 0.24
Nodes (8): memberEventHash(), memberEventPath(), memberNotificationHash(), PushDestination, PushEndpoint, PushMessage, PushSubscribeInput, PushUnsubscribeInput

### Community 48 - "import-believers.py"
Cohesion: 0.18
Nodes (4): main(), map_workbook(), normalize(), read_workbook()

### Community 49 - "devDependencies"
Cohesion: 0.09
Nodes (21): devDependencies, esbuild@^0.28.2, jsdom@^26.1.0, sharp@^0.35.5, tailwindcss@^4.1.0, @tailwindcss/vite@^4.1.0, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8 (+13 more)

### Community 50 - "client-router.ts"
Cohesion: 0.16
Nodes (22): currentClientPath(), currentClientSearch(), historyPosition, listeners, notify(), observedPath, onPopState(), onScroll() (+14 more)

### Community 51 - "ref_node_path"
Cohesion: 0.12
Nodes (11): children, launch(), require, root, stop(), root, args, connection() (+3 more)

### Community 52 - "my-assignments.tsx"
Cohesion: 0.13
Nodes (19): dateFormat, labels, Notice, notificationDate(), OfflineBanner(), Context, InstallEvent, PwaRoot() (+11 more)

### Community 53 - "calendar-page.tsx"
Cohesion: 0.19
Nodes (14): eventColor(), eventColors, weekdayLabels, CalendarListView(), CalendarListViewProps, CalendarMonthView(), CalendarMonthViewProps, CalendarExport (+6 more)

### Community 54 - "web-admin/package.json"
Cohesion: 0.17
Nodes (15): devDependencies, jszip@^3.10.1, tailwindcss@^4.1.0, @tailwindcss/postcss@^4.1.0, @types/nodemailer@^8.0.2, @types/pg@^8.23.1, @types/web-push@^3.6.4, tailwindcss (+7 more)

### Community 55 - "src/member-sync.ts"
Cohesion: 0.15
Nodes (17): adminKinds, CachedPage, CachedRow, detailKinds, listKinds, memberKinds, removeMemberReads(), Cursor (+9 more)

### Community 56 - "Schedule & Ministry Assignment Management"
Cohesion: 0.08
Nodes (26): Cancellation and deletion, Categories and configuration, Copying, Creation and editing permissions, Database and API knowledge base, Department-sourced reception verification — 9 November 2026, Editable reception table text — 9 November 2026, Editing and lifecycle (+18 more)

### Community 57 - "Church Member Management"
Cohesion: 0.07
Nodes (27): Membership, Administrative features, Applications and request flow, Architecture, Backup, archival, and handoff, Church Member Management, Contents, Database model and migrations (+19 more)

### Community 58 - "check-responsive-ui.mts"
Cohesion: 0.22
Nodes (14): cdp(), check(), click(), clickText(), delay(), departments, evaluate(), fixture (+6 more)

### Community 59 - "choir-memberships.ts"
Cohesion: 0.23
Nodes (12): POST(), runtime, authorized(), GET(), runtime, currentChurchYear(), reassignChoirMemberships(), AgeBound (+4 more)

### Community 60 - "reception-team/route.ts"
Cohesion: 0.47
Nodes (5): GET(), PUT(), runtime, receptionTeam(), saveReceptionTeam()

### Community 61 - "ref_lucide_react"
Cohesion: 0.12
Nodes (28): ClientError(), roleLabels, statusLabels, DirectoryCards(), DirectoryLoading(), DirectoryPagination(), DirectoryResults(), MemberDirectory() (+20 more)

### Community 62 - "Architecture and integration guide"
Cohesion: 0.14
Nodes (14): API contract to replace the demo adapter, Architecture and integration guide, Authorization matrix, Client state and real-time, Custom mobile dropdowns and type scale, Design and deployment, Filter navigation and age contract, Mobile member directory (+6 more)

### Community 63 - "use-workspace-route.ts"
Cohesion: 0.36
Nodes (8): App(), isHistoryNavigation(), restoreNavigationScroll(), useWorkspaceRoute(), WorkspaceRoute, useWorkspaceScroll(), WorkspaceTabs(), hasDashboard()

### Community 64 - "Church calendar, email groups, delivery and Word export"
Cohesion: 0.15
Nodes (13): Built-in event presets, Church calendar, email groups, delivery and Word export, Database and APIs, Delivery states and recovery, Deployment and verification, Email calendar export to Ban Trình chiếu, Email groups, Event entry and parsing (+5 more)

### Community 65 - "Hội Thánh PWA and device notifications"
Cohesion: 0.15
Nodes (12): APIs, Event integration, recipients and delivery recovery, Explicit local reception draft exception, Hội Thánh PWA and device notifications, Installation and device support, Local development and HTTPS, Main implementation files, Manifest, icons and public-only offline behavior (+4 more)

### Community 66 - "ref_node_fs"
Cohesion: 0.18
Nodes (7): path, privateExists, publicExists, hash, root, sources(), version

### Community 67 - "route-modules.tsx"
Cohesion: 0.13
Nodes (21): assignmentsModule, deferred(), Component(), directoryModule, emailGroupsModule, eventModule, membersModule, notificationsModule (+13 more)

### Community 68 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+3 more)

### Community 69 - "vercel.json"
Cohesion: 0.17
Nodes (11): crons, framework, rewrites, root, rewrites, $schema, services, mobile-client (+3 more)

### Community 70 - "catalog.ts"
Cohesion: 0.24
Nodes (9): areas, DEPARTMENT_DISPLAY_ORDER, DEPARTMENT_TYPE_LABELS, DepartmentCatalogItem, departmentKey(), departmentRanks, DepartmentType, locations (+1 more)

### Community 71 - "README.md"
Cohesion: 0.26
Nodes (3): Account access, Nhân sự Hội Thánh, Admin profile merging

### Community 72 - "Authentication and access control"
Cohesion: 0.17
Nodes (12): API surface, Authentication and access control, Concurrent devices, Department bulk status and contextual profile navigation, Department detail pages and bulk membership changes, Department member management, Permission matrix, Prepared local database (+4 more)

### Community 73 - "directory.ts"
Cohesion: 0.18
Nodes (14): AgeRangeSchema, viewerId, all(), CompactMembersPage, describeDepartments(), DirectoryMemberSchema, enrich(), importedProfile() (+6 more)

### Community 74 - "copySchedule"
Cohesion: 0.28
Nodes (7): Context, POST(), runtime, Context, POST(), runtime, copySchedule()

### Community 75 - "Worship programs: automatic email updates and phone-ready Viber drafts"
Cohesion: 0.20
Nodes (10): Current save behavior, Device verification, Email link compatibility and alternate labels, Failure handling and retries, Opening the email on a phone, Parsing and missing information, Persistence and compatibility, Public worship contributions (+2 more)

### Community 76 - "local-data.ts"
Cohesion: 0.22
Nodes (8): datasets, DatasetSchema, LocalDataset, SourceProfile, SourceProfileSchema, IdSchema, MemberDetailInputSchema, MemberSchema

### Community 77 - "Production loading performance"
Cohesion: 0.33
Nodes (5): Device cache, Lists and SQL, Production loading performance, Startup and navigation, Timing and later verification

### Community 78 - "worship-contributions.ts"
Cohesion: 0.18
Nodes (20): GET(), POST(), runtime, POST(), runtime, escapeEventHtml(), sendSavedCalendarEvent(), listWorshipContributions() (+12 more)

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

### Community 83 - "grantScheduleLeader"
Cohesion: 0.43
Nodes (7): GET(), PATCH(), runtime, administrators(), grantScheduleLeader(), grantToken(), scheduleLeaders()

### Community 84 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 85 - "addGroupEmails"
Cohesion: 0.50
Nodes (4): POST(), runtime, addGroupEmails(), parseBulkEmails()

### Community 86 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 87 - "Local believer workbook fixture"
Cohesion: 0.33
Nodes (5): Field mapping, Local believer workbook fixture, Local-only delivery and verification, Mapping results for this file, Run locally

### Community 89 - "Persistent login"
Cohesion: 0.33
Nodes (6): Client example, Endpoint contract, Implementation, Limits and security rationale, Persistent login, Revocation and replay

### Community 90 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, effect@4.0.5, @prisma/composer@0.38.0, @prisma/orm-postgres@8.0.0-rc.23, effect, @prisma/orm-postgres

### Community 91 - "overrides"
Cohesion: 0.33
Nodes (6): overrides, effect, @effect/platform-bun, @effect/platform-node, @effect/platform-node-shared, @effect/vitest

### Community 92 - "Church Management Platform — Agent Documentation"
Cohesion: 0.11
Nodes (18): 10. Adding a New API Endpoint (Web Admin), 11. Adding a New Database Migration, 12. Typecheck & Lint, 13. Environment Variables, 14. Deployment (Vercel), 15. Graphify (Knowledge Graph), 16. Common Conventions / Gotchas, 1. Project Overview (+10 more)

### Community 93 - "Local development"
Cohesion: 0.33
Nodes (6): Explicit legacy demo mode, Local development, Option A: create a private local PostgreSQL cluster, Option B: use an existing PostgreSQL database, Prerequisites, Run the separate Vite client

### Community 94 - "server/schedules.ts"
Cohesion: 0.24
Nodes (13): GET(), PATCH(), runtime, configureScheduleCategory(), getSchedule(), managerAny(), requireScheduleCategory(), scheduleCategories() (+5 more)

### Community 98 - "Member-facing features"
Cohesion: 0.40
Nodes (5): Confidential history, Directory and navigation, Filters, Member-facing features, Profile details and editing

### Community 99 - "Schedule & Ministry Assignment Management"
Cohesion: 0.40
Nodes (5): Direct reception table editing, Extra reception dates, Monthly reception assignments, Schedule & Ministry Assignment Management, Temporary reception drafts and official submission

### Community 100 - "mobile-client/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 101 - "local-database.ts"
Cohesion: 0.28
Nodes (8): cluster, directory, envFile, exists(), log, main(), run(), socket

### Community 102 - "useLocalQueryReady"
Cohesion: 0.28
Nodes (11): DepartmentManagement(), MemberDetailScope, useMemberDetail(), persist(), departmentsModule, useCalendarResponsibilities(), getMyProfile(), updateMemberReads() (+3 more)

### Community 103 - "next"
Cohesion: 0.20
Nodes (4): metadata, viewport, config, next

### Community 108 - "MissionsForm"
Cohesion: 0.33
Nodes (4): savePersonnelMissions(), MissionSelect(), collect(), MissionsForm()

### Community 109 - "src/department-members.ts"
Cohesion: 0.50
Nodes (3): DEPARTMENT_BULK_LIMIT, DepartmentMembershipBulkInput, memberIds

### Community 110 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 111 - "ui/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 113 - "Authentication and persistent sessions"
Cohesion: 0.50
Nodes (4): Authentication and persistent sessions, Credentials and token lifecycle, Identifier-first login, Security boundaries and tradeoffs

### Community 114 - "Pages and API reference"
Cohesion: 0.50
Nodes (4): Authentication endpoints, Main pages, Member and management endpoints, Pages and API reference

### Community 115 - "schedules/route.ts"
Cohesion: 0.50
Nodes (4): GET(), POST(), runtime, listSchedules()

### Community 116 - "public/sw.js"
Cohesion: 0.40
Nodes (4): ASSETS, destination(), SHELL_ASSETS, submit()

### Community 122 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, argon2@^0.45.2, next@^16.0.0, @org/core@*, pg@^8.23.1, recharts@^3.3.0, @tanstack/react-table@^8.21.0, web-push@^4.0.0 (+8 more)

### Community 123 - "useKeyboardScrollSpace"
Cohesion: 0.52
Nodes (6): useKeyboardScrollSpace(), blur(), focus(), restore(), schedule(), update()

### Community 126 - "personnel-filters.tsx"
Cohesion: 0.40
Nodes (4): roleOptions, accessRoleLabels, managementRoles, ChurchStatusFilterSchema

### Community 127 - "recipients/route.ts"
Cohesion: 0.50
Nodes (4): POST(), runtime, recipientPreview(), validateGroups()

### Community 128 - "getLocalDataset"
Cohesion: 0.50
Nodes (5): key(), read(), seed(), write(), getLocalDataset()

### Community 130 - "ReviewQueue"
Cohesion: 0.16
Nodes (19): WorshipDraft, changes(), Edit, LocalSession, projectSession(), ReviewChange, ReviewQueue(), back() (+11 more)

### Community 133 - "publish/route.ts"
Cohesion: 0.50
Nodes (3): Context, POST(), runtime

### Community 134 - "previewQuarterlyCheck"
Cohesion: 0.67
Nodes (3): POST(), runtime, previewQuarterlyCheck()

### Community 135 - "next-themes@^0.4.6"
Cohesion: 0.33
Nodes (4): next-themes@^0.4.6, react@^19.2.0, next-themes, react

### Community 146 - "displayCalendarDate"
Cohesion: 0.13
Nodes (27): ReceptionWorkloadSummary(), addReceptionExtraService(), cleanReceptionLine(), compareReceptionNames(), editReceptionCell(), eligible(), formatReceptionName(), generateReceptionSchedule() (+19 more)

### Community 147 - "src/schedules.ts"
Cohesion: 0.13
Nodes (15): copyScheduleDraft(), days(), fields, ScheduleCategoryId, ScheduleCopyInput, ScheduleCreate, ScheduleDraftValue, ScheduleDuty (+7 more)

## Knowledge Gaps
- **5 isolated node(s):** `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 696 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Church Member Management` connect `Church Member Management` to `Member-facing features`, `Schedule & Ministry Assignment Management`, `README.md`, `Calendar, event email and Word export`, `Authentication and persistent sessions`, `Pages and API reference`, `Supporting documentation`, `Local development`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Button()` (e.g. with `5.4 UI Package (`packages/ui/src/`)` and `primitiveCases()`) actually correct?**
  _`Button()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `HttpError` be split into smaller, more focused modules?**
  _Cohesion score 0.09098639455782313 - nodes in this community are weakly interconnected._
- **Why does `HttpError` connect `db.ts` to `HttpError`, `schedule-api.ts`, `previewQuarterlyCheck`, `schedule-export.ts`, `calendar-responsibilities.ts`, `session.ts`, `src/quarterly-work.ts`, `HttpError`, `calendar-immediate-mail.ts`, `push-subscriptions.ts`, `roles.ts`, `calendarApi`, `prepareWorshipInformationRequest`, `audit`, `failure`, `requireCalendar`, `scheduleApi`, `server/calendar.ts`, `saveSchedule`, `choir-memberships.ts`, `reception-team/route.ts`, `copySchedule`, `worship-contributions.ts`, `grantScheduleLeader`, `addGroupEmails`, `server/schedules.ts`, `schedules/route.ts`, `recipients/route.ts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `apiRequest()` (e.g. with `3. Monorepo Conventions` and `5.1 Shared Core (`packages/core/src/`)`) actually correct?**
  _`apiRequest()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `apiRequest` be split into smaller, more focused modules?**
  _Cohesion score 0.08766788766788766 - nodes in this community are weakly interconnected._