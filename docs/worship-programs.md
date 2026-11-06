# Worship programs: automatic email updates and phone-ready Viber drafts

`Chương trình thờ phượng` reuses the existing calendar, free-text editor, PostgreSQL schema, SMTP transport, Admin permissions and audit conventions. Persisted `original_text` remains authoritative.

## Current save behavior

Every successful worship event creation or edit performs two independent email actions automatically after the save transaction commits:

1. Send the ordinary event notification to the **selected email groups**. Recipients are resolved/deduplicated by the existing backend. Empty selections send no group mail.
2. Send one private Viber-draft email to **nguyentruongky33@gmail.com**, even when no groups are selected. It contains the saved program plus missing-field request text, a protected phone handoff URL, and the full text for copying.

This includes creation and content/date changes. Unchanged saves and recipient-only changes do not send another email. A complete program still sends its private draft email, containing the full program without an unnecessary missing-information appendix. The private recipient is a server constant enforced by a database constraint; clients do not supply message bodies, links or recipients.

The event editor contains only the live **Thông tin còn thiếu** summary and its complete-state notice. It has no manual request-email, Viber-email, open-Viber or copy actions, no email confirmation step, and no private-email success toast. The normal save/group-delivery feedback remains. Merely typing, selecting a preset or inspecting missing fields sends nothing; email happens on save.

Both channels attempt immediately and independently, outside the save transaction. Failure of one does not prevent the other or undo the saved event. The save receipt stores both group and private notification IDs, so a repeated request reuses the exact original snapshots even if the event was subsequently edited. Sent/failed/uncertain attempts are never blindly repeated by replaying a save.

## Parsing and missing information

Pure functions in `packages/core/src/worship/` extract the ten labels and compose request text without modifying the event. The draft contains the original event followed by “Thông tin còn thiếu:” and a bullet list of the missing fields, then one request sentence. Group A alone uses “Xin nhờ CS Thiệu Huy cung cấp thông tin giúp. Xin cám ơn.”; Group B alone uses “Xin nhờ CS Sơn Hải cung cấp thông tin giúp. Xin cám ơn.”; both use “Xin nhờ CS Sơn Hải và CS Thiệu Huy cung cấp thông tin giúp. Xin cám ơn.” Only missing fields are listed, in template order. The editor still displays its missing-field summary. Complete programs contain only the original text and still trigger the private handoff email on creation and content/date changes.

Missing fields determine the recipient of the single appended sentence:

- **CS Thiệu Huy:** Chủ đề, Diễn giả, Kinh Thánh nền tảng, Câu gốc, HDCT, Kinh Thánh đầu giờ, KTĐĐ, Dâng hiến.
- **CS Sơn Hải:** Hát dẫn, Ban Hát Lễ.

A complete program returns the original text unchanged. The group notification uses the ordinary event content; only the private Viber draft includes this request appendix. The editor's summary updates while typing and has no network/email side effects.

## Opening the email on a phone

Email contains only the authenticated `/worship-viber/:requestId` web link and the complete message. There is no automatic app redirect.

**Mở Viber để gửi yêu cầu** is a real browser anchor whose `href` contains the complete encoded message:

```text
viber://chat?number=%2B84397092176&draft=<encoded complete message>
```

The page loads the latest persisted event through `GET /api/worship-viber-drafts/:id?latest=1` before rendering this link. Tapping it follows the link directly in the same browsing context. There is no asynchronous fetch, clipboard operation, `preventDefault`, `window.open`, Next router navigation or scripted `anchor.click()` before opening. No text is shortened or removed from the draft. The fixed number is a personal conversation, not a group identifier. The user reviews the draft and presses Send inside Viber.

**Sao chép nội dung** is a separate optional fallback that refreshes/copies the full current composed message and updates the displayed link. It never opens Viber. Clipboard API failures fall back to legacy textarea selection/copy for HTTP LAN browsers; if both fail, the full text remains selectable.

The user reports that manually following the full draft hyperlink opens the correct recipient **and the full content**. The previous implementation did not preserve that interaction: it used scripted navigation and later replaced the draft link with a copy/recipient-only flow. Direct hyperlink behavior is restored. The exact cause of the earlier partial prefill inside the browser/OS/Viber is still not independently observable; it must not be asserted to be a universal draft-size limit. We found no application-side truncation and do not impose an arbitrary length cutoff.

Official [Business click-to-chat documentation](https://help.viber.com/hc/en-us/articles/36712478644381-Get-your-Viber-chat-link-and-QR-code-for-Business-accounts) documents `https://viber.me/84397092176?draft=...` for **registered Business accounts only**. We do not assume this personal recipient is one. The [business article](https://www.forbusiness.viber.com/en/blog/post/how-to-use-click-to-chat/) supplies no verifiable personal-account/long-message guarantee. The documented [forwarding scheme](https://developers.viber.com/docs/tools/share-button/) opens recipient selection and trims text beyond 200 characters, so it is not substituted for the working personal-chat link.

The legacy draft link builder is retained for diagnostics/compatibility. Complete Vietnamese fixtures round-trip exactly, including newlines, punctuation and special query characters. On a direct click, development-only diagnostics synchronously record **counts only**: Unicode code points, UTF-16 length, UTF-8 bytes, encoded draft length, complete draft URL length and round-trip equality. Production logs contain no message, recipient content or URL. No app-side cutoff was found; the exact browser/OS/Viber cutoff cannot be measured from this workspace.

Only an authenticated Admin with calendar access can read either the historical snapshot or current content. Default GET retains the immutable emailed snapshot; `?latest=1` supplies current persisted event content for the action. Consequently, an old email may contain an older version than the page, which explicitly labels its content as the latest saved version. No event or email snapshot is rewritten. Login preserves the draft URL and deleted events are inaccessible.

Configure **APP_ORIGIN** to a phone-reachable LAN address for local testing or public HTTPS in production. Browser clipboard and custom-scheme policies vary; copying is verified before opening, and manual selection remains available.

### Device verification

| Platform                                              | Format / path                                       | Correct recipient | Full draft prefill    | Status                                                      |
| ----------------------------------------------------- | --------------------------------------------------- | ----------------- | --------------------- | ----------------------------------------------------------- |
| User-reported device (OS not independently confirmed) | Manually followed full `viber://chat?...&draft=...` | Reported yes      | Reported full content | Working manual-link evidence; not independently tested here |
| iOS                                                   | Direct anchor with full draft                       | Not tested here   | Not tested here       | Manual device check required                                |
| Android                                               | Direct anchor with full draft                       | Not tested here   | Not tested here       | Manual device check required                                |
| Desktop                                               | Direct anchor with full draft                       | Not tested here   | Not tested here       | Manual device check required                                |

Automated tests verify the complete anchor draft, fixed recipient, native default navigation without a fetch/clipboard prerequisite, separate full-copy behavior, refresh/copy failures, latest saved text, and lack of automatic launches. They cannot observe what Viber receives or prove app delivery.

## Failure handling and retries

The Admin notification bell includes private Viber-email failures alongside group-email failures, marked **Email bản nháp Viber**. Only the latest attempt for a saved version is shown. Successful retry clears that alert. Retrying a private draft sends its original saved snapshot and never resends the group notification.

`POST /api/worship-viber-drafts/:id/retry` accepts only `{requestId}`. Admin authorization, event visibility, UUID idempotency, per-version active-attempt uniqueness, a five-attempt cap and a 20-new-attempts-per-Admin/15-minute retry limit apply. Definite failures permit explicit retry from the bell. Sending/uncertain outcomes are not blindly resent; operators must check provider logs. SMTP acceptance does not prove inbox delivery. A process/database interruption can retain a pending/sending record; a save replay safely resumes pending work, while stale sending leases become uncertain. No detached in-process SMTP task is used.

## Persistence and compatibility

Apply all **fifteen migrations** with `npm run db:migrate`:

- **013:** optional `events.preset_id` provenance and `notification_history` snapshots/statuses. Older recognizable worship-template events are tagged; text recognition also supports legacy records.
- **014:** distinct `worship_viber_draft` email type.
- **015:** `event_save_requests.worship_notification_id` binds private delivery to the same durable save receipt as group delivery.

Notification snapshots include event/version, initiating profile, fixed recipient, exact message, missing fields and status/timestamps. Profile merges canonicalize actor IDs while retaining snapshots. Preset provenance survives free text edits but is not a dependency on the original template remaining available.

Earlier Admin-only preview/manual information-request APIs remain for compatibility, with the existing source validation and protections. The editor no longer calls them. `worship_information_request` records are distinct from automatic `worship_viber_draft` records; no additional plain request email is automatically sent. Other calendar event kinds retain their existing group-email behavior.

No migration sends mail or retroactively emails historical events. Pending historical outbox work remains unchanged. Real event saves now send mail immediately, so tests must use synthetic data and mocked transport.

## Verification

Run `npm run test:core`, `npm run test:mobile`, `npm run test:backend`, followed by `npm run typecheck` and `npm run build` sequentially. Coverage includes parsing/composition, live summary-only UI, group/private sends on create and edit, no-group/complete programs, replay across newer versions, failure independence, safe bell retries, protected phone snapshots and clipboard fallback. Backend tests use isolated PostgreSQL and mocked SMTP; they do not send real emails.

### Email link compatibility and alternate labels

The primary email action is the authenticated web draft URL, which uses HTTPS in production. Gmail iOS may strip custom-scheme links, so the email contains only the web URL. Open the web draft and choose the copy/open action; if the embedded browser blocks it, open the page in Safari. The full message remains available for copying. Real-device Gmail/Viber behavior still requires manual verification.

The parser accepts NKTP as Hát dẫn, Chấp sự HDCT as HDCT, and KTĐĐ (Kinh Thánh Đối Đáp) as KTĐĐ. Either spelling satisfies its field by presence, including an empty label. Repeated aliases combine values without changing the saved source text.

Worship presence rule: containing either NKTP/Hát dẫn, Chấp sự HDCT/HDCT, or KTĐĐ/Kinh Thánh Đối Đáp anywhere in the original text satisfies that field, even without a colon or value. Matching ignores case, Unicode normalization and repeated whitespace. Other fields still require a populated value.

The email contains only the authenticated web draft link (no direct viber:// URI). After Admin authentication, the page shows the latest saved content and waits for an explicit direct-link click. It never launches a partial draft automatically or sends a message.

Unchanged event saves do not send either group or Viber-draft emails. Text is compared exactly and date changes count as content changes. A completely unchanged save preserves the version and records an idempotent receipt with no notification IDs; stale versions still fail. Recipient-only changes persist without resending unchanged content. Event row locking serializes comparisons against concurrent saves. Creation and actual content/date edits continue to send, including complete worship programs.

Viber query values are percent-encoded exactly once, including the phone number’s plus sign (%2B). Unicode, line breaks, literal plus/percent signs, ampersands, quotes and other reserved characters round-trip without changing the saved message. Direct links and diagnostics use the same shared full-draft link builder. This validates URL encoding; Viber app support for the chat draft parameter still depends on the device.

The composed Viber/email message trims trailing whitespace and line breaks from the event before appending exactly one newline followed by “Thông tin còn thiếu:”. Internal program line breaks and the saved event text remain unchanged. Complete programs retain their original text.
