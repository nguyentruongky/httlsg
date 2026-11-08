#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# A private ephemeral PostgreSQL cluster; never touches DATABASE_URL from your shell.
CHURCH_TEST_DIR=$(mktemp -d /tmp/church-rbac.XXXXXX)
cleanup() {
  pg_ctl -D "$CHURCH_TEST_DIR/data" -m immediate -w stop > /dev/null 2>&1 || true
  rm -rf "$CHURCH_TEST_DIR"
}
trap cleanup EXIT
initdb -D "$CHURCH_TEST_DIR/data" -A trust --no-locale -E UTF8 > "$CHURCH_TEST_DIR/init.log"
pg_ctl -D "$CHURCH_TEST_DIR/data" -l "$CHURCH_TEST_DIR/server.log" -o "-k $CHURCH_TEST_DIR -h '' -p 55439" -w start > /dev/null
export DATABASE_URL="postgresql:///postgres?host=$CHURCH_TEST_DIR&port=55439"
export SESSION_SECRET=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64"))')
export APP_ORIGIN="http://127.0.0.1:3000"
export NODE_ENV=test
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/001_church.sql > "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/002_otp_onboarding.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/003_member_roles.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/004_leader_team_live.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/005_board_otp_access.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/006_profile_merges.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/007_phone_sign_in_otp.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/008_profile_login_identifiers.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/009_persistent_sessions.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/010_session_delete_revocation.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/011_calendar.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/012_immediate_calendar_mail.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/013_worship_information_requests.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/014_worship_viber_email.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/015_automatic_worship_notifications.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/016_calendar_export_email.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/017_department_board_history.sql >> "$CHURCH_TEST_DIR/migrate.log"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/018_web_push.sql >> "$CHURCH_TEST_DIR/migrate.log"
export OTP_SECRET=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64"))')
unset SMTP_USER SMTP_PASS SMTP_FROM VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT
export EMAIL_DELIVERY_MODE=file
export OTP_OUTBOX_DIR="$CHURCH_TEST_DIR/outbox"
node --import tsx --test --test-concurrency=1 apps/web-admin/tests/*.test.ts

if [[ -f .local-data/believers.json ]]; then
  node --import tsx scripts/database.ts import
  node --import tsx scripts/database.ts import
fi
