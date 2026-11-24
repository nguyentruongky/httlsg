BEGIN;
ALTER TABLE church.election_contests ADD COLUMN online_voting_enabled boolean NOT NULL DEFAULT false;
UPDATE church.election_contests e SET online_voting_enabled=true
WHERE EXISTS(SELECT 1 FROM church.election_public_sessions s WHERE s.election_id=e.id AND s.enabled);
INSERT INTO church.schema_migrations(version) VALUES(59);
COMMIT;
