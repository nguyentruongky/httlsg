BEGIN;
-- Existing notes retain their previous audience; new notes default to private.
ALTER TABLE church.notes ADD COLUMN visibility text NOT NULL DEFAULT 'public'
  CHECK (visibility IN ('public', 'private'));
ALTER TABLE church.notes ALTER COLUMN visibility SET DEFAULT 'private';
INSERT INTO church.schema_migrations(version) VALUES(35);
COMMIT;
