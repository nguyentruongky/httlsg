BEGIN;
INSERT INTO church.role_permissions(role_id,permission_id) VALUES('board','leader.otps.read') ON CONFLICT DO NOTHING;
-- Refresh effective permissions immediately for every affected primary/secondary account.
UPDATE church.users SET auth_version=auth_version+1 WHERE role_id='board' OR id IN (SELECT member_id FROM church.member_roles WHERE role_id='board');
UPDATE church.sessions SET revoked_at=now() WHERE revoked_at IS NULL AND user_id IN (SELECT id FROM church.users WHERE role_id='board' OR id IN (SELECT member_id FROM church.member_roles WHERE role_id='board'));
INSERT INTO church.schema_migrations(version) VALUES(5);
COMMIT;
