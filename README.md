# Church member management

Single-church member directory with a mobile client (React/Vite), a Next.js App Router backend and dashboard, shared Tailwind/shadcn UI, and PostgreSQL authentication with six roles, including department leaders. Interface actions and new authentication screens use Vietnamese.

All users sign in with phone/email at `/login`. First-time users can request an email OTP or a phone OTP from their Ban ngành leader, then must set a password at `/set-password` before continuing to `/client`. Admin and Thư ký have identical full access and can open `/dashboard` from the profile tab. Chấp sự can read the directory without editing; Ban điều hành edit assigned departments; User can view and edit their own and existing family profiles. Assigned leaders use the scoped `/dashboard/leader-otp` console; Admin/Thư ký configure roles and leader assignments at `/dashboard/admin/permissions`. Authorization is enforced by the APIs, independently of UI guards.

The local database has been prepared for this workspace. Open `http://127.0.0.1:3000/login`; the generated local administrator credentials are in `.local-data/local-auth.txt` (ignored by Git). Use `npm run db:local:start` after restarting your machine and `npm run dev:admin` to start the application.

## Setup from a fresh checkout

1. `npm install`
2. Configure PostgreSQL and `apps/web-admin/.env.local` using [the environment template](apps/web-admin/.env.example).
3. `npm run db:migrate`
4. Optionally `npm run db:import` for the private local fixture.
5. Supply `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD`, then `npm run db:bootstrap`.
6. `npm run dev:admin` and open `http://127.0.0.1:3000/login`.

See [authentication, setup, API, and RBAC documentation](docs/authentication.md) for database privileges, secret generation, account creation, department assignments, deployment, and testing. The raw schema and seeded role matrix are in [database/001_church.sql](database/001_church.sql) and [the OTP/account upgrade](database/002_otp_onboarding.sql). See [OTP onboarding, SMTP, and leader-console documentation](docs/otp-onboarding.md) for the new flows. No default login password is included.

## Workspace

```text
apps/mobile-client/       Mobile directory, detail/profile screens, shared login form
apps/web-admin/app/       Login, authenticated /client, guarded /dashboard, API routes
apps/web-admin/lib/server PostgreSQL repositories, authorization, passwords, sessions
apps/web-admin/tests/     Real PostgreSQL API integration tests
packages/core/           Shared schemas, auth contracts/provider, API adapter, demo adapter
packages/ui/             Owned Radix/shadcn components and design tokens
database/001_church.sql   Initial single-church schema
database/002_otp_onboarding.sql Unique login accounts, OTPs, leader mapping, permissions
scripts/database.ts      Migration, first-admin bootstrap, private fixture import
scripts/local-database.ts Local PostgreSQL setup/start/stop helpers
scripts/test-backend.sh   Isolated temporary PostgreSQL test runner
.local-data/             Ignored private fixture; never bundled or publicly served
```

The Vite client also runs with `npm run dev:mobile`; its dev proxy uses the Next.js backend on port 3000. The mobile shell is shared with Next.js at `/client`. Both use the same session cookies and API contract under one origin. The client preserves light styling, larger mobile text, search-first infinite scrolling, full-screen filters, inline edits, department roles, family links, notes, and date-only visit history. Dates use `dd/MM/yyyy`, with `ngày/tháng/năm` for entry.

The old localStorage demonstration remains available only through explicit `VITE_DEMO_MODE=true npm run dev:mobile`. It is separate from the authenticated PostgreSQL application and grants no real access. There is no organization switcher, organization table, or organization settings in the live implementation. The old unused SQL example is archived under `database/legacy/`.

## Checks

```sh
npm test
npm run test:backend
npm run typecheck
npm run build
```

The backend tests require PostgreSQL binaries on PATH and create/remove their own temporary cluster. The original workbook import guide is [docs/local-testing-data.md](docs/local-testing-data.md); its browser-fixture instructions describe the explicit legacy demo mode. Use `npm run db:import` to load those records into the authenticated backend.
