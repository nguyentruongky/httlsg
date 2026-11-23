# Graph Report - church-management  (2026-11-23)

## Corpus Check
- 487 files · ~211,982 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: (none) 3, .webmanifest 3, .css 3)

## Summary
- 2558 nodes · 8840 edges · 131 communities (105 shown, 26 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 217 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `824ef3b8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api.ts
- apiRequest
- pool
- worship-information.ts
- failure
- index.tsx
- schedule-export.ts
- http.ts
- schedule-views.tsx
- member-information.tsx
- department-board.ts
- session.ts
- src/quarterly-work.ts
- members.ts
- ref_react
- db.ts
- dependencies
- push-api.ts
- workspace-pages.tsx
- roles.ts
- calendar-immediate-mail.ts
- worship-information.ts
- directory.ts
- choir-memberships.ts
- auth-contract.ts
- main.tsx
- role-assign-dialog.tsx
- push.ts
- ui/package.json
- with
- HttpError
- scheduleApi
- scripts
- worship-mention-textarea.tsx
- schedule-editor.tsx
- saveSchedule
- @tanstack/react-query@5.107.1
- AuthEventStream
- calendar-page.tsx
- day-responsibilities.tsx
- merge-members.ts
- package.json
- core/package.json
- day-responsibilities.tsx
- login-form.tsx
- mobile-client/package.json
- import-believers.py
- devDependencies
- client-router.ts
- local-database.ts
- useAuth
- web-admin/package.json
- src/member-sync.ts
- Schedule & Ministry Assignment Management
- Church Member Management
- check-responsive-ui.mts
- choir-memberships.ts
- Production loading performance
- route-modules.tsx
- Architecture and integration guide
- use-workspace-route.ts
- Hội Thánh PWA and device notifications
- query-persistence.ts
- 5.1 Shared Core (`packages/core/src/`)
- compilerOptions
- vercel.json
- catalog.ts
- README.md
- Authentication and access control
- requirePermission
- copySchedule
- Worship programs: automatic email updates and phone-ready Viber drafts
- personnel-missions.ts
- worship-contributions.ts
- @prisma/composer
- web-admin/tsconfig.json
- Calendar, event email and Word export
- Supporting documentation
- grantScheduleLeader
- scripts
- src/calendar.ts
- scripts
- Local believer workbook fixture
- ref_lucide_react
- Persistent login
- dependencies
- overrides
- Church Management Platform — Agent Documentation
- Local development
- server/reception.ts
- my-assignments/[id]/route.ts
- src/schedules.ts
- Member-facing features
- Schedule & Ministry Assignment Management
- mobile-client/tsconfig.json
- auth-session.tsx
- next
- src/department-members.ts
- core/tsconfig.json
- ui/tsconfig.json
- push-keys.mjs
- @org/core@*
- react-hook-form@^7.65.0
- server/schedules.ts
- public/sw.js
- nodemailer
- public/pwa/sw.js
- core/pwa/sw.js
- Monthly reception team generator
- AGENTS.md
- dependencies
- @tanstack/react-query@5.107.1
- docx
- @org/ui@*
- zustand@^5.0.0
- tailwindcss@^4.1.0
- @testing-library/react@^16.3.3
- ReviewQueue
- collect
- next-themes@^0.4.6
- react@^19.2.0
- member-read-sync.md
- @tanstack/react-table@^8.21.0
- lucide-react@^0.468.0
- zod@^4.0.0
- zustand@^5.0.0
- src/reception.ts

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
- `Roles, permissions, and privacy` --references--> `admin()`  [INFERRED]
  README.md → apps/web-admin/lib/server/roles.ts
- `Filter navigation and age contract` --references--> `getAge()`  [INFERRED]
  docs/architecture.md → packages/core/src/age.ts
- `5.2 Mobile Client (`apps/mobile-client/src/`)` --references--> `navigateClient()`  [INFERRED]
  AGENTS.md → apps/mobile-client/src/client-router.ts
- `5.2 Mobile Client (`apps/mobile-client/src/`)` --references--> `usePathname()`  [INFERRED]
  AGENTS.md → apps/mobile-client/src/client-router.ts

## Import Cycles
- None detected.

## Communities (131 total, 26 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.07
Nodes (25): formatCsv(), MemberUpdateResult, getPersonnel(), personnelCollator, personnelCsv(), sortPersonnelDepartments(), PersonnelAssignment(), AssignedData (+17 more)

### Community 1 - "apiRequest"
Cohesion: 0.07
Nodes (52): AccountCredentials(), AnimatedSheetContent(), ConnectionIssue(), BOARD_POSITIONS, BoardPerson, BoardRoleEditor(), BoardYear, BoardYears() (+44 more)

### Community 2 - "pool"
Cohesion: 0.19
Nodes (24): authorized(), comingWeekRange(), GET(), runtime, pool(), decryptSubscription(), encryptSubscription(), endpointHash() (+16 more)

### Community 3 - "worship-information.ts"
Cohesion: 0.15
Nodes (22): Context, GET(), POST(), runtime, POST(), runtime, POST(), runtime (+14 more)

### Community 4 - "failure"
Cohesion: 0.08
Nodes (45): GET(), runtime, Context, GET(), PATCH(), PUT(), runtime, GET() (+37 more)

### Community 5 - "index.tsx"
Cohesion: 0.08
Nodes (41): 5.4 UI Package (`packages/ui/src/`), ApplicationSettings(), SettingsDestination, SettingsLink(), settingsPages, DepartmentMembersState, DepartmentMenu(), ProfileSettings() (+33 more)

### Community 6 - "schedule-export.ts"
Cohesion: 0.15
Nodes (34): saveQuarterlyImage(), dutyText(), ErrorCell(), PlainCellInput(), QuarterlyWorkTable(), cell(), saveScheduleImage(), schedule() (+26 more)

### Community 7 - "http.ts"
Cohesion: 0.08
Nodes (38): POST(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+30 more)

### Community 8 - "schedule-views.tsx"
Cohesion: 0.17
Nodes (17): QuarterlyCellChange, ReceptionCellChange, ScheduleTable(), ReceptionCellChange, ScheduleViews(), move(), addCalendarDays(), calendarMonth() (+9 more)

### Community 9 - "member-information.tsx"
Cohesion: 0.13
Nodes (24): formatDate(), AreaPicker(), DepartmentChoices(), LocationPicker(), Option, ProfileChoiceList(), InlineMemberField(), displayDate() (+16 more)

### Community 10 - "department-board.ts"
Cohesion: 0.10
Nodes (33): Context, DELETE, GET(), mutate(), PATCH, POST, runtime, GET() (+25 more)

### Community 11 - "session.ts"
Cohesion: 0.10
Nodes (42): POST(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+34 more)

### Community 12 - "src/quarterly-work.ts"
Cohesion: 0.12
Nodes (43): requestAction(), POST(), runtime, checkQuarterlyWork(), quarterlyDirectoryMembers(), quarterlyReceptionUnavailableDays(), quarterlyRosterMembers(), receptionTextMembers() (+35 more)

### Community 13 - "members.ts"
Cohesion: 0.15
Nodes (29): GET(), runtime, Context, GET(), PATCH(), runtime, setManualChoirMembership(), assignedDepartments() (+21 more)

### Community 14 - "ref_react"
Cohesion: 0.10
Nodes (36): downloadCsv(), FilterChip, FilterChips(), memberFilterChips(), ListControls(), ListPageHeader(), ListResultsSummary(), ListSearchToolbar() (+28 more)

### Community 15 - "db.ts"
Cohesion: 0.11
Nodes (21): GET(), runtime, GET(), runtime, GET(), runtime, POST(), runtime (+13 more)

### Community 16 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, @hookform/resolvers@^6.0.0, lucide-react@^0.468.0, next-themes@^0.4.6, react@^19.2.0, recharts@^3.3.0, @tanstack/react-table@^8.21.0, zod@^4.0.0 (+7 more)

### Community 17 - "push-api.ts"
Cohesion: 0.22
Nodes (10): GET(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+2 more)

### Community 18 - "workspace-pages.tsx"
Cohesion: 0.09
Nodes (38): CalendarContribution, CalendarReviewPage(), Draft, SavedDraft(), WorshipViberDraftPage(), InviteDialog(), MergeProfilesDialog(), Preview (+30 more)

### Community 19 - "roles.ts"
Cohesion: 0.10
Nodes (33): GET(), runtime, PUT(), runtime, GET(), POST(), runtime, GET() (+25 more)

### Community 20 - "calendar-immediate-mail.ts"
Cohesion: 0.15
Nodes (17): Context, GET(), POST(), runtime, GET(), POST(), runtime, POST() (+9 more)

### Community 21 - "worship-information.ts"
Cohesion: 0.11
Nodes (22): definiteFailure(), deliverCalendarItems(), deliverNext(), escapeEventHtml(), eventEmail(), processCalendarOutbox(), Input, recipients (+14 more)

### Community 22 - "directory.ts"
Cohesion: 0.06
Nodes (55): AgeBound, AgeRangeSchema, localDateFormatter, audit(), key(), memory, read(), seed() (+47 more)

### Community 23 - "choir-memberships.ts"
Cohesion: 0.29
Nodes (10): POST(), runtime, authorized(), GET(), runtime, currentChurchYear(), reassignChoirMemberships(), CHOIR_DEPARTMENT_AGE_BANDS (+2 more)

### Community 24 - "auth-contract.ts"
Cohesion: 0.19
Nodes (14): 6. Authentication & Permissions, canOpenBoardTeam(), canOpenLeaderTeam(), CreateAccountSchema, departmentScopedRoles, hasBoardRole(), hasHistoryManagementRole(), hasLeaderRole() (+6 more)

### Community 25 - "main.tsx"
Cohesion: 0.07
Nodes (21): PublicWorshipPage(), submit(), submitNew(), Slot, client, root, start(), PageErrorBoundary (+13 more)

### Community 26 - "role-assign-dialog.tsx"
Cohesion: 0.13
Nodes (12): AssignTarget, Department, Field(), RoleAssignDialog(), RoleAssignForm(), Data, Permission, Role (+4 more)

### Community 27 - "push.ts"
Cohesion: 0.24
Nodes (7): memberEventHash(), memberEventPath(), memberNotificationHash(), PushDestination, PushEndpoint, PushMessage, PushUnsubscribeInput

### Community 28 - "ui/package.json"
Cohesion: 0.10
Nodes (24): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, cmdk@^1.1.1, lucide-react@^0.468.0, radix-ui@^1.4.0, react@^19.2.0, react-dom@^19.2.0 (+16 more)

### Community 29 - "with"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, if, runs-on, steps, jobs, deploy (+15 more)

### Community 30 - "HttpError"
Cohesion: 0.05
Nodes (76): 5.3 Web Admin (`apps/web-admin/`), DELETE(), runtime, POST(), runtime, Context, DELETE(), GET() (+68 more)

### Community 31 - "scheduleApi"
Cohesion: 0.11
Nodes (23): GET(), runtime, GET(), runtime, GET(), runtime, Context, POST() (+15 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, b, calendar:deliver, d, db:bootstrap, db:import, db:local:setup, db:local:start (+15 more)

### Community 33 - "worship-mention-textarea.tsx"
Cohesion: 0.05
Nodes (61): applyPreset(), caretPosition(), mentionAt(), missingInformationContacts(), Trigger, WorshipMentionTextarea(), reportLinkDiagnostics(), Built-in event presets (+53 more)

### Community 34 - "schedule-editor.tsx"
Cohesion: 0.11
Nodes (34): DateInput(), DropdownBox(), DropdownBoxProps, MissionSelect(), collect(), CategorySettings(), ScheduleEventEditor(), ScheduleCopy() (+26 more)

### Community 35 - "saveSchedule"
Cohesion: 0.17
Nodes (17): Context, POST(), runtime, POST(), POST(), runtime, queueScheduleNotifications(), assignmentDepartments() (+9 more)

### Community 38 - "calendar-page.tsx"
Cohesion: 0.18
Nodes (19): eventColor(), eventColors, weekdayLabels, CalendarListView(), CalendarListViewProps, CalendarMonthPreview(), CalendarMonthView(), CalendarMonthViewProps (+11 more)

### Community 39 - "day-responsibilities.tsx"
Cohesion: 0.35
Nodes (8): assignmentResponsibilityLabel(), churchDay(), DayResponsibilities(), programTitle(), receptionSession(), responsibilityText(), sessionOrder(), SCHEDULE_CATEGORIES

### Community 40 - "merge-members.ts"
Cohesion: 0.19
Nodes (14): POST(), runtime, POST(), runtime, authorize(), blank(), fields, Ids (+6 more)

### Community 42 - "package.json"
Cohesion: 0.15
Nodes (18): devDependencies, prettier@^3.9.10, sharp@^0.35.5, tsx@^4.20.0, @types/node@^22.0.0, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.9.0 (+10 more)

### Community 43 - "core/package.json"
Cohesion: 0.13
Nodes (18): dependencies, react@^19.2.0, @tanstack/react-query@5.107.1, @tanstack/react-query-persist-client@^5.107.1, zod@^4.0.0, zustand@^5.0.0, exports, react (+10 more)

### Community 45 - "day-responsibilities.tsx"
Cohesion: 0.29
Nodes (10): Assignment, assignmentEvent(), googleCalendarUrl(), saveAssignmentToCalendar(), calendarFile(), CalendarFileEvent, CalendarFileEventSchema, calendarTimestamp() (+2 more)

### Community 46 - "login-form.tsx"
Cohesion: 0.32
Nodes (9): AuthFrame(), dismissKeyboard(), ClientAuthGate(), LoginForm(), LoginPage(), PageLoading(), PasswordSetupForm(), PasswordSetupPage() (+1 more)

### Community 47 - "mobile-client/package.json"
Cohesion: 0.25
Nodes (7): @org/ui@*, react-dom@^19.2.0, @org/ui, react-dom, name, private, type

### Community 48 - "import-believers.py"
Cohesion: 0.18
Nodes (4): main(), map_workbook(), normalize(), read_workbook()

### Community 49 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, esbuild@^0.28.2, jsdom@^26.1.0, sharp@^0.35.5, @tailwindcss/vite@^4.1.0, @testing-library/user-event@^14.6.8, @types/jsdom@^30.0.0, vite@^6.4.0 (+9 more)

### Community 50 - "client-router.ts"
Cohesion: 0.14
Nodes (30): 3. Monorepo Conventions, currentClientPath(), currentClientSearch(), goBackClient(), historyPosition, isNativeHistoryNavigation(), listeners, navigateClient() (+22 more)

### Community 51 - "local-database.ts"
Cohesion: 0.07
Nodes (25): children, launch(), require, root, stop(), cluster, directory, envFile (+17 more)

### Community 52 - "useAuth"
Cohesion: 0.07
Nodes (43): AutoLoadMore(), CalendarExport(), sendEmail(), Preview, EmailGroupsPage(), GroupDialog(), GroupForm(), EventEditor() (+35 more)

### Community 54 - "web-admin/package.json"
Cohesion: 0.17
Nodes (15): devDependencies, jszip@^3.10.1, tailwindcss@^4.1.0, @tailwindcss/postcss@^4.1.0, @types/nodemailer@^8.0.2, @types/pg@^8.23.1, @types/web-push@^3.6.4, tailwindcss (+7 more)

### Community 55 - "src/member-sync.ts"
Cohesion: 0.15
Nodes (17): adminKinds, CachedPage, CachedRow, detailKinds, listKinds, memberKinds, removeMemberReads(), Cursor (+9 more)

### Community 56 - "Schedule & Ministry Assignment Management"
Cohesion: 0.10
Nodes (21): Cancellation and deletion, Categories and configuration, Copying, Creation and editing permissions, Database and API knowledge base, Editable reception table text — 9 November 2026, Editing and lifecycle, Entry points (+13 more)

### Community 57 - "Church Member Management"
Cohesion: 0.07
Nodes (29): Administrative features, Applications and request flow, Architecture, Authentication and persistent sessions, Authentication endpoints, Backup, archival, and handoff, Church Member Management, Contents (+21 more)

### Community 58 - "check-responsive-ui.mts"
Cohesion: 0.16
Nodes (16): orgs, Tab, cdp(), check(), click(), clickText(), delay(), departments (+8 more)

### Community 59 - "choir-memberships.ts"
Cohesion: 0.12
Nodes (21): DELETE, GET(), mutate(), PATCH, POST, runtime, POST(), runtime (+13 more)

### Community 60 - "Production loading performance"
Cohesion: 0.33
Nodes (5): Device cache, Lists and SQL, Production loading performance, Startup and navigation, Timing and later verification

### Community 61 - "route-modules.tsx"
Cohesion: 0.11
Nodes (26): MemberDetail(), MemberDirectory(), assignmentsModule, calendarModule, departmentDetailModule, departmentsModule, directoryModule, emailGroupsModule (+18 more)

### Community 62 - "Architecture and integration guide"
Cohesion: 0.12
Nodes (17): Membership, API contract to replace the demo adapter, Architecture and integration guide, Authorization matrix, Client state and real-time, Custom mobile dropdowns and type scale, Design and deployment, Filter navigation and age contract (+9 more)

### Community 63 - "use-workspace-route.ts"
Cohesion: 0.19
Nodes (16): 5.2 Mobile Client (`apps/mobile-client/src/`), 5. Key Source Files by Domain, App(), isHistoryNavigation(), restoreNavigationScroll(), useClientRoute(), canonicalize(), prefetch() (+8 more)

### Community 65 - "Hội Thánh PWA and device notifications"
Cohesion: 0.15
Nodes (12): APIs, Event integration, recipients and delivery recovery, Explicit local reception draft exception, Hội Thánh PWA and device notifications, Installation and device support, Local development and HTTPS, Main implementation files, Manifest, icons and public-only offline behavior (+4 more)

### Community 66 - "query-persistence.ts"
Cohesion: 0.20
Nodes (16): useCalendarResponsibilities(), startTiming(), allowed(), allowedRoots, clearPersistedReads(), database(), DurableRead, durableWrites (+8 more)

### Community 67 - "5.1 Shared Core (`packages/core/src/`)"
Cohesion: 0.18
Nodes (19): 5.1 Shared Core (`packages/core/src/`), MemberDetailScope, useMemberDetail(), persist(), isApiMode(), DirectoryQuery, getMyProfile(), listDirectory() (+11 more)

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

### Community 73 - "requirePermission"
Cohesion: 0.16
Nodes (16): POST(), runtime, CredentialSchema, POST(), runtime, POST(), runtime, AccessChangeSchema (+8 more)

### Community 74 - "copySchedule"
Cohesion: 0.28
Nodes (7): Context, POST(), runtime, Context, POST(), runtime, copySchedule()

### Community 75 - "Worship programs: automatic email updates and phone-ready Viber drafts"
Cohesion: 0.20
Nodes (10): Current save behavior, Device verification, Email link compatibility and alternate labels, Failure handling and retries, Opening the email on a phone, Parsing and missing information, Persistence and compatibility, Public worship contributions (+2 more)

### Community 77 - "personnel-missions.ts"
Cohesion: 0.26
Nodes (15): Context, GET(), PUT(), runtime, authorize(), Board, BoardMember, getPersonnelMissions() (+7 more)

### Community 78 - "worship-contributions.ts"
Cohesion: 0.13
Nodes (19): GET(), POST(), runtime, CalendarCreateContext, WORSHIP_INFORMATION_RECIPIENT, listWorshipContributions(), reviewer(), reviewLinkHtml() (+11 more)

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

### Community 85 - "src/calendar.ts"
Cohesion: 0.12
Nodes (17): BulkEmailInput, CalendarDate, CalendarDelivery, calendarExportPreview(), calendarExportText(), calendarPermissions, CalendarSaveResult, CalendarSendSummary (+9 more)

### Community 86 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 87 - "Local believer workbook fixture"
Cohesion: 0.33
Nodes (5): Field mapping, Local believer workbook fixture, Local-only delivery and verification, Mapping results for this file, Run locally

### Community 88 - "ref_lucide_react"
Cohesion: 0.11
Nodes (30): ClientError(), roleLabels, statusLabels, DirectoryCards(), DirectoryLoading(), DirectoryPagination(), DirectoryResults(), MemberDirectoryState (+22 more)

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
Cohesion: 0.13
Nodes (14): 10. Adding a New API Endpoint (Web Admin), 11. Adding a New Database Migration, 12. Typecheck & Lint, 13. Environment Variables, 14. Deployment (Vercel), 15. Graphify (Knowledge Graph), 16. Common Conventions / Gotchas, 1. Project Overview (+6 more)

### Community 93 - "Local development"
Cohesion: 0.33
Nodes (6): Explicit legacy demo mode, Local development, Option A: create a private local PostgreSQL cluster, Option B: use an existing PostgreSQL database, Prerequisites, Run the separate Vite client

### Community 94 - "server/reception.ts"
Cohesion: 0.27
Nodes (12): GET(), PUT(), runtime, POST(), runtime, previewReceptionMonth(), receptionTeam(), saveReceptionTeam() (+4 more)

### Community 95 - "my-assignments/[id]/route.ts"
Cohesion: 0.28
Nodes (7): GET(), runtime, GET(), runtime, getAssignedSchedule(), getNotifiedSchedule(), sharedSchedule()

### Community 96 - "src/schedules.ts"
Cohesion: 0.12
Nodes (23): Id, List, managerAny(), affectedAssignments(), canCreateScheduleCategory(), canEditScheduleDuty(), canManageScheduleCategory(), canViewSchedules() (+15 more)

### Community 98 - "Member-facing features"
Cohesion: 0.40
Nodes (5): Confidential history, Directory and navigation, Filters, Member-facing features, Profile details and editing

### Community 99 - "Schedule & Ministry Assignment Management"
Cohesion: 0.40
Nodes (5): Direct reception table editing, Extra reception dates, Monthly reception assignments, Schedule & Ministry Assignment Management, Temporary reception drafts and official submission

### Community 100 - "mobile-client/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 102 - "auth-session.tsx"
Cohesion: 0.14
Nodes (25): download(), download(), advanceAuthEpoch(), ApiError, authenticatedFetch(), clearBrowserAuth(), clearRefreshRequest(), currentAuthBootstrap() (+17 more)

### Community 103 - "next"
Cohesion: 0.18
Nodes (5): metadata, viewport, config, next@^16.0.0, next

### Community 109 - "src/department-members.ts"
Cohesion: 0.50
Nodes (3): DEPARTMENT_BULK_LIMIT, DepartmentMembershipBulkInput, memberIds

### Community 110 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 111 - "ui/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 112 - "push-keys.mjs"
Cohesion: 0.33
Nodes (5): web-push@^4.0.0, web-push, path, privateExists, publicExists

### Community 115 - "server/schedules.ts"
Cohesion: 0.25
Nodes (9): GET(), PATCH(), runtime, GET(), POST(), runtime, configureScheduleCategory(), listSchedules() (+1 more)

### Community 116 - "public/sw.js"
Cohesion: 0.40
Nodes (4): ASSETS, destination(), SHELL_ASSETS, submit()

### Community 120 - "Monthly reception team generator"
Cohesion: 0.40
Nodes (5): Department-sourced reception verification — 9 November 2026, Monthly reception team generator, Reception API and files, Reception verification — 8 November 2026, Required positions

### Community 122 - "dependencies"
Cohesion: 0.12
Nodes (17): dependencies, argon2@^0.45.2, @hookform/resolvers@^6.0.0, jose@^6.2.15, @org/core@*, pg@^8.23.1, react-dom@^19.2.0, react-hook-form@^7.65.0 (+9 more)

### Community 130 - "ReviewQueue"
Cohesion: 0.11
Nodes (27): CalendarToolbar(), CalendarToolbarProps, useWorshipContributions(), WorshipContributions(), WorshipContributionsBadge(), worshipContributionsKey, WorshipDraft, changes() (+19 more)

### Community 146 - "src/reception.ts"
Cohesion: 0.12
Nodes (36): ReceptionCellTextarea(), saveReceptionImage(), ReceptionTable(), content(), errorCell(), upcomingWorshipSunday(), calendarWeekday(), addReceptionExtraService() (+28 more)

## Knowledge Gaps
- **5 isolated node(s):** `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 695 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Church Member Management` connect `Church Member Management` to `Member-facing features`, `Schedule & Ministry Assignment Management`, `README.md`, `Calendar, event email and Word export`, `Supporting documentation`, `main.tsx`, `Local development`, `Architecture and integration guide`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Button()` (e.g. with `5.4 UI Package (`packages/ui/src/`)` and `primitiveCases()`) actually correct?**
  _`Button()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07030527289546716 - nodes in this community are weakly interconnected._
- **Why does `HttpError` connect `session.ts` to `pool`, `worship-information.ts`, `failure`, `schedule-export.ts`, `http.ts`, `department-board.ts`, `src/quarterly-work.ts`, `members.ts`, `db.ts`, `roles.ts`, `worship-information.ts`, `choir-memberships.ts`, `HttpError`, `scheduleApi`, `saveSchedule`, `merge-members.ts`, `choir-memberships.ts`, `requirePermission`, `copySchedule`, `personnel-missions.ts`, `worship-contributions.ts`, `grantScheduleLeader`, `server/reception.ts`, `my-assignments/[id]/route.ts`, `src/schedules.ts`, `server/schedules.ts`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `apiRequest()` (e.g. with `3. Monorepo Conventions` and `5.1 Shared Core (`packages/core/src/`)`) actually correct?**
  _`apiRequest()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `apiRequest` be split into smaller, more focused modules?**
  _Cohesion score 0.07366946778711485 - nodes in this community are weakly interconnected._