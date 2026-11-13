BEGIN;
ALTER TABLE church.member_profiles
  ADD COLUMN choir_assignment_manual boolean NOT NULL DEFAULT false;
INSERT INTO church.schema_migrations(version) VALUES(29);
COMMIT;
