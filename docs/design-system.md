# Design system and development conventions

Reviewed 24 November 2026. This guide covers the current single-church application.
Start with the [current architecture guide](architecture.md); the original multi-tenant design is retained in [architecture-history.md](architecture-history.md).

## System assessment

The workspace boundaries are useful: `@org/core` owns shared contracts and browser
API access, `@org/ui` owns reusable presentation, mobile owns member workflows,
and web-admin owns trusted server operations. Both applications import
`@org/ui/styles.css`, so a second theme or component framework is unnecessary.

The review inspected the shared primitives, application stylesheets, HTTP request
reader, calendar route wrapper, and session transaction boundary. It was a source
review, not a complete security, accessibility, or runtime audit.

| Finding                                                                                     | Action / remaining work                                                                                                                                    |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dropdown controls used fixed white/slate colors while inputs used semantic tokens           | Dropdowns now use the shared background, foreground and muted tokens.                                                                                      |
| Destructive buttons assumed white text in both themes                                       | Added a destructive foreground token with light and dark values.                                                                                           |
| Invalid fields had no shared visual state; mobile dropdowns omitted validation descriptions | Shared input/select invalid styling and mobile trigger accessibility attributes now follow the original select. Callers still supply validation text.      |
| Shared error fallback was English                                                           | Fallback is now Vietnamese.                                                                                                                                |
| JSON request validation accepted media types with an arbitrary suffix                       | Reader now compares the normalized media type exactly; charset parameters remain supported.                                                                |
| Shared stylesheet includes schedule printing and department navigation rules                | Move feature-specific rules gradually into feature-owned styles; preserve print portal and measurement behavior.                                           |
| Mobile stylesheet has overlapping dialog rules                                              | Consolidate one dialog variant at a time with explicit keyboard, safe-area and scroll ownership requirements.                                              |
| Calendar server module combines persistence, contributions and notification orchestration   | Extracted into `lib/server/calendar/` services behind the existing facade; preserve transaction, idempotency and permission boundaries in further changes. |

## Visual ownership

`packages/ui/src/styles.css` owns semantic color tokens, global accessibility
behavior and shared component styles. Theme values live in `:root` and `.dark`;
Tailwind names are exposed through `@theme inline`. Application stylesheets own
page layout and feature-specific behavior. Avoid app-wide overrides of primitives.

Use `bg-background` / `text-foreground` for page and form surfaces,
`bg-card` / `text-card-foreground` for panels, and `bg-muted` /
`text-muted-foreground` for secondary content. Use primary tokens for the main
action and destructive tokens for deletion. Always pair destructive backgrounds
with `text-destructive-foreground`. Fixed colors are reserved for intentional
print output or a documented domain distinction.

Use Tailwind's existing spacing scale: 2 for closely related controls, 3–4 for
form groups, and 6 for section separation. Use rounded-lg for controls,
rounded-xl for cards, text-sm for controls/body metadata, and font-medium for
labels. Prefer existing Button variants and sizes over copied class strings.
These are composition conventions, not a mandate to restyle every existing page.

## Frontend implementation

- Reuse `@org/ui` controls. Add a shared primitive when multiple workflows need
  the same behavior; keep domain-specific components in their feature folder.
- Keep page components focused on composition. Separate request/cache logic and
  complex domain transformations from JSX. Share domain rules through `@org/core`.
- Give inputs visible labels. Connect help/error text using `aria-describedby`
  and set `aria-invalid` after validation. Icon-only actions need accessible names.
  Shared styling does not create labels or error messages automatically.
- Preserve keyboard navigation, visible focus, reduced motion and browser zoom.
  Shared controls retain the existing 44px minimum mobile touch targets.
- Give a dialog one explicit scroll owner. Use `scrollableBody` when controls
  must stay visible; avoid nested page/modal scroll regions without a reason.
- Use Vietnamese for user-visible copy, including pending, empty and error states.
  Keep current values visible after a failed mutation and prevent duplicate submits.
- Use `apiRequest()` and existing query hooks. Keep cache keys scoped to actor,
  parameters and permissions; invalidate affected reads after successful writes.
  Follow established session/cache policy before persisting private information.
- Navigate through `clientPath()` / `navigateClient()` under `/client/*`.

## Backend implementation

Keep route handlers thin. Use the established request wrapper where appropriate,
then put domain authorization and validation in server services. Client-side role
checks only control presentation. Derive actor identity from the authenticated
session and validate resource scope on the server for every operation.

The `calendarApi()` wrapper handles parsing, origin checks for body requests,
authenticated execution, response serialization and error mapping. Its write flag
controls the session transaction. Origin validation is present here; explicit
`X-Church-CSRF` header enforcement exists in the election wrappers, not in
`calendarApi()` or `withActor()`. Review client compatibility before unifying that
policy. Never replace authentication with a caller-supplied actor ID.

Parse `unknown` input with the domain Zod schema before using it. The shared
`body()` reader enforces JSON media type, streamed byte limits and malformed-JSON
errors. It accepts case-insensitive `application/json` with optional parameters;
it does not opt all endpoints into vendor `+json` formats. Keep size limits explicit
for larger payloads rather than removing limits globally.

Use parameterized SQL and existing DB/transaction helpers. Keep related mutations,
audit records and queued delivery work atomic. Preserve version checks and request
idempotency. Send external notifications through established delivery/outbox flows;
an external network call must not make a committed write appear rolled back.

Throw `HttpError` for expected failures. Keep responses compatible with
`{ message, code? }` and Vietnamese messages. Never expose SQL, credentials or driver
error details. The current generic failure mapper returns 503 for unclassified
errors; changing that contract needs an explicit review of client retry behavior.

## Maintaining the system

For each change, identify its owning layer and reuse existing contracts before
adding abstractions. Update the relevant feature documentation when behavior or
API contracts change. Avoid mixing migrations, broad formatting and unrelated
feature rewrites in one change.

Run `npm run typecheck` after implementation. Current project instructions prohibit
adding, updating or running automated or manual tests unless the user explicitly
requests them. Typechecking provides static validation only; it does not establish
visual correctness, accessibility compliance or production behavior.

The calendar implementation is now split by responsibility behind a stable facade.
For future cleanup, prioritize the shared stylesheet's feature rules and the
remaining large server domains. Extract one behavior at a time; preserve API
payloads, permission rules, optimistic concurrency, notification ordering, print
layout and existing consumer imports throughout the migration.


## Loading views

`LoadingView` in `@org/ui` owns the app's centered loading indicator and an
optional Vietnamese `message`. It exposes a status region, hides the decorative
spinner from assistive technology, and animates only when motion is permitted.
`className` allows compact panel/table contexts (for example `min-h-48`) without
copying spinner markup. It requires no authentication or query provider.

The mobile startup/auth loading view and lazy screen fallback reuse this component.
Election list/detail, results, audit, assignments, candidate/team data and public
session screens use the same view for initial reads. Background refreshes retain
already loaded content; button-level submission/search feedback remains local to
its control. Calendar startup previews keep their existing specialized layout.
