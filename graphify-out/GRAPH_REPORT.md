# Graph Report - church-management  (2026-11-24)

## Corpus Check
- 613 files · ~269,588 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 3, .webmanifest 3, .css 3)

## Summary
- 3012 nodes · 10553 edges · 150 communities (125 shown, 25 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 229 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `571c0fd7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- department-members.tsx
- use-ticket-entry.ts
- local-election.ts
- election-admin-page.tsx
- schedule-manager.tsx
- index.tsx
- worship-information.ts
- server/elections.ts
- renderScheduleDocument
- server/calendar.ts
- roles.ts
- src/member-sync.ts
- src/quarterly-work.ts
- ref_zod
- Church Management Platform — Agent Documentation
- 5.3 Web Admin (`apps/web-admin/`)
- devDependencies
- parser.ts
- src/calendar.ts
- src/reception.ts
- useAuth
- location-settings-form.tsx
- merge-members.ts
- web-push
- scrutineer-page.tsx
- server/event-responsibility.ts
- calendar-toolbar.tsx
- check-responsive-ui.mts
- ui/package.json
- with
- role-assign-dialog.tsx
- Input
- scripts
- login-form.tsx
- failure
- HttpError
- schedule-editor.tsx
- assertOrigin
- AuthEventStream
- navigateClient
- worship-contributions.ts
- schemas.ts
- package.json
- core/package.json
- server/session.ts
- phone-calendar.ts
- ticket-entry.tsx
- query-persistence.ts
- import-believers.py
- public-election-page.tsx
- 5.1 Shared Core (`packages/core/src/`)
- push-delivery.ts
- main.tsx
- src/index.ts
- web-admin/package.json
- election-api.ts
- Schedule & Ministry Assignment Management
- Church Member Management
- exceljs
- server/reception.ts
- Bầu cử / Election module
- Architecture and integration guide
- election-team-export-data.ts
- mobile-client/package.json
- Hội Thánh PWA and device notifications
- personnel-missions.ts
- Button
- compilerOptions
- vercel.json
- department-board.ts
- README.md
- Authentication and access control
- use-workspace-route.ts
- server/department-members.ts
- Worship programs: automatic email updates and phone-ready Viber drafts
- client-router.ts
- auth-session.tsx
- departments/route.ts
- @prisma/composer
- web-admin/tsconfig.json
- Calendar, event email and Word export
- Supporting documentation
- dependencies
- ticket-card.tsx
- public-election.ts
- scripts
- Local believer workbook fixture
- local-data.ts
- Persistent login
- dependencies
- overrides
- ui-interactions.test.ts
- Local development
- worship-review-page.tsx
- db.ts
- election-page.tsx
- demo.ts
- catalog.ts
- connection-check.ts
- mobile-client/tsconfig.json
- Church calendar, email groups, delivery and Word export
- Member-facing features
- scripts
- ref_node_path
- use-public-election.ts
- displayCalendarDate
- audit-log-list.tsx
- server/schedules.ts
- core/tsconfig.json
- ui/tsconfig.json
- nodemailer
- election-geocoding.ts
- api-client.ts
- candidate-selection.tsx
- public/sw.js
- local-database.ts
- public/pwa/sw.js
- core/pwa/sw.js
- audit
- AGENTS.md
- Production loading performance
- members.ts
- sync-production-to-local.mjs
- migrate-local-database.mjs
- collect
- Schedule & Ministry Assignment Management
- createWorshipViberDraftLink
- Authentication and persistent sessions
- worship-directory.ts
- src/department-members.ts
- database-performance.md
- argon2
- directory.ts
- member-read-sync.md
- docx
- member-table.tsx
- lucide-react@^0.468.0
- next-themes@^0.4.6
- @org/ui@*
- pdfkit
- qrcode@^1.5.4
- react-dom@^19.2.0
- recharts@^3.3.0
- zod@^4.0.0
- zustand@^5.0.0

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
- `Registration troubleshooting` --references--> `subscribe()`  [INFERRED]
  docs/pwa.md → apps/mobile-client/src/client-router.ts
- `Setup` --references--> `admin()`  [INFERRED]
  docs/election.md → apps/web-admin/lib/server/roles.ts
- `Roles, permissions, and privacy` --references--> `admin()`  [INFERRED]
  README.md → apps/web-admin/lib/server/roles.ts
- `Filter navigation and age contract` --references--> `getAge()`  [INFERRED]
  docs/architecture.md → packages/core/src/age.ts

## Import Cycles
- None detected.

## Communities (150 total, 25 thin omitted)

### Community 0 - "department-members.tsx"
Cohesion: 0.12
Nodes (21): AnimatedSheetContent(), BoardYears(), ChangeDepartmentStatusDialog(), DepartmentMemberCards(), DepartmentMembersToolbar(), DepartmentMembers(), MoveDepartmentMembersDialog(), RemoveDepartmentMembersDialog() (+13 more)

### Community 1 - "use-ticket-entry.ts"
Cohesion: 0.44
Nodes (8): saveLocalTicket(), CommandPlan, entryFilter(), filterEntryCandidates(), planEntryCommand(), errorMessage(), useTicketEntry(), ElectionTicketKind

### Community 2 - "local-election.ts"
Cohesion: 0.18
Nodes (20): ElectionSync(), Action, append(), completed(), db(), digest(), localMeta(), LocalTicket (+12 more)

### Community 3 - "election-admin-page.tsx"
Cohesion: 0.16
Nodes (16): CandidateManager(), decorate(), post(), Row, CountedBallotsCard(), download(), ElectionAdminPage(), ElectionResults() (+8 more)

### Community 4 - "schedule-manager.tsx"
Cohesion: 0.12
Nodes (24): AutoLoadMore(), dateFormat, labels, Notice, notificationDate(), Notifications(), pushRegistrationError(), DeviceSettings() (+16 more)

### Community 5 - "index.tsx"
Cohesion: 0.06
Nodes (53): 5.4 UI Package (`packages/ui/src/`), ApplicationSettings(), SettingsDestination, SettingsLink(), settingsPages, DepartmentMenu(), PublicLocationCard(), ElectionOtp (+45 more)

### Community 6 - "worship-information.ts"
Cohesion: 0.14
Nodes (24): Context, GET(), POST(), runtime, POST(), runtime, POST(), runtime (+16 more)

### Community 7 - "server/elections.ts"
Cohesion: 0.15
Nodes (31): localTicket, reconcileElectionBackup(), electionBallotsSql, candidateList(), candidateSnapshot(), rowSchema, saveCandidateList(), electionReport() (+23 more)

### Community 8 - "renderScheduleDocument"
Cohesion: 0.16
Nodes (32): saveQuarterlyImage(), dutyText(), ErrorCell(), PlainCellInput(), QuarterlyWorkTable(), cell(), useKeyboardScrollSpace(), blur() (+24 more)

### Community 9 - "server/calendar.ts"
Cohesion: 0.06
Nodes (52): DELETE(), runtime, POST(), runtime, Context, DELETE(), GET(), PATCH() (+44 more)

### Community 10 - "roles.ts"
Cohesion: 0.06
Nodes (47): 6. Authentication & Permissions, GET(), runtime, PUT(), runtime, GET(), POST(), runtime (+39 more)

### Community 11 - "src/member-sync.ts"
Cohesion: 0.15
Nodes (17): adminKinds, CachedPage, CachedRow, detailKinds, listKinds, memberKinds, removeMemberReads(), Cursor (+9 more)

### Community 12 - "src/quarterly-work.ts"
Cohesion: 0.11
Nodes (46): POST(), runtime, POST(), runtime, checkQuarterlyWork(), quarterlyDirectoryMembers(), quarterlyReceptionUnavailableDays(), quarterlyRosterMembers() (+38 more)

### Community 13 - "ref_zod"
Cohesion: 0.14
Nodes (33): Context, GET, handler(), POST, runtime, JoinInput, joinPublicElection(), publicElectionAction() (+25 more)

### Community 14 - "Church Management Platform — Agent Documentation"
Cohesion: 0.13
Nodes (14): 10. Adding a New API Endpoint (Web Admin), 11. Adding a New Database Migration, 12. Typecheck & Lint, 13. Environment Variables, 14. Deployment (Vercel), 15. Graphify (Knowledge Graph), 16. Common Conventions / Gotchas, 1. Project Overview (+6 more)

### Community 15 - "5.3 Web Admin (`apps/web-admin/`)"
Cohesion: 0.10
Nodes (34): 5.3 Web Admin (`apps/web-admin/`), 5. Key Source Files by Domain, POST(), runtime, Context, GET(), POST(), runtime (+26 more)

### Community 16 - "devDependencies"
Cohesion: 0.10
Nodes (19): devDependencies, esbuild@^0.28.2, sharp@^0.35.5, tailwindcss@^4.1.0, @tailwindcss/vite@^4.1.0, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/jsdom@^30.0.0 (+11 more)

### Community 17 - "parser.ts"
Cohesion: 0.19
Nodes (17): composeWorshipInformationRequest(), DuplicateWorshipHymn, findDuplicateWorshipHymns(), HymnOccurrence, getMissingWorshipProgramFields(), hasWorshipValue(), keys, labelMap (+9 more)

### Community 18 - "src/calendar.ts"
Cohesion: 0.10
Nodes (19): GET(), runtime, exportCalendarPreview(), BulkEmailInput, CalendarDelivery, calendarExportPreview(), calendarExportText(), calendarPermissions (+11 more)

### Community 19 - "src/reception.ts"
Cohesion: 0.15
Nodes (26): ReceptionWorkloadSummary(), addReceptionExtraService(), cleanReceptionLine(), compareReceptionNames(), eligible(), formatReceptionName(), RECEPTION_ELIGIBILITY_LABELS, RECEPTION_REQUIREMENTS (+18 more)

### Community 20 - "useAuth"
Cohesion: 0.09
Nodes (38): ConnectionIssue(), ListLoading(), ClientError(), roleLabels, statusLabels, MemberDetail(), DirectoryCards(), DirectoryLoading() (+30 more)

### Community 21 - "location-settings-form.tsx"
Cohesion: 0.19
Nodes (12): fromConfig(), LocationSettingsForm(), PublicLocationSettings, PublicSessionConfig, VenueAddressSearch(), VenuePreview(), VenueRadius(), validVenueCoordinates() (+4 more)

### Community 22 - "merge-members.ts"
Cohesion: 0.29
Nodes (10): authorize(), blank(), fields, Ids, labels, MergeInput, mergeMembers(), MergePreviewInput (+2 more)

### Community 24 - "scrutineer-page.tsx"
Cohesion: 0.25
Nodes (13): downloadElectionFile(), exportElectionBackup(), AssignedResponse, ScrutineerPage(), printTeamMinutes(), ScrutineerExportKind, ScrutineerHeader(), ScrutineerNavigation() (+5 more)

### Community 25 - "server/event-responsibility.ts"
Cohesion: 0.13
Nodes (16): POST(), runtime, CalendarCreateContext, persistNewCalendarEvent(), eventResponsiblePeople(), previewEventResponsibilities(), saveEventResponsibilities(), queueAutomaticWorshipViberDraft() (+8 more)

### Community 26 - "calendar-toolbar.tsx"
Cohesion: 0.42
Nodes (7): CalendarToolbar(), CalendarToolbarProps, useWorshipContributions(), WorshipContributions(), WorshipContributionsBadge(), worshipContributionsKey, hasScheduleCreation()

### Community 27 - "check-responsive-ui.mts"
Cohesion: 0.22
Nodes (14): cdp(), check(), click(), clickText(), delay(), departments, evaluate(), fixture (+6 more)

### Community 28 - "ui/package.json"
Cohesion: 0.10
Nodes (24): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, cmdk@^1.1.1, lucide-react@^0.468.0, radix-ui@^1.4.0, react@^19.2.0, react-dom@^19.2.0 (+16 more)

### Community 29 - "with"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, if, runs-on, steps, jobs, deploy (+15 more)

### Community 30 - "role-assign-dialog.tsx"
Cohesion: 0.11
Nodes (14): AssignRoleEntry, AssignTarget, Department, Field(), RoleAssignDialog(), RoleAssignForm(), Data, Permission (+6 more)

### Community 31 - "Input"
Cohesion: 0.08
Nodes (47): CalendarReviewPage(), DateInput(), formatDate(), AreaPicker(), DepartmentChoices(), LocationPicker(), Option, ProfileChoiceList() (+39 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, b, calendar:deliver, d, db:bootstrap, db:import, db:local:setup, db:local:start (+15 more)

### Community 33 - "login-form.tsx"
Cohesion: 0.31
Nodes (10): AuthFrame(), dismissKeyboard(), ClientAuthGate(), LoginForm(), LoginPage(), PageLoading(), PasswordSetupForm(), PasswordSetupPage() (+2 more)

### Community 34 - "failure"
Cohesion: 0.08
Nodes (49): GET(), runtime, Context, GET(), PATCH(), PUT(), runtime, GET() (+41 more)

### Community 35 - "HttpError"
Cohesion: 0.18
Nodes (14): POST(), runtime, createFollowupElection(), grantScrutineerRole(), manageElectionScrutineers(), readRoster(), HttpError, boardDepartments() (+6 more)

### Community 36 - "schedule-editor.tsx"
Cohesion: 0.08
Nodes (41): sendEmail(), submit(), draftKey(), ScheduleEditor(), download(), leaveEditor(), requestAction(), update() (+33 more)

### Community 37 - "assertOrigin"
Cohesion: 0.09
Nodes (32): POST(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+24 more)

### Community 39 - "navigateClient"
Cohesion: 0.24
Nodes (17): 3. Monorepo Conventions, currentClientPath(), goBackClient(), isNativeHistoryNavigation(), navigateClient(), useClientRoute(), canonicalize(), onClick() (+9 more)

### Community 40 - "worship-contributions.ts"
Cohesion: 0.12
Nodes (15): GET(), POST(), runtime, POST(), runtime, metadata, viewport, sendSavedCalendarEvent() (+7 more)

### Community 41 - "schemas.ts"
Cohesion: 0.15
Nodes (12): EventDateSchema, localToday(), MemberDetailInput, MembershipSchema, NoteVisibilitySchema, Organization, OrganizationSchema, Role (+4 more)

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
Cohesion: 0.17
Nodes (17): assignmentResponsibilityLabel(), churchDay(), DayResponsibilities(), programTitle(), receptionSession(), responsibilityText(), sessionOrder(), Assignment (+9 more)

### Community 46 - "ticket-entry.tsx"
Cohesion: 0.26
Nodes (10): BallotActions(), BallotPreview(), CandidateResults(), commands, EntryInstructions(), EntrySearch(), entryPanel, entryPrimary (+2 more)

### Community 47 - "query-persistence.ts"
Cohesion: 0.20
Nodes (13): AuthBootstrap, startTiming(), allowed(), allowedRoots, database(), DurableRead, durableWrites, READ_CACHE_MAX_AGE (+5 more)

### Community 48 - "import-believers.py"
Cohesion: 0.18
Nodes (4): main(), map_workbook(), normalize(), read_workbook()

### Community 49 - "public-election-page.tsx"
Cohesion: 0.23
Nodes (13): CheckResult, PublicConnectionCheck(), flushAllPublicConnectionReports(), descriptions, ElectionEligibilityError(), EligibilityIllustration(), Reason, SingleLineText() (+5 more)

### Community 50 - "5.1 Shared Core (`packages/core/src/`)"
Cohesion: 0.12
Nodes (30): 5.1 Shared Core (`packages/core/src/`), EventPresetSelector(), caretPosition(), mentionAt(), missingInformationContacts(), Trigger, WorshipMentionTextarea(), Event entry and parsing (+22 more)

### Community 51 - "push-delivery.ts"
Cohesion: 0.06
Nodes (72): applyPreset(), authorized(), comingWeekRange(), GET(), runtime, GET(), runtime, POST() (+64 more)

### Community 52 - "main.tsx"
Cohesion: 0.09
Nodes (17): PublicWorshipPage(), submitNew(), client, root, start(), PageErrorBoundary, Context, InstallEvent (+9 more)

### Community 53 - "src/index.ts"
Cohesion: 0.06
Nodes (50): eventColor(), eventColors, weekdayLabels, Preview, CalendarListView(), CalendarListViewProps, CalendarMonthView(), CalendarMonthViewProps (+42 more)

### Community 54 - "web-admin/package.json"
Cohesion: 0.14
Nodes (19): devDependencies, jszip@^3.10.1, tailwindcss@^4.1.0, @tailwindcss/postcss@^4.1.0, @types/nodemailer@^8.0.2, @types/pdfkit@^0.17.7, @types/pg@^8.23.1, @types/qrcode@^1.5.6 (+11 more)

### Community 55 - "election-api.ts"
Cohesion: 0.13
Nodes (18): Context, GET, handler(), POST, runtime, Context, GET, handler() (+10 more)

### Community 56 - "Schedule & Ministry Assignment Management"
Cohesion: 0.08
Nodes (26): Cancellation and deletion, Categories and configuration, Copying, Creation and editing permissions, Database and API knowledge base, Department-sourced reception verification — 9 November 2026, Editable reception table text — 9 November 2026, Editing and lifecycle (+18 more)

### Community 57 - "Church Member Management"
Cohesion: 0.08
Nodes (25): Administrative features, Applications and request flow, Architecture, Authentication endpoints, Backup, archival, and handoff, Church Member Management, Contents, Database model and migrations (+17 more)

### Community 60 - "server/reception.ts"
Cohesion: 0.20
Nodes (15): update(), GET(), PUT(), runtime, POST(), runtime, previewReceptionMonth(), receptionTeam() (+7 more)

### Community 61 - "Bầu cử / Election module"
Cohesion: 0.11
Nodes (17): Bầu cử / Election module, Consolidated storage (migration 052), Election and team identity (migration 054), Keyboard entry, Limits and delivery notes, Offline storage and recovery, Run an election, Scrutineer entry interface (+9 more)

### Community 62 - "Architecture and integration guide"
Cohesion: 0.12
Nodes (17): Membership, API contract to replace the demo adapter, Architecture and integration guide, Authorization matrix, Client state and real-time, Custom mobile dropdowns and type scale, Design and deployment, Filter navigation and age contract (+9 more)

### Community 63 - "election-team-export-data.ts"
Cohesion: 0.25
Nodes (16): electionTeamExcel(), heading(), table(), ElectionTeamExport, electionTeamExportData(), teamExportDate(), teamStats(), teamTicketStatus() (+8 more)

### Community 64 - "mobile-client/package.json"
Cohesion: 0.08
Nodes (34): dependencies, @hookform/resolvers@^6.0.0, jsqr@^1.4.0, lucide-react@^0.468.0, next-themes@^0.4.6, @noble/hashes@2.4.0, @org/core@*, @org/ui@* (+26 more)

### Community 65 - "Hội Thánh PWA and device notifications"
Cohesion: 0.14
Nodes (13): APIs, Event integration, recipients and delivery recovery, Explicit local reception draft exception, Hội Thánh PWA and device notifications, Installation and device support, Local development and HTTPS, Main implementation files, Manifest, icons and public-only offline behavior (+5 more)

### Community 66 - "personnel-missions.ts"
Cohesion: 0.26
Nodes (15): Context, GET(), PUT(), runtime, authorize(), Board, BoardMember, getPersonnelMissions() (+7 more)

### Community 67 - "Button"
Cohesion: 0.09
Nodes (59): AccountCredentials(), CalendarExport(), EmailGroupsPage(), GroupDialog(), GroupForm(), EventEditor(), Failure, FailureNotifications() (+51 more)

### Community 68 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+3 more)

### Community 69 - "vercel.json"
Cohesion: 0.17
Nodes (11): crons, framework, rewrites, root, rewrites, $schema, services, mobile-client (+3 more)

### Community 70 - "department-board.ts"
Cohesion: 0.23
Nodes (15): authorize(), BoardMember, canonical(), changeDepartmentBoardMember(), currentYear(), Input, listDepartmentBoard(), persist() (+7 more)

### Community 71 - "README.md"
Cohesion: 0.26
Nodes (3): Account access, Nhân sự Hội Thánh, Admin profile merging

### Community 72 - "Authentication and access control"
Cohesion: 0.17
Nodes (12): API surface, Authentication and access control, Concurrent devices, Department bulk status and contextual profile navigation, Department detail pages and bulk membership changes, Department member management, Permission matrix, Prepared local database (+4 more)

### Community 73 - "use-workspace-route.ts"
Cohesion: 0.24
Nodes (13): 5.2 Mobile Client (`apps/mobile-client/src/`), App(), currentClientSearch(), isHistoryNavigation(), restoreNavigationScroll(), useClientSearch(), useWorkspaceRoute(), WorkspaceRoute (+5 more)

### Community 74 - "server/department-members.ts"
Cohesion: 0.23
Nodes (14): Context, DELETE, GET(), mutate(), PATCH, POST, runtime, boardExpressions() (+6 more)

### Community 75 - "Worship programs: automatic email updates and phone-ready Viber drafts"
Cohesion: 0.20
Nodes (10): Current save behavior, Device verification, Email link compatibility and alternate labels, Failure handling and retries, Opening the email on a phone, Parsing and missing information, Persistence and compatibility, Public worship contributions (+2 more)

### Community 76 - "client-router.ts"
Cohesion: 0.23
Nodes (15): historyPosition, listeners, notify(), observedPath, onPopState(), onScroll(), previousActiveTabIndex, routeScroll (+7 more)

### Community 77 - "auth-session.tsx"
Cohesion: 0.27
Nodes (12): currentAuthBootstrap(), enableApiMode(), setOfflineReadAccess(), AuthSessionProvider(), AuthState, Context, replaceDepartmentCatalog(), clearDevicePush() (+4 more)

### Community 78 - "departments/route.ts"
Cohesion: 0.18
Nodes (12): DELETE, GET(), mutate(), PATCH, POST, runtime, POST(), runtime (+4 more)

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
Nodes (16): dependencies, @hookform/resolvers@^6.0.0, jose@^6.2.15, @org/core@*, pg@^8.23.1, react@^19.2.0, react-hook-form@^7.65.0, @tanstack/react-query@5.107.1 (+8 more)

### Community 84 - "ticket-card.tsx"
Cohesion: 0.27
Nodes (8): TicketStatusBadge(), ticketStatusLabel(), TicketCandidateLine(), TicketCandidates(), TicketCard(), TicketCardData, copyTicketId(), TicketNumber()

### Community 85 - "public-election.ts"
Cohesion: 0.13
Nodes (13): ElectionPoint, PUBLIC_DEFAULT_ACCURACY_METERS, PUBLIC_DEFAULT_RADIUS_METERS, PUBLIC_ELECTION_POLL_MS, PUBLIC_LOCATION_MAX_AGE_MS, PUBLIC_OTP_CARD_HEADER, PUBLIC_OTP_CARD_INSTRUCTIONS, PublicConnectionAccess (+5 more)

### Community 86 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 87 - "Local believer workbook fixture"
Cohesion: 0.33
Nodes (5): Field mapping, Local believer workbook fixture, Local-only delivery and verification, Mapping results for this file, Run locally

### Community 88 - "local-data.ts"
Cohesion: 0.20
Nodes (9): datasets, DatasetSchema, LocalDataset, registerLocalDataset(), SourceProfile, SourceProfileSchema, IdSchema, MemberDetailInputSchema (+1 more)

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
Cohesion: 0.10
Nodes (9): jsdom@^26.1.0, container, dom, root, expected, jsdom, path, privateExists (+1 more)

### Community 93 - "Local development"
Cohesion: 0.33
Nodes (6): Explicit legacy demo mode, Local development, Option A: create a private local PostgreSQL cluster, Option B: use an existing PostgreSQL database, Prerequisites, Run the separate Vite client

### Community 94 - "worship-review-page.tsx"
Cohesion: 0.17
Nodes (18): WorshipDraft, changes(), Edit, LocalSession, projectSession(), ReviewChange, ReviewQueue(), back() (+10 more)

### Community 95 - "db.ts"
Cohesion: 0.14
Nodes (12): GET(), runtime, GET(), runtime, calendarResponsibilities(), loadPublishedResponsibilities(), responsibilitiesForDates(), clientSchedule() (+4 more)

### Community 96 - "election-page.tsx"
Cohesion: 0.25
Nodes (15): ElectionPage, Audit(), BackupImport(), download(), ElectionPage(), errorMessage(), labelStatus(), post() (+7 more)

### Community 97 - "demo.ts"
Cohesion: 0.12
Nodes (22): audit(), key(), memory, read(), seed(), Snapshot, viewerId, write() (+14 more)

### Community 98 - "catalog.ts"
Cohesion: 0.28
Nodes (8): areas, DEPARTMENT_TYPE_LABELS, DepartmentCatalogItem, departmentKey(), departmentRanks, DepartmentType, locations, sortDepartments()

### Community 99 - "connection-check.ts"
Cohesion: 0.30
Nodes (12): PublicElectionError, publicElectionRequest(), activeChecks, checkPublicElectionConnection(), errorReason(), flushPublicConnectionReports(), key(), queue() (+4 more)

### Community 100 - "mobile-client/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 101 - "Church calendar, email groups, delivery and Word export"
Cohesion: 0.18
Nodes (11): Built-in event presets, Church calendar, email groups, delivery and Word export, Database and APIs, Delivery states and recovery, Deployment and verification, Email calendar export to Ban Trình chiếu, Email groups, Immediate delivery and optional recovery worker (+3 more)

### Community 102 - "Member-facing features"
Cohesion: 0.40
Nodes (5): Confidential history, Directory and navigation, Filters, Member-facing features, Profile details and editing

### Community 103 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 104 - "ref_node_path"
Cohesion: 0.12
Nodes (10): children, launch(), require, root, stop(), root, hash, root (+2 more)

### Community 105 - "use-public-election.ts"
Cohesion: 0.35
Nodes (10): publicErrorMessage(), key(), publicVoteRequestId(), readPublicDraft(), storePublicDraft(), currentElectionLocation(), positionInput(), initialId() (+2 more)

### Community 107 - "displayCalendarDate"
Cohesion: 0.11
Nodes (37): CalendarMonthPreview(), QuarterlyCellChange, ReceptionCellTextarea(), saveReceptionImage(), ReceptionTable(), content(), errorCell(), saveScheduleImage() (+29 more)

### Community 108 - "audit-log-list.tsx"
Cohesion: 0.23
Nodes (14): actions, ActivityLogs(), ConnectionLogs(), SubmissionLogs(), time(), AuditSummary(), ActivityLog, AuditData (+6 more)

### Community 109 - "server/schedules.ts"
Cohesion: 0.05
Nodes (74): GET(), runtime, GET(), runtime, GET(), runtime, GET(), runtime (+66 more)

### Community 110 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 111 - "ui/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 113 - "election-geocoding.ts"
Cohesion: 0.24
Nodes (8): GET(), runtime, cache, electionGeocoding(), pending, Place, ResponseSchema, Search

### Community 114 - "api-client.ts"
Cohesion: 0.26
Nodes (12): download(), advanceAuthEpoch(), ApiError, authenticatedFetch(), clearBrowserAuth(), clearRefreshRequest(), expire(), REAUTHENTICATION_MESSAGE (+4 more)

### Community 115 - "candidate-selection.tsx"
Cohesion: 0.39
Nodes (6): PublicCandidateList(), PublicCandidateSelection(), PublicSelectionTabs(), MAX_ELECTION_SELECTIONS, matchesElectionName(), PublicElectionCandidate

### Community 116 - "public/sw.js"
Cohesion: 0.40
Nodes (4): ASSETS, destination(), SHELL_ASSETS, submit()

### Community 117 - "local-database.ts"
Cohesion: 0.28
Nodes (8): cluster, directory, envFile, exists(), log, main(), run(), socket

### Community 120 - "audit"
Cohesion: 0.13
Nodes (24): POST(), runtime, CredentialSchema, POST(), runtime, POST(), runtime, authorized() (+16 more)

### Community 122 - "Production loading performance"
Cohesion: 0.33
Nodes (5): Device cache, Lists and SQL, Production loading performance, Startup and navigation, Timing and later verification

### Community 123 - "members.ts"
Cohesion: 0.09
Nodes (43): GET(), runtime, Context, GET(), PATCH(), runtime, GET(), runtime (+35 more)

### Community 124 - "sync-production-to-local.mjs"
Cohesion: 0.32
Nodes (5): args, connection(), localEnvFile, main(), restore()

### Community 125 - "migrate-local-database.mjs"
Cohesion: 0.43
Nodes (6): args, connection(), localEnvFile, main(), restore(), runCapture()

### Community 127 - "Schedule & Ministry Assignment Management"
Cohesion: 0.40
Nodes (5): Direct reception table editing, Extra reception dates, Monthly reception assignments, Schedule & Ministry Assignment Management, Temporary reception drafts and official submission

### Community 128 - "createWorshipViberDraftLink"
Cohesion: 0.53
Nodes (5): reportLinkDiagnostics(), createWorshipViberDraftLink(), createWorshipViberRecipientLink(), encodeQueryValue(), getWorshipViberDiagnostics()

### Community 130 - "Authentication and persistent sessions"
Cohesion: 0.50
Nodes (4): Authentication and persistent sessions, Credentials and token lifecycle, Identifier-first login, Security boundaries and tradeoffs

### Community 133 - "worship-directory.ts"
Cohesion: 0.33
Nodes (3): orgs, Tab, LocalWorshipPeopleInCharge

### Community 134 - "src/department-members.ts"
Cohesion: 0.50
Nodes (3): DEPARTMENT_BULK_LIMIT, DepartmentMembershipBulkInput, memberIds

### Community 135 - "database-performance.md"
Cohesion: 0.50
Nodes (3): Consolidation (migration 052), Local database performance review, Retired tables

### Community 137 - "directory.ts"
Cohesion: 0.14
Nodes (17): AgeBound, AgeRangeSchema, localDateFormatter, AccessRoleSchema, demo, all(), CompactMembersPage, describeDepartments() (+9 more)

### Community 140 - "member-table.tsx"
Cohesion: 0.05
Nodes (68): downloadCsv(), formatCsv(), Page, useDepartmentRoster(), FilterChip, FilterChips(), memberFilterChips(), ListControls() (+60 more)

## Knowledge Gaps
- **5 isolated node(s):** `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 772 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Church Member Management` connect `Church Member Management` to `Authentication and persistent sessions`, `Member-facing features`, `README.md`, `Calendar, event email and Word export`, `Supporting documentation`, `main.tsx`, `Local development`, `Architecture and integration guide`, `Schedule & Ministry Assignment Management`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Button()` (e.g. with `5.4 UI Package (`packages/ui/src/`)` and `primitiveCases()`) actually correct?**
  _`Button()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `department-members.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12298387096774194 - nodes in this community are weakly interconnected._
- **Why does `HttpError` connect `HttpError` to `worship-information.ts`, `server/elections.ts`, `renderScheduleDocument`, `server/calendar.ts`, `roles.ts`, `src/quarterly-work.ts`, `ref_zod`, `5.3 Web Admin (`apps/web-admin/`)`, `src/calendar.ts`, `merge-members.ts`, `server/event-responsibility.ts`, `failure`, `assertOrigin`, `worship-contributions.ts`, `server/session.ts`, `push-delivery.ts`, `election-api.ts`, `server/reception.ts`, `election-team-export-data.ts`, `personnel-missions.ts`, `department-board.ts`, `server/department-members.ts`, `departments/route.ts`, `db.ts`, `server/schedules.ts`, `election-geocoding.ts`, `audit`, `members.ts`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `apiRequest()` (e.g. with `3. Monorepo Conventions` and `5.1 Shared Core (`packages/core/src/`)`) actually correct?**
  _`apiRequest()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `schedule-manager.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11612903225806452 - nodes in this community are weakly interconnected._