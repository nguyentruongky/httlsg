# Graph Report - church-management  (2026-11-28)

## Corpus Check
- 709 files · ~300,763 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .webmanifest 3, .css 3, (none) 2)

## Summary
- 3468 nodes · 12023 edges · 162 communities (148 shown, 14 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 266 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `14956b05`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- worship-information.ts
- http.ts
- Button
- src/reception.ts
- schedule-editor.tsx
- Bầu cử / Election module
- ref_react
- election-api.ts
- client.ts
- state.ts
- HttpError
- schedule-export.ts
- src/quarterly-work.ts
- connection-check.ts
- Church Management Platform — Agent Documentation
- HttpError
- devDependencies
- use-elections.ts
- calendar/event-editor.tsx
- json
- actions.ts
- directory.ts
- Input
- scheduleApi
- login-form.tsx
- event-service.ts
- ReviewQueue
- public-election-page.tsx
- ui/package.json
- with
- location-settings-form.tsx
- Card
- scripts
- ref_zod
- Public election voting
- Architecture and integration guide
- Button
- ref_node_path
- rules.ts
- client-router.ts
- worship-contributions.ts
- navigateClient
- package.json
- core/package.json
- persistent-session.ts
- phone-calendar.ts
- member-detail.tsx
- use-member-detail.ts
- import-believers.py
- parser.ts
- department-board.ts
- next
- push-subscriptions.ts
- domain/types.ts
- web-admin/package.json
- worship-mention-textarea.tsx
- Schedule & Ministry Assignment Management
- Church Member Management
- election-team-export-data.ts
- server/reception.ts
- ticket-card.tsx
- visit-history.tsx
- public-election.ts
- mobile-client/package.json
- Hội Thánh PWA and device notifications
- personnel-missions-dialog.tsx
- header
- compilerOptions
- vercel.json
- ui-interactions.test.ts
- README.md
- Authentication and access control
- use-ticket-entry.ts
- Architecture and code organization
- Worship programs: automatic email updates and phone-ready Viber drafts
- choir-memberships.ts
- displayCalendarDate
- src/member-sync.ts
- @prisma/composer
- web-admin/tsconfig.json
- Calendar, event email and Word export
- Supporting documentation
- web-admin/package.json
- calendar-responsibilities.ts
- 5.1 Shared Core (`packages/core/src/`)
- scripts
- Local believer workbook fixture
- src/index.ts
- main.tsx
- dependencies
- overrides
- election-results-metrics.tsx
- canCalendar
- route-modules.tsx
- election-page.tsx
- admin.ts
- src/schedules.ts
- catalog.ts
- mobile-client/tsconfig.json
- worship-viber-draft-page.tsx
- local-database.ts
- scripts
- check-responsive-ui.mts
- AuthEventStream
- Notification center
- use-workspace-route.ts
- server/schedules.ts
- core/tsconfig.json
- ui/tsconfig.json
- index.tsx
- ElectionCandidate
- components/index.ts
- Persistent login
- public/sw.js
- copySchedule
- public/pwa/sw.js
- core/pwa/sw.js
- Church calendar, email groups, delivery and Word export
- AGENTS.md
- query-persistence.ts
- election-team-excel.ts
- Editable reception table text — 9 November 2026
- Local development
- calendarApi
- Schedule & Ministry Assignment Management
- ElectionPageRoundContent.tsx
- isWorshipProgramText
- Pages and API reference
- queries.ts
- database-performance.md
- election-geocoding.ts
- personnel-missions.ts
- member-read-sync.md
- calendar-page.tsx
- server/schedules.ts
- Production loading performance
- addCalendarDays
- ref_node_fs
- restorePersistedReads
- src/department-members.ts
- Scrutineer export menu
- member-filters.tsx
- sync-production-to-local.mjs
- Member-facing features
- useKeyboardScrollSpace
- public/elections/[[...path]]/route.ts
- Authentication and persistent sessions
- schedules/route.ts
- Administrative features
- Backup, archival, and handoff
- SKILL.md
- age.ts
- all
- Membership
- export-orders.ts
- search.ts
- collect

## God Nodes (most connected - your core abstractions)
1. `Button()` - 239 edges
2. `HttpError` - 225 edges
3. `apiRequest()` - 169 edges
4. `failure()` - 125 edges
5. `json()` - 114 edges
6. `withActor()` - 113 edges
7. `useAuth()` - 111 edges
8. `Dialog()` - 98 edges
9. `ErrorMessage()` - 91 edges
10. `cn()` - 82 edges

## Surprising Connections (you probably didn't know these)
- `8. Calendar Contribution Review Workflow` --references--> `CalendarReviewPage()`  [INFERRED]
  AGENTS.md → apps/mobile-client/src/calendar/calendar-review-page.tsx
- `Patterns used here` --references--> `db()`  [INFERRED]
  docs/architecture.md → apps/mobile-client/src/elections/local-election.ts
- `Application services: one named use case` --references--> `db()`  [INFERRED]
  docs/backend-development.md → apps/mobile-client/src/elections/local-election.ts
- `API` --references--> `Summary`  [INFERRED]
  docs/election.md → apps/mobile-client/src/schedules/schedule-manager.tsx
- `Follow an event save` --references--> `calendarApi()`  [INFERRED]
  docs/architecture.md → apps/web-admin/lib/server/calendar-api.ts

## Import Cycles
- None detected.

## Communities (162 total, 14 thin omitted)

### Community 0 - "worship-information.ts"
Cohesion: 0.10
Nodes (33): Context, GET(), POST(), runtime, POST(), runtime, POST(), runtime (+25 more)

### Community 1 - "http.ts"
Cohesion: 0.06
Nodes (69): GET(), runtime, POST(), runtime, POST(), runtime, GET(), POST() (+61 more)

### Community 2 - "Button"
Cohesion: 0.06
Nodes (41): AnimatedSheetContent(), BoardYear, BoardYears(), ChangeDepartmentStatusDialog(), DepartmentMemberCards(), DepartmentMembersToolbar(), DepartmentMembers(), RemoveDepartmentMembersDialog() (+33 more)

### Community 3 - "src/reception.ts"
Cohesion: 0.15
Nodes (26): cleanReceptionLine(), compareReceptionNames(), eligible(), formatReceptionName(), generateReceptionSchedule(), RECEPTION_EXCLUDED_MEMBER_IDS, RECEPTION_REQUIREMENTS, receptionCellText() (+18 more)

### Community 4 - "schedule-editor.tsx"
Cohesion: 0.17
Nodes (22): draftKey(), ScheduleEditor(), download(), leaveEditor(), requestAction(), update(), ScheduleMenu(), ScheduleMenuAction (+14 more)

### Community 5 - "Bầu cử / Election module"
Cohesion: 0.17
Nodes (10): Bầu cử / Election module, Consolidated storage (migration 052), Election and team identity (migration 054), Keyboard entry, Limits and delivery notes, Offline storage and recovery, Run an election, Scrutineer entry interface (+2 more)

### Community 6 - "ref_react"
Cohesion: 0.10
Nodes (28): Notifications, AutoLoadMore(), ConnectionIssue(), AuditProps, Run, ListLoading(), dateFormat, labels (+20 more)

### Community 7 - "election-api.ts"
Cohesion: 0.12
Nodes (17): Context, GET, handler(), POST, PUT, runtime, Context, GET (+9 more)

### Community 8 - "client.ts"
Cohesion: 0.07
Nodes (37): castVote(), createElection(), downloadResults(), exportElectionBackup(), fetchCandidates(), fetchElection(), fetchElectionActivity(), fetchElections() (+29 more)

### Community 10 - "HttpError"
Cohesion: 0.07
Nodes (58): MainContentProps, DB, shared, localTicket, reconcileElectionBackup(), electionBallotsSql, addSingleCandidate(), candidateList() (+50 more)

### Community 11 - "schedule-export.ts"
Cohesion: 0.15
Nodes (33): saveQuarterlyImage(), dutyText(), ErrorCell(), PlainCellInput(), QuarterlyWorkTable(), cell(), saveScheduleImage(), QUARTERLY_WORD_COLUMNS (+25 more)

### Community 12 - "src/quarterly-work.ts"
Cohesion: 0.14
Nodes (40): checkQuarterlyWork(), quarterlyDirectoryMembers(), quarterlyReceptionUnavailableDays(), quarterlyRosterMembers(), receptionTextMembers(), resolveQuarterlyText(), scheduledPeople(), validateQuarterlyConflicts() (+32 more)

### Community 13 - "connection-check.ts"
Cohesion: 0.17
Nodes (24): performPublicElectionRequest(), PublicElectionError, publicElectionRequest(), publicErrorMessage(), activeChecks, checkPublicElectionConnection(), errorReason(), flushAllPublicConnectionReports() (+16 more)

### Community 14 - "Church Management Platform — Agent Documentation"
Cohesion: 0.11
Nodes (18): 10. Adding a New API Endpoint (Web Admin), 11. Adding a New Database Migration, 12. Typecheck & Lint, 13. Environment Variables, 14. Deployment (Vercel), 15. Graphify (Knowledge Graph), 16. Common Conventions / Gotchas, 17. Implementation boundaries and patterns (+10 more)

### Community 15 - "HttpError"
Cohesion: 0.07
Nodes (55): Context, DELETE, GET(), mutate(), PATCH, POST, runtime, GET() (+47 more)

### Community 16 - "devDependencies"
Cohesion: 0.09
Nodes (19): devDependencies, esbuild@^0.28.2, sharp@^0.35.5, tailwindcss@^4.1.0, @tailwindcss/vite@^4.1.0, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/jsdom@^30.0.0 (+11 more)

### Community 17 - "use-elections.ts"
Cohesion: 0.11
Nodes (38): assignScrutineers(), configureRound(), fetchElectionAudit(), fetchOnlineTickets(), fetchRoundResults(), fetchTickets(), manualChecking(), mapAuditLogs() (+30 more)

### Community 18 - "calendar/event-editor.tsx"
Cohesion: 0.23
Nodes (13): EventEditor(), applyPreset(), EventPresetSelector(), EventResponsibilityBadges(), CalendarDate, defaultEventPreset(), EVENT_PRESETS, EventPreset (+5 more)

### Community 19 - "json"
Cohesion: 0.07
Nodes (56): GET(), runtime, GET(), runtime, Context, GET(), PATCH(), runtime (+48 more)

### Community 20 - "actions.ts"
Cohesion: 0.16
Nodes (30): JoinInput, joinPublicElection(), publicElectionAction(), publicElectionApi(), publicConnectionAccess(), publicElectionConnection(), publicBrowserCredential(), publicCredentialHash() (+22 more)

### Community 21 - "directory.ts"
Cohesion: 0.07
Nodes (51): audit(), key(), memory, read(), seed(), Snapshot, viewerId, write() (+43 more)

### Community 22 - "Input"
Cohesion: 0.11
Nodes (22): DateInput(), DropdownBox(), DropdownBoxProps, InviteDialog(), MissionSelect(), collect(), ProfileShareButton(), Leader (+14 more)

### Community 23 - "scheduleApi"
Cohesion: 0.10
Nodes (23): GET(), runtime, GET(), runtime, GET(), runtime, Context, POST() (+15 more)

### Community 24 - "login-form.tsx"
Cohesion: 0.26
Nodes (12): AuthFrame(), dismissKeyboard(), ClientAuthGate(), LoginForm(), LoginPage(), PageLoading(), PasswordSetupForm(), PasswordSetupPage() (+4 more)

### Community 25 - "event-service.ts"
Cohesion: 0.15
Nodes (26): CalendarCreateContext, persistNewCalendarEvent(), eventDto(), iso(), calendarEvent(), lockCalendarReviewEvents(), CalendarEventRow, findEventRow() (+18 more)

### Community 26 - "ReviewQueue"
Cohesion: 0.16
Nodes (19): WorshipDraft, changes(), Edit, LocalSession, projectSession(), ReviewChange, ReviewQueue(), back() (+11 more)

### Community 27 - "public-election-page.tsx"
Cohesion: 0.23
Nodes (12): CheckResult, PublicConnectionCheck(), descriptions, ElectionEligibilityError(), EligibilityIllustration(), Reason, SingleLineText(), PublicJoinCard() (+4 more)

### Community 28 - "ui/package.json"
Cohesion: 0.10
Nodes (24): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, cmdk@^1.1.1, lucide-react@^0.468.0, radix-ui@^1.4.0, react@^19.2.0, react-dom@^19.2.0 (+16 more)

### Community 29 - "with"
Cohesion: 0.08
Nodes (23): concurrency, cancel-in-progress, group, if, runs-on, steps, jobs, deploy (+15 more)

### Community 30 - "location-settings-form.tsx"
Cohesion: 0.26
Nodes (12): fromConfig(), LocationSettingsForm(), PublicLocationSettings, PublicSessionConfig, VenueAddressSearch(), VenuePreview(), VenueRadius(), validVenueCoordinates() (+4 more)

### Community 31 - "Card"
Cohesion: 0.07
Nodes (55): downloadCsv(), formatDate(), BOARD_POSITIONS, BoardPerson, fold(), AreaPicker(), DepartmentChoices(), LocationPicker() (+47 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, b, calendar:deliver, d, db:bootstrap, db:import, db:local:setup, db:local:start (+15 more)

### Community 33 - "ref_zod"
Cohesion: 0.08
Nodes (27): 6. Authentication & Permissions, canOpenBoardTeam(), canOpenLeaderTeam(), CreateAccountSchema, departmentScopedRoles, hasBoardRole(), hasHistoryManagementRole(), hasLeaderRole() (+19 more)

### Community 34 - "Public election voting"
Cohesion: 0.18
Nodes (11): API and storage, Components and shared rules, Location and integrity, Online intake and manual checking, Organizer setup, OTP attempt logging, lockout and device admission, Polling and connection-report retries, Production rollout — 25 November 2026 (+3 more)

### Community 35 - "Architecture and integration guide"
Cohesion: 0.14
Nodes (14): API contract to replace the demo adapter, Architecture and integration guide, Authorization matrix, Client state and real-time, Custom mobile dropdowns and type scale, Design and deployment, Filter navigation and age contract, Mobile member directory (+6 more)

### Community 36 - "Button"
Cohesion: 0.07
Nodes (56): Requests, contracts, and pure rules, AccountCredentials(), CalendarExport(), download(), Preview, CalendarContribution, CalendarReviewPage(), EmailGroupsPage() (+48 more)

### Community 37 - "ref_node_path"
Cohesion: 0.13
Nodes (12): children, launch(), require, root, stop(), args, connection(), localEnvFile (+4 more)

### Community 38 - "rules.ts"
Cohesion: 0.07
Nodes (13): ResultsTable(), ResultsTableProps, calculateElectionStats(), calculatePendingCount(), calculateRankings(), meetsMinimumThreshold(), searchResults(), selectByMinimumThreshold() (+5 more)

### Community 39 - "client-router.ts"
Cohesion: 0.13
Nodes (29): currentClientSearch(), goBackClient(), historyPosition, isHistoryNavigation(), isNativeHistoryNavigation(), listeners, notify(), observedPath (+21 more)

### Community 40 - "worship-contributions.ts"
Cohesion: 0.09
Nodes (40): authorized(), comingWeekRange(), GET(), runtime, pool(), setting(), decryptSubscription(), encryptSubscription() (+32 more)

### Community 41 - "navigateClient"
Cohesion: 0.21
Nodes (15): 3. Monorepo Conventions, currentClientPath(), navigateClient(), useClientRoute(), canonicalize(), onClick(), prefetch(), preloadRoute() (+7 more)

### Community 42 - "package.json"
Cohesion: 0.15
Nodes (18): devDependencies, prettier@^3.9.10, sharp@^0.35.5, tsx@^4.20.0, @types/node@^22.0.0, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.9.0 (+10 more)

### Community 43 - "core/package.json"
Cohesion: 0.13
Nodes (18): dependencies, react@^19.2.0, @tanstack/react-query@5.107.1, @tanstack/react-query-persist-client@^5.107.1, zod@^4.0.0, zustand@^5.0.0, exports, react (+10 more)

### Community 44 - "persistent-session.ts"
Cohesion: 0.08
Nodes (51): POST(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+43 more)

### Community 45 - "phone-calendar.ts"
Cohesion: 0.16
Nodes (18): assignmentResponsibilityLabel(), churchDay(), DayResponsibilities(), programTitle(), receptionSession(), responsibilityText(), sessionOrder(), Assignment (+10 more)

### Community 46 - "member-detail.tsx"
Cohesion: 0.15
Nodes (20): ClientError(), roleLabels, statusLabels, MemberDetail(), DirectoryCards(), DirectoryLoading(), DirectoryPagination(), DirectoryResults() (+12 more)

### Community 47 - "use-member-detail.ts"
Cohesion: 0.28
Nodes (14): memberShortcutKey(), MemberShortcuts, MemberShortcutScope, memory, parseMemberShortcuts(), readShortcutSnapshot(), recordMemberView(), subscribeMemberShortcuts() (+6 more)

### Community 48 - "import-believers.py"
Cohesion: 0.18
Nodes (4): main(), map_workbook(), normalize(), read_workbook()

### Community 49 - "parser.ts"
Cohesion: 0.22
Nodes (14): DuplicateWorshipHymn, HymnOccurrence, getMissingWorshipProgramFields(), keys, labelMap, normalize(), parseWorshipProgram(), worshipFieldForLabel() (+6 more)

### Community 50 - "department-board.ts"
Cohesion: 0.20
Nodes (18): Context, GET(), PATCH(), PUT(), runtime, authorize(), BoardMember, canonical() (+10 more)

### Community 51 - "next"
Cohesion: 0.18
Nodes (5): metadata, viewport, config, next@^16.0.0, next

### Community 52 - "push-subscriptions.ts"
Cohesion: 0.18
Nodes (16): GET(), runtime, POST(), runtime, POST(), runtime, POST(), runtime (+8 more)

### Community 53 - "domain/types.ts"
Cohesion: 0.10
Nodes (22): TicketCardProps, TicketsListProps, canUserAccessElection(), canUserAdminElection(), CastVoteInput, ConfigureRoundInput, ElectionAuditLog, ElectionBackup (+14 more)

### Community 54 - "web-admin/package.json"
Cohesion: 0.12
Nodes (17): devDependencies, jszip@^3.10.1, tailwindcss@^4.1.0, @tailwindcss/postcss@^4.1.0, @types/nodemailer@^8.0.2, @types/pdfkit@^0.17.7, @types/pg@^8.23.1, @types/qrcode@^1.5.6 (+9 more)

### Community 55 - "worship-mention-textarea.tsx"
Cohesion: 0.30
Nodes (13): caretPosition(), mentionAt(), missingInformationContacts(), Trigger, WorshipMentionTextarea(), hasWorshipValue(), detectWorshipWorkerCategories(), normalizeWorshipWorkerText() (+5 more)

### Community 56 - "Schedule & Ministry Assignment Management"
Cohesion: 0.10
Nodes (21): Cancellation and deletion, Categories and configuration, Copying, Creation and editing permissions, Database and API knowledge base, Department-sourced reception verification — 9 November 2026, Editing and lifecycle, Entry points (+13 more)

### Community 57 - "Church Member Management"
Cohesion: 0.13
Nodes (15): Applications and request flow, Architecture, Church Member Management, Contents, Database model and migrations, Development commands and verification, Environment configuration, Importing local test data (+7 more)

### Community 58 - "election-team-export-data.ts"
Cohesion: 0.32
Nodes (11): ElectionTeamExport, teamStats(), teamMinutes(), electionTeamPrint(), escape(), electionTeamWord(), p(), signatures() (+3 more)

### Community 60 - "server/reception.ts"
Cohesion: 0.27
Nodes (12): GET(), PUT(), runtime, POST(), runtime, previewReceptionMonth(), receptionTeam(), saveReceptionTeam() (+4 more)

### Community 61 - "ticket-card.tsx"
Cohesion: 0.38
Nodes (5): TicketCandidateLine(), TicketCandidates(), TicketCardData, copyTicketId(), TicketNumber()

### Community 62 - "visit-history.tsx"
Cohesion: 0.38
Nodes (9): DeleteHistoryEntry(), formatVisitDate(), HistoryEntryForm(), MemberNotes(), useMemberHistory(), VisitHistory(), canManageMemberHistory(), canReadMemberHistory() (+1 more)

### Community 63 - "public-election.ts"
Cohesion: 0.11
Nodes (19): PublicCandidateList(), PublicCandidateSelection(), PublicSelectionTabs(), MAX_ELECTION_SELECTIONS, ElectionPoint, matchesElectionName(), PUBLIC_DEFAULT_ACCURACY_METERS, PUBLIC_DEFAULT_RADIUS_METERS (+11 more)

### Community 64 - "mobile-client/package.json"
Cohesion: 0.08
Nodes (34): dependencies, @hookform/resolvers@^6.0.0, jsqr@^1.4.0, lucide-react@^0.468.0, next-themes@^0.4.6, @noble/hashes@2.4.0, @org/core@*, @org/ui@* (+26 more)

### Community 65 - "Hội Thánh PWA and device notifications"
Cohesion: 0.14
Nodes (13): APIs, Calendar changes for admins, Event integration, recipients and delivery recovery, Explicit local reception draft exception, Hội Thánh PWA and device notifications, Installation and device support, Local development and HTTPS, Main implementation files (+5 more)

### Community 66 - "personnel-missions-dialog.tsx"
Cohesion: 0.12
Nodes (24): formatCsv(), MemberUpdateResult, getPersonnelMissions(), savePersonnelMissions(), personnelCollator, personnelCsv(), sortPersonnelDepartments(), DraftMission (+16 more)

### Community 67 - "header"
Cohesion: 0.24
Nodes (9): GET(), runtime, GET(), runtime, getAssignedSchedule(), getNotifiedSchedule(), header(), hydrate() (+1 more)

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
Cohesion: 0.20
Nodes (4): Calendar server feature, Account access, Nhân sự Hội Thánh, Admin profile merging

### Community 72 - "Authentication and access control"
Cohesion: 0.17
Nodes (12): API surface, Authentication and access control, Concurrent devices, Department bulk status and contextual profile navigation, Department detail pages and bulk membership changes, Department member management, Permission matrix, Prepared local database (+4 more)

### Community 73 - "use-ticket-entry.ts"
Cohesion: 0.08
Nodes (35): actions, ActivityLogs(), ConnectionLogs(), phaseLabel(), SubmissionLogs(), time(), AuditSummary(), ActivityLog (+27 more)

### Community 74 - "Architecture and code organization"
Cohesion: 0.15
Nodes (12): ElectionResultsTabs(), ElectionResultsTabsProps, Architecture and code organization, Calendar module map, Follow an event save, Frontend boundaries, Further restructuring, Making your first change (+4 more)

### Community 75 - "Worship programs: automatic email updates and phone-ready Viber drafts"
Cohesion: 0.18
Nodes (11): Current save behavior, Device verification, Email link compatibility and alternate labels, Failure handling and retries, Opening the email on a phone, Parsing and missing information, People-in-charge detection, Persistence and compatibility (+3 more)

### Community 76 - "choir-memberships.ts"
Cohesion: 0.10
Nodes (28): POST(), runtime, DELETE, GET(), mutate(), PATCH, POST, runtime (+20 more)

### Community 77 - "displayCalendarDate"
Cohesion: 0.17
Nodes (22): QuarterlyCellChange, ReceptionCellTextarea(), saveReceptionImage(), ReceptionTable(), content(), errorCell(), ReceptionCellChange, ScheduleTable() (+14 more)

### Community 78 - "src/member-sync.ts"
Cohesion: 0.14
Nodes (19): persist(), adminKinds, CachedPage, CachedRow, detailKinds, listKinds, memberKinds, removeMemberReads() (+11 more)

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

### Community 83 - "web-admin/package.json"
Cohesion: 0.07
Nodes (42): dependencies, argon2@^0.45.2, @hookform/resolvers@^6.0.0, jose@^6.2.15, lucide-react@^0.468.0, next-themes@^0.4.6, nodemailer@^10.3.1, @org/core@* (+34 more)

### Community 84 - "calendar-responsibilities.ts"
Cohesion: 0.26
Nodes (9): GET(), runtime, GET(), runtime, calendarResponsibilities(), loadPublishedResponsibilities(), responsibilitiesForDates(), clientSchedule() (+1 more)

### Community 85 - "5.1 Shared Core (`packages/core/src/`)"
Cohesion: 0.26
Nodes (11): 5.1 Shared Core (`packages/core/src/`), Event entry and parsing, clock(), formatEventText(), isValidEventTime(), ParsedEventText, parseEventText(), parseEventTime() (+3 more)

### Community 86 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 87 - "Local believer workbook fixture"
Cohesion: 0.33
Nodes (5): Field mapping, Local believer workbook fixture, Local-only delivery and verification, Mapping results for this file, Run locally

### Community 88 - "src/index.ts"
Cohesion: 0.21
Nodes (18): advanceAuthEpoch(), clearBrowserAuth(), clearRefreshRequest(), currentAuthBootstrap(), enableApiMode(), expire(), REAUTHENTICATION_MESSAGE, refreshRequestId() (+10 more)

### Community 89 - "main.tsx"
Cohesion: 0.10
Nodes (16): client, root, start(), deferred(), Component(), PageErrorBoundary, Context, InstallEvent (+8 more)

### Community 90 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, effect@4.0.5, @prisma/composer@0.38.0, @prisma/orm-postgres@8.0.0-rc.23, effect, @prisma/orm-postgres

### Community 91 - "overrides"
Cohesion: 0.33
Nodes (6): overrides, effect, @effect/platform-bun, @effect/platform-node, @effect/platform-node-shared, @effect/vitest

### Community 93 - "election-results-metrics.tsx"
Cohesion: 0.27
Nodes (9): MetricCard(), MetricCardProps, MetricsPanel(), MetricsPanelProps, ElectionMetricId, electionSummaryMetrics(), ElectionSummary, ElectionResultsMetrics() (+1 more)

### Community 94 - "canCalendar"
Cohesion: 0.31
Nodes (7): GET(), runtime, POST(), runtime, eventResponsiblePeople(), previewEventResponsibilities(), worshipPeopleInCharge()

### Community 95 - "route-modules.tsx"
Cohesion: 0.11
Nodes (24): Slot, DepartmentManagement(), assignmentsModule, calendarModule, departmentDetailModule, departmentsModule, directoryModule, emailGroupsModule (+16 more)

### Community 96 - "election-page.tsx"
Cohesion: 0.04
Nodes (111): Audit(), BackupImport(), BackupImportProps, errorMessage(), post(), Run, BottomNav(), ClosedStateView() (+103 more)

### Community 97 - "admin.ts"
Cohesion: 0.23
Nodes (9): POST(), runtime, POST(), runtime, AccessChangeSchema, changeAccess(), createAccount(), CHOIR_DEPARTMENT_AGE_BANDS (+1 more)

### Community 98 - "src/schedules.ts"
Cohesion: 0.11
Nodes (19): sendEmail(), PublicWorshipPage(), submit(), submitNew(), createRequestId(), copyScheduleDraft(), days(), fields (+11 more)

### Community 99 - "catalog.ts"
Cohesion: 0.31
Nodes (8): DEPARTMENT_DISPLAY_ORDER, DEPARTMENT_TYPE_LABELS, DepartmentCatalogItem, departmentKey(), departmentRanks, DepartmentType, replaceDepartmentCatalog(), sortDepartments()

### Community 100 - "mobile-client/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 101 - "worship-viber-draft-page.tsx"
Cohesion: 0.33
Nodes (8): Draft, SavedDraft(), reportLinkDiagnostics(), WorshipViberDraftPage(), createWorshipViberDraftLink(), createWorshipViberRecipientLink(), encodeQueryValue(), getWorshipViberDiagnostics()

### Community 102 - "local-database.ts"
Cohesion: 0.28
Nodes (8): cluster, directory, envFile, exists(), log, main(), run(), socket

### Community 103 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 104 - "check-responsive-ui.mts"
Cohesion: 0.22
Nodes (14): cdp(), check(), click(), clickText(), delay(), departments, evaluate(), fixture (+6 more)

### Community 107 - "Notification center"
Cohesion: 0.50
Nodes (3): Notification center, Sources and recipients, Storage and rollout

### Community 108 - "use-workspace-route.ts"
Cohesion: 0.25
Nodes (11): 5.2 Mobile Client (`apps/mobile-client/src/`), 5. Key Source Files by Domain, Calendar and navigation organization, App(), useWorkspaceRoute(), WorkspaceRoute, matchWorkspaceRoute(), resolveWorkspacePath() (+3 more)

### Community 109 - "server/schedules.ts"
Cohesion: 0.14
Nodes (20): Context, DELETE(), GET(), PUT(), runtime, Context, POST(), runtime (+12 more)

### Community 110 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 111 - "ui/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 112 - "index.tsx"
Cohesion: 0.07
Nodes (45): 5.4 UI Package (`packages/ui/src/`), ApplicationSettings(), ElectionPage, SettingsDestination, SettingsLink(), settingsPages, BottomNavProps, ElectionResultsActions() (+37 more)

### Community 113 - "ElectionCandidate"
Cohesion: 0.11
Nodes (25): BallotPreviewProps, CandidateList(), CandidateListProps, CandidateSelection(), CandidateSelectionProps, ScrutineerAssignmentProps, TicketEntryForm(), TicketEntryFormProps (+17 more)

### Community 114 - "components/index.ts"
Cohesion: 0.18
Nodes (13): ElectionHeader(), ElectionHeaderProps, ElectionSelector(), ElectionSelectorProps, ElectionCard(), ElectionCardProps, ElectionListView(), ElectionListViewProps (+5 more)

### Community 115 - "Persistent login"
Cohesion: 0.33
Nodes (6): Client example, Endpoint contract, Implementation, Limits and security rationale, Persistent login, Revocation and replay

### Community 116 - "public/sw.js"
Cohesion: 0.40
Nodes (4): ASSETS, destination(), SHELL_ASSETS, submit()

### Community 117 - "copySchedule"
Cohesion: 0.28
Nodes (7): Context, POST(), runtime, Context, POST(), runtime, copySchedule()

### Community 120 - "Church calendar, email groups, delivery and Word export"
Cohesion: 0.18
Nodes (11): Built-in event presets, Church calendar, email groups, delivery and Word export, Database and APIs, Delivery states and recovery, Deployment and verification, Email calendar export to Ban Trình chiếu, Email groups, Immediate delivery and optional recovery worker (+3 more)

### Community 122 - "query-persistence.ts"
Cohesion: 0.19
Nodes (15): usePersonnel(), useCalendarResponsibilities(), allowedRoots, durableQuery(), DurableRead, durableWrites, READ_CACHE_MAX_AGE, readCachedListPage() (+7 more)

### Community 123 - "election-team-excel.ts"
Cohesion: 0.43
Nodes (7): electionTeamExcel(), heading(), table(), teamExportDate(), teamTicketStatus(), exceljs@^4.4.0, exceljs

### Community 124 - "Editable reception table text — 9 November 2026"
Cohesion: 0.40
Nodes (5): Editable reception table text — 9 November 2026, Reception ordering, advisory checks and mobile table — 9 November 2026, Reception presentation refinement — 9 November 2026, Simplified reception workspace and workload overview — 9 November 2026, Whole-cell errors and compact person list — 9 November 2026

### Community 125 - "Local development"
Cohesion: 0.33
Nodes (6): Explicit legacy demo mode, Local development, Option A: create a private local PostgreSQL cluster, Option B: use an existing PostgreSQL database, Prerequisites, Run the separate Vite client

### Community 126 - "calendarApi"
Cohesion: 0.05
Nodes (86): 5.3 Web Admin (`apps/web-admin/`), DELETE(), runtime, POST(), runtime, Context, DELETE(), GET() (+78 more)

### Community 127 - "Schedule & Ministry Assignment Management"
Cohesion: 0.40
Nodes (5): Direct reception table editing, Extra reception dates, Monthly reception assignments, Schedule & Ministry Assignment Management, Temporary reception drafts and official submission

### Community 128 - "ElectionPageRoundContent.tsx"
Cohesion: 0.14
Nodes (15): ActionsPanel(), ActionsPanelProps, ElectionPageRoundContent(), renderEntryContent(), renderManageContent(), renderResultsContent(), renderTicketsContent(), ElectionPageRoundContentProps (+7 more)

### Community 130 - "isWorshipProgramText"
Cohesion: 0.29
Nodes (9): findDuplicateWorshipHymns(), isWorshipProgramText(), WorshipInformationPanel(), WorshipInformationPanelProps, WorshipMissingInformation(), WorshipNotificationPanel(), copy(), writeClipboard() (+1 more)

### Community 133 - "Pages and API reference"
Cohesion: 0.50
Nodes (4): Authentication endpoints, Main pages, Member and management endpoints, Pages and API reference

### Community 134 - "queries.ts"
Cohesion: 0.26
Nodes (10): isApiMode(), demo, listDirectory(), listMembersCompact(), compareNamesByLastWord(), emptyDirectoryQuery, organizationActivityKey(), organizationMembersKey() (+2 more)

### Community 135 - "database-performance.md"
Cohesion: 0.50
Nodes (3): Consolidation (migration 052), Local database performance review, Retired tables

### Community 136 - "election-geocoding.ts"
Cohesion: 0.24
Nodes (8): GET(), runtime, cache, electionGeocoding(), pending, Place, ResponseSchema, Search

### Community 137 - "personnel-missions.ts"
Cohesion: 0.22
Nodes (16): Context, GET(), PUT(), runtime, LEGACY_BOARD, MEMBERSHIP_TITLE, Board, BoardMember (+8 more)

### Community 139 - "calendar-page.tsx"
Cohesion: 0.11
Nodes (29): eventColor(), eventColors, weekdayLabels, CalendarListView(), CalendarListViewProps, CalendarMonthPreview(), CalendarMonthView(), CalendarMonthViewProps (+21 more)

### Community 140 - "server/schedules.ts"
Cohesion: 0.18
Nodes (18): GET(), PATCH(), runtime, GET(), PATCH(), runtime, administrators(), configureScheduleCategory() (+10 more)

### Community 141 - "Production loading performance"
Cohesion: 0.33
Nodes (5): Device cache, Lists and SQL, Production loading performance, Startup and navigation, Timing and later verification

### Community 142 - "addCalendarDays"
Cohesion: 0.25
Nodes (5): upcomingWorshipSunday(), addCalendarDays(), CalendarEventLane, calendarMonthWeeks(), CalendarWeekSegment

### Community 143 - "ref_node_fs"
Cohesion: 0.18
Nodes (7): path, privateExists, publicExists, hash, root, sources(), version

### Community 144 - "restorePersistedReads"
Cohesion: 0.39
Nodes (8): allowed(), clearPersistedReads(), database(), restoreDurableQueries(), restorePersistedReads(), saveOfflineIdentity(), stored(), summary()

### Community 145 - "src/department-members.ts"
Cohesion: 0.50
Nodes (3): DEPARTMENT_BULK_LIMIT, DepartmentMembershipBulkInput, memberIds

### Community 146 - "Scrutineer export menu"
Cohesion: 0.29
Nodes (7): Assigned normal-user access, Audit polling scope, Complete polling lifecycle, Edit and delete elections, Four-stage election workflow, Results polling scope, Scrutineer export menu

### Community 147 - "member-filters.tsx"
Cohesion: 0.10
Nodes (28): CandidateManager, decorate(), post(), Row, FilterChip, FilterChips(), memberFilterChips(), DirectoryToolbar() (+20 more)

### Community 148 - "sync-production-to-local.mjs"
Cohesion: 0.38
Nodes (5): args, connection(), localEnvFile, main(), restore()

### Community 149 - "Member-facing features"
Cohesion: 0.40
Nodes (5): Confidential history, Directory and navigation, Filters, Member-facing features, Profile details and editing

### Community 150 - "useKeyboardScrollSpace"
Cohesion: 0.67
Nodes (6): useKeyboardScrollSpace(), blur(), focus(), restore(), schedule(), update()

### Community 151 - "public/elections/[[...path]]/route.ts"
Cohesion: 0.33
Nodes (5): Context, GET, handler(), POST, runtime

### Community 152 - "Authentication and persistent sessions"
Cohesion: 0.50
Nodes (4): Authentication and persistent sessions, Credentials and token lifecycle, Identifier-first login, Security boundaries and tradeoffs

### Community 153 - "schedules/route.ts"
Cohesion: 0.50
Nodes (4): GET(), POST(), runtime, listSchedules()

### Community 154 - "Administrative features"
Cohesion: 0.67
Nodes (3): Administrative features, Duplicate-profile merging, Member management

### Community 155 - "Backup, archival, and handoff"
Cohesion: 0.67
Nodes (3): Backup, archival, and handoff, What to preserve privately, What to share for code review

### Community 156 - "SKILL.md"
Cohesion: 0.50
Nodes (3): 1. Token-Saving Workflow, 2. Vite Project Conventions, 3. Mobile-First Web Standards

### Community 157 - "age.ts"
Cohesion: 0.50
Nodes (3): AgeBound, AgeRangeSchema, localDateFormatter

### Community 158 - "all"
Cohesion: 0.83
Nodes (4): all(), describeDepartments(), enrich(), importedProfile()

### Community 159 - "Membership"
Cohesion: 0.67
Nodes (3): Membership, Shared model, Project scope and implementation status

## Knowledge Gaps
- **5 isolated node(s):** `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 883 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `apiRequest()` connect `Button` to `Button`, `schedule-editor.tsx`, `ref_react`, `queries.ts`, `client.ts`, `calendar-page.tsx`, `use-elections.ts`, `calendar/event-editor.tsx`, `member-filters.tsx`, `directory.ts`, `Input`, `login-form.tsx`, `ReviewQueue`, `location-settings-form.tsx`, `Card`, `navigateClient`, `member-detail.tsx`, `use-member-detail.ts`, `visit-history.tsx`, `personnel-missions-dialog.tsx`, `use-ticket-entry.ts`, `src/member-sync.ts`, `5.1 Shared Core (`packages/core/src/`)`, `src/index.ts`, `route-modules.tsx`, `election-page.tsx`, `worship-viber-draft-page.tsx`, `query-persistence.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Button()` (e.g. with `5.4 UI Package (`packages/ui/src/`)` and `primitiveCases()`) actually correct?**
  _`Button()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `worship-information.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10299003322259136 - nodes in this community are weakly interconnected._
- **Why does `Button()` connect `Button` to `isWorshipProgramText`, `schedule-editor.tsx`, `ref_react`, `calendar-page.tsx`, `calendar/event-editor.tsx`, `member-filters.tsx`, `Input`, `login-form.tsx`, `ReviewQueue`, `public-election-page.tsx`, `location-settings-form.tsx`, `Card`, `Button`, `member-detail.tsx`, `visit-history.tsx`, `public-election.ts`, `personnel-missions-dialog.tsx`, `use-ticket-entry.ts`, `displayCalendarDate`, `route-modules.tsx`, `election-page.tsx`, `index.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `HttpError` (e.g. with `5.3 Web Admin (`apps/web-admin/`)` and `Backend implementation`) actually correct?**
  _`HttpError` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `http.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06043956043956044 - nodes in this community are weakly interconnected._