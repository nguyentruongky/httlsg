BEGIN;
-- Explicitly invalid paper ballots must not be counted as blank ballots.
ALTER TABLE church.election_tickets DROP CONSTRAINT election_tickets_invalid_reason_check;
ALTER TABLE church.election_tickets ADD CONSTRAINT election_tickets_invalid_reason_check
  CHECK(invalid_reason IN ('over_limit','blank','manual'));
INSERT INTO church.schema_migrations(version) VALUES(53);
COMMIT;
