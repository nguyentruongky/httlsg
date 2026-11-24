# Graph Report - church-management  (2026-11-25)

## Corpus Check
- 642 files · ~281,373 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .webmanifest 3, .css 3, (none) 2)

## Summary
- 3110 nodes · 10964 edges · 167 communities (147 shown, 20 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 254 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4564843d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- member-table.tsx
- http.ts
- scrutineer-page.tsx
- election-page.tsx
- Button
- Bầu cử / Election module
- use-member-directory.ts
- server/elections.ts
- members.ts
- main
- pwa-settings.tsx
- db.ts
- src/quarterly-work.ts
- location-settings-form.tsx
- Church Management Platform — Agent Documentation
- roles.ts
- devDependencies
- parser.ts
- calendar-page.tsx
- choir-memberships.ts
- actions.ts
- schedule-manager.tsx
- client-router.ts
- scheduleApi
- login-form.tsx
- server/calendar.ts
- ReviewQueue
- renderScheduleDocument
- ui/package.json
- with
- grantScheduleLeader
- member-information.tsx
- scripts
- auth-contract.ts
- Public election voting
- Architecture and integration guide
- src/index.ts
- migrate-local-database.mjs
- rounds/[[...path]]/route.ts
- navigateClient
- pool
- Design system and development conventions
- package.json
- core/package.json
- server/session.ts
- phone-calendar.ts
- members-compact.ts
- use-workspace-route.ts
- import-believers.py
- worship-mention-textarea.tsx
- personnel-missions.ts
- next
- event-service.ts
- worship-contributions.ts
- web-admin/package.json
- api/elections/[[...path]]/route.ts
- Schedule & Ministry Assignment Management
- Church Member Management
- election-team-export-data.ts
- server/reception.ts
- ticket-card.tsx
- schedule-views.tsx
- prepareWorshipInformationRequest
- mobile-client/package.json
- Hội Thánh PWA and device notifications
- personnel-missions-dialog.tsx
- worship-information.ts
- compilerOptions
- vercel.json
- ui-interactions.test.ts
- README.md
- Authentication and access control
- election-audit.tsx
- Architecture and code organization
- Worship programs: automatic email updates and phone-ready Viber drafts
- directory.ts
- useKeyboardScrollSpace
- api/events/[id]/route.ts
- @prisma/composer
- web-admin/tsconfig.json
- Calendar, event email and Word export
- Supporting documentation
- dependencies
- createRequestId
- use-ticket-entry.ts
- scripts
- Local believer workbook fixture
- auth-session.tsx
- main.tsx
- dependencies
- overrides
- member-filters.tsx
- local-database.ts
- local-data.ts
- route-modules.tsx
- local-election.ts
- schemas.ts
- canCreateScheduleCategory
- HttpError
- mobile-client/tsconfig.json
- worship-viber-draft-page.tsx
- header
- scripts
- check-responsive-ui.mts
- ref_node_crypto
- Notification center
- public/elections/[[...path]]/route.ts
- server/schedules.ts
- core/tsconfig.json
- ui/tsconfig.json
- index.tsx
- calendar-responsibilities.ts
- tickets/[[...path]]/route.ts
- day-responsibilities.tsx
- public/sw.js
- copySchedule
- public/pwa/sw.js
- core/pwa/sw.js
- merge-members.ts
- AGENTS.md
- Church calendar, email groups, delivery and Word export
- HttpError
- exceljs
- Local development
- calendarApi
- Schedule & Ministry Assignment Management
- push.ts
- useAuth
- Pages and API reference
- src/reception.ts
- database-performance.md
- catalog.ts
- http.ts
- member-read-sync.md
- src/calendar.ts
- settings.ts
- Production loading performance
- prepareWorshipViberRetry
- push-keys.mjs
- Monthly reception team generator
- getLocalDataset
- schedule-members/route.ts
- ref_node_path
- Activity
- Member-facing features
- Backend development patterns
- src/department-members.ts
- Authentication and persistent sessions
- @hookform/resolvers@^6.0.0
- Administrative features
- Backup, archival, and handoff
- nodemailer
- state.ts
- Deployment and operations
- argon2
- jose
- next-themes@^0.4.6
- @org/core@*
- @org/ui@*
- react@^19.2.0
- react-dom@^19.2.0
- collect

## God Nodes (most connected - your core abstractions)
1. `HttpError` - 224 edges
2. `Button()` - 215 edges
3. `apiRequest()` - 134 edges
4. `failure()` - 125 edges
5. `json()` - 114 edges
6. `withActor()` - 113 edges
7. `useAuth()` - 97 edges
8. `ErrorMessage()` - 91 edges
9. `Dialog()` - 90 edges
10. `cn()` - 77 edges

## Surprising Connections (you probably didn't know these)
- `8. Calendar Contribution Review Workflow` --references--> `CalendarReviewPage()`  [INFERRED]
  AGENTS.md → apps/mobile-client/src/calendar/calendar-review-page.tsx
- `Registration troubleshooting` --references--> `subscribe()`  [INFERRED]
  docs/pwa.md → apps/mobile-client/src/client-router.ts
- `Patterns used here` --references--> `db()`  [INFERRED]
  docs/architecture.md → apps/mobile-client/src/elections/local-election.ts
- `Application services: one named use case` --references--> `db()`  [INFERRED]
  docs/backend-development.md → apps/mobile-client/src/elections/local-election.ts
- `Results polling scope` --references--> `useElectionResultsPolling()`  [INFERRED]
  docs/election.md → apps/mobile-client/src/elections/use-election-results-polling.ts

## Import Cycles
- None detected.

## Communities (167 total, 20 thin omitted)

### Community 0 - "member-table.tsx"
Cohesion: 0.08
Nodes (46): CalendarContribution, CalendarReviewPage(), downloadCsv(), ListControls(), ListPageHeader(), ListResultsSummary(), ListSearchToolbar(), MemberTable() (+38 more)

### Community 1 - "http.ts"
Cohesion: 0.08
Nodes (35): POST(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+27 more)

### Community 2 - "scrutineer-page.tsx"
Cohesion: 0.20
Nodes (11): createElectionPolling(), AssignedResponse, ScrutineerPage(), ScrutineerExportKind, ScrutineerHeader(), ScrutineerNavigation(), useOwnTicketCount(), Run (+3 more)

### Community 3 - "election-page.tsx"
Cohesion: 0.13
Nodes (18): ElectionPage, download(), download(), Audit(), BackupImport(), download(), ElectionPage(), errorMessage() (+10 more)

### Community 4 - "Button"
Cohesion: 0.10
Nodes (26): AnimatedSheetContent(), ConnectionIssue(), BOARD_POSITIONS, BoardPerson, BoardRoleEditor(), BoardYears(), fold(), ChangeDepartmentStatusDialog() (+18 more)

### Community 5 - "Bầu cử / Election module"
Cohesion: 0.12
Nodes (17): Assigned normal-user access, Audit polling scope, Bầu cử / Election module, Complete polling lifecycle, Consolidated storage (migration 052), Edit and delete elections, Election and team identity (migration 054), Four-stage election workflow (+9 more)

### Community 6 - "use-member-directory.ts"
Cohesion: 0.12
Nodes (26): ClientError(), roleLabels, statusLabels, MemberDetail(), DirectoryCards(), DirectoryLoading(), DirectoryPagination(), DirectoryResults() (+18 more)

### Community 7 - "server/elections.ts"
Cohesion: 0.14
Nodes (32): electionApi(), localTicket, reconcileElectionBackup(), electionBallotsSql, candidateList(), candidateSnapshot(), rowSchema, saveCandidateList() (+24 more)

### Community 8 - "members.ts"
Cohesion: 0.11
Nodes (32): 5.3 Web Admin (`apps/web-admin/`), GET(), runtime, DELETE(), POST(), runtime, Context, DELETE() (+24 more)

### Community 9 - "main"
Cohesion: 0.40
Nodes (6): registerLocalDataset(), main(), bootstrap(), importMembers(), root(), migrate()

### Community 10 - "pwa-settings.tsx"
Cohesion: 0.25
Nodes (12): OfflineBanner(), pushRegistrationError(), DeviceSettings(), enable(), inspect(), dismissedUntil(), notificationDismissedUntil(), PwaDeviceSettings() (+4 more)

### Community 11 - "db.ts"
Cohesion: 0.11
Nodes (19): CalendarContributionInput, CalendarCreateContext, DB, shared, createFollowupElection(), cache, pending, Place (+11 more)

### Community 12 - "src/quarterly-work.ts"
Cohesion: 0.14
Nodes (41): requestAction(), checkQuarterlyWork(), quarterlyDirectoryMembers(), quarterlyReceptionUnavailableDays(), quarterlyRosterMembers(), receptionTextMembers(), resolveQuarterlyText(), scheduledPeople() (+33 more)

### Community 13 - "location-settings-form.tsx"
Cohesion: 0.05
Nodes (67): performPublicElectionRequest(), PublicElectionError, publicElectionRequest(), publicErrorMessage(), PublicCandidateList(), PublicCandidateSelection(), activeChecks, CheckResult (+59 more)

### Community 14 - "Church Management Platform — Agent Documentation"
Cohesion: 0.14
Nodes (13): 10. Adding a New API Endpoint (Web Admin), 11. Adding a New Database Migration, 12. Typecheck & Lint, 13. Environment Variables, 14. Deployment (Vercel), 15. Graphify (Knowledge Graph), 1. Project Overview, 2. Root Scripts (`package.json`) (+5 more)

### Community 15 - "roles.ts"
Cohesion: 0.10
Nodes (33): PUT(), runtime, GET(), runtime, GET(), POST(), runtime, POST() (+25 more)

### Community 16 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, esbuild@^0.28.2, sharp@^0.35.5, tailwindcss@^4.1.0, @tailwindcss/vite@^4.1.0, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/jsdom@^30.0.0 (+11 more)

### Community 17 - "parser.ts"
Cohesion: 0.19
Nodes (17): composeWorshipInformationRequest(), DuplicateWorshipHymn, findDuplicateWorshipHymns(), HymnOccurrence, getMissingWorshipProgramFields(), hasWorshipValue(), keys, labelMap (+9 more)

### Community 18 - "calendar-page.tsx"
Cohesion: 0.19
Nodes (18): eventColor(), eventColors, weekdayLabels, CalendarListView(), CalendarListViewProps, CalendarMonthPreview(), CalendarMonthView(), CalendarMonthViewProps (+10 more)

### Community 19 - "choir-memberships.ts"
Cohesion: 0.21
Nodes (13): POST(), runtime, authorized(), GET(), runtime, PATCH(), runtime, currentChurchYear() (+5 more)

### Community 20 - "actions.ts"
Cohesion: 0.19
Nodes (27): JoinInput, joinPublicElection(), publicElectionAction(), publicElectionApi(), publicConnectionAccess(), publicElectionConnection(), publicBrowserCredential(), publicCredentialHash() (+19 more)

### Community 21 - "schedule-manager.tsx"
Cohesion: 0.10
Nodes (23): Notifications, AutoLoadMore(), dateFormat, labels, Notice, notificationDate(), Notifications(), SchedulePerson (+15 more)

### Community 22 - "client-router.ts"
Cohesion: 0.21
Nodes (16): currentClientSearch(), historyPosition, listeners, notify(), observedPath, onPopState(), onScroll(), previousActiveTabIndex (+8 more)

### Community 23 - "scheduleApi"
Cohesion: 0.10
Nodes (25): GET(), runtime, GET(), runtime, Context, POST(), runtime, Context (+17 more)

### Community 24 - "login-form.tsx"
Cohesion: 0.29
Nodes (11): AuthFrame(), dismissKeyboard(), ClientAuthGate(), LoginForm(), LoginPage(), PageLoading(), PasswordSetupForm(), PasswordSetupPage() (+3 more)

### Community 25 - "server/calendar.ts"
Cohesion: 0.11
Nodes (33): DELETE(), runtime, POST(), runtime, POST(), runtime, GET(), POST() (+25 more)

### Community 26 - "ReviewQueue"
Cohesion: 0.17
Nodes (17): CalendarToolbar(), CalendarToolbarProps, useWorshipContributions(), WorshipContributions(), WorshipContributionsBadge(), worshipContributionsKey, WorshipDraft, changes() (+9 more)

### Community 27 - "renderScheduleDocument"
Cohesion: 0.23
Nodes (24): saveQuarterlyImage(), dutyText(), ErrorCell(), PlainCellInput(), QuarterlyWorkTable(), cell(), QUARTERLY_WORD_COLUMNS, quarterlyWordFontSize() (+16 more)

### Community 28 - "ui/package.json"
Cohesion: 0.10
Nodes (24): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, cmdk@^1.1.1, lucide-react@^0.468.0, radix-ui@^1.4.0, react@^19.2.0, react-dom@^19.2.0 (+16 more)

### Community 29 - "with"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, if, runs-on, steps, jobs, deploy (+15 more)

### Community 30 - "grantScheduleLeader"
Cohesion: 0.43
Nodes (7): GET(), PATCH(), runtime, administrators(), grantScheduleLeader(), grantToken(), scheduleLeaders()

### Community 31 - "member-information.tsx"
Cohesion: 0.14
Nodes (22): formatDate(), AreaPicker(), DepartmentChoices(), LocationPicker(), Option, ProfileChoiceList(), InlineMemberField(), displayDate() (+14 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, b, calendar:deliver, d, db:bootstrap, db:import, db:local:setup, db:local:start (+15 more)

### Community 33 - "auth-contract.ts"
Cohesion: 0.13
Nodes (17): 6. Authentication & Permissions, CredentialSchema, runtime, AccessRoleSchema, canOpenBoardTeam(), canOpenLeaderTeam(), CreateAccountSchema, departmentScopedRoles (+9 more)

### Community 34 - "Public election voting"
Cohesion: 0.17
Nodes (10): API and storage, Components and shared rules, Location and integrity, Online intake and manual checking, Organizer setup, OTP attempt logging, lockout and device admission, Polling and connection-report retries, Public election voting (+2 more)

### Community 35 - "Architecture and integration guide"
Cohesion: 0.14
Nodes (14): API contract to replace the demo adapter, Architecture and integration guide, Authorization matrix, Client state and real-time, Custom mobile dropdowns and type scale, Design and deployment, Filter navigation and age contract, Mobile member directory (+6 more)

### Community 36 - "src/index.ts"
Cohesion: 0.07
Nodes (46): AccountCredentials(), Action, MemberCardMenu(), choose(), item(), MemberCardMenuMember, choirOptions, MemberChoirSheet() (+38 more)

### Community 37 - "migrate-local-database.mjs"
Cohesion: 0.18
Nodes (11): args, connection(), localEnvFile, main(), restore(), runCapture(), args, connection() (+3 more)

### Community 38 - "rounds/[[...path]]/route.ts"
Cohesion: 0.33
Nodes (5): Context, GET, handler(), POST, runtime

### Community 39 - "navigateClient"
Cohesion: 0.16
Nodes (25): 3. Monorepo Conventions, 5.2 Mobile Client (`apps/mobile-client/src/`), 5. Key Source Files by Domain, Calendar and navigation organization, currentClientPath(), goBackClient(), isHistoryNavigation(), isNativeHistoryNavigation() (+17 more)

### Community 40 - "pool"
Cohesion: 0.20
Nodes (21): authorized(), comingWeekRange(), GET(), runtime, pool(), setting(), decryptSubscription(), encryptSubscription() (+13 more)

### Community 41 - "Design system and development conventions"
Cohesion: 0.40
Nodes (5): Design system and development conventions, Loading views, Maintaining the system, System assessment, Visual ownership

### Community 42 - "package.json"
Cohesion: 0.15
Nodes (18): devDependencies, prettier@^3.9.10, sharp@^0.35.5, tsx@^4.20.0, @types/node@^22.0.0, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.9.0 (+10 more)

### Community 43 - "core/package.json"
Cohesion: 0.13
Nodes (18): dependencies, react@^19.2.0, @tanstack/react-query@5.107.1, @tanstack/react-query-persist-client@^5.107.1, zod@^4.0.0, zustand@^5.0.0, exports, react (+10 more)

### Community 44 - "server/session.ts"
Cohesion: 0.11
Nodes (40): POST(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+32 more)

### Community 45 - "phone-calendar.ts"
Cohesion: 0.29
Nodes (10): Assignment, assignmentEvent(), googleCalendarUrl(), saveAssignmentToCalendar(), calendarFile(), CalendarFileEvent, CalendarFileEventSchema, calendarTimestamp() (+2 more)

### Community 46 - "members-compact.ts"
Cohesion: 0.26
Nodes (10): GET(), runtime, CompactMember, compactMemberDto(), CompactMembersPage, date(), iso(), listMembersCompact() (+2 more)

### Community 47 - "use-workspace-route.ts"
Cohesion: 0.32
Nodes (9): App(), useClientSearch(), useWorkspaceRoute(), matchWorkspaceRoute(), resolveWorkspacePath(), WorkspaceTabs(), hasDashboard(), hasFullMemberAccess() (+1 more)

### Community 48 - "import-believers.py"
Cohesion: 0.18
Nodes (4): main(), map_workbook(), normalize(), read_workbook()

### Community 49 - "worship-mention-textarea.tsx"
Cohesion: 0.13
Nodes (30): 5.1 Shared Core (`packages/core/src/`), applyPreset(), caretPosition(), mentionAt(), missingInformationContacts(), Trigger, WorshipMentionTextarea(), mentionSuggestions() (+22 more)

### Community 50 - "personnel-missions.ts"
Cohesion: 0.22
Nodes (16): Context, GET(), PUT(), runtime, LEGACY_BOARD, MEMBERSHIP_TITLE, Board, BoardMember (+8 more)

### Community 51 - "next"
Cohesion: 0.15
Nodes (9): metadata, viewport, sendCalendarNotificationNow(), dispatch(), sendCalendarBatch(), sendCalendarRetry(), config, next@^16.0.0 (+1 more)

### Community 52 - "event-service.ts"
Cohesion: 0.14
Nodes (25): POST(), runtime, persistNewCalendarEvent(), eventDto(), iso(), calendarEvent(), listCalendarEvents(), lockCalendarReviewEvents() (+17 more)

### Community 53 - "worship-contributions.ts"
Cohesion: 0.13
Nodes (24): GET(), POST(), runtime, POST(), runtime, sendSavedCalendarEvent(), WORSHIP_INFORMATION_RECIPIENT, listWorshipContributions() (+16 more)

### Community 54 - "web-admin/package.json"
Cohesion: 0.14
Nodes (19): devDependencies, jszip@^3.10.1, tailwindcss@^4.1.0, @tailwindcss/postcss@^4.1.0, @types/nodemailer@^8.0.2, @types/pdfkit@^0.17.7, @types/pg@^8.23.1, @types/qrcode@^1.5.6 (+11 more)

### Community 55 - "api/elections/[[...path]]/route.ts"
Cohesion: 0.33
Nodes (5): Context, GET, handler(), POST, runtime

### Community 56 - "Schedule & Ministry Assignment Management"
Cohesion: 0.10
Nodes (21): Cancellation and deletion, Categories and configuration, Copying, Creation and editing permissions, Database and API knowledge base, Editable reception table text — 9 November 2026, Editing and lifecycle, Entry points (+13 more)

### Community 57 - "Church Member Management"
Cohesion: 0.13
Nodes (15): Applications and request flow, Architecture, Church Member Management, Contents, Database model and migrations, Development commands and verification, Environment configuration, Importing local test data (+7 more)

### Community 58 - "election-team-export-data.ts"
Cohesion: 0.27
Nodes (15): electionTeamExcel(), heading(), table(), ElectionTeamExport, electionTeamExportData(), teamExportDate(), teamStats(), teamTicketStatus() (+7 more)

### Community 60 - "server/reception.ts"
Cohesion: 0.20
Nodes (13): update(), GET(), PUT(), runtime, POST(), runtime, previewReceptionMonth(), receptionTeam() (+5 more)

### Community 61 - "ticket-card.tsx"
Cohesion: 0.25
Nodes (9): TicketStatusBadge(), ticketStatusLabel(), TicketCandidateLine(), TicketCandidates(), TicketCardAction(), TicketCard(), TicketCardData, copyTicketId() (+1 more)

### Community 62 - "schedule-views.tsx"
Cohesion: 0.14
Nodes (19): QuarterlyCellChange, ReceptionCellChange, ScheduleTable(), ReceptionCellChange, ScheduleViews(), move(), publicWorship(), upcomingWorshipSunday() (+11 more)

### Community 63 - "prepareWorshipInformationRequest"
Cohesion: 0.14
Nodes (17): reportLinkDiagnostics(), Context, GET(), POST(), runtime, POST(), runtime, GET() (+9 more)

### Community 64 - "mobile-client/package.json"
Cohesion: 0.08
Nodes (34): dependencies, @hookform/resolvers@^6.0.0, jsqr@^1.4.0, lucide-react@^0.468.0, next-themes@^0.4.6, @noble/hashes@2.4.0, @org/core@*, @org/ui@* (+26 more)

### Community 65 - "Hội Thánh PWA and device notifications"
Cohesion: 0.13
Nodes (14): APIs, Calendar changes for admins, Event integration, recipients and delivery recovery, Explicit local reception draft exception, Hội Thánh PWA and device notifications, Installation and device support, Local development and HTTPS, Main implementation files (+6 more)

### Community 66 - "personnel-missions-dialog.tsx"
Cohesion: 0.14
Nodes (19): formatCsv(), MemberUpdateResult, personnelCollator, personnelCsv(), sortPersonnelDepartments(), PersonnelAssignment(), AssignedData, AssignedMember (+11 more)

### Community 67 - "worship-information.ts"
Cohesion: 0.26
Nodes (16): definiteFailure(), deliverCalendarItems(), deliverNext(), escapeEventHtml(), eventEmail(), Input, recipients, sendCalendarExportEmail() (+8 more)

### Community 68 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+3 more)

### Community 69 - "vercel.json"
Cohesion: 0.17
Nodes (11): crons, framework, rewrites, root, rewrites, $schema, services, mobile-client (+3 more)

### Community 70 - "ui-interactions.test.ts"
Cohesion: 0.11
Nodes (5): jsdom@^26.1.0, container, dom, root, jsdom

### Community 71 - "README.md"
Cohesion: 0.13
Nodes (10): Calendar server feature, Account access, Client example, Endpoint contract, Implementation, Limits and security rationale, Persistent login, Revocation and replay (+2 more)

### Community 72 - "Authentication and access control"
Cohesion: 0.17
Nodes (12): API surface, Authentication and access control, Concurrent devices, Department bulk status and contextual profile navigation, Department detail pages and bulk membership changes, Department member management, Permission matrix, Prepared local database (+4 more)

### Community 73 - "election-audit.tsx"
Cohesion: 0.14
Nodes (27): actions, ActivityLogs(), ConnectionLogs(), phaseLabel(), SubmissionLogs(), time(), AuditSummary(), ActivityLog (+19 more)

### Community 74 - "Architecture and code organization"
Cohesion: 0.22
Nodes (9): Architecture and code organization, Calendar module map, Follow an event save, Frontend boundaries, Further restructuring, Making your first change, Patterns used here, Read the project in this order (+1 more)

### Community 75 - "Worship programs: automatic email updates and phone-ready Viber drafts"
Cohesion: 0.18
Nodes (11): Current save behavior, Device verification, Email link compatibility and alternate labels, Failure handling and retries, Opening the email on a phone, Parsing and missing information, People-in-charge detection, Persistence and compatibility (+3 more)

### Community 76 - "directory.ts"
Cohesion: 0.15
Nodes (16): AgeBound, AgeRangeSchema, localDateFormatter, viewerId, all(), CompactMembersPage, describeDepartments(), DirectoryMemberSchema (+8 more)

### Community 77 - "useKeyboardScrollSpace"
Cohesion: 0.67
Nodes (6): useKeyboardScrollSpace(), blur(), focus(), restore(), schedule(), update()

### Community 78 - "api/events/[id]/route.ts"
Cohesion: 0.16
Nodes (14): POST(), runtime, Context, DELETE(), GET(), PATCH(), runtime, GET() (+6 more)

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
Cohesion: 0.10
Nodes (20): dependencies, docx@9.5.1, lucide-react@^0.468.0, pdfkit@^0.21.0, pg@^8.23.1, qrcode@^1.5.4, react-hook-form@^7.65.0, recharts@^3.3.0 (+12 more)

### Community 84 - "createRequestId"
Cohesion: 0.12
Nodes (24): getSchedule(), Id, List, managerAny(), requireScheduleCategory(), canCreateScheduleCategory(), canEditScheduleDuty(), canManageScheduleCategory() (+16 more)

### Community 85 - "use-ticket-entry.ts"
Cohesion: 0.14
Nodes (22): saveLocalTicket(), BallotActions(), BallotPreview(), CandidateResults(), CommandPlan, entryFilter(), filterEntryCandidates(), planEntryCommand() (+14 more)

### Community 86 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 87 - "Local believer workbook fixture"
Cohesion: 0.33
Nodes (5): Field mapping, Local believer workbook fixture, Local-only delivery and verification, Mapping results for this file, Run locally

### Community 88 - "auth-session.tsx"
Cohesion: 0.06
Nodes (69): 16. Common Conventions / Gotchas, usePersonnel(), leaveEditor(), openPeriod(), advanceAuthEpoch(), clearBrowserAuth(), clearRefreshRequest(), currentAuthBootstrap() (+61 more)

### Community 89 - "main.tsx"
Cohesion: 0.09
Nodes (18): PublicWorshipPage(), submit(), submitNew(), Slot, client, root, start(), deferred() (+10 more)

### Community 90 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, effect@4.0.5, @prisma/composer@0.38.0, @prisma/orm-postgres@8.0.0-rc.23, effect, @prisma/orm-postgres

### Community 91 - "overrides"
Cohesion: 0.33
Nodes (6): overrides, effect, @effect/platform-bun, @effect/platform-node, @effect/platform-node-shared, @effect/vitest

### Community 92 - "member-filters.tsx"
Cohesion: 0.08
Nodes (34): BoardYear, DepartmentBulkAction, DepartmentMembersState, useDepartmentMembers(), findProfiles(), leaveSelection(), openBoard(), Page (+26 more)

### Community 93 - "local-database.ts"
Cohesion: 0.28
Nodes (8): cluster, directory, envFile, exists(), log, main(), run(), socket

### Community 94 - "local-data.ts"
Cohesion: 0.22
Nodes (8): datasets, DatasetSchema, LocalDataset, SourceProfile, SourceProfileSchema, IdSchema, MemberDetailInputSchema, MemberSchema

### Community 95 - "route-modules.tsx"
Cohesion: 0.11
Nodes (24): DepartmentManagement(), assignmentsModule, calendarModule, departmentDetailModule, departmentsModule, directoryModule, emailGroupsModule, eventModule (+16 more)

### Community 96 - "local-election.ts"
Cohesion: 0.18
Nodes (25): ElectionSync(), Action, append(), completed(), db(), digest(), downloadElectionFile(), exportElectionBackup() (+17 more)

### Community 97 - "schemas.ts"
Cohesion: 0.11
Nodes (26): audit(), historyActor(), memory, Snapshot, ActivitySchema, canEditMemberDetails(), EventDateSchema, Invite (+18 more)

### Community 98 - "canCreateScheduleCategory"
Cohesion: 0.25
Nodes (9): GET(), PATCH(), runtime, GET(), POST(), runtime, configureScheduleCategory(), listSchedules() (+1 more)

### Community 99 - "HttpError"
Cohesion: 0.19
Nodes (16): GET(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+8 more)

### Community 100 - "mobile-client/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 101 - "worship-viber-draft-page.tsx"
Cohesion: 0.36
Nodes (6): Draft, SavedDraft(), WorshipViberDraftPage(), WorshipNotificationPanel(), copy(), writeClipboard()

### Community 102 - "header"
Cohesion: 0.24
Nodes (9): GET(), runtime, GET(), runtime, getAssignedSchedule(), getNotifiedSchedule(), header(), hydrate() (+1 more)

### Community 103 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 104 - "check-responsive-ui.mts"
Cohesion: 0.22
Nodes (14): cdp(), check(), click(), clickText(), delay(), departments, evaluate(), fixture (+6 more)

### Community 105 - "ref_node_crypto"
Cohesion: 0.50
Nodes (5): decryptElectionOtp(), encryptElectionOtp(), encryptionKey(), BatchInput, publicElectionOtps()

### Community 107 - "Notification center"
Cohesion: 0.50
Nodes (3): Notification center, Sources and recipients, Storage and rollout

### Community 108 - "public/elections/[[...path]]/route.ts"
Cohesion: 0.33
Nodes (5): Context, GET, handler(), POST, runtime

### Community 109 - "server/schedules.ts"
Cohesion: 0.19
Nodes (15): Context, POST(), runtime, POST(), runtime, queueScheduleNotifications(), assignmentDepartments(), readMemberState() (+7 more)

### Community 110 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 111 - "ui/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 112 - "index.tsx"
Cohesion: 0.07
Nodes (48): 5.4 UI Package (`packages/ui/src/`), ApplicationSettings(), SettingsDestination, SettingsLink(), settingsPages, Election, ElectionActions(), ElectionOtp (+40 more)

### Community 113 - "calendar-responsibilities.ts"
Cohesion: 0.39
Nodes (6): GET(), runtime, calendarResponsibilities(), loadPublishedResponsibilities(), responsibilitiesForDates(), CalendarRange

### Community 114 - "tickets/[[...path]]/route.ts"
Cohesion: 0.33
Nodes (5): Context, GET, handler(), POST, runtime

### Community 115 - "day-responsibilities.tsx"
Cohesion: 0.35
Nodes (8): assignmentResponsibilityLabel(), churchDay(), DayResponsibilities(), programTitle(), receptionSession(), responsibilityText(), sessionOrder(), SCHEDULE_CATEGORIES

### Community 116 - "public/sw.js"
Cohesion: 0.40
Nodes (4): ASSETS, destination(), SHELL_ASSETS, submit()

### Community 117 - "copySchedule"
Cohesion: 0.28
Nodes (7): Context, POST(), runtime, Context, POST(), runtime, copySchedule()

### Community 120 - "merge-members.ts"
Cohesion: 0.19
Nodes (13): POST(), runtime, POST(), runtime, blank(), fields, Ids, labels (+5 more)

### Community 122 - "Church calendar, email groups, delivery and Word export"
Cohesion: 0.18
Nodes (11): Built-in event presets, Church calendar, email groups, delivery and Word export, Database and APIs, Delivery states and recovery, Deployment and verification, Email calendar export to Ban Trình chiếu, Email groups, Immediate delivery and optional recovery worker (+3 more)

### Community 123 - "HttpError"
Cohesion: 0.08
Nodes (50): Context, GET(), PATCH(), PUT(), runtime, Context, DELETE, GET() (+42 more)

### Community 125 - "Local development"
Cohesion: 0.33
Nodes (6): Explicit legacy demo mode, Local development, Option A: create a private local PostgreSQL cluster, Option B: use an existing PostgreSQL database, Prerequisites, Run the separate Vite client

### Community 126 - "calendarApi"
Cohesion: 0.08
Nodes (31): GET(), runtime, GET(), runtime, Context, DELETE(), GET(), PATCH() (+23 more)

### Community 127 - "Schedule & Ministry Assignment Management"
Cohesion: 0.40
Nodes (5): Direct reception table editing, Extra reception dates, Monthly reception assignments, Schedule & Ministry Assignment Management, Temporary reception drafts and official submission

### Community 128 - "push.ts"
Cohesion: 0.22
Nodes (8): memberEventHash(), memberEventPath(), memberNotificationHash(), PushDestination, PushEndpoint, PushMessage, PushSubscribeInput, PushUnsubscribeInput

### Community 130 - "useAuth"
Cohesion: 0.08
Nodes (55): CalendarExport(), sendEmail(), Preview, EmailGroupsPage(), GroupDialog(), GroupForm(), EventEditor(), EventPresetSelector() (+47 more)

### Community 133 - "Pages and API reference"
Cohesion: 0.50
Nodes (4): Authentication endpoints, Main pages, Member and management endpoints, Pages and API reference

### Community 134 - "src/reception.ts"
Cohesion: 0.10
Nodes (39): ReceptionCellTextarea(), saveReceptionImage(), ReceptionTable(), content(), errorCell(), saveScheduleImage(), RECEPTION_WORD_COLUMNS, receptionWordLayout() (+31 more)

### Community 135 - "database-performance.md"
Cohesion: 0.50
Nodes (3): Consolidation (migration 052), Local database performance review, Retired tables

### Community 136 - "catalog.ts"
Cohesion: 0.24
Nodes (10): areas, DEPARTMENT_DISPLAY_ORDER, DEPARTMENT_TYPE_LABELS, DepartmentCatalogItem, departmentKey(), departmentRanks, DepartmentType, locations (+2 more)

### Community 137 - "http.ts"
Cohesion: 0.07
Nodes (55): GET(), runtime, DELETE, GET(), mutate(), PATCH, POST, runtime (+47 more)

### Community 139 - "src/calendar.ts"
Cohesion: 0.12
Nodes (17): BulkEmailInput, CalendarDate, CalendarDelivery, calendarExportPreview(), calendarExportText(), calendarPermissions, CalendarSaveResult, CalendarSendSummary (+9 more)

### Community 140 - "settings.ts"
Cohesion: 0.47
Nodes (4): DEVELOPMENT_ELECTION_PIN, Config, currentSettings(), publicElectionSettings()

### Community 141 - "Production loading performance"
Cohesion: 0.33
Nodes (5): Device cache, Lists and SQL, Production loading performance, Startup and navigation, Timing and later verification

### Community 142 - "prepareWorshipViberRetry"
Cohesion: 0.60
Nodes (4): POST(), runtime, prepareWorshipViberRetry(), sendWorshipViberRetry()

### Community 143 - "push-keys.mjs"
Cohesion: 0.33
Nodes (5): web-push@^4.0.0, web-push, path, privateExists, publicExists

### Community 144 - "Monthly reception team generator"
Cohesion: 0.40
Nodes (5): Department-sourced reception verification — 9 November 2026, Monthly reception team generator, Reception API and files, Reception verification — 8 November 2026, Required positions

### Community 145 - "getLocalDataset"
Cohesion: 0.50
Nodes (5): key(), read(), seed(), write(), getLocalDataset()

### Community 146 - "schedule-members/route.ts"
Cohesion: 0.67
Nodes (3): GET(), runtime, searchScheduleMembers()

### Community 147 - "ref_node_path"
Cohesion: 0.11
Nodes (12): processCalendarOutbox(), main(), children, launch(), require, root, stop(), root (+4 more)

### Community 148 - "Activity"
Cohesion: 0.50
Nodes (4): Membership, Shared model, Activity, Project scope and implementation status

### Community 149 - "Member-facing features"
Cohesion: 0.40
Nodes (5): Confidential history, Directory and navigation, Filters, Member-facing features, Profile details and editing

### Community 150 - "Backend development patterns"
Cohesion: 0.50
Nodes (4): Application services: one named use case, Backend development patterns, Boundaries to preserve, Durable jobs and after-commit work

### Community 151 - "src/department-members.ts"
Cohesion: 0.50
Nodes (3): DEPARTMENT_BULK_LIMIT, DepartmentMembershipBulkInput, memberIds

### Community 152 - "Authentication and persistent sessions"
Cohesion: 0.50
Nodes (4): Authentication and persistent sessions, Credentials and token lifecycle, Identifier-first login, Security boundaries and tradeoffs

### Community 153 - "@hookform/resolvers@^6.0.0"
Cohesion: 0.33
Nodes (4): @hookform/resolvers@^6.0.0, zod@^4.0.0, @hookform/resolvers, zod

### Community 154 - "Administrative features"
Cohesion: 0.67
Nodes (3): Administrative features, Duplicate-profile merging, Member management

### Community 155 - "Backup, archival, and handoff"
Cohesion: 0.67
Nodes (3): Backup, archival, and handoff, What to preserve privately, What to share for code review

### Community 158 - "Deployment and operations"
Cohesion: 0.50
Nodes (4): Deployment and operations, Operational responsibilities, Release procedure, Runtime topology

## Knowledge Gaps
- **5 isolated node(s):** `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 797 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `HttpError` connect `HttpError` to `http.ts`, `server/elections.ts`, `members.ts`, `http.ts`, `db.ts`, `settings.ts`, `src/quarterly-work.ts`, `prepareWorshipViberRetry`, `roles.ts`, `choir-memberships.ts`, `actions.ts`, `scheduleApi`, `server/calendar.ts`, `renderScheduleDocument`, `grantScheduleLeader`, `auth-contract.ts`, `server/session.ts`, `members-compact.ts`, `personnel-missions.ts`, `event-service.ts`, `worship-contributions.ts`, `election-team-export-data.ts`, `server/reception.ts`, `prepareWorshipInformationRequest`, `worship-information.ts`, `api/events/[id]/route.ts`, `createRequestId`, `canCreateScheduleCategory`, `HttpError`, `header`, `ref_node_crypto`, `server/schedules.ts`, `calendar-responsibilities.ts`, `copySchedule`, `merge-members.ts`, `calendarApi`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `HttpError` (e.g. with `5.3 Web Admin (`apps/web-admin/`)` and `Backend implementation`) actually correct?**
  _`HttpError` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `member-table.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08397337429595494 - nodes in this community are weakly interconnected._
- **Why does `Church Member Management` connect `Church Member Management` to `Pages and API reference`, `README.md`, `Calendar, event email and Word export`, `Supporting documentation`, `Activity`, `Member-facing features`, `Authentication and persistent sessions`, `Administrative features`, `Backup, archival, and handoff`, `Local development`, `Deployment and operations`, `Schedule & Ministry Assignment Management`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Button()` (e.g. with `5.4 UI Package (`packages/ui/src/`)` and `primitiveCases()`) actually correct?**
  _`Button()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `http.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08326530612244898 - nodes in this community are weakly interconnected._