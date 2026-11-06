# Persistent login

Full sessions persist until revoked in PostgreSQL. Access credentials last 15 minutes. First-time password setup remains restricted and expires after 15 minutes, including across refreshes. This policy applies to password login, phone/email OTP verification, and completion of password setup.

## Implementation

- `database/009_persistent_sessions.sql` and `010_session_delete_revocation.sql`: hashed refresh credentials, device/user-agent auditing, refresh families, security events, and revocation triggers. Apply with `npm run db:migrate`. Existing access-cookie sessions are revoked once during migration; users sign in again.
- `apps/web-admin/lib/server/persistent-session.ts`: 256-bit random opaque refresh credentials, SHA-256 hashes, atomic rotation, replay detection, browser cookie responses, and logout.
- `apps/web-admin/lib/server/session.ts`: 15-minute encrypted access tokens with database validation on **every** API request. Deleting/revoking the active refresh row or access session also invalidates access immediately. Refresh cookies never authorize member APIs.
- `packages/core/src/api-client.ts`: memory-only access token, Authorization headers, a single refresh/retry on 401, same-origin URL restrictions, in-tab single-flight and cross-tab Web Locks. BroadcastChannel conveys logout events only, never credentials. Older browsers without Web Locks may require login again after simultaneous tab refreshes; strict replay detection is preserved.
- `packages/core/src/auth-event-stream.ts`: authenticated fetch-based SSE because native EventSource cannot send Authorization headers. Tokens never enter query strings.
- `packages/core/src/auth-session.tsx`: restore on startup, clear private React Query data on principal changes/logout, cross-tab logout and a security alert immediately after a rejected replay refresh. The alert is also shown on the next successful login for 24 hours; security events are retained in PostgreSQL. No unsolicited emails are sent for alerts.

## Endpoint contract

| Endpoint | Request | Response |
| --- | --- | --- |
| `POST /api/auth/login` | Existing identifier/password JSON | `user`, `accessToken`, `expiresIn: 900`; refresh cookie |
| `POST /api/auth/verify-otp` | Existing OTP JSON | Same credential envelope; setup-only when required |
| `POST /api/auth/refresh` | Refresh cookie; `X-Church-CSRF: 1`; allowlisted Origin | Rotated cookie and new access token, or 401 and cleared cookie |
| `POST /api/auth/set-password` | Setup access bearer and validated password JSON | Revokes old sessions; issues a full persistent session |
| `POST /api/auth/logout` | Refresh cookie; CSRF header and Origin | Revokes this family and clears cookie; idempotent |
| `POST /api/auth/logout-all` | Active refresh cookie; CSRF header and Origin | Revokes every device; exposed in profile as “Đăng xuất tất cả thiết bị” |
| `GET /api/auth/me` | `Authorization: Bearer …` | Fresh profile/permissions and security alert state |

Production refresh cookies use `__Host-church-refresh; HttpOnly; Secure; SameSite=Strict; Path=/` without a Domain attribute. Local HTTP development alone omits Secure and uses an unprefixed name. Cookies have a 400-day rolling Max-Age; actual browser limits or manual cookie clearing can end persistence sooner. Full refresh rows have `expires_at = NULL`; setup refreshes have an absolute deadline that rotation never extends. HTTPS and the correct `APP_ORIGIN` are required in production. The retired access cookie is cleared.

## Client example

```ts
import { apiRequest } from '@org/core';

// Stores accessToken only inside the module's memory; the browser keeps the
// HttpOnly refresh cookie. Never copy tokens to localStorage/sessionStorage.
await apiRequest('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ identifier, password }),
});

// Adds a bearer token and silently refreshes/retries once after a 401.
const profile = await apiRequest('/api/auth/me');
await apiRequest('/api/auth/logout', { method: 'POST' });
// UI should use useAuth().signOut() to also clear client data and notify tabs.
```

The shared request wrapper attaches the custom CSRF header. Unsafe existing APIs additionally require the allowlisted Origin and JSON; bearer Authorization is a non-simple header. Refresh/logout reject absent custom headers and cross-site fetch metadata. No permissive credentialed CORS configuration is added.

## Revocation and replay

Each refresh retires its row and creates one successor in the same family under a database transaction. A unique partial index enforces one active refresh per family. A revoked credential presented to refresh revokes **all** active refresh/access sessions for that user and records a security event. The failure response is returned only after committing revocation. No retry grace window weakens this rule. A lost rotation response, stolen retired token, or uncoordinated concurrent request can therefore force reauthentication; this is the tradeoff of the requested strict policy. Repeated stolen-token use can cause repeated sign-outs.

Existing session revocations from role changes, permissions, credentials, suspensions, department changes and profile merging propagate to refresh families. Account auth-version changes also revoke all refresh credentials. SQL examples:

```sql
-- Revoke all devices for a member; existing bearer tokens stop working too.
UPDATE church.refresh_tokens
SET revoked = true, revoked_reason = 'all_devices'
WHERE user_id = $1 AND NOT revoked;
UPDATE church.sessions SET revoked_at = now()
WHERE user_id = $1 AND revoked_at IS NULL;
```

Retain rotated/revoked refresh hashes to detect replay; deleting audit history removes that detection capability. Deleting the active credential still prevents refresh and immediately invalidates its family's access tokens. Deleting any access-session row also revokes its persistent family, so do not prune individual expired access rows while that family remains active. Session and replay tables need a documented retention/maintenance policy for long-running deployments. Do not log Authorization, Cookie, Set-Cookie, OTPs, or token JSON.

## Limits and security rationale

Indefinite sessions increase the lifetime of a stolen credential; the explicit revocation requirement is implemented, but a bounded inactivity/absolute lifetime is a stronger default for sensitive deployments. Cookies cannot promise literal indefinite persistence because browsers and users can remove them. HttpOnly prevents reading the persistent credential through JavaScript; it does not make an application immune to XSS. Injected scripts can still make authenticated requests or intercept new access tokens while running. Continue preventing XSS, reviewing third-party scripts and applying an application-compatible CSP; this feature is not an XSS audit or immunity claim.

Pages now render public shells and authenticate in the client, because memory-only access credentials cannot authorize server-rendered page requests. Server-rendered HTML contains no member data. APIs enforce permissions independently of navigation guards. Existing phone OTP delivery and Admin visibility are unchanged.

The rotation/replay design follows [RFC 9700 §4.14](https://www.rfc-editor.org/rfc/rfc9700.html#section-4.14); browser storage rationale follows [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html).
