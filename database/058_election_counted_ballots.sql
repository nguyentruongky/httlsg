BEGIN;
ALTER TABLE church.election_contests
 ADD COLUMN counted_ballots integer NOT NULL DEFAULT 0 CHECK(counted_ballots>=0);
INSERT INTO church.schema_migrations(version) VALUES(58);
COMMIT;
