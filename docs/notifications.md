# Notification center

Open **Cài đặt → Trung tâm thông báo** (`/client/notifications`). All signed-in
accounts can open Settings and their notification center; administrative settings
retain their existing role checks. Browser push support or installation as a PWA
is not required to read the list.

The list loads 25 items at a time, newest first. It refreshes every 30 seconds while
open and online, on focus/reconnection, or through **Làm mới**. Dates use Vietnam
time. Device notifications still require push configuration and user permission.

## Sources and recipients

- **Task/ministry assignments:** existing `schedule_notifications` records for the
  signed-in member, including assignment, change, removal and cancellation notices.
  These are the live ministry task/schedule workflows; the legacy demo task system
  is not a new source of notifications.
- **Event assignments:** durable `event_assignment_notifications` rows for newly
  linked responsible members. The event must still exist and the member must still
  be responsible to see/open its assignment notice. Current assignments are
  backfilled when migration 064 is installed.
- **Event email updates:** existing delivery history matching the account email
  and current event access. Assignment notices remain visible even if the same
  person also received an event email.
- **Calendar contributions:** every committed calendar contribution is visible to
  users with `calendar.write`, matching calendar review access.
- **Worship contributions:** every committed worship contribution is visible to
  Admin/Thư ký with `calendar.write`, matching worship review access. A notice opens
  the appropriate review screen. The list retains the notice after review; it does
  not expose draft text to other members.

Assignment history is independent of push subscription and VAPID configuration.
Responsibility synchronization preserves unchanged links and inserts only new
ones, so editing unrelated content does not generate another assignment notice.
Removing and later reassigning a member in a newer event version records a new
notice. Batched event creation writes assignment notices in the same SQL operation
as the event, assignments and queued jobs. Calendar contribution review also
synchronizes event responsibilities after applying its text.

Event push queue keys now use the actual event version for every recipient. This
allows selected members to receive subsequent event updates rather than being
suppressed forever by the old non-admin version-zero key. Existing retry limits,
subscription validation and delivery worker behavior remain in effect. Worship
contribution device alerts target Admin/Thư ký and open `/client/worship-review`.

## Storage and rollout

Apply migration **064** through `npm run db:migrate` before deploying this code. It
creates the assignment history table and member/time index, grants runtime access,
and backfills current assignments. The migration runner includes version 064.
The migration was prepared but not executed as part of this implementation.

`GET /api/my-notifications` remains the authenticated, account-scoped read endpoint.
It combines existing durable sources with event assignment history. Notification
history does not grant access to the linked resource; destination APIs enforce
permissions independently. The center currently provides a chronological list;
it does not maintain unread counts or mark-as-read state.

Validation: workspace TypeScript checks. No automated or manual tests were run,
following the project instructions.
