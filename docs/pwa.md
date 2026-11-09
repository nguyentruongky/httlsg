# Hội Thánh PWA and device notifications

The installable production entry is **`/client` in `apps/web-admin`**, not the admin dashboard. It renders the same member application as the independent Vite app. Vite's development/build entry is `/` on its own origin. No separate native application was introduced.

## Installation and device support

On iPhone/iPad, use **iOS/iPadOS 16.4 or newer** for Web Push. Open the member URL in Safari → Share → Add to Home Screen → enable Open as Web App if offered → Add. Open the resulting Hội Thánh icon. The profile's device settings include Vietnamese instructions; dismissing them persists only a nonsensitive preference. There is no fake iOS native install button.

On Android/Chromium, the device settings show Cài ứng dụng when the browser supplies `beforeinstallprompt`. The native prompt opens only after a tap. If the browser does not offer that event, the UI describes its own installation menu. Installed/standalone apps do not show the install instructions again. Installation can be blocked by browser policy or the site's existing install history.

Feature detection remains authoritative: supported APIs, a secure context, a ready service worker, and notification permission are all checked. User-agent information is used only for installation guidance. Safari on macOS and supported desktop browsers can also use Web Push. iOS browser tabs cannot enable this feature without a Home Screen web app. Device Focus modes, power restrictions, browser policies, force-quitting, and push-service availability can delay/prevent delivery. No application can guarantee delivery time or override the operating system's notification settings.

## Manifest, icons and public-only offline behavior

`npm run pwa:assets` creates:

- Next: `/pwa/manifest.webmanifest`, `/pwa/sw.js`, PNG icons, and `/pwa/offline.html`.
- Vite: the same public assets with a root `/sw.js`, a root-scoped manifest, and the compatible legacy manifest URL.

The Next manifest uses name/short name Hội Thánh, start URL/id/scope `/client`, standalone display, unrestricted orientation, Vietnamese description, the existing green/background colors, 192/512 PNG icons, a maskable icon and an Apple touch icon. The Vite manifest uses `/` as start/id/scope. Icons derive from the existing green-and-white cross brand asset; Android's maskable icon has a filled safe-area background. iOS uses the Apple touch icon. Native splash/loading presentation is platform-dependent.

Generation runs before both apps' dev/build commands. Its deterministic worker version incorporates member/shared source, public client layouts, styling, the generation source and dependency lockfile. Generated assets are committed so static URLs and tests also work before a build.

The worker caches **only an explicit allowlist of public icons and the static offline fallback**. It does not cache member HTML, API responses, auth endpoints, Next RSC, authenticated data or private events. Other requests use the browser's normal networking. Offline navigation to the member app shows an explanatory page and a retry link; this is deliberately not an offline member directory. Private information is never written to Cache Storage. Logout clears Query Cache, revokes the relevant subscriptions on the server and attempts to unsubscribe locally and close already displayed notifications.

Next serves its worker with `Service-Worker-Allowed: /client` and no-store update headers. Vite's root worker needs no scope-widening header. A static Vite deployment must serve `/sw.js` with JavaScript MIME and `Cache-Control: no-cache`/no-store, serve the manifest with a manifest/JSON MIME type, and proxy `/api` to the existing backend with the same public origin. The primary documented production deployment remains Next `/client`.

Waiting worker updates never automatically reload a form. The update notice asks the user to save first; Cập nhật ứng dụng sends `SKIP_WAITING`, then reloads only when the new controller activates. Để sau leaves the current page untouched. Visibility checks and an hourly check discover future worker updates. Initial installations activate normally without a forced reload.

## Server configuration

Migration **018_web_push.sql** adds encrypted subscriptions and durable event delivery tracking. Apply with `npm run db:migrate` before deploying the new APIs/auth logout changes. The regular migration runner and isolated backend-test harness include 018.

Required **server-only** variables:

```dotenv
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-church-administrator@example.com
```

Generate a local key pair with:

```sh
npm run push:keys
```

This writes credentials into the ignored `apps/web-admin/.env.local` with mode 0600 and prints no private key. Existing keys are preserved. Set VAPID_SUBJECT to a real operator contact before production. Store production values in the hosting platform's secret manager and restart the server after changing them. Do not regenerate keys on each deploy; existing browser subscriptions bind to the public application key. Changing the pair requires device re-registration. SMTP and OTP keys are independent and are never reused for VAPID.

Only the public key is returned through the authenticated status endpoint. No `NEXT_PUBLIC_` or `VITE_` private-key variable is used. Subscription endpoint, p256dh and auth are encrypted together using AES-256-GCM, with a domain-separated key derived from the existing stable SESSION_SECRET. PostgreSQL stores a unique SHA-256 endpoint fingerprint instead of plaintext endpoint URLs. Rotating SESSION_SECRET requires re-registering encrypted device subscriptions as well as reviewing the authentication rotation procedure. Never log plaintext subscription objects, endpoint URLs, private VAPID keys, or provider response bodies.

## Local development and HTTPS

`http://localhost:3000/client` and loopback addresses are secure-context exceptions on the computer running the browser. A phone cannot reach your computer through its own localhost/127.0.0.1. An ordinary HTTP LAN IP can load the website, but cannot register a PWA service worker or enable Web Push. For device testing, use a reachable **HTTPS** origin with a certificate trusted by the phone, through your normal HTTPS reverse proxy/tunnel. Configure APP_ORIGIN to the exact public origin and restart the server. Production also requires HTTPS for the existing refresh cookie.

Vite forwards API requests to Next during development. Subscriptions are per browser origin/device; enabling a Next-origin installation does not also enable the Vite origin. Never serve real member data from an untrusted tunnel or test service.

## Member controls

In Cá nhân → Thông báo trên thiết bị:

1. Read the explanation; on iOS install/open from Home Screen first.
2. Tap Bật thông báo. Only this action requests native permission, directly from the tap.
3. The browser creates a visible-notifications subscription and the server confirms ownership/storage before the UI reports success.
4. Gửi thông báo thử sends only to the authenticated account's active devices.
5. Tắt thông báo revokes the current endpoint server-side, then unsubscribes the browser. It does not change other devices.

Denied permission is not repeatedly prompted: the UI explains browser/device settings. Expired/unavailable registrations can be explicitly enabled again. The existing login-session family is bound to each device registration, surviving access/refresh rotation. Logout revokes only that family; all-device logout revokes all that account's registrations. Delivery also checks live family credentials, enabled account status, password-setup state and auth version, so database revocation stops future sends without trusting a stale device flag.

At most 20 active registrations are accepted per account. An endpoint cannot be reassigned to another account, including a previously revoked endpoint. A browser encountering that situation unsubscribes its old capability and can retry with a fresh subscription. There is no automatic cross-account transfer.

## APIs

All endpoints use the existing bearer session and origin/JSON mutation checks. Password-setup-only sessions cannot manage subscriptions.

| Endpoint                               | Behavior                                                                                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST `/api/push/subscribe`             | Strict `{endpoint,keys:{p256dh,auth},deviceLabel?}`; server binds account and refresh family, encrypts secrets and upserts only the same owner's endpoint.                     |
| POST `/api/push/unsubscribe`           | Strict `{endpoint}`; revokes only the authenticated account's match, with an enumeration-safe response.                                                                        |
| GET `/api/push/status?fingerprint=...` | Optional SHA-256 device fingerprint; returns configured/public key, own active count and matching-device active state. No endpoint, encryption/auth keys or other users' data. |
| POST `/api/push/test`                  | Own active devices only; five attempts per 15 minutes. No caller-supplied recipients or payload.                                                                               |
| GET `/api/push/events/:id`             | Read-only existing event; current selected-group account membership or existing calendar read permission is rechecked. Deleted/unavailable events return a generic 404.        |

Subscribe/unsubscribe are limited to 30 requests per 15 minutes per account. Outbound endpoints must be HTTPS, credential-free and on known browser push-provider domains (Google FCM, Mozilla, Apple, Windows); arbitrary/private-network URLs and nonstandard ports are rejected to prevent SSRF. New provider domains require a reviewed allowlist change. Do not turn this into a generic URL-fetch service.

## Event integration, recipients and delivery recovery

**New event creation only**, when notification groups include subscribed member accounts, queues one delivery per `(event,subscription)`. Existing email sends and automatic worship/Viber email behavior are unchanged. Selecting overlapping groups does not duplicate devices. Editing events continues to send the existing email updates, but does **not** enqueue or automatically resend push notifications. Replaying an idempotent save cannot duplicate a sent push. No unrelated notification categories or general broadcast API were added.

The existing email-group relation stores addresses, not member IDs. Recipients are resolved by matching those selected addresses to active **login-account email** values, not arbitrary profile/contact aliases. Phone-only accounts without a matching account email receive no group-event push. No new group or broad member-read permission was invented. Eligibility is rechecked before delivery and when opening the event; removal from a group or account revocation prevents new access.

Payloads use a generic Vietnamese title/body and an event reference, not full content, names, phone numbers or emails. The URL is `/client#/events/:id`. The member app adds a small read-only event view over the existing event table. Standard members keep their normal profile-only navigation but can open authorized event links. Login and forced-password setup preserve only a validated event hash; there is no arbitrary redirect parameter. Taps focus/navigate an existing member window or open a new one; the worker validates internal destinations independently of the server.

Queueing uses a savepoint so push infrastructure failure cannot abort the saved event/email transaction. Email and push dispatches are separate after-commit attempts. The immediate dispatcher claims at most 30 devices, with at most 10 requests in flight and bounded network timeouts. **Production must schedule recovery** to drain larger batches and transient failures:

```sh
npm run push:deliver
```

Run it at least once per minute with the same server environment, using the existing deployment scheduler/process manager. The command drains up to 600 due records per invocation; busy deployments should invoke it more frequently or run a dedicated worker. Without that scheduler, only the immediate bounded batch is guaranteed to be attempted. It is safe for multiple workers to run: atomic `SKIP LOCKED` claims and unique delivery keys prevent concurrent duplicate attempts.

404/410 revokes an expired subscription. HTTP 429/5xx can retry up to three attempts, after at least five minutes and honoring bounded Retry-After advice. Unknown transport outcomes or stale sending claims become `uncertain` and are **not** automatically retried: a provider may already have accepted them, so exactly-once external delivery cannot be guaranteed. Other rejections remain safely recorded for operator diagnosis. Audit records and durable status codes omit provider bodies and subscription secrets. Missing VAPID configuration skips event push while preserving all event/email behavior.

## Verification and manual device checks

Automated tests use the existing Node/Testing Library frameworks and a mocked provider. They verify manifest/icons, public-only worker behavior, visible pushes/click destinations, explicit permission/install/update consent, endpoint ownership/encryption, group scoping, deduplication, expiry/revocation, failure isolation and authentication deep links. No standard test contacts the real Web Push network or sends real SMTP mail.

Before release, verify on real iPhone/iPad and Android hardware:

- Trusted HTTPS, manifest fetch and Home Screen icon/name; standalone launch, portrait/landscape and native splash behavior.
- iPhone-size and 360px Android layouts; tablet layout; safe-area/keyboard behavior; no clipped buttons or horizontal scrolling.
- Explicit enable/deny/disable; own test notification while the application is closed; tap into an authorized event.
- Logout and another-account sign-in; old subscriptions stop receiving private/account-specific notifications.
- Update notice while a form contains unsaved edits; no reload until consent.
- Selected-group create sends once; edit sends existing email updates without a new automatic push.
- Confirm scheduler/recovery and host service-worker/cache headers.

No real-device iOS/Android delivery claim is made by automated tests.

Platform references: [WebKit: Web Push for Home Screen web apps](https://webkit.org/blog/13878/), [Apple: sending web push notifications](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers), [web-push official documentation](https://github.com/web-push-libs/web-push), and the installed Next.js PWA guide at `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`.

## Verification record for this implementation

- `npm run typecheck`: passed across all workspaces.
- `npm run build`: passed for Vite and Next.js, including public asset generation.
- `npm run test:mobile`: 126 passed, using Node 25 with built-in Web Storage disabled (`NODE_OPTIONS=--no-webstorage`) so the existing jsdom test environment keeps its intended storage behavior.
- `npm run test:backend`: 136 passed against disposable PostgreSQL, including same-account multi-device isolation, quota enforcement, profile-alias privacy and provider recovery.
- Focused push/PWA and existing calendar/export core regression checks: 46 passed.
- `npm run test:core`: 118 passed, 8 failed. The remaining failures are existing worship-content expectations in `event-presets.test.ts` and `worship/worship.test.ts`: template heading/wording and one-versus-two-newline formatting. This PWA task leaves those unrelated content choices unchanged.
- Production HTTP smoke on a temporary loopback server: `/client` metadata, manifest/start/scope, PNG icons, offline asset, worker MIME/scope/cache headers, and unauthenticated API rejection passed.
- A scan of both browser builds found no configured private VAPID key. No key value was printed during that scan.

The private local environment has VAPID keys and migration 018 is applied locally. This does not configure the production environment, provision an HTTPS certificate, or install a deployment scheduler. Real-device Home Screen installation, mobile viewport/keyboard rendering, background delivery, OS notification behavior and tap navigation still require manual testing. Push messages use a one-hour provider TTL; provider acceptance is not proof of delivery to a particular device.

## Main implementation files

- Member UI: `apps/mobile-client/src/pwa.tsx`, `pwa-settings.tsx`, `push-event.tsx`; existing app/login/profile integration remains shared with Next.
- Hosting metadata: `apps/web-admin/app/client/layout.tsx`, `next.config.ts`, Vite index metadata and generated public assets.
- Worker source and generation: `packages/core/pwa/`, `scripts/pwa-assets.mjs`, public `pwa/` directories and Vite root `sw.js`.
- Contracts and auth cleanup: `packages/core/src/push.ts`, `pwa-client.ts`, `auth-session.tsx`.
- APIs: `apps/web-admin/app/api/push/`; server services are `apps/web-admin/lib/server/push-*.ts`.
- Existing event/logout integration: `calendar.ts`, `calendar-immediate-mail.ts`, `persistent-session.ts`.
- Database/setup/recovery: migration 018, migration/test scripts, `push-keys.mjs`, `push-deliver.ts`, `.env.example` and package scripts.
- Tests: shared push/worker tests, member PWA/auth tests and PostgreSQL push tests. The backend harness removes inherited SMTP/VAPID configuration before creating its private test environment.

## Explicit local reception draft exception

At the user's request, unsubmitted reception plans now autosave to account/auth-version-scoped browser localStorage. They contain working schedule text, names and linked profile IDs, never access/refresh credentials. These private temporary copies are cleared on submission, successful official save/cancellation, logout, session expiry and detected principal changes. This is separate from service-worker Cache Storage: member pages/API responses are still not cached, and there is no general offline directory. Local drafts are recoverable on the same browser while signed in; the application shell may still require a network connection to open. See the scheduling guide for resume, stale-version review, storage failures and official-print behavior.
