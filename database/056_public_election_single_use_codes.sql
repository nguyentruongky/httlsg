BEGIN;
ALTER TABLE church.election_public_sessions
 ADD COLUMN consumed_browser_hash text,
 ADD COLUMN consumed_at timestamptz,
 ADD CONSTRAINT public_code_consumption_complete CHECK ((consumed_browser_hash IS NULL) = (consumed_at IS NULL));
-- Previously shared credentials may already have multiple admissions. Retire
-- those credentials until an organizer generates a new, single-use code.
UPDATE church.election_public_sessions s
SET consumed_browser_hash='retired',consumed_at=now()
WHERE EXISTS(SELECT 1 FROM church.election_public_admissions a WHERE a.session_id=s.id);
INSERT INTO church.schema_migrations(version) VALUES(56);
COMMIT;
