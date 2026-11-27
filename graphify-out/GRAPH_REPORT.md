# Graph Report - church-management  (2026-11-27)

## Corpus Check
- 706 files · ~299,700 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .webmanifest 3, .css 3, (none) 2)

## Summary
- 3451 nodes · 11972 edges · 152 communities (142 shown, 10 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 265 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e0fa07d2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- member-table.tsx
- withActor
- Dialog
- election-page.tsx
- schedule-editor.tsx
- Bầu cử / Election module
- pwa-settings.tsx
- merge-members.ts
- client.ts
- useWorkspace
- HttpError
- schedule-export.ts
- src/quarterly-work.ts
- connection-check.ts
- Church Management Platform — Agent Documentation
- members.ts
- devDependencies
- use-elections.ts
- scrutineer-page.tsx
- getMember
- HttpError
- directory.ts
- ElectionDetailView.tsx
- scheduleApi
- login-form.tsx
- audit
- ReviewQueue
- http.ts
- ui/package.json
- with
- grantScheduleLeader
- member-information.tsx
- scripts
- auth-contract.ts
- Public election voting
- Architecture and integration guide
- Button
- dev.mjs
- rules.ts
- client-router.ts
- db.ts
- Design system and development conventions
- package.json
- core/package.json
- persistent-session.ts
- phone-calendar.ts
- use-member-directory.ts
- app.tsx
- import-believers.py
- calendar/event-editor.tsx
- department-board.ts
- next
- push-subscriptions.ts
- domain/types.ts
- web-admin/package.json
- worship-contributions.ts
- Schedule & Ministry Assignment Management
- Church Member Management
- election-team-export-data.ts
- server/reception.ts
- ticket-card.tsx
- MenuItem
- use-ticket-entry.ts
- mobile-client/package.json
- Hội Thánh PWA and device notifications
- personnel-missions-dialog.tsx
- my-notifications/schedules/[id]/route.ts
- compilerOptions
- vercel.json
- ui-interactions.test.ts
- README.md
- Authentication and access control
- election-audit.tsx
- Architecture and code organization
- Worship programs: automatic email updates and phone-ready Viber drafts
- choir-memberships.ts
- ReceptionTable
- src/member-sync.ts
- @prisma/composer
- web-admin/tsconfig.json
- Calendar, event email and Word export
- Supporting documentation
- web-admin/package.json
- manual-ticket-entry-page.tsx
- manual-ticket-entry-page.tsx
- scripts
- Local believer workbook fixture
- src/index.ts
- main.tsx
- dependencies
- overrides
- role-assign-dialog.tsx
- election-results-metrics.tsx
- canCalendar
- Card
- local-election.ts
- election-admin-page.tsx
- src/schedules.ts
- catalog.ts
- mobile-client/tsconfig.json
- useClientRoute
- local-database.ts
- scripts
- check-responsive-ui.mts
- authenticatedFetch
- Notification center
- use-workspace-route.ts
- server/schedules.ts
- core/tsconfig.json
- ui/tsconfig.json
- index.tsx
- ElectionCandidate
- election-selector.tsx
- Persistent login
- public/sw.js
- copySchedule
- public/pwa/sw.js
- core/pwa/sw.js
- directory-toolbar.tsx
- AGENTS.md
- query-persistence.ts
- election-team-excel.ts
- Editable reception table text — 9 November 2026
- Local development
- calendarApi
- Schedule & Ministry Assignment Management
- ElectionPageRoundContent.tsx
- schedule-members/route.ts
- Pages and API reference
- 5.1 Shared Core (`packages/core/src/`)
- database-performance.md
- day-responsibilities.tsx
- failure
- member-read-sync.md
- src/calendar.ts
- requireScheduleCategory
- Production loading performance
- push.ts
- push-keys.mjs
- nodemailer
- src/department-members.ts
- member-filters.tsx
- Member-facing features
- Backend development patterns
- Authentication and persistent sessions
- Administrative features
- Backup, archival, and handoff

## God Nodes (most connected - your core abstractions)
1. `Button()` - 239 edges
2. `HttpError` - 225 edges
3. `apiRequest()` - 167 edges
4. `failure()` - 125 edges
5. `json()` - 114 edges
6. `withActor()` - 113 edges
7. `useAuth()` - 109 edges
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
- `Setup` --references--> `admin()`  [INFERRED]
  docs/election.md → apps/web-admin/lib/server/roles.ts
- `Calendar changes for admins` --references--> `admin()`  [INFERRED]
  docs/pwa.md → apps/web-admin/lib/server/roles.ts

## Import Cycles
- None detected.

## Communities (152 total, 10 thin omitted)

### Community 0 - "member-table.tsx"
Cohesion: 0.16
Nodes (24): downloadCsv(), formatCsv(), ListControls(), ListPageHeader(), ListResultsSummary(), ListSearchToolbar(), MemberTable(), exportCsv() (+16 more)

### Community 1 - "withActor"
Cohesion: 0.08
Nodes (35): POST(), runtime, POST(), runtime, POST(), runtime, CredentialSchema, POST() (+27 more)

### Community 2 - "Dialog"
Cohesion: 0.07
Nodes (37): AnimatedSheetContent(), BOARD_POSITIONS, BoardPerson, BoardRoleEditor(), BoardYears(), fold(), ChangeDepartmentStatusDialog(), DepartmentMemberCards() (+29 more)

### Community 3 - "election-page.tsx"
Cohesion: 0.12
Nodes (22): ElectionPage, Audit(), CandidateManager, decorate(), post(), ElectionPageBottomNav(), ElectionPageBottomNavProps, ElectionPage() (+14 more)

### Community 4 - "schedule-editor.tsx"
Cohesion: 0.09
Nodes (44): ReceptionWorkloadSummary(), draftKey(), ScheduleEditor(), download(), leaveEditor(), requestAction(), update(), ScheduleMenuAction (+36 more)

### Community 5 - "Bầu cử / Election module"
Cohesion: 0.12
Nodes (17): Assigned normal-user access, Audit polling scope, Bầu cử / Election module, Complete polling lifecycle, Consolidated storage (migration 052), Edit and delete elections, Election and team identity (migration 054), Four-stage election workflow (+9 more)

### Community 6 - "pwa-settings.tsx"
Cohesion: 0.25
Nodes (12): OfflineBanner(), pushRegistrationError(), DeviceSettings(), enable(), inspect(), dismissedUntil(), notificationDismissedUntil(), PwaDeviceSettings() (+4 more)

### Community 7 - "merge-members.ts"
Cohesion: 0.29
Nodes (10): authorize(), blank(), fields, Ids, labels, MergeInput, mergeMembers(), MergePreviewInput (+2 more)

### Community 8 - "client.ts"
Cohesion: 0.08
Nodes (33): castVote(), createElection(), exportElectionBackup(), fetchCandidates(), fetchElection(), fetchElectionActivity(), fetchElections(), fetchRoundDetail() (+25 more)

### Community 9 - "useWorkspace"
Cohesion: 0.19
Nodes (10): Heading(), ActivityPage(), ChurchStatusReportPage(), EngagementChart, Loading(), OverviewPage(), orgs, Tab (+2 more)

### Community 10 - "HttpError"
Cohesion: 0.07
Nodes (57): Context, GET, handler(), POST, PUT, runtime, Context, GET (+49 more)

### Community 11 - "schedule-export.ts"
Cohesion: 0.12
Nodes (45): saveQuarterlyImage(), dutyText(), ErrorCell(), PlainCellInput(), QuarterlyCellChange, QuarterlyWorkTable(), cell(), saveReceptionImage() (+37 more)

### Community 12 - "src/quarterly-work.ts"
Cohesion: 0.13
Nodes (40): POST(), runtime, checkQuarterlyWork(), quarterlyDirectoryMembers(), quarterlyReceptionUnavailableDays(), quarterlyRosterMembers(), receptionTextMembers(), resolveQuarterlyText() (+32 more)

### Community 13 - "connection-check.ts"
Cohesion: 0.05
Nodes (65): performPublicElectionRequest(), PublicElectionError, publicElectionRequest(), publicErrorMessage(), PublicCandidateList(), PublicCandidateSelection(), activeChecks, CheckResult (+57 more)

### Community 14 - "Church Management Platform — Agent Documentation"
Cohesion: 0.11
Nodes (18): 10. Adding a New API Endpoint (Web Admin), 11. Adding a New Database Migration, 12. Typecheck & Lint, 13. Environment Variables, 14. Deployment (Vercel), 15. Graphify (Knowledge Graph), 17. Implementation boundaries and patterns, 1. Project Overview (+10 more)

### Community 15 - "members.ts"
Cohesion: 0.05
Nodes (87): AccessChangeSchema, changeAccess(), manageDepartment(), exportCalendarDocument(), setManualChoirMembership(), authorize(), BoardMember, Input (+79 more)

### Community 16 - "devDependencies"
Cohesion: 0.11
Nodes (17): devDependencies, esbuild@^0.28.2, sharp@^0.35.5, tailwindcss@^4.1.0, @tailwindcss/vite@^4.1.0, @testing-library/user-event@^14.6.8, @types/jsdom@^30.0.0, vite@^6.4.0 (+9 more)

### Community 17 - "use-elections.ts"
Cohesion: 0.10
Nodes (40): assignScrutineers(), configureRound(), fetchElectionAudit(), fetchOnlineTickets(), fetchTickets(), manualChecking(), mapAuditLogs(), previewElectionBackup() (+32 more)

### Community 18 - "scrutineer-page.tsx"
Cohesion: 0.18
Nodes (14): createElectionPolling(), AssignedResponse, ScrutineerPage(), printTeamMinutes(), ScrutineerExportKind, ScrutineerHeader(), ScrutineerNavigation(), useOwnTicketCount() (+6 more)

### Community 19 - "getMember"
Cohesion: 0.11
Nodes (21): PUT(), runtime, Context, GET(), PATCH(), runtime, Context, GET() (+13 more)

### Community 20 - "HttpError"
Cohesion: 0.08
Nodes (45): findAccountIdentity(), ProfileIdentity, login(), queueCalendarExportEmail(), DB, shared, createFollowupElection(), HttpError (+37 more)

### Community 21 - "directory.ts"
Cohesion: 0.06
Nodes (58): Shared model, departments, audit(), historyActor(), key(), memory, read(), seed() (+50 more)

### Community 22 - "ElectionDetailView.tsx"
Cohesion: 0.12
Nodes (25): ElectionCard(), ElectionCardProps, ElectionDetailView(), ElectionDetailViewProps, post(), Run, ElectionListView(), ElectionListViewProps (+17 more)

### Community 23 - "scheduleApi"
Cohesion: 0.11
Nodes (22): GET(), runtime, GET(), runtime, Context, POST(), runtime, Context (+14 more)

### Community 24 - "login-form.tsx"
Cohesion: 0.17
Nodes (19): AuthFrame(), Draft, SavedDraft(), WorshipViberDraftPage(), currentClientPath(), ConnectionIssue(), AuditProps, Run (+11 more)

### Community 25 - "audit"
Cohesion: 0.09
Nodes (55): 5.3 Web Admin (`apps/web-admin/`), POST(), runtime, GET(), CalendarContributionInput, listCalendarContributions(), reviewCalendarContribution(), submitCalendarContribution() (+47 more)

### Community 26 - "ReviewQueue"
Cohesion: 0.16
Nodes (19): WorshipDraft, changes(), Edit, LocalSession, projectSession(), ReviewChange, ReviewQueue(), back() (+11 more)

### Community 27 - "http.ts"
Cohesion: 0.16
Nodes (12): POST(), runtime, POST(), runtime, authenticatedJsonApi(), JsonRequestMode, JsonRequestOptions, addTiming() (+4 more)

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
Cohesion: 0.12
Nodes (23): formatDate(), AreaPicker(), DepartmentChoices(), LocationPicker(), Option, ProfileChoiceList(), InlineMemberField(), displayDate() (+15 more)

### Community 32 - "scripts"
Cohesion: 0.09
Nodes (23): scripts, b, calendar:deliver, d, db:bootstrap, db:import, db:local:setup, db:local:start (+15 more)

### Community 33 - "auth-contract.ts"
Cohesion: 0.14
Nodes (18): 6. Authentication & Permissions, AccessRoleSchema, canOpenBoardTeam(), canOpenLeaderTeam(), CreateAccountSchema, departmentScopedRoles, hasBoardRole(), hasHistoryManagementRole() (+10 more)

### Community 34 - "Public election voting"
Cohesion: 0.15
Nodes (11): API and storage, Components and shared rules, Location and integrity, Online intake and manual checking, Organizer setup, OTP attempt logging, lockout and device admission, Polling and connection-report retries, Production rollout — 25 November 2026 (+3 more)

### Community 35 - "Architecture and integration guide"
Cohesion: 0.14
Nodes (14): API contract to replace the demo adapter, Architecture and integration guide, Authorization matrix, Client state and real-time, Custom mobile dropdowns and type scale, Design and deployment, Filter navigation and age contract, Mobile member directory (+6 more)

### Community 36 - "Button"
Cohesion: 0.08
Nodes (62): AccountCredentials(), CalendarExport(), Preview, EmailGroupsPage(), GroupDialog(), GroupForm(), EventEditor(), EventResponsibilityBadges() (+54 more)

### Community 37 - "dev.mjs"
Cohesion: 0.13
Nodes (10): children, launch(), require, root, stop(), root, hash, root (+2 more)

### Community 38 - "rules.ts"
Cohesion: 0.08
Nodes (8): calculateElectionStats(), calculatePendingCount(), calculateRankings(), meetsMinimumThreshold(), selectByMinimumThreshold(), selectTopCandidates(), ElectionProgress, ElectionRoundDetail

### Community 39 - "client-router.ts"
Cohesion: 0.19
Nodes (18): currentClientSearch(), historyPosition, listeners, notify(), observedPath, onPopState(), onScroll(), previousActiveTabIndex (+10 more)

### Community 40 - "db.ts"
Cohesion: 0.08
Nodes (53): authorized(), comingWeekRange(), GET(), runtime, POST(), runtime, definiteFailure(), deliverCalendarItems() (+45 more)

### Community 41 - "Design system and development conventions"
Cohesion: 0.33
Nodes (6): Design system and development conventions, Frontend implementation, Loading views, Maintaining the system, System assessment, Visual ownership

### Community 42 - "package.json"
Cohesion: 0.15
Nodes (18): devDependencies, prettier@^3.9.10, sharp@^0.35.5, tsx@^4.20.0, @types/node@^22.0.0, @types/react@^19.0.0, @types/react-dom@^19.0.0, typescript@^5.9.0 (+10 more)

### Community 43 - "core/package.json"
Cohesion: 0.13
Nodes (18): dependencies, react@^19.2.0, @tanstack/react-query@5.107.1, @tanstack/react-query-persist-client@^5.107.1, zod@^4.0.0, zustand@^5.0.0, exports, react (+10 more)

### Community 44 - "persistent-session.ts"
Cohesion: 0.14
Nodes (32): POST(), runtime, POST(), runtime, POST(), runtime, authBootstrap(), electionSessionLog() (+24 more)

### Community 45 - "phone-calendar.ts"
Cohesion: 0.25
Nodes (11): assignmentResponsibilityLabel(), Assignment, assignmentEvent(), googleCalendarUrl(), saveAssignmentToCalendar(), calendarFile(), CalendarFileEvent, CalendarFileEventSchema (+3 more)

### Community 46 - "use-member-directory.ts"
Cohesion: 0.10
Nodes (29): DateInput(), FieldEditor(), ClientError(), roleLabels, statusLabels, MemberDetail(), DirectoryLoading(), DirectoryPagination() (+21 more)

### Community 47 - "app.tsx"
Cohesion: 0.46
Nodes (5): App(), isHistoryNavigation(), restoreNavigationScroll(), useWorkspaceScroll(), WorkspaceTabs()

### Community 48 - "import-believers.py"
Cohesion: 0.18
Nodes (4): main(), map_workbook(), normalize(), read_workbook()

### Community 49 - "calendar/event-editor.tsx"
Cohesion: 0.05
Nodes (55): caretPosition(), mentionAt(), missingInformationContacts(), Trigger, WorshipMentionTextarea(), reportLinkDiagnostics(), Built-in event presets, Church calendar, email groups, delivery and Word export (+47 more)

### Community 50 - "department-board.ts"
Cohesion: 0.24
Nodes (12): Context, GET(), PATCH(), PUT(), runtime, canonical(), changeDepartmentBoardMember(), currentYear() (+4 more)

### Community 51 - "next"
Cohesion: 0.18
Nodes (5): metadata, viewport, config, next@^16.0.0, next

### Community 52 - "push-subscriptions.ts"
Cohesion: 0.11
Nodes (26): POST(), runtime, Context, GET, handler(), POST, runtime, GET() (+18 more)

### Community 53 - "domain/types.ts"
Cohesion: 0.09
Nodes (29): ActionsPanel(), ActionsPanelProps, ElectionHeaderProps, RoundSelectorProps, AssignedElectionRound, canUserAccessElection(), canUserAdminElection(), CastVoteInput (+21 more)

### Community 54 - "web-admin/package.json"
Cohesion: 0.12
Nodes (17): devDependencies, jszip@^3.10.1, tailwindcss@^4.1.0, @tailwindcss/postcss@^4.1.0, @types/nodemailer@^8.0.2, @types/pdfkit@^0.17.7, @types/pg@^8.23.1, @types/qrcode@^1.5.6 (+9 more)

### Community 55 - "worship-contributions.ts"
Cohesion: 0.20
Nodes (16): GET(), POST(), runtime, POST(), runtime, listWorshipContributions(), reviewer(), reviewWorshipContribution() (+8 more)

### Community 56 - "Schedule & Ministry Assignment Management"
Cohesion: 0.10
Nodes (21): Cancellation and deletion, Categories and configuration, Copying, Creation and editing permissions, Database and API knowledge base, Department-sourced reception verification — 9 November 2026, Editing and lifecycle, Entry points (+13 more)

### Community 57 - "Church Member Management"
Cohesion: 0.12
Nodes (17): Membership, Applications and request flow, Architecture, Church Member Management, Contents, Database model and migrations, Development commands and verification, Environment configuration (+9 more)

### Community 58 - "election-team-export-data.ts"
Cohesion: 0.32
Nodes (11): ElectionTeamExport, teamStats(), teamMinutes(), electionTeamPrint(), escape(), electionTeamWord(), p(), signatures() (+3 more)

### Community 60 - "server/reception.ts"
Cohesion: 0.21
Nodes (15): GET(), PUT(), runtime, POST(), runtime, previewReceptionMonth(), receptionTeam(), saveReceptionTeam() (+7 more)

### Community 61 - "ticket-card.tsx"
Cohesion: 0.25
Nodes (9): TicketStatusBadge(), ticketStatusLabel(), TicketCandidateLine(), TicketCandidates(), TicketCardAction(), TicketCard(), TicketCardData, copyTicketId() (+1 more)

### Community 62 - "MenuItem"
Cohesion: 0.22
Nodes (14): CalendarToolbar(), CalendarToolbarProps, useWorshipContributions(), WorshipContributions(), WorshipContributionsBadge(), worshipContributionsKey, Person, ScrutineerData (+6 more)

### Community 63 - "use-ticket-entry.ts"
Cohesion: 0.22
Nodes (13): saveLocalTicket(), CommandPlan, entryFilter(), filterEntryCandidates(), planEntryCommand(), EntryProps, errorMessage(), useTicketEntry() (+5 more)

### Community 64 - "mobile-client/package.json"
Cohesion: 0.08
Nodes (34): dependencies, @hookform/resolvers@^6.0.0, jsqr@^1.4.0, lucide-react@^0.468.0, next-themes@^0.4.6, @noble/hashes@2.4.0, @org/core@*, @org/ui@* (+26 more)

### Community 65 - "Hội Thánh PWA and device notifications"
Cohesion: 0.14
Nodes (13): APIs, Calendar changes for admins, Event integration, recipients and delivery recovery, Explicit local reception draft exception, Hội Thánh PWA and device notifications, Installation and device support, Local development and HTTPS, Main implementation files (+5 more)

### Community 66 - "personnel-missions-dialog.tsx"
Cohesion: 0.19
Nodes (15): MemberUpdateResult, getPersonnelMissions(), savePersonnelMissions(), DraftMission, Target, AssignedData, AssignedMember, PersonnelQueryParams (+7 more)

### Community 67 - "my-notifications/schedules/[id]/route.ts"
Cohesion: 0.67
Nodes (3): GET(), runtime, getNotifiedSchedule()

### Community 68 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit, resolveJsonModule (+3 more)

### Community 69 - "vercel.json"
Cohesion: 0.17
Nodes (11): crons, framework, rewrites, root, rewrites, $schema, services, mobile-client (+3 more)

### Community 70 - "ui-interactions.test.ts"
Cohesion: 0.09
Nodes (8): jsdom@^26.1.0, @testing-library/react@^16.3.3, container, dom, root, expected, jsdom, @testing-library/react

### Community 71 - "README.md"
Cohesion: 0.20
Nodes (4): Calendar server feature, Account access, Nhân sự Hội Thánh, Admin profile merging

### Community 72 - "Authentication and access control"
Cohesion: 0.17
Nodes (12): API surface, Authentication and access control, Concurrent devices, Department bulk status and contextual profile navigation, Department detail pages and bulk membership changes, Department member management, Permission matrix, Prepared local database (+4 more)

### Community 73 - "election-audit.tsx"
Cohesion: 0.22
Nodes (15): actions, ActivityLogs(), ConnectionLogs(), phaseLabel(), SubmissionLogs(), time(), AuditSummary(), ActivityLog (+7 more)

### Community 74 - "Architecture and code organization"
Cohesion: 0.29
Nodes (7): Architecture and code organization, Frontend boundaries, Further restructuring, Making your first change, Patterns used here, Read the project in this order, Workspace map

### Community 75 - "Worship programs: automatic email updates and phone-ready Viber drafts"
Cohesion: 0.18
Nodes (11): Current save behavior, Device verification, Email link compatibility and alternate labels, Failure handling and retries, Opening the email on a phone, Parsing and missing information, People-in-charge detection, Persistence and compatibility (+3 more)

### Community 76 - "choir-memberships.ts"
Cohesion: 0.29
Nodes (9): POST(), runtime, authorized(), GET(), runtime, currentChurchYear(), reassignChoirMemberships(), choirDepartmentForAge() (+1 more)

### Community 77 - "ReceptionTable"
Cohesion: 0.27
Nodes (12): ReceptionCellTextarea(), ReceptionTable(), content(), errorCell(), useKeyboardScrollSpace(), blur(), focus(), restore() (+4 more)

### Community 78 - "src/member-sync.ts"
Cohesion: 0.15
Nodes (17): adminKinds, CachedPage, CachedRow, detailKinds, listKinds, memberKinds, removeMemberReads(), Cursor (+9 more)

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
Nodes (38): dependencies, argon2@^0.45.2, @hookform/resolvers@^6.0.0, jose@^6.2.15, lucide-react@^0.468.0, next-themes@^0.4.6, @org/core@*, @org/ui@* (+30 more)

### Community 84 - "manual-ticket-entry-page.tsx"
Cohesion: 0.26
Nodes (12): BottomNav(), BottomNavProps, DraftStateView(), DraftStateViewProps, ManualTicketEntryPage(), RoundSelector(), RoundSelectorProps, ElectionPhase (+4 more)

### Community 85 - "manual-ticket-entry-page.tsx"
Cohesion: 0.21
Nodes (12): MainContent(), MainContentProps, BallotActions(), BallotPreview(), CandidateResults(), commands, EntryInstructions(), EntrySearch() (+4 more)

### Community 86 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 87 - "Local believer workbook fixture"
Cohesion: 0.33
Nodes (5): Field mapping, Local believer workbook fixture, Local-only delivery and verification, Mapping results for this file, Run locally

### Community 88 - "src/index.ts"
Cohesion: 0.20
Nodes (19): advanceAuthEpoch(), ApiError, clearBrowserAuth(), clearRefreshRequest(), currentAuthBootstrap(), enableApiMode(), expire(), REAUTHENTICATION_MESSAGE (+11 more)

### Community 89 - "main.tsx"
Cohesion: 0.11
Nodes (15): client, root, start(), deferred(), Component(), PageErrorBoundary, Context, InstallEvent (+7 more)

### Community 90 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, effect@4.0.5, @prisma/composer@0.38.0, @prisma/orm-postgres@8.0.0-rc.23, effect, @prisma/orm-postgres

### Community 91 - "overrides"
Cohesion: 0.33
Nodes (6): overrides, effect, @effect/platform-bun, @effect/platform-node, @effect/platform-node-shared, @effect/vitest

### Community 92 - "role-assign-dialog.tsx"
Cohesion: 0.16
Nodes (10): MemberRoleAssignment(), AssignRoleEntry, AssignTarget, Department, Field(), RoleAssignDialog(), RoleAssignForm(), ScheduleAssignmentHint() (+2 more)

### Community 93 - "election-results-metrics.tsx"
Cohesion: 0.29
Nodes (8): MetricCard(), MetricCardProps, MetricsPanel(), MetricsPanelProps, ElectionMetricId, electionSummaryMetrics(), ElectionSummary, icons

### Community 94 - "canCalendar"
Cohesion: 0.27
Nodes (8): GET(), runtime, POST(), runtime, eventResponsiblePeople(), previewEventResponsibilities(), worshipPeopleInCharge(), EventResponsiblePerson

### Community 95 - "Card"
Cohesion: 0.06
Nodes (59): ApplicationSettings(), Notifications, SettingsDestination, SettingsLink(), settingsPages, AutoLoadMore(), CalendarContribution, CalendarReviewPage() (+51 more)

### Community 96 - "local-election.ts"
Cohesion: 0.16
Nodes (24): ElectionSync(), Action, append(), completed(), db(), digest(), exportElectionBackup(), localMeta() (+16 more)

### Community 97 - "election-admin-page.tsx"
Cohesion: 0.33
Nodes (6): CreateElectionDialog(), CreateElectionDialogProps, ElectionListHeader(), ElectionListHeaderProps, ElectionAdminPage(), errorMessage()

### Community 98 - "src/schedules.ts"
Cohesion: 0.07
Nodes (26): sendEmail(), EventPresetSelector(), PublicWorshipPage(), submit(), submitNew(), Slot, EVENT_PRESETS, EventPreset (+18 more)

### Community 99 - "catalog.ts"
Cohesion: 0.15
Nodes (12): AgeBound, AgeRangeSchema, localDateFormatter, areas, DEPARTMENT_DISPLAY_ORDER, DEPARTMENT_TYPE_LABELS, DepartmentCatalogItem, departmentKey() (+4 more)

### Community 100 - "mobile-client/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 101 - "useClientRoute"
Cohesion: 0.29
Nodes (8): 5.2 Mobile Client (`apps/mobile-client/src/`), 5. Key Source Files by Domain, Calendar and navigation organization, useClientRoute(), canonicalize(), prefetch(), preloadRoute(), WorkspaceRoute

### Community 102 - "local-database.ts"
Cohesion: 0.11
Nodes (19): cluster, directory, envFile, exists(), log, main(), run(), socket (+11 more)

### Community 103 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, prebuild, predev, typecheck

### Community 104 - "check-responsive-ui.mts"
Cohesion: 0.22
Nodes (14): cdp(), check(), click(), clickText(), delay(), departments, evaluate(), fixture (+6 more)

### Community 105 - "authenticatedFetch"
Cohesion: 0.13
Nodes (13): download(), downloadResults(), download(), download(), downloadElectionFile(), download(), post(), ResultsProps (+5 more)

### Community 107 - "Notification center"
Cohesion: 0.50
Nodes (3): Notification center, Sources and recipients, Storage and rollout

### Community 108 - "use-workspace-route.ts"
Cohesion: 0.54
Nodes (6): useWorkspaceRoute(), matchWorkspaceRoute(), resolveWorkspacePath(), hasDashboard(), hasFullMemberAccess(), isTeamScopedUser()

### Community 109 - "server/schedules.ts"
Cohesion: 0.15
Nodes (23): GET(), runtime, Context, POST(), runtime, POST(), runtime, queueScheduleNotifications() (+15 more)

### Community 110 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 111 - "ui/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 112 - "index.tsx"
Cohesion: 0.05
Nodes (53): 5.4 UI Package (`packages/ui/src/`), ClosedStateView(), ClosedStateViewProps, ElectionResultsActions(), ElectionResultsActionsProps, ElectionResultsCandidateTableProps, PublicLocationCard(), ElectionOtp (+45 more)

### Community 113 - "ElectionCandidate"
Cohesion: 0.11
Nodes (25): BallotPreviewProps, CandidateList(), CandidateListProps, CandidateSelection(), CandidateSelectionProps, ScrutineerAssignmentProps, TicketEntryForm(), TicketEntryFormProps (+17 more)

### Community 114 - "election-selector.tsx"
Cohesion: 0.36
Nodes (6): ElectionHeader(), ElectionSelector(), ElectionSelectorProps, ElectionPageHeader(), ElectionPageHeaderProps, Election

### Community 115 - "Persistent login"
Cohesion: 0.33
Nodes (6): Client example, Endpoint contract, Implementation, Limits and security rationale, Persistent login, Revocation and replay

### Community 116 - "public/sw.js"
Cohesion: 0.40
Nodes (4): ASSETS, destination(), SHELL_ASSETS, submit()

### Community 117 - "copySchedule"
Cohesion: 0.28
Nodes (7): Context, POST(), runtime, Context, POST(), runtime, copySchedule()

### Community 120 - "directory-toolbar.tsx"
Cohesion: 0.36
Nodes (7): FilterChip, FilterChips(), memberFilterChips(), DirectoryToolbar(), Props, ageRangeLabel(), ProfileBackButton()

### Community 122 - "query-persistence.ts"
Cohesion: 0.16
Nodes (22): useCalendarResponsibilities(), startTiming(), allowed(), allowedRoots, clearPersistedReads(), database(), durableQuery(), DurableRead (+14 more)

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
Cohesion: 0.03
Nodes (80): GET(), runtime, GET(), runtime, GET(), runtime, DELETE(), runtime (+72 more)

### Community 127 - "Schedule & Ministry Assignment Management"
Cohesion: 0.40
Nodes (5): Direct reception table editing, Extra reception dates, Monthly reception assignments, Schedule & Ministry Assignment Management, Temporary reception drafts and official submission

### Community 128 - "ElectionPageRoundContent.tsx"
Cohesion: 0.13
Nodes (17): ElectionPageRoundContent(), renderEntryContent(), renderManageContent(), renderResultsContent(), renderTicketsContent(), ElectionPageRoundContentProps, ResultsTable(), ResultsTableProps (+9 more)

### Community 130 - "schedule-members/route.ts"
Cohesion: 0.67
Nodes (3): GET(), runtime, searchScheduleMembers()

### Community 133 - "Pages and API reference"
Cohesion: 0.50
Nodes (4): Authentication endpoints, Main pages, Member and management endpoints, Pages and API reference

### Community 134 - "5.1 Shared Core (`packages/core/src/`)"
Cohesion: 0.20
Nodes (16): 5.1 Shared Core (`packages/core/src/`), BoardYear, Page, useDepartmentRoster(), isApiMode(), listDirectory(), listMembersCompact(), emptyDirectoryQuery (+8 more)

### Community 135 - "database-performance.md"
Cohesion: 0.50
Nodes (3): Consolidation (migration 052), Local database performance review, Retired tables

### Community 136 - "day-responsibilities.tsx"
Cohesion: 0.39
Nodes (7): churchDay(), DayResponsibilities(), programTitle(), receptionSession(), responsibilityText(), sessionOrder(), SCHEDULE_CATEGORIES

### Community 137 - "failure"
Cohesion: 0.06
Nodes (62): GET(), runtime, Context, DELETE, GET(), mutate(), PATCH, POST (+54 more)

### Community 139 - "src/calendar.ts"
Cohesion: 0.07
Nodes (50): eventColor(), eventColors, weekdayLabels, CalendarListView(), CalendarListViewProps, CalendarMonthPreview(), CalendarMonthView(), CalendarMonthViewProps (+42 more)

### Community 140 - "requireScheduleCategory"
Cohesion: 0.18
Nodes (15): GET(), PATCH(), runtime, GET(), POST(), runtime, configureScheduleCategory(), listSchedules() (+7 more)

### Community 141 - "Production loading performance"
Cohesion: 0.33
Nodes (5): Device cache, Lists and SQL, Production loading performance, Startup and navigation, Timing and later verification

### Community 142 - "push.ts"
Cohesion: 0.21
Nodes (10): 16. Common Conventions / Gotchas, 3. Monorepo Conventions, clientPath(), memberEventHash(), memberEventPath(), memberNotificationHash(), PushDestination, PushEndpoint (+2 more)

### Community 143 - "push-keys.mjs"
Cohesion: 0.33
Nodes (5): web-push@^4.0.0, web-push, path, privateExists, publicExists

### Community 145 - "src/department-members.ts"
Cohesion: 0.50
Nodes (3): DEPARTMENT_BULK_LIMIT, DepartmentMembershipBulkInput, memberIds

### Community 147 - "member-filters.tsx"
Cohesion: 0.11
Nodes (25): Row, Options, useMemberDirectory(), FilterRow(), Selection(), SelectionList(), emptyMemberFilters, MemberFilters() (+17 more)

### Community 149 - "Member-facing features"
Cohesion: 0.40
Nodes (5): Confidential history, Directory and navigation, Filters, Member-facing features, Profile details and editing

### Community 150 - "Backend development patterns"
Cohesion: 0.50
Nodes (4): Application services: one named use case, Backend development patterns, Boundaries to preserve, Durable jobs and after-commit work

### Community 152 - "Authentication and persistent sessions"
Cohesion: 0.50
Nodes (4): Authentication and persistent sessions, Credentials and token lifecycle, Identifier-first login, Security boundaries and tradeoffs

### Community 154 - "Administrative features"
Cohesion: 0.67
Nodes (3): Administrative features, Duplicate-profile merging, Member management

### Community 155 - "Backup, archival, and handoff"
Cohesion: 0.67
Nodes (3): Backup, archival, and handoff, What to preserve privately, What to share for code review

## Knowledge Gaps
- **5 isolated node(s):** `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 878 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Button()` connect `Button` to `member-table.tsx`, `Dialog`, `election-page.tsx`, `schedule-editor.tsx`, `pwa-settings.tsx`, `useWorkspace`, `src/calendar.ts`, `schedule-export.ts`, `connection-check.ts`, `scrutineer-page.tsx`, `member-filters.tsx`, `ElectionDetailView.tsx`, `login-form.tsx`, `ReviewQueue`, `member-information.tsx`, `use-member-directory.ts`, `ticket-card.tsx`, `MenuItem`, `personnel-missions-dialog.tsx`, `manual-ticket-entry-page.tsx`, `manual-ticket-entry-page.tsx`, `role-assign-dialog.tsx`, `Card`, `local-election.ts`, `election-admin-page.tsx`, `authenticatedFetch`, `index.tsx`, `directory-toolbar.tsx`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Button()` (e.g. with `5.4 UI Package (`packages/ui/src/`)` and `primitiveCases()`) actually correct?**
  _`Button()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `RFC-5987`, `../../tsconfig.base.json` to the rest of the system?**
  _5 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `withActor` be split into smaller, more focused modules?**
  _Cohesion score 0.0782312925170068 - nodes in this community are weakly interconnected._
- **Why does `HttpError` connect `HttpError` to `withActor`, `merge-members.ts`, `failure`, `HttpError`, `schedule-export.ts`, `src/quarterly-work.ts`, `requireScheduleCategory`, `members.ts`, `getMember`, `scheduleApi`, `audit`, `http.ts`, `grantScheduleLeader`, `db.ts`, `persistent-session.ts`, `department-board.ts`, `push-subscriptions.ts`, `worship-contributions.ts`, `server/reception.ts`, `my-notifications/schedules/[id]/route.ts`, `choir-memberships.ts`, `canCalendar`, `server/schedules.ts`, `copySchedule`, `calendarApi`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `HttpError` (e.g. with `5.3 Web Admin (`apps/web-admin/`)` and `Backend implementation`) actually correct?**
  _`HttpError` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `Dialog` be split into smaller, more focused modules?**
  _Cohesion score 0.07139079851930195 - nodes in this community are weakly interconnected._