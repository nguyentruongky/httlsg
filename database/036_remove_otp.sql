BEGIN;
-- Password login and admin-issued temporary passwords remain unchanged.
-- Dropping the table also removes its OTP-only indexes, constraints and trigger.
DROP TABLE IF EXISTS church.otps;
DROP FUNCTION IF EXISTS church.notify_team_otp();
ALTER TABLE church.users DROP COLUMN IF EXISTS requires_admin_email_otp;
DELETE FROM church.role_permissions
 WHERE permission_id IN (SELECT id FROM church.permissions WHERE code LIKE '%otp%');
DELETE FROM church.permissions WHERE code LIKE '%otp%';
INSERT INTO church.schema_migrations(version) VALUES(36);
COMMIT;
