# Church calendar, email groups, delivery and Word export

This guide describes the live single-church feature introduced by `011_calendar.sql`. The [README](../README.md) remains the project knowledge-base entry point. No historical tenant/task scheduling implementation is used.

## Product behavior and permissions

The feature uses the supplied brief's recommended defaults:

| Action                                                               | Admin | Thư ký | Other roles |
| -------------------------------------------------------------------- | ----- | ------ | ----------- |
| Calendar, event details                                              | Yes   | Yes    | No          |
| Export preview and Word download                                     | Yes   | Yes    | No          |
| Event creation/edit/deletion                                         | Yes   | No     | No          |
| Email groups and recipient lists                                     | Yes   | No     | No          |
| Send updates, delivery history, retries, uncertain-result resolution | Yes   | No     | No          |

Each action also requires its corresponding `calendar.read`, `calendar.write`, `calendar.export`, `calendar.groups` or `calendar.notify` grant. Hard role ceilings prevent other roles from obtaining calendar authority through a forged client flag. This is a new explicit exception to the older general Admin/Thư ký permission-equality policy. Existing general member-management permissions and OTP restrictions remain unchanged. These are current-session role ceilings: Thư ký remains a trusted general account/role administrator under the existing product policy. Calendar restrictions do not remove that provisioning authority. Strict separation of duties would also require a separate change to the account-administration policy.

Calendar links are in the dashboard sidebar/command menu. `/dashboard/calendar` provides month, week and day views; `/dashboard/calendar/email-groups` manages recipients. There is no new mobile-client tab. The integrated `/client` experience continues unchanged.

The calendar is Sunday-first. Date display and weekday placement are derived explicitly in GMT+7, independent of the device/server timezone. The grid uses each date’s Sunday-based weekday as its explicit column; 08/11/2026 is Sunday (column one). Today, previous/next navigation, current-range labels, and date interpretation use Asia/Ho_Chi_Minh. Timed events show their original time label; no-time events show “Chưa có giờ”. Month cells show up to three events and an overflow action opening the full day. On narrow screens, dense month/week grids scroll horizontally; day view and full-screen dialogs remain available.

## Event entry and parsing

Choose a calendar day or use **Tạo sinh hoạt**. The selected date is authoritative; dates are not extracted from pasted text.

```text
Ban Thanh niên — Sinh hoạt Chúa nhật
08h00 - 10h00
Chủ đề: Sống trong tình yêu thương
Kinh Thánh: I Cô-rinh-tô 13:4-7

Nội dung:
- Cầu nguyện
- Thờ phượng
- Thảo luận 🙏
```

- The first nonblank line is the title. Surrounding title whitespace is trimmed for display.
- The second nonblank line becomes a time only if its entire content matches a supported time format.
- Otherwise that line stays in the details. Invalid-looking times are never silently discarded.
- Everything after the title/time boundary remains details, including section breaks, punctuation, bullets, Vietnamese and Unicode. The submitted `original_text` is stored separately without rewriting it.
- One submission is one event. No time is valid; a blank title is not.
- The textarea is the only editable content source. Parsed title/time/details are a review preview, not competing editable fields.

Supported examples: `08:00`, `08:00 - 10:00`, `08:00–10:00`, `08h00 - 10h00`, `8:00 AM`, `8:00 AM - 10:00 AM`. Minutes/hours are checked; AM/PM supports 1–12. A range must end after it starts on the same day. Overnight/equal-time ranges remain details rather than inventing another date. `formatEventText` produces a stable LF-separated header representation, preserving supplied detail content.

Event dates are ISO date-only strings at the API boundary, with dd/MM/yyyy entry/display in the interface. Supported dates are 1900–2100. Titles are at most 300 characters; original text at most 50,000. Range queries cover at most 367 inclusive dates and 5,000 events; excessive requests fail explicitly rather than silently dropping records.

Events have optimistic versions. A stale update/deletion returns 409, requiring a reload. Creation uses a durable request UUID and a canonical payload hash: retrying the same create returns the same event, while reusing the UUID for different data conflicts. Ordinary edits save date/text/group selection **without resending**.

## Email groups

An Admin can create/rename/delete groups and add/remove addresses. Removing an old address and adding its correction is supported; there is no separate in-place address editor.

Bulk entry accepts newline, comma and semicolon separators. The preview distinguishes valid addresses, invalid values, duplicates within the paste, and addresses already present. Valid addresses normalize to lowercase and are unique within each group. Invalid entries remain available for correction; the server returns the same classification. Group members can be external email addresses and need not have login accounts.

Limits are 500 active groups, 5,000 addresses per group and 50 selected groups per event. Metadata edits/deletion use group versions. Save a changed group name/description before modifying its membership. Destructive actions require confirmation.

Deleting a group soft-deletes it and detaches current event assignments. It **does not cancel previously queued messages** or erase membership/history/snapshots. Deleting an event soft-deletes it, hides it from the calendar/export and cancels pending deliveries. Already-sending messages may still reach SMTP; previously sent messages are not recalled. Neither action automatically emails a cancellation.

## Notification triggers and recipient privacy

Creating or editing an event with selected groups automatically sends a creation or update notification immediately. The editor saves directly, without recipient counts or confirmation. The server resolves and deduplicates group memberships. No groups is valid and sends nothing; empty groups can produce a batch with zero recipients.

The event, immutable delivery batch and save receipt commit together. The request then attempts its own batch before returning, with up to four concurrent SMTP deliveries. SMTP runs outside the transaction. A repeated save UUID with the same payload returns the original result without creating another version or notification; a changed payload with that UUID is rejected. Preserve both request UUID and original version when retrying a lost response.

Email failures never undo a committed event. The response includes delivery counts (or an unknown-result error), and the editor directs incomplete delivery to the notification bell. Saving can take longer for large groups because the response awaits SMTP attempts; this is not a detached background task.

A batch stores an immutable event snapshot, group names/IDs, type and initiating member. Delivery rows store recipient snapshots. Later event edits, group renames, address additions/removals and profile merges do not rewrite previously queued message content or recipients. Adding an address later does not send historical notifications.

The creation/update request UUID is unique. Repeating it returns the existing batch. Each batch/recipient pair is unique. Initiation is limited to 20 new notification batches per Admin in 15 minutes; retries have a separate 20-per-15-minute limit. Each batch is capped at 5,000 unique recipients. The regular phone OTP Admin recipient and authentication-email behavior are unchanged.

## Immediate delivery and optional recovery worker

Normal saves, explicit notification requests and failed-only retries send immediately. No scheduler is required for normal delivery. PostgreSQL remains the durable outbox so interrupted requests retain their progress. Only pending recipients in the current batch are sent; unrelated batches are not flushed by a save.

For pending work left by an interrupted process or an older deployment, optionally invoke:

```sh
npm run calendar:deliver -- --limit=25
```

The command processes up to 25 pending recipients once and exits; the supported limit is 1–100. Atomic `FOR UPDATE SKIP LOCKED` claims prevent overlapping senders from claiming the same row. A scheduler can run this as recovery, but is not part of the ordinary save path. The command needs the source checkout, tsx, database and SMTP connectivity. Supply production secrets separately through deployment configuration and set `NODE_ENV=production`.

Existing `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `SMTP_FROM` are reused. Development-only file outbox rules remain unchanged. Authentication OTP delivery and its Admin recipient are unchanged. Do not run a real-configured recovery worker as a test: it may send any pending batch.

Host/request timeouts can interrupt a large batch. Pending rows can be recovered; already-sending rows require outcome verification rather than blind resending. SMTP acceptance does not prove inbox delivery, and exactly-once delivery across SMTP/database failures cannot be guaranteed.

### Delivery states and recovery

| State       | Meaning                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------- |
| `pending`   | Persisted, awaiting immediate dispatch or interruption recovery                             |
| `sending`   | Claimed durably before the SMTP attempt                                                     |
| `sent`      | SMTP accepted the message, or an operator verified that result; not proof of inbox delivery |
| `failed`    | A definite rejection/unavailability; eligible for explicit retry below five attempts        |
| `uncertain` | Worker interruption or ambiguous SMTP acceptance; never automatically resent                |
| `cancelled` | Pending message cancelled because the event was deleted                                     |

Immediate dispatch uses up to four concurrent deliveries; the recovery CLI sends one at a time. A sending lease older than five minutes becomes uncertain on the next worker invocation. Explicit SMTP rejection/connection/authentication failures become failed; ambiguous DATA/timeouts or unrecognized errors become uncertain. A successful SMTP send followed by a database-write failure also remains sending, then becomes uncertain rather than being blindly sent again.

Exactly-once final inbox delivery cannot be guaranteed by SMTP. Stable Message-IDs are useful for tracing but do not establish provider-side idempotency. The implementation prioritizes avoiding automatic duplicate sends in ambiguous cases. A process crash before SMTP starts can therefore also require operator review.

The Admin notification bell polls every 15 seconds and refreshes when opened. It lists only batches with failed, uncertain or stale-sending deliveries for active events. The badge counts affected batches, not recipient addresses. Successful retries clear resolved alerts automatically; exhausted failures stay visible without a retry button. There is no sending-history UI. Failure notifications derive from durable delivery records, survive reloads and are shared across authorized Admin accounts. They contain event context rather than successful-recipient lists. No recognized time means no time label in the calendar or editor.

**Thử lại địa chỉ thất bại** immediately attempts failed rows with fewer than five attempts. It does not resend sent, pending, sending, uncertain or cancelled rows. Retry requests have durable UUID records; replaying the same retry request does not requeue it again. Retry of a deleted event is denied.

For uncertain rows, first check provider/server logs. Then use the restricted `PATCH /api/notification-deliveries/:id` resolution API with the verified status and current attempt number; this operator-only recovery API remains available without exposing a history screen. Resolution is audited. Only a verified failed result can later be retried. Misclassifying an uncertain accepted message can cause a duplicate; do not treat this confirmation as a substitute for investigation.

## Word export

Admin and Thư ký can export a selected Sunday–Saturday week or a custom inclusive range.

1. Open **Xuất Word** from the calendar.
2. Review/change the from/to dates. Both endpoints are included.
3. Generate the consolidated preview.
4. Edit the preview text freely, including Vietnamese, multiline details and Unicode.
5. Download the real `.docx` generated from that exact edited preview.

The preview is a local draft. Query invalidation or a changed calendar does not overwrite it. Regenerating an edited draft requires confirmation. Changing its requested date range requires regeneration before download. Preview changes never update events. Empty ranges yield an explanatory document rather than inventing events.

Ordering is date ascending, normalized start time ascending with no-time events last, creation timestamp ascending, then event ID for ties. All titles, available time labels and details are included. Preview/document text is capped at 500,000 characters, with at most 10,000 Word paragraphs; oversized ranges fail with instructions to narrow the range, never silent truncation. XML-invalid control characters are rejected.

`docx` 9.5.1 is pinned for compatibility with the workspace's current Node 20.19 runtime; the latest inspected release had a transitive Node-22-only dependency. The Node-compatible library generates A4 OOXML with Times New Roman, Unicode text, readable spacing and margins. Export tests unpack the ZIP and inspect `word/document.xml`, Vietnamese text, long content, A4 settings and headers.

Responses use the standard Office MIME type, a validated ASCII filename such as `lich-sinh-hoat-2026-11-02-den-2026-11-08.docx`, attachment disposition and `no-store`. The browser revokes temporary object URLs after initiating download. No HTML/text file is disguised as Word.

## Database and APIs

Migration `011_calendar.sql` adds:

- `events`: date, parsed title/time/details, exact submitted text, optimistic version, request id/hash, author metadata and soft deletion.
- `email_groups` and `email_group_members`: soft-deleted group metadata and normalized unique memberships.
- `event_email_groups`: current assignments, detached when a group is deleted.
- `event_notifications`: immutable event/group snapshots and durable initiation keys.
- `event_notification_deliveries`: unique recipient snapshots, status, attempts and safe outcomes.
- `event_notification_retries`: durable retry request/result records.
- Calendar permissions and role grants.

Migration `012_immediate_calendar_mail.sql` adds `event_save_requests` for durable create/edit idempotency and a sending-lease recovery index. Apply all sixteen migrations in order. Save responses include `notificationId` and delivery outcome counts when a batch is present.

Derived title/time fields permit date/time sorting and concise calendar rendering; original text is preserved for editing. This denormalization is deliberate and all derived fields are regenerated from the original text on every save. Callers cannot independently submit conflicting structured content.

Foreign keys use the existing church profiles. Merging profiles canonicalizes calendar/group/notification/retry/save-receipt author references to the retained ID. Merge preview hashes include those references; message/content/recipient snapshots do not change. General audit records contain concise IDs/actions/counts, not full email bodies or recipient lists.

All endpoints use bearer authentication, server role ceilings/permissions, Zod validation and parameterized SQL. Unsafe operations retain Origin/JSON protection. Event/group mutations use the existing write transaction lock. Larger event/export bodies have bounded per-route limits; the global default body limit is unchanged.

| Method/path                                      | Purpose                                                        |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `GET/POST /api/events`                           | Inclusive range query / idempotent create                      |
| `GET/PATCH/DELETE /api/events/:id`               | Detail / versioned edit / confirmed soft deletion              |
| `GET/POST /api/events/:id/notifications`         | Admin history / explicit update notification                   |
| `GET /api/events/export`                         | Read-authorized consolidated preview                           |
| `POST /api/events/export/docx`                   | Word from edited preview, not a hidden re-fetch                |
| `GET/POST /api/email-groups`                     | Admin list/create                                              |
| `GET/PATCH/DELETE /api/email-groups/:id`         | Detail/rename-description/soft delete                          |
| `POST /api/email-groups/:id/members`             | Bulk classification and valid additions                        |
| `DELETE /api/email-groups/:id/members/:memberId` | Scope-checked address removal; JSON `{}` body                  |
| `POST /api/email-groups/recipients`              | Unique recipient count for selected group IDs                  |
| `GET /api/notifications/failures`                | Admin unresolved-failure bell feed, paginated 20 batches       |
| `GET /api/notifications`                         | Global paginated Admin batch history, including deleted events |
| `GET /api/notifications/:id/deliveries`          | Paginated recipient outcomes                                   |
| `POST /api/notifications/:id/retry`              | Idempotent failed-only retry                                   |
| `PATCH /api/notification-deliveries/:id`         | Audited resolution of an uncertain attempt                     |

Use `{eventDate, originalText, groupIds, requestId, version?}` for event saves; `{name, description, version?}` for groups; `{text}` for bulk membership; `{requestId}` for notification/retry; and `{from,to,text}` for Word generation. Update/delete versions and request UUIDs must be retained during retries. The exported shared schemas define the exact contracts.

## Deployment and verification

From the intended checkout and database environment:

```sh
npm ci
npm run db:migrate
npm run test:core
npm run test:mobile
npm run test:backend
npm run typecheck
npm run build
```

Run type checking/build sequentially. Deploy the request handler with SMTP/database settings; optionally schedule `calendar:deliver` for interruption recovery. Do not start the production worker before reviewing test queues and approved recipient groups. No migration sends mail or creates sample events/groups.

Tests use synthetic records with an isolated PostgreSQL cluster and mocked SMTP/private outboxes. Coverage includes parser preservation, local-date/week boundaries, role ceilings and forged flags, CRUD/version conflicts, recipient deduplication, initiation/retry idempotency, competing workers, partial failure/uncertain results, deletion retention, profile-merge authors, edited DOCX content and browser object-URL cleanup. No test sends real calendar mail or changes the hard-coded phone-OTP recipient.

Automated DOM/API checks do not replace real-device accessibility/browser acceptance or provider delivery testing. There is no recurrence, external sync, unsubscribe/subscription portal, bounce tracking, read receipts, timed-event drag-and-drop, or automatic cancellation mail in this scope. Retention policies must account for soft-deleted content and historical email-address snapshots.

Primary library references: [docx](https://docx.js.org/), [Packer](https://docx.js.org/api/classes/index.Packer.html), and [Nodemailer SMTP/error behavior](https://nodemailer.com/errors).

## Built-in event presets

The creation editor offers **Mẫu chương trình**, a searchable two-category selector using the shared Command and Dialog primitives. The four definitions and `renderEventPreset` live in `packages/core/src/event-presets.ts`; see the [README preset guide](../README.md#mẫu-chương-trình--built-in-event-presets) for behavior and extension instructions.

Presets only produce editable draft text. Selecting an empty draft applies immediately; replacing nonempty text requires confirmation. Saving uses the existing event API, permissions and email behavior. The worship date uses the editor's selected date in DD/MM/YYYY and the service defaults to `...`. Changing the date later does not rewrite the draft. The three single-line presets preserve their exact `18g00:` prefix and remain ordinary titles under the unchanged parser. Optional preset provenance and the separate worship request workflow are added by migration 013; see [worship programs](worship-programs.md). Worship saves send selected-group emails and a separate private Viber draft automatically on creation and edits; the editor shows only the missing-information summary. Migrations 014–015 add the private email type and save-receipt linkage.

The “Xuất lịch chương trình” dialog includes “Tuần trước” and “Tuần sau” controls, moving seven days between Sunday–Saturday weeks and regenerating the preview automatically. Edited previews require replacement confirmation; cancel preserves both dates and text. Word downloads use the displayed regenerated preview range, with date arithmetic unchanged in GMT+7.

Export week navigation is a single row: left chevron, dd/MM/yyyy – dd/MM/yyyy, right chevron. The reset-week button and duplicate range/event-count caption are removed. Preview generation numbers each event 1., 2., 3., … in chronological order across the entire export, including across dates. Numbering is part of the editable text used for Word output; saved events are unchanged.

### Email calendar export to Ban Trình chiếu

Admin users with calendar.export and calendar.notify can click **Gửi email Ban Trình chiếu** in the export dialog. It sends the exact current editable preview (including event numbers) as plain text and escaped HTML to **btt.httlsaigon@gmail.com** and **nguyentruongky33@gmail.com**, individually. There is no recipient selector, confirmation step or automatic send on opening the dialog. A changed date range must regenerate its preview first. Secretary retains preview/Word export access but cannot send.

POST /api/events/export/email accepts only {requestId, preview: {from, to, text}}. Migration **016_calendar_export_email.sql** adds durable per-recipient delivery snapshots, request hashing/idempotency, atomic claims, a maximum of five delivery attempts per address, and a 20-new-request/15-minute Admin limit. Sending happens immediately after the snapshot transaction commits. Successful addresses are not resent on retries; definite failures can retry the same request from the dialog; uncertain/stale sending attempts require operator review instead of automatic retries. Closing/reopening the dialog begins a new explicit send request. The UI reports partial delivery and disables repeat sending after success for the unchanged preview. SMTP acceptance is not proof of inbox delivery.

The new table’s author FK participates in canonical profile merges. No member/event records are changed and no Word attachment is added; the email body is the preview itself. Existing SMTP configuration is reused. Apply migration 016 before using the button.

Export week navigation keeps the existing dialog and preview mounted while loading. Dates and preview text update together only after the new response succeeds, avoiding the transient range-warning layout shift. The preview stays read-only rather than disabled during requests, preserving its appearance and scroll position. Edited-preview confirmation is unchanged.

The editable export preview tracks event-heading offsets from the server. Deleting an event automatically renumbers the remaining headings 1, 2, 3, …, including across dates. Numbered song entries and other event details are preserved because renumbering targets tracked event headings only. Ordinary title/detail edits keep those anchors aligned; caret positions account for changed number lengths. Email and Word export use the same updated preview. Fully replacing the preview with custom text preserves that text without guessing which numbered lines are events. Saved calendar events are not modified by preview edits.

Calendar UI terminology uses “chương trình” for create/save/delete/date/content labels, navigation, status/error messages and newly generated export/email headings. The detail dialog is “Chương trình sinh hoạt” and its textarea is “Nội dung chương trình”. Existing saved event text, historical notifications and built-in preset template wording are not rewritten.
